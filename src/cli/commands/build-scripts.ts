import { Command } from "../command";
import { CommandOptions } from "../types";
import { DefaultCommandOptions, DefaultCommandValues } from "../constants";
import {
  copyFile,
  deletePath,
  getAllFiles,
  getPackage,
  patchFile,
  readFile,
  renameFile,
  runCommand,
  writeFile,
} from "../../utils";
import fs from "fs";
import path from "path";
import { InputOptions, OutputOptions, rollup, RollupBuild } from "rollup";
import typescript from "@rollup/plugin-typescript";
import commonjs from "@rollup/plugin-commonjs";
import { nodeResolve } from "@rollup/plugin-node-resolve";
import json from "@rollup/plugin-json";
import { LoggingConfig } from "@decaf-ts/logging";
import * as ts from "typescript";
import { Diagnostic, EmitResult, ModuleKind, SourceFile } from "typescript";

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

enum SEPARATORS {
  DOT = "."
}

const binSourceLocation = "/src/bin"

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

  private reportDiagnostics(diagnostics: Diagnostic[]): void {
    diagnostics.forEach((diagnostic) => {
      let message = "Error";
      if (diagnostic.file && diagnostic.start) {
        const { line, character } =
          diagnostic.file.getLineAndCharacterOfPosition(diagnostic.start);
        message += ` ${diagnostic.file.fileName} (${line + 1},${character + 1})`;
      }
      message +=
        ": " + ts.flattenDiagnosticMessageText(diagnostic.messageText, "\n");
      console.log(message);
    });
  }

  private readConfigFile(configFileName: string) {
    // Read config file
    const configFileText = fs.readFileSync(configFileName).toString();

    // Parse JSON, after removing comments. Just fancier JSON.parse
    const result = ts.parseConfigFileTextToJson(configFileName, configFileText);
    const configObject = result.config;
    if (!configObject) {
      this.reportDiagnostics([result.error!]);
      throw new Error("Failed to parse tsconfig.json");
    }

    // Extract config infromation
    const configParseResult = ts.parseJsonConfigFileContent(
      configObject,
      ts.sys,
      path.dirname(configFileName)
    );
    if (configParseResult.errors.length > 0) {
      this.reportDiagnostics(configParseResult.errors);
      throw new Error("Failed to parse tsconfig.json");
    }
    return configParseResult;
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

    if (isDev) {
      tsConfig.options.inlineSourceMap = true;
      tsConfig.options.sourceMap = false;
    } else {
      tsConfig.options.sourceMap = false;
    }

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

    allDiagnostics.forEach((diagnostic) => {
      if (diagnostic.file) {
        const { line, character } =
          diagnostic.file.getLineAndCharacterOfPosition(diagnostic.start!);
        const message = ts.flattenDiagnosticMessageText(
          diagnostic.messageText,
          "\n"
        );
        log.info(
          `${diagnostic.file.fileName} (${line + 1},${character + 1}): ${message}`
        );
      } else {
        log.info(ts.flattenDiagnosticMessageText(diagnostic.messageText, "\n"));
      }
    });
    if (emitResult.emitSkipped) {
      throw new Error("Build failed");
    }
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

  async buildCommands() {
    const commands: string[]  = fs.readdirSync(path.join(process.cwd() + binSourceLocation)).map((cmd) => cmd.split(SEPARATORS.DOT)[0]) 
    for (const cmd of commands) {
      if (!cmd.endsWith(".ts")) continue;

      await this.bundle(Modes.CJS, true, true, `${binSourceLocation}/${cmd}.ts`, cmd);
      let data = readFile(`bin/${cmd}.cjs`);
      data = "#!/usr/bin/env node\n" + data;
      writeFile(`bin/${cmd}.cjs`, data);
      fs.chmodSync(`bin/${cmd}.cjs`, "755");
    }
  }

  async bundle(
    mode: Modes,
    isDev: boolean,
    isLib: boolean,
    entryFile: string = "src/index.ts",
    nameOverride: string = this.pkgName,
    externals?: string[],
    include: string[] = [
      "prompts",
      "styled-string-builder",
      "typed-object-accumulator",
      "@decaf-ts/logging",
    ]
  ) {
    const isEsm = mode === Modes.ESM;
    const pkgName = this.pkgName;

    const ext = Array.from(
      new Set([
        ...[
          "fs",
          "path",
          "process",
          "rollup",
          "@rollup/plugin-typescript",
          "@rollup/plugin-json",
          "@rollup/plugin-commonjs",
          "@rollup/plugin-node-resolve",
          "child_process",
          "tslib",
          "util",
          "https",
        ],
        ...(externals || []),
      ])
    );

    const plugins = [
      typescript({
        compilerOptions: {
          module: "esnext",
          declaration: false,
          outDir: isLib ? "bin" : "dist",
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
          exclude: externals,
        }),
        nodeResolve({
          resolveOnly: include,
        })
      );
    }

    const input: InputOptions = {
      input: entryFile,
      plugins: plugins,
      external: ext,
    };

    const outputs: OutputOptions[] = [
      {
        file: `${isLib ? "bin/" : "dist/"}${nameOverride ? nameOverride : `.bundle.${!isDev ? "min" : ""}`}${isEsm ? ".esm" : ""}.cjs`,
        format: isLib ? "cjs" : isEsm ? "esm" : "umd",
        name: pkgName,
        esModule: isEsm,
        sourcemap: isDev ? "inline" : false,
        globals: {},
        exports: "auto",
      },
    ];

    try {
      const bundle = await rollup(input);
      console.log(bundle.watchFiles);
      async function generateOutputs(bundle: RollupBuild) {
        for (const outputOptions of outputs) {
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          const { output } = await bundle.write(outputOptions);
        }
      }

      await generateOutputs(bundle);
    } catch (e: unknown) {
      throw new Error(`Failed to bundle: ${e}`);
    }
  }

  private async buildByEnv(isDev: boolean, mode: BuildMode = BuildMode.ALL) {
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
      await this.bundle(Modes.ESM, true, false);
      await this.bundle(Modes.CJS, true, false);
      this.patchFiles("dist");
    }

    this.copyAssets(Modes.CJS);
    this.copyAssets(Modes.ESM);
  }

  async buildDev(mode: BuildMode = BuildMode.ALL) {
    return this.buildByEnv(true, mode);
  }

  async buildProd(mode: BuildMode = BuildMode.ALL) {
    return this.buildByEnv(false, mode);
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
    const { dev, prod, docs, commands, buildMode } = answers;

    if (commands) {
      await this.buildCommands();
    }

    if (dev) {
      return await this.buildDev(buildMode as BuildMode);
    }
    if (prod) {
      return await this.buildProd(buildMode as BuildMode);
    }
    if (docs) {
      return await this.buildDocs();
    }
  }
}
