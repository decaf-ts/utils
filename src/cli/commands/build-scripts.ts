import { Command } from "../command";
import { CommandOptions } from "../types";
import { DefaultCommandOptions, DefaultCommandValues } from "../constants";
import {
  copyFile,
  deletePath,
  getAllFiles,
  getPackage,
  patchFile,
  runCommand,
  getFileSizeZipped,
  listNodeModulesPackages,
} from "../../utils";
import fs from "fs";
import path from "path";
import type { InputOptions, OutputOptions, RollupBuild } from "rollup";
import typescript from "@rollup/plugin-typescript";
import commonjs from "@rollup/plugin-commonjs";
import { nodeResolve } from "@rollup/plugin-node-resolve";
import json from "@rollup/plugin-json";
import { builtinModules } from "module";
import { LoggingConfig, LogLevel } from "@decaf-ts/logging";

// declare optional terser module to satisfy TypeScript when types aren't installed
declare module "@rollup/plugin-terser";

import * as ts from "typescript";
import {
  Diagnostic,
  EmitResult,
  ModuleKind,
  ModuleResolutionKind,
  SourceFile,
} from "typescript";

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

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function buildExportsTypePathMappings(
  cwd: string = process.cwd(),
  deps: string[] = getPackageDependencies()
): Record<string, string[]> {
  const mappings: Record<string, string[]> = {};

  for (const dep of deps) {
    const pkgPath = path.join(cwd, "node_modules", dep, "package.json");
    if (!fs.existsSync(pkgPath)) continue;

    let pkg: any;
    try {
      pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"));
    } catch {
      continue;
    }

    const exportsField = pkg?.exports;
    if (!exportsField || typeof exportsField !== "object") continue;

    for (const [subpath, target] of Object.entries(exportsField)) {
      if (!target || typeof target !== "object") continue;
      const typesPath = (target as any).types;
      if (typeof typesPath !== "string" || !typesPath.length) continue;

      const normalizedSubpath = String(subpath).replace(/^\.\//, "");
      const normalizedSpecifier =
        subpath === "." ? dep : `${dep}/${normalizedSubpath}`;
      const normalizedTypesPath = `./node_modules/${dep}/${typesPath.replace(/^\.\//, "")}`;
      mappings[normalizedSpecifier] = [normalizedTypesPath];

      // Mirror wildcard export mappings so TypeScript can resolve deep import types.
      if (
        normalizedSubpath.endsWith("/*") &&
        normalizedTypesPath.endsWith("/*")
      ) {
        const specifierNoWildcard = normalizedSpecifier.slice(0, -2);
        const typesNoWildcard = normalizedTypesPath.slice(0, -2);
        if (specifierNoWildcard && typesNoWildcard) {
          mappings[specifierNoWildcard] = [typesNoWildcard];
        }
      }
    }
  }

  return mappings;
}

const VERSION_STRING = "##VERSION##";
const PACKAGE_STRING = "##PACKAGE##";
const PACKAGE_SIZE_STRING = "##PACKAGE_SIZE##";

enum Modes {
  CJS = "commonjs",
  ESM = "es2022",
}

enum BuildMode {
  BUILD = "build",
  BUNDLE = "bundle",
  ALL = "all",
}

enum TsBuildTarget {
  ESM = "esm",
  CJS_CHECK = "cjs-check",
  TYPES = "types",
  NODE_NEXT_VALIDATE = "nodenext-validate",
  BUNDLE = "bundle",
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
  entry: {
    type: "string",
    default: "./src/index.ts",
  },
  banner: {
    type: "boolean",
    default: false,
  },
  validateNodeNext: {
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
        } else if (ts.isCallExpression(node)) {
          const moduleSpecifier = getCallExpressionModuleSpecifier(node);
          if (
            moduleSpecifier &&
            isRelativePathWithoutExtension(moduleSpecifier.text)
          ) {
            const resolvedPath = resolvePath(moduleSpecifier.text);
            const newModuleSpecifier =
              transformationContext.factory.createStringLiteral(resolvedPath);
            const updatedArguments = node.arguments.map((arg, index) =>
              index === 0 ? newModuleSpecifier : arg
            );
            return transformationContext.factory.updateCallExpression(
              node,
              node.expression,
              node.typeArguments,
              transformationContext.factory.createNodeArray(updatedArguments)
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
        return isRelativePathWithoutExtension(node.moduleSpecifier.text);
      }

      function isRelativePathWithoutExtension(rawPath: string) {
        if (!rawPath.startsWith("./") && !rawPath.startsWith("../"))
          return false;
        return path.extname(rawPath) === "";
      }

      function getCallExpressionModuleSpecifier(
        node: ts.CallExpression
      ): ts.StringLiteral | undefined {
        if (
          isDynamicImportCall(node) &&
          node.arguments.length > 0 &&
          ts.isStringLiteral(node.arguments[0])
        ) {
          return node.arguments[0];
        }
        if (
          ts.isIdentifier(node.expression) &&
          node.expression.text === "require" &&
          node.arguments.length > 0 &&
          ts.isStringLiteral(node.arguments[0])
        ) {
          return node.arguments[0];
        }
        return undefined;
      }

      function isDynamicImportCall(node: ts.CallExpression) {
        return node.expression.kind === ts.SyntaxKind.ImportKeyword;
      }

      return ts.visitNode(sourceFile, visitNode) as SourceFile;
    };
  };
};

/**
 * @description A command-line script for building and bundling TypeScript projects.
 * @summary This class provides a comprehensive build script that handles TypeScript compilation,
 * bundling with Rollup, and documentation generation. It supports different build modes
 * (development, production), module formats (CJS, ESM), and can be extended with custom
 * configurations.
 * @class BuildScripts
 */
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

  /**
   * @description Patches files with version and package name.
   * @summary This method reads all files in a directory, finds placeholders for version
   * and package name, and replaces them with the actual values from package.json.
   * @param {string} p - The path to the directory containing the files to patch.
   */
  patchFiles(p: string) {
    const log = this.log.for(this.patchFiles);
    const { name, version } = getPackage() as any;
    log.info(`Patching ${name} ${version} module in ${p}...`);
    const stat = fs.statSync(p);
    const patchVersionAndPackage = (content: string) => {
      let patched = content;
      // Patch public VERSION assignments without mutating internal VERSION_STRING constants.
      patched = patched.replace(
        /((?:^|[\s;,(])(?:const|let|var)\s+VERSION\s*=\s*["'])##VERSION##(["'])/gm,
        `$1${version}$2`
      );
      patched = patched.replace(
        /((?:^|[\s;,(])(?:exports|module\.exports)\.VERSION\s*=\s*["'])##VERSION##(["'])/gm,
        `$1${version}$2`
      );
      patched = patched.replace(
        /((?:^|[\s;,(])\w+\.VERSION\s*=\s*["'])##VERSION##(["'])/gm,
        `$1${version}$2`
      );
      patched = patched.replace(
        /((?:^|[\s;,(])(?:const|let|var)\s+PACKAGE_NAME\s*=\s*["'])##PACKAGE##(["'])/gm,
        `$1${name}$2`
      );
      patched = patched.replace(
        /((?:^|[\s;,(])(?:exports|module\.exports)\.PACKAGE_NAME\s*=\s*["'])##PACKAGE##(["'])/gm,
        `$1${name}$2`
      );
      patched = patched.replace(
        /((?:^|[\s;,(])\w+\.PACKAGE_NAME\s*=\s*["'])##PACKAGE##(["'])/gm,
        `$1${name}$2`
      );
      return patched;
    };
    if (stat.isDirectory())
      fs.readdirSync(p, { withFileTypes: true, recursive: true })
        .filter((p) => p.isFile())
        .forEach((file) => {
          const filePath = path.join(file.parentPath, file.name);
          const content = fs.readFileSync(filePath, "utf8");
          const patched = patchVersionAndPackage(content);
          if (patched !== content) fs.writeFileSync(filePath, patched, "utf8");
          patchFile(
            filePath,
            Object.entries(this.replacements).reduce(
              (acc: Record<string, any>, [key, val]) => {
                if ([VERSION_STRING, PACKAGE_STRING].includes(key)) return acc;
                acc[key] = val;
                return acc;
              },
              {}
            )
          );
        });
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

      if (warnings.length) this.reportDiagnostics(warnings, LogLevel.warn);
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

    this.applyTsConfigProfile(
      tsConfig.options,
      bundle
        ? TsBuildTarget.BUNDLE
        : mode === Modes.ESM
          ? TsBuildTarget.ESM
          : TsBuildTarget.CJS_CHECK,
      isDev
    );

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

    this.applyTsConfigProfile(
      tsConfig.options,
      bundle
        ? TsBuildTarget.BUNDLE
        : mode === Modes.ESM
          ? TsBuildTarget.ESM
          : TsBuildTarget.CJS_CHECK,
      isDev
    );

    // For production builds we still keep TypeScript comments (removeComments=false in tsconfig)
    // Bundler/terser will strip comments for production bundles as requested.

    const program = ts.createProgram(tsConfig.fileNames, tsConfig.options);

    const transformations: { before?: any[] } = {};
    if (mode === Modes.ESM) {
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
    if (mode === Modes.CJS && !bundle) await this.buildCjsFromEsm(isDev);
  }

  private rewriteRelativeJsSpecifiersToCjs(content: string) {
    const replaceSpecifier = (specifier: string) => {
      if (
        !specifier.startsWith("./") &&
        !specifier.startsWith("../") &&
        !specifier.startsWith("/")
      )
        return specifier;
      if (specifier.endsWith(".cjs")) return specifier;
      if (specifier.endsWith(".js")) return specifier.replace(/\.js$/, ".cjs");
      return specifier;
    };

    const quotedSpecifierRegex = /(["'])(\.{1,2}\/[^"']+?)(\1)/g;
    return content.replace(
      quotedSpecifierRegex,
      (_full, quote: string, specifier: string, endQuote: string) =>
        `${quote}${replaceSpecifier(specifier)}${endQuote}`
    );
  }

  private async buildCjsFromEsm(isDev: boolean) {
    const log = this.log.for(this.buildCjsFromEsm);
    log.info(
      `Building ${this.pkgName} ${this.pkgVersion} module (${Modes.CJS}) from ESM output in ${isDev ? "dev" : "prod"} mode...`
    );

    const esmRoot = path.resolve("lib/esm");
    const cjsRoot = path.resolve("lib/cjs");
    fs.mkdirSync(cjsRoot, { recursive: true });

    const esmJsFiles = getAllFiles(
      esmRoot,
      (file) => file.endsWith(".js") && !file.endsWith(".d.js")
    );

    for (const file of esmJsFiles) {
      const relative = path.relative(esmRoot, file);
      const outFile = path.join(cjsRoot, relative).replace(/\.js$/gm, ".cjs");
      fs.mkdirSync(path.dirname(outFile), { recursive: true });

      const source = fs.readFileSync(file, "utf8");
      const transpiled = ts.transpileModule(source, {
        compilerOptions: {
          module: ModuleKind.CommonJS,
          target: ts.ScriptTarget.ES2022,
          sourceMap: !isDev,
          inlineSourceMap: isDev,
          inlineSources: isDev,
          esModuleInterop: true,
        },
        fileName: path.basename(file),
        reportDiagnostics: true,
      });

      if (transpiled.diagnostics?.length) {
        this.evalDiagnostics(transpiled.diagnostics as Diagnostic[]);
      }

      const rewritten = this.rewriteRelativeJsSpecifiersToCjs(
        transpiled.outputText
      );
      fs.writeFileSync(outFile, rewritten, "utf8");

      if (transpiled.sourceMapText) {
        fs.writeFileSync(`${outFile}.map`, transpiled.sourceMapText, "utf8");
      }
    }
  }

  private applyTsConfigProfile(
    options: ts.CompilerOptions,
    target: TsBuildTarget,
    isDev: boolean
  ) {
    options.declaration = false;
    options.emitDeclarationOnly = false;
    options.noEmit = false;
    options.outFile = undefined;
    options.moduleResolution = ModuleResolutionKind.Bundler;

    switch (target) {
      case TsBuildTarget.ESM:
        options.module = ModuleKind.ESNext;
        options.outDir = "lib/esm";
        break;
      case TsBuildTarget.CJS_CHECK:
        options.module = (ModuleKind as any).Preserve ?? ModuleKind.ESNext;
        options.moduleResolution = ModuleResolutionKind.Bundler;
        options.noEmit = true;
        options.outDir = undefined;
        break;
      case TsBuildTarget.TYPES:
        options.module = ModuleKind.ESNext;
        options.outDir = "lib/types";
        options.declaration = true;
        options.emitDeclarationOnly = true;
        break;
      case TsBuildTarget.NODE_NEXT_VALIDATE:
        options.module = ModuleKind.NodeNext;
        options.moduleResolution = ModuleResolutionKind.NodeNext;
        options.noEmit = true;
        break;
      case TsBuildTarget.BUNDLE:
        options.module = ModuleKind.ESNext;
        options.moduleResolution = ModuleResolutionKind.Bundler;
        options.outDir = "dist";
        options.isolatedModules = false;
        options.outFile = undefined;
        break;
    }

    if (target === TsBuildTarget.NODE_NEXT_VALIDATE) {
      options.inlineSourceMap = false;
      options.inlineSources = false;
      options.sourceMap = false;
      return;
    }

    if (isDev) {
      options.inlineSourceMap = true;
      options.inlineSources = true;
      options.sourceMap = false;
    } else {
      options.inlineSourceMap = false;
      options.inlineSources = false;
      options.sourceMap = true;
    }
  }

  private async checkNodeNextCompatibility() {
    const log = this.log.for(this.checkNodeNextCompatibility);
    let tsConfig;
    try {
      tsConfig = this.readConfigFile("./tsconfig.json");
    } catch (e: unknown) {
      throw new Error(`Failed to parse tsconfig.json: ${e}`);
    }

    this.applyTsConfigProfile(
      tsConfig.options,
      TsBuildTarget.NODE_NEXT_VALIDATE,
      false
    );

    const program = ts.createProgram(tsConfig.fileNames, tsConfig.options);
    this.preCheckDiagnostics(program);
    log.verbose("TypeScript NodeNext compatibility check passed.");
  }

  private async buildTypes(isDev: boolean) {
    const log = this.log.for(this.buildTypes);
    log.info(
      `Building ${this.pkgName} ${this.pkgVersion} declaration files...`
    );
    let tsConfig;
    try {
      tsConfig = this.readConfigFile("./tsconfig.json");
    } catch (e: unknown) {
      throw new Error(`Failed to parse tsconfig.json: ${e}`);
    }

    this.applyTsConfigProfile(tsConfig.options, TsBuildTarget.TYPES, isDev);

    const program = ts.createProgram(tsConfig.fileNames, tsConfig.options);
    const emitResult = program.emit();
    const allDiagnostics = ts
      .getPreEmitDiagnostics(program)
      .concat(emitResult.diagnostics);
    this.evalDiagnostics(allDiagnostics);
    this.emitDualDeclarationFiles();
    this.removeLegacyDeclarationFiles();
    this.updatePackageJsonDualTypeExports();
  }

  private rewriteRelativeDeclarationSpecifiers(
    content: string,
    declarationExtension: ".d.mts" | ".d.cts",
    sourceFilePath: string
  ) {
    const sourceDir = path.dirname(sourceFilePath);
    const withDeclarationSpecifier = (specifier: string) => {
      if (
        !specifier.startsWith("./") &&
        !specifier.startsWith("../") &&
        !specifier.startsWith("/")
      )
        return specifier;
      if (/\.(d\.(mts|cts)|mts|cts|ts|json)$/i.test(specifier))
        return specifier;
      const resolved = path.resolve(sourceDir, specifier);
      try {
        if (fs.existsSync(resolved) && fs.statSync(resolved).isDirectory()) {
          return `${specifier}/index${declarationExtension}`;
        }
      } catch {
        // ignore and fallback to file specifier
      }
      return `${specifier}${declarationExtension}`;
    };

    let updated = content.replace(
      /(\b(?:import|export)\b[\s\S]*?\bfrom\s*["'])([^"']+)(["'])/gm,
      (_full, prefix: string, specifier: string, suffix: string) =>
        `${prefix}${withDeclarationSpecifier(specifier)}${suffix}`
    );
    updated = updated.replace(
      /(\bimport\s*\(\s*["'])([^"']+)(["']\s*\))/gm,
      (_full, prefix: string, specifier: string, suffix: string) =>
        `${prefix}${withDeclarationSpecifier(specifier)}${suffix}`
    );
    updated = updated.replace(
      /(\brequire\s*\(\s*["'])([^"']+)(["']\s*\))/gm,
      (_full, prefix: string, specifier: string, suffix: string) =>
        `${prefix}${withDeclarationSpecifier(specifier)}${suffix}`
    );
    return updated;
  }

  private emitDualDeclarationFiles() {
    const log = this.log.for(this.emitDualDeclarationFiles);
    const typesRoot = path.resolve("lib/types");
    if (!fs.existsSync(typesRoot)) return;

    const typeFiles = getAllFiles(typesRoot, (file) => file.endsWith(".d.ts"));
    for (const dtsFile of typeFiles) {
      const content = fs.readFileSync(dtsFile, "utf8");
      const dMts = dtsFile.replace(/\.d\.ts$/i, ".d.mts");
      const dCts = dtsFile.replace(/\.d\.ts$/i, ".d.cts");
      fs.writeFileSync(
        dMts,
        this.rewriteRelativeDeclarationSpecifiers(content, ".d.mts", dtsFile),
        "utf8"
      );
      fs.writeFileSync(
        dCts,
        this.rewriteRelativeDeclarationSpecifiers(content, ".d.cts", dtsFile),
        "utf8"
      );
    }

    log.verbose(`Generated ${typeFiles.length * 2} dual declaration files.`);
  }

  private removeLegacyDeclarationFiles() {
    const log = this.log.for(this.removeLegacyDeclarationFiles);
    const typesRoot = path.resolve("lib/types");
    if (!fs.existsSync(typesRoot)) return;

    const legacyFiles = getAllFiles(
      typesRoot,
      (file) => file.endsWith(".d.ts") || file.endsWith(".d.ts.map")
    );
    for (const legacyFile of legacyFiles) {
      try {
        fs.unlinkSync(legacyFile);
      } catch {
        // ignore stale or already-removed files
      }
    }

    log.verbose(`Removed ${legacyFiles.length} legacy declaration files.`);
  }

  private updatePackageJsonDualTypeExports() {
    const log = this.log.for(this.updatePackageJsonDualTypeExports);
    const packageJsonPath = path.resolve("package.json");
    if (!fs.existsSync(packageJsonPath)) return;

    const pkg = JSON.parse(fs.readFileSync(packageJsonPath, "utf8"));
    const exportsField = pkg?.exports;
    if (!exportsField || typeof exportsField !== "object") return;

    const toDualTypePath = (typesPath: string, ext: ".d.mts" | ".d.cts") =>
      typesPath.replace(/\.d\.(ts|mts|cts)$/i, ext);
    const esmToCjsRuntimePath = (runtimePath?: string) => {
      if (!runtimePath) return undefined;
      if (runtimePath.includes("/lib/esm/")) {
        return runtimePath
          .replace("/lib/esm/", "/lib/cjs/")
          .replace(/\.js$/i, ".cjs");
      }
      return runtimePath;
    };
    const esmToTypesPath = (runtimePath?: string, ext: ".d.mts" | ".d.cts" = ".d.mts") => {
      if (!runtimePath) return undefined;
      if (runtimePath.includes("/lib/esm/")) {
        return runtimePath
          .replace("/lib/esm/", "/lib/types/")
          .replace(/\.js$/i, ext);
      }
      return undefined;
    };
    const getDefaultEntry = (value: unknown) => {
      if (typeof value === "string") return value;
      if (
        value &&
        typeof value === "object" &&
        typeof (value as Record<string, unknown>).default === "string"
      ) {
        return (value as Record<string, string>).default;
      }
      return undefined;
    };
    const getTypesEntry = (value: unknown) => {
      if (
        value &&
        typeof value === "object" &&
        typeof (value as Record<string, unknown>).types === "string"
      ) {
        return (value as Record<string, string>).types;
      }
      return undefined;
    };

    const updatedExports: Record<string, any> = {};
    for (const [subpath, target] of Object.entries(exportsField)) {
      if (!target || typeof target !== "object" || Array.isArray(target)) {
        updatedExports[subpath] = target;
        continue;
      }

      const targetObj = target as Record<string, any>;
      const importEntry = getDefaultEntry(targetObj.import);
      const requireEntryRaw = getDefaultEntry(targetObj.require);
      const requireEntry =
        requireEntryRaw && requireEntryRaw.includes("/lib/esm/")
          ? esmToCjsRuntimePath(requireEntryRaw)
          : requireEntryRaw || esmToCjsRuntimePath(importEntry);
      const defaultEntry = getDefaultEntry(targetObj.default);
      const rootTypes =
        (typeof targetObj.types === "string" ? targetObj.types : undefined) ||
        getTypesEntry(targetObj.import);
      const esmTypes =
        rootTypes && /\.d\.(ts|mts|cts)$/i.test(rootTypes)
          ? toDualTypePath(rootTypes, ".d.mts")
          : getTypesEntry(targetObj.import) || esmToTypesPath(importEntry, ".d.mts");
      const cjsTypes =
        rootTypes && /\.d\.(ts|mts|cts)$/i.test(rootTypes)
          ? toDualTypePath(rootTypes, ".d.cts")
          : getTypesEntry(targetObj.require) || esmToTypesPath(importEntry, ".d.cts");

      updatedExports[subpath] = {
        ...(importEntry
          ? {
              import: {
                ...(esmTypes ? { types: esmTypes } : {}),
                default: importEntry,
              },
            }
          : {}),
        ...(requireEntry
          ? {
              require: {
                ...(cjsTypes ? { types: cjsTypes } : {}),
                default: requireEntry,
              },
            }
          : {}),
        ...(defaultEntry || importEntry
          ? { default: defaultEntry || importEntry }
          : {}),
      };
    }

    pkg.exports = updatedExports;
    if (typeof pkg.types === "string" && /\.d\.(ts|mts|cts)$/i.test(pkg.types)) {
      pkg.types = pkg.types.replace(/\.d\.(ts|mts|cts)$/i, ".d.mts");
    }

    fs.writeFileSync(packageJsonPath, JSON.stringify(pkg, null, 2) + "\n", "utf8");
    log.verbose("Updated package.json exports with import/require type conditions.");
  }

  /**
   * @description Copies assets to the build output directory.
   * @summary This method checks for the existence of an 'assets' directory in the source
   * and copies it to the appropriate build output directory (lib or dist).
   * @param {Modes} mode - The build mode (CJS or ESM).
   */
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

  /**
   * @description Bundles the project using Rollup.
   * @summary This method configures and runs Rollup to bundle the project. It handles
   * different module formats, development and production builds, and external dependencies.
   * @param {Modes} mode - The module format (CJS or ESM).
   * @param {boolean} isDev - Whether it's a development build.
   * @param {boolean} isLib - Whether it's a library build.
   * @param {string} [entryFile="src/index.ts"] - The entry file for the bundle.
   * @param {string} [nameOverride=this.pkgName] - The name of the output bundle.
   * @param {string|string[]} [externalsArg] - A list of external dependencies.
   * @param {string|string[]} [includeArg] - A list of dependencies to include.
   * @returns {Promise<void>}
   */
  async bundle(
    mode: Modes,
    isDev: boolean,
    isLib: boolean,
    entryFile: string = "./src/index.ts",
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
    const log = this.log;

    // normalize include and externals
    const include = Array.from(
      new Set([...(parseList(includeArg) as string[])])
    );
    let externalsList = parseList(externalsArg);
    if (externalsList.length === 0) {
      // if no externals specified, list top-level packages in node_modules (expand scopes)
      try {
        externalsList = listNodeModulesPackages(
          path.join(process.cwd(), "node_modules")
        );
      } catch {
        // fallback to package.json dependencies if listing fails or yields nothing
      }
      if (!externalsList || externalsList.length === 0) {
        externalsList = getPackageDependencies();
      }
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
          // For dev bundles emit inline source maps (no separate .map files).
          // For prod bundles emit external maps so Rollup can write them to disk.
          sourceMap: isDev ? false : true,
          inlineSourceMap: isDev ? true : false,
          inlineSources: isDev ? true : false,
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

    const outputDir = isLib ? "bin" : "dist";
    const entryFileName = `${nameOverride ? nameOverride : `.bundle.${!isDev ? "min" : ""}`}${isEsm ? ".js" : ".cjs"}`;
    const outputs: OutputOptions[] = [
      {
        dir: outputDir,
        entryFileNames: entryFileName,
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
      const { rollup } = (await import("rollup")) as typeof import("rollup");
      const bundle = await rollup(input as any);
      // only log watchFiles at verbose level to avoid noisy console output
      log.verbose(bundle.watchFiles);
      async function generateOutputs(bundle: RollupBuild) {
        for (const outputOptions of outputs) {
          await bundle.write(outputOptions);
        }
      }

      try {
        await generateOutputs(bundle);
      } finally {
        await bundle.close();
      }
    } catch (e: unknown) {
      throw new Error(`Failed to bundle: ${e}`);
    }
  }

  private async buildByEnv(
    entryFile: string = "./src/index.ts",
    isDev: boolean,
    mode: BuildMode = BuildMode.ALL,
    validateNodeNext = false,
    includesArg?: string | string[],
    externalsArg?: string | string[]
  ) {
    if (validateNodeNext) await this.checkNodeNextCompatibility();
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

    if ([BuildMode.ALL, BuildMode.BUILD].includes(mode)) {
      fs.mkdirSync("lib", { recursive: true });
      await this.build(isDev, Modes.ESM);
      await this.build(isDev, Modes.CJS);
      await this.buildTypes(isDev);
      this.patchFiles("lib");
    }

    if ([BuildMode.ALL, BuildMode.BUNDLE].includes(mode)) {
      fs.mkdirSync("dist");
      await this.bundle(
        Modes.ESM,
        isDev,
        false,
        entryFile || "./src/index.ts",
        this.pkgName,
        externalsArg,
        includesArg
      );
      await this.bundle(
        Modes.CJS,
        isDev,
        false,
        entryFile || "./src/index.ts",
        this.pkgName,
        externalsArg,
        includesArg
      );
      this.patchFiles("dist");
    }

    this.copyAssets(Modes.CJS);
    this.copyAssets(Modes.ESM);
  }

  /**
   * @description Builds the project for development.
   * @summary This method runs the build process with development-specific configurations.
   * @param {BuildMode} [mode=BuildMode.ALL] - The build mode (build, bundle, or all).
   * @param {string|string[]} [includesArg] - A list of dependencies to include.
   * @param {string|string[]} [externalsArg] - A list of external dependencies.
   * @returns {Promise<void>}
   */
  async buildDev(
    entryFile: string = "./src/index.ts",
    mode: BuildMode = BuildMode.ALL,
    validateNodeNext = false,
    includesArg?: string | string[],
    externalsArg?: string | string[]
  ) {
    return this.buildByEnv(
      entryFile,
      true,
      mode,
      validateNodeNext,
      includesArg,
      externalsArg
    );
  }

  /**
   * @description Builds the project for production.
   * @summary This method runs the build process with production-specific configurations,
   * including minification and other optimizations.
   * @param {BuildMode} [mode=BuildMode.ALL] - The build mode (build, bundle, or all).
   * @param {string|string[]} [includesArg] - A list of dependencies to include.
   * @param {string|string[]} [externalsArg] - A list of external dependencies.
   * @returns {Promise<void>}
   */
  async buildProd(
    entryFile: string = "./src/index.ts",
    mode: BuildMode = BuildMode.ALL,
    validateNodeNext = false,
    includesArg?: string | string[],
    externalsArg?: string | string[]
  ) {
    return this.buildByEnv(
      entryFile,
      false,
      mode,
      validateNodeNext,
      includesArg,
      externalsArg
    );
  }

  /**
   * @description Generates the project documentation.
   * @summary This method uses JSDoc and other tools to generate HTML documentation for the project.
   * It also patches the README.md file with version and package size information.
   * @returns {Promise<void>}
   */
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

    // patch ./README.md file to replace version/package/package size strings
    try {
      const sizeKb = await getFileSizeZipped(
        path.resolve(path.join(process.cwd(), "dist"))
      );
      this.replacements[PACKAGE_SIZE_STRING] = `${sizeKb} KB`;
    } catch {
      // if we couldn't compute size, leave placeholder or set to unknown
      this.replacements[PACKAGE_SIZE_STRING] = "unknown";
    }

    // Patch README.md in project root
    try {
      patchFile("./README.md", this.replacements);
    } catch (e: unknown) {
      const log = this.log.for(this.buildDocs as any);
      log.verbose(`Failed to patch README.md: ${e}`);
    }
  }

  protected async run<R>(
    answers: LoggingConfig &
      typeof DefaultCommandValues & { [k in keyof typeof options]: unknown }
  ): Promise<string | void | R> {
    const {
      dev,
      prod,
      docs,
      buildMode,
      includes,
      externals,
      entry,
      validateNodeNext,
    } = answers as any;
    if (dev) {
      return await this.buildDev(
        entry || "./src/index.ts",
        buildMode as BuildMode,
        !!validateNodeNext,
        includes,
        externals
      );
    }
    if (prod) {
      return await this.buildProd(
        entry || "./src/index.ts",
        buildMode as BuildMode,
        !!validateNodeNext,
        includes,
        externals
      );
    }
    if (docs) {
      return await this.buildDocs();
    }
  }
}
