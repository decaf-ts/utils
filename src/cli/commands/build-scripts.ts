import { Command } from "../command";
import { CommandOptions } from "../types";
import { DefaultCommandOptions, DefaultCommandValues } from "../constants";
import {
  copyFile,
  deletePath,
  getAllFiles,
  getPackage,
  patchFile,
  renameFile,
  runCommand,
} from "../../utils";
import fs from "fs";
import path from "path";
import { InputOptions, OutputOptions, rollup, RollupBuild } from "rollup";
import typescript from "@rollup/plugin-typescript";
import commonjs from "@rollup/plugin-commonjs";
import { nodeResolve } from "@rollup/plugin-node-resolve";
import json from "@rollup/plugin-json";
import { builtinModules } from "module";
import { LoggingConfig, LogLevel } from "@decaf-ts/logging";

// declare optional terser module to satisfy TypeScript when types aren't installed
declare module "@rollup/plugin-terser";

import * as ts from "typescript";
import { Diagnostic, EmitResult, ModuleKind, SourceFile } from "typescript";

export function parseList(input?: string | string[]): string[] {
  if (!input) return [];
  if (Array.isArray(input))
    return input.map((i) => `${i}`.trim()).filter(Boolean);
  return `${input}`
    .split(",")
    .map((p) => p.trim())
    .filter(Boolean);
}

export function packageToGlobal(name: string): string {
  // Remove scope and split by non-alphanumeric chars, then camelCase
  const withoutScope = name.replace(/^@/, "");
  const parts = withoutScope.split(/[/\-_.]+/).filter(Boolean);
  return parts
    .map((p, i) =>
      i === 0
        ? p.replace(/[^a-zA-Z0-9]/g, "")
        : `${p.charAt(0).toUpperCase()}${p.slice(1)}`
    )
    .join("");
}

export function getPackageDependencies(): string[] {
  // Try the current working directory first
  let pkg: any;
  try {
    pkg = getPackage(process.cwd()) as any;
  } catch {
    pkg = undefined;
  }

  // If no dependencies found in cwd, try the package next to this source file (fallback for tests)
  try {
    const hasDeps =
      pkg &&
      (Object.keys(pkg.dependencies || {}).length > 0 ||
        Object.keys(pkg.devDependencies || {}).length > 0 ||
        Object.keys(pkg.peerDependencies || {}).length > 0);
    if (!hasDeps) {
      const fallbackDir = path.resolve(__dirname, "../../..");
      try {
        pkg = getPackage(fallbackDir) as any;
      } catch {
        // ignore and keep pkg as-is
      }
    }
  } catch {
    // ignore
  }

  const deps = Object.keys((pkg && pkg.dependencies) || {});
  const peer = Object.keys((pkg && pkg.peerDependencies) || {});
  const dev = Object.keys((pkg && pkg.devDependencies) || {});
  return Array.from(new Set([...deps, ...peer, ...dev]));
}

const VERSION_STRING = "##VERSION##";
const PACKAGE_STRING = "##PACKAGE##";

enum Modes {
  CJS = "commonjs",
  ESM = "es2022",
}

enum BuildMode {
  BUILD = "build",
  BUNDLE = "bundle",
  ALL = "all",
}

const options = {
  prod: {
    type: "boolean",
    default: false,
  },
  dev: {
    type: "boolean",
    default: false,
  },
  buildMode: {
    type: "string",
    default: BuildMode.ALL,
  },
  includes: {
    type: "string",
    default: "",
  },
  externals: {
    type: "string",
    default: "",
  },
  docs: {
    type: "boolean",
    default: false,
  },
  commands: {
    type: "boolean",
    default: false,
  },
  banner: {
    type: "boolean",
    default: false,
  },
};

const cjs2Transformer = (ext = ".cjs") => {
  const log = BuildScripts.log.for(cjs2Transformer);
  const resolutionCache = new Map<string, string>();

  return (transformationContext: ts.TransformationContext) => {
    return (sourceFile: ts.SourceFile) => {
      const sourceDir = path.dirname(sourceFile.fileName);

      function resolvePath(importPath: string) {
        const cacheKey = JSON.stringify([sourceDir, importPath]);
        const cachedValue = resolutionCache.get(cacheKey);
        if (cachedValue != null) return cachedValue;

        let resolvedPath = importPath;
        try {
          resolvedPath = path.resolve(sourceDir, resolvedPath + ".ts");
        } catch (error: unknown) {
          throw new Error(`Failed to resolve path ${importPath}: ${error}`);
        }
        let stat;
        try {
          stat = fs.statSync(resolvedPath);
        } catch (e: unknown) {
          try {
            log.verbose(
              `Testing existence of path ${resolvedPath} as a folder defaulting to index file`
            );
            stat = fs.statSync(resolvedPath.replace(/\.ts$/gm, ""));
          } catch (e2: unknown) {
            throw new Error(
              `Failed to resolve path ${importPath}: ${e}, ${e2}`
            );
          }
        }
        if (stat.isDirectory())
          resolvedPath = resolvedPath.replace(/\.ts$/gm, "/index.ts");

        if (path.isAbsolute(resolvedPath)) {
          const extension =
            (/\.tsx?$/.exec(path.basename(resolvedPath)) || [])[0] || void 0;

          resolvedPath =
            "./" +
            path.relative(
              sourceDir,
              path.resolve(
                path.dirname(resolvedPath),
                path.basename(resolvedPath, extension) + ext
              )
            );
        }

        resolutionCache.set(cacheKey, resolvedPath);
        return resolvedPath;
      }

      function visitNode(node: ts.Node): ts.VisitResult<ts.Node> {
        if (shouldMutateModuleSpecifier(node)) {
          if (ts.isImportDeclaration(node)) {
            const resolvedPath = resolvePath(node.moduleSpecifier.text);
            const newModuleSpecifier =
              transformationContext.factory.createStringLiteral(resolvedPath);
            return transformationContext.factory.updateImportDeclaration(
              node,
              node.modifiers,
              node.importClause,
              newModuleSpecifier,
              undefined
            );
          } else if (ts.isExportDeclaration(node)) {
            const resolvedPath = resolvePath(node.moduleSpecifier.text);
            const newModuleSpecifier =
              transformationContext.factory.createStringLiteral(resolvedPath);
            return transformationContext.factory.updateExportDeclaration(
              node,
              node.modifiers,
              node.isTypeOnly,
              node.exportClause,
              newModuleSpecifier,
              undefined
            );
          }
        }

        return ts.visitEachChild(node, visitNode, transformationContext);
      }

      function shouldMutateModuleSpecifier(node: ts.Node): node is (
        | ts.ImportDeclaration
        | ts.ExportDeclaration
      ) & {
        moduleSpecifier: ts.StringLiteral;
      } {
        if (!ts.isImportDeclaration(node) && !ts.isExportDeclaration(node))
          return false;

        if (node.moduleSpecifier === undefined) return false;
        // only when module specifier is valid
        if (!ts.isStringLiteral(node.moduleSpecifier)) return false;
        // only when path is relative
        if (
          !node.moduleSpecifier.text.startsWith("./") &&
          !node.moduleSpecifier.text.startsWith("../")
        )
          return false;
        // only when module specifier has no extension
        if (path.extname(node.moduleSpecifier.text) !== "") return false;
        return true;
      }

      return ts.visitNode(sourceFile, visitNode) as SourceFile;
    };
  };
};

export class BuildScripts extends Command<
  CommandOptions<typeof options>,
  void
> {
  private replacements: Record<string, string> = {};
  private readonly pkgVersion: string;
  private readonly pkgName: string;

  constructor() {
    super(
      "BuildScripts",
      Object.assign({}, DefaultCommandOptions, options) as CommandOptions<
        typeof options
      >
    );
    const pkg = getPackage() as { name: string; version: string };
    const { name, version } = pkg;
    this.pkgName = name.includes("@") ? name.split("/")[1] : name;
    this.pkgVersion = version;
    this.replacements[VERSION_STRING] = this.pkgVersion;
    this.replacements[PACKAGE_STRING] = name;
  }

  patchFiles(p: string) {
    const log = this.log.for(this.patchFiles);
    const { name, version } = getPackage() as any;
    log.info(`Patching ${name} ${version} module in ${p}...`);
    const stat = fs.statSync(p);
    if (stat.isDirectory())
      fs.readdirSync(p, { withFileTypes: true, recursive: true })
        .filter((p) => p.isFile())
        .forEach((file) =>
          patchFile(path.join(file.parentPath, file.name), this.replacements)
        );
    log.verbose(`Module ${name} ${version} patched in ${p}...`);
  }

  private reportDiagnostics(
    diagnostics: Diagnostic[],
    logLevel: LogLevel
  ): string {
    const msg = this.formatDiagnostics(diagnostics);
    try {
      this.log[logLevel](msg);
    } catch (e: unknown) {
      console.warn(`Failed to get logger for ${logLevel}`);
      throw e;
    }
    return msg;
  }

  // Format diagnostics into a single string for throwing or logging
  private formatDiagnostics(diagnostics: Diagnostic[]): string {
    return diagnostics
      .map((diagnostic) => {
        let message = "";
        if (diagnostic.file && diagnostic.start) {
          const { line, character } =
            diagnostic.file.getLineAndCharacterOfPosition(diagnostic.start);
          message += `${diagnostic.file.fileName} (${line + 1},${character + 1})`;
        }
        message +=
          ": " + ts.flattenDiagnosticMessageText(diagnostic.messageText, "\n");
        return message;
      })
      .join("\n");
  }

  private readConfigFile(configFileName: string) {
    // Read config file
    const configFileText = fs.readFileSync(configFileName).toString();

    // Parse JSON, after removing comments. Just fancier JSON.parse
    const result = ts.parseConfigFileTextToJson(configFileName, configFileText);
    const configObject = result.config;
    if (!configObject) {
      this.reportDiagnostics([result.error!], LogLevel.error);
    }

    // Extract config infromation
    const configParseResult = ts.parseJsonConfigFileContent(
      configObject,
      ts.sys,
      path.dirname(configFileName)
    );
    if (configParseResult.errors.length > 0)
      this.reportDiagnostics(configParseResult.errors, LogLevel.error);

    return configParseResult;
  }

  private evalDiagnostics(diagnostics: Diagnostic[]) {
    if (diagnostics && diagnostics.length > 0) {
      const errors = diagnostics.filter(
        (d) => d.category === ts.DiagnosticCategory.Error
      );
      const warnings = diagnostics.filter(
        (d) => d.category === ts.DiagnosticCategory.Warning
      );
      const suggestions = diagnostics.filter(
        (d) => d.category === ts.DiagnosticCategory.Suggestion
      );
      const messages = diagnostics.filter(
        (d) => d.category === ts.DiagnosticCategory.Message
      );
      // Log diagnostics to console

      if (warnings.length) this.reportDiagnostics(warnings, LogLevel.info);
      if (errors.length) {
        this.reportDiagnostics(diagnostics as Diagnostic[], LogLevel.error);
        throw new Error(
          `TypeScript reported ${diagnostics.length} diagnostic(s) during check; aborting.`
        );
      }
      if (suggestions.length)
        this.reportDiagnostics(suggestions, LogLevel.info);
      if (messages.length) this.reportDiagnostics(messages, LogLevel.info);
    }
  }

  private preCheckDiagnostics(program: ts.Program) {
    const diagnostics = ts.getPreEmitDiagnostics(program);
    this.evalDiagnostics(diagnostics as any);
  }

  // Create a TypeScript program for the current tsconfig and fail if there are any error diagnostics.
  private async checkTsDiagnostics(
    isDev: boolean,
    mode: Modes,
    bundle = false
  ) {
    const log = this.log.for(this.checkTsDiagnostics);
    let tsConfig;
    try {
      tsConfig = this.readConfigFile("./tsconfig.json");
    } catch (e: unknown) {
      throw new Error(`Failed to parse tsconfig.json: ${e}`);
    }

    if (bundle) {
      tsConfig.options.module = ModuleKind.AMD;
      tsConfig.options.outDir = "dist";
      tsConfig.options.isolatedModules = false;
      tsConfig.options.outFile = this.pkgName;
    } else {
      tsConfig.options.outDir = `lib${mode === Modes.ESM ? "/esm" : ""}`;
      tsConfig.options.module =
        mode === Modes.ESM ? ModuleKind.ES2022 : ModuleKind.CommonJS;
    }

    // Ensure TypeScript emits inline source maps for both dev and prod (bundlers will control external maps)
    // Keep comments in TS emit by default; bundling/minification will handle removal where requested.
    // Emit external source maps from TypeScript so editors/debuggers can find them.
    // Turn off inline maps/sources so bundlers (Rollup) can control whether maps are inlined or written externally.
    tsConfig.options.inlineSourceMap = false;
    tsConfig.options.inlineSources = false;
    tsConfig.options.sourceMap = true;

    const program = ts.createProgram(tsConfig.fileNames, tsConfig.options);
    this.preCheckDiagnostics(program);
    log.verbose(
      `TypeScript checks passed (${bundle ? "bundle" : "normal"} mode).`
    );
  }

  private async buildTs(isDev: boolean, mode: Modes, bundle = false) {
    const log = this.log.for(this.buildTs);
    log.info(
      `Building ${this.pkgName} ${this.pkgVersion} module (${mode}) in ${isDev ? "dev" : "prod"} mode...`
    );
    let tsConfig;
    try {
      tsConfig = this.readConfigFile("./tsconfig.json");
    } catch (e: unknown) {
      throw new Error(`Failed to parse tsconfig.json: ${e}`);
    }

    if (bundle) {
      tsConfig.options.module = ModuleKind.AMD;
      tsConfig.options.outDir = "dist";
      tsConfig.options.isolatedModules = false;
      tsConfig.options.outFile = this.pkgName;
    } else {
      tsConfig.options.outDir = `lib${mode === Modes.ESM ? "/esm" : ""}`;
      tsConfig.options.module =
        mode === Modes.ESM ? ModuleKind.ES2022 : ModuleKind.CommonJS;
    }

    // Always emit inline source maps from tsc (bundler will emit external maps for production bundles).
    // Emit external source maps from TypeScript for easier debugging.
    // Keep inline maps disabled so bundler controls final map placement.
    tsConfig.options.inlineSourceMap = false;
    tsConfig.options.inlineSources = false;
    tsConfig.options.sourceMap = true;

    // For production builds we still keep TypeScript comments (removeComments=false in tsconfig)
    // Bundler/terser will strip comments for production bundles as requested.

    const program = ts.createProgram(tsConfig.fileNames, tsConfig.options);

    const transformations: { before?: any[] } = {};
    if (mode === Modes.CJS) {
      transformations.before = [cjs2Transformer(".cjs")];
    } else if (mode === Modes.ESM) {
      transformations.before = [cjs2Transformer(".js")];
    }

    const emitResult: EmitResult = program.emit(
      undefined,
      undefined,
      undefined,
      undefined,
      transformations
    );

    const allDiagnostics = ts
      .getPreEmitDiagnostics(program)
      .concat(emitResult.diagnostics);

    this.evalDiagnostics(allDiagnostics);
  }

  private async build(isDev: boolean, mode: Modes, bundle = false) {
    const log = this.log.for(this.build);
    await this.buildTs(isDev, mode, bundle);

    log.verbose(
      `Module ${this.pkgName} ${this.pkgVersion} (${mode}) built in ${isDev ? "dev" : "prod"} mode...`
    );
    if (mode === Modes.CJS && !bundle) {
      const files = getAllFiles(
        "lib",
        (file) => file.endsWith(".js") && !file.includes("/esm/")
      );

      for (const file of files) {
        log.verbose(`Patching ${file}'s cjs imports...`);
        const f = file.replace(".js", ".cjs");
        await renameFile(file, f);
      }
    }
  }

  copyAssets(mode: Modes) {
    const log = this.log.for(this.copyAssets);
    let hasAssets = false;
    try {
      hasAssets = fs.statSync("./src/assets").isDirectory();
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (e: unknown) {
      return log.verbose(`No assets found in ./src/assets to copy`);
    }
    if (hasAssets)
      copyFile(
        "./src/assets",
        `./${mode === Modes.CJS ? "lib" : "dist"}/assets`
      );
  }

  async bundle(
    mode: Modes,
    isDev: boolean,
    isLib: boolean,
    entryFile: string = "src/index.ts",
    nameOverride: string = this.pkgName,
    externalsArg?: string | string[],
    includeArg: string | string[] = [
      "prompts",
      "styled-string-builder",
      "typed-object-accumulator",
      "@decaf-ts/logging",
    ]
  ) {
    // Run a TypeScript-only diagnostic check for the bundling configuration and fail fast on any errors.
    await this.checkTsDiagnostics(isDev, mode, true);
    const isEsm = mode === Modes.ESM;
    const pkgName = this.pkgName;

    // normalize include and externals
    const include = Array.from(
      new Set([...(parseList(includeArg) as string[])])
    );
    let externalsList = parseList(externalsArg);
    if (externalsList.length === 0) {
      // if no externals specified, include package.json dependencies to avoid rollup treating them as resolvable
      externalsList = getPackageDependencies();
    }

    const ext = Array.from(
      new Set([
        // builtins and always external runtime deps
        ...(function builtinList(): string[] {
          try {
            return (
              Array.isArray(builtinModules) ? builtinModules : []
            ) as string[];
          } catch {
            // fallback to a reasonable subset if `builtinModules` is unavailable
            return [
              "fs",
              "path",
              "process",
              "child_process",
              "util",
              "https",
              "http",
              "os",
              "stream",
              "crypto",
              "zlib",
              "net",
              "tls",
              "url",
              "querystring",
              "assert",
              "events",
              "tty",
              "dns",
              "querystring",
            ];
          }
        })(),
        ...externalsList,
      ])
    );

    // For plugin-typescript we want it to emit source maps (not inline) so Rollup can
    // decide whether to inline or emit external files. The Rollup output.sourcemap
    // controls final map placement. Do NOT set a non-standard `sourcemap` field on
    // the rollup input options (Rollup will reject it).
    const rollupSourceMapOutput: false | true | "inline" | "hidden" = isDev
      ? "inline"
      : true;

    const plugins = [
      typescript({
        compilerOptions: {
          module: "esnext",
          declaration: false,
          outDir: isLib ? "bin" : "dist",
          // Ask the TypeScript plugin to emit proper (external) source maps so
          // Rollup can consume/transform them. We keep inlineSourceMap=false
          // so maps are separate at the plugin stage.
          sourceMap: true,
          inlineSourceMap: false,
        },
        include: ["src/**/*.ts"],
        exclude: ["node_modules", "**/*.spec.ts"],
        tsconfig: "./tsconfig.json",
      }),
      json(),
    ];

    if (isLib) {
      plugins.push(
        commonjs({
          include: [],
          exclude: externalsList,
        }),
        nodeResolve({
          resolveOnly: include,
        })
      );
    }

    // production minification: add terser last so it sees prior source maps
    try {
      const terserMod: any = await import("@rollup/plugin-terser");
      const terserFn =
        (terserMod && terserMod.terser) || terserMod.default || terserMod;

      const terserOptionsDev: any = {
        parse: { ecma: 2020 },
        compress: false,
        mangle: false,
        format: {
          comments: false,
          beautify: true,
        },
      };

      const terserOptionsProd: any = {
        parse: { ecma: 2020 },
        compress: {
          ecma: 2020,
          passes: 5,
          drop_console: true,
          drop_debugger: true,
          toplevel: true,
          module: isEsm,
          unsafe: true,
          unsafe_arrows: true,
          unsafe_comps: true,
          collapse_vars: true,
          reduce_funcs: true,
          reduce_vars: true,
        },
        mangle: {
          toplevel: true,
        },
        format: {
          comments: false,
          ascii_only: true,
        },
        toplevel: true,
      };

      plugins.push(terserFn(isDev ? terserOptionsDev : terserOptionsProd));
    } catch {
      // if terser isn't available, ignore
    }

    const input: InputOptions = {
      input: entryFile,
      plugins: plugins,
      external: ext,
      onwarn: undefined,
      // enable tree-shaking for production bundles
      treeshake: !isDev,
    } as any;

    // prepare output globals mapping for externals
    const globals: Record<string, string> = {};
    // include all externals and builtins (ext) so Rollup won't guess names for builtins
    ext.forEach((e) => {
      globals[e] = packageToGlobal(e);
    });

    const outputs: OutputOptions[] = [
      {
        file: `${isLib ? "bin/" : "dist/"}${nameOverride ? nameOverride : `.bundle.${!isDev ? "min" : ""}`}${isEsm ? ".esm" : ""}.cjs`,
        format: isLib ? "cjs" : isEsm ? "esm" : "umd",
        name: pkgName,
        esModule: isEsm,
        // output sourcemap: inline for dev, external for prod
        sourcemap: rollupSourceMapOutput,
        globals: globals,
        exports: "auto",
      },
    ];

    try {
      const bundle = await rollup(input as any);
      console.log(bundle.watchFiles);
      async function generateOutputs(bundle: RollupBuild) {
        for (const outputOptions of outputs) {
          await bundle.write(outputOptions);
        }
      }

      await generateOutputs(bundle);
    } catch (e: unknown) {
      throw new Error(`Failed to bundle: ${e}`);
    }
  }

  private async buildByEnv(
    isDev: boolean,
    mode: BuildMode = BuildMode.ALL,
    includesArg?: string | string[],
    externalsArg?: string | string[]
  ) {
    // note: includes and externals will be passed through from run() into this method by callers
    try {
      deletePath("lib");
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (e: unknown) {
      // do nothing
    }
    try {
      deletePath("dist");
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (e: unknown) {
      // do nothing
    }
    fs.mkdirSync("lib");
    fs.mkdirSync("dist");

    if ([BuildMode.ALL, BuildMode.BUILD].includes(mode)) {
      await this.build(isDev, Modes.ESM);
      await this.build(isDev, Modes.CJS);
      this.patchFiles("lib");
    }

    if ([BuildMode.ALL, BuildMode.BUNDLE].includes(mode)) {
      await this.bundle(
        Modes.ESM,
        isDev,
        false,
        "src/index.ts",
        this.pkgName,
        externalsArg,
        includesArg
      );
      await this.bundle(
        Modes.CJS,
        isDev,
        false,
        "src/index.ts",
        this.pkgName,
        externalsArg,
        includesArg
      );
      this.patchFiles("dist");
    }

    this.copyAssets(Modes.CJS);
    this.copyAssets(Modes.ESM);
  }

  async buildDev(
    mode: BuildMode = BuildMode.ALL,
    includesArg?: string | string[],
    externalsArg?: string | string[]
  ) {
    return this.buildByEnv(true, mode, includesArg, externalsArg);
  }

  async buildProd(
    mode: BuildMode = BuildMode.ALL,
    includesArg?: string | string[],
    externalsArg?: string | string[]
  ) {
    return this.buildByEnv(false, mode, includesArg, externalsArg);
  }

  async buildDocs() {
    await runCommand(`npm install better-docs taffydb`).promise;
    await runCommand(`npx markdown-include ./workdocs/readme-md.json`).promise;
    await runCommand(
      `npx jsdoc -c ./workdocs/jsdocs.json -t ./node_modules/better-docs`
    ).promise;
    await runCommand(`npm remove better-docs taffydb`).promise;
    [
      {
        src: "workdocs/assets",
        dest: "./docs/workdocs/assets",
      },
      {
        src: "workdocs/reports/coverage",
        dest: "./docs/workdocs/reports/coverage",
      },
      {
        src: "workdocs/reports/html",
        dest: "./docs/workdocs/reports/html",
      },
      {
        src: "workdocs/resources",
        dest: "./docs/workdocs/resources",
      },
      {
        src: "LICENSE.md",
        dest: "./docs/LICENSE.md",
      },
    ].forEach((f) => {
      const { src, dest } = f;
      copyFile(src, dest);
    });
  }

  protected async run<R>(
    answers: LoggingConfig &
      typeof DefaultCommandValues & { [k in keyof typeof options]: unknown }
  ): Promise<string | void | R> {
    const { dev, prod, docs, buildMode, includes, externals } = answers as any;
    if (dev) {
      return await this.buildDev(buildMode as BuildMode, includes, externals);
    }
    if (prod) {
      return await this.buildProd(buildMode as BuildMode, includes, externals);
    }
    if (docs) {
      return await this.buildDocs();
    }
  }
}
