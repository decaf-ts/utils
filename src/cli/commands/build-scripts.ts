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
import { rollup, InputOptions, OutputOptions, RollupBuild } from "rollup";
import typescript from "@rollup/plugin-typescript";
import commonjs from "@rollup/plugin-commonjs";
import { nodeResolve } from "@rollup/plugin-node-resolve";
import json from "@rollup/plugin-json";
import { LoggingConfig } from "@decaf-ts/logging";

const VERSION_STRING = "##VERSION##";

enum Modes {
  CJS = "commonjs",
  ESM = "es2022",
}

const Commands = ["update-scripts", "tag-release", "build-scripts"];

const options = {
  prod: {
    type: "boolean",
    default: false,
  },
  dev: {
    type: "boolean",
    default: false,
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
  }

  patchCjsImports(file: string) {
    const regexp = /(require\(["'])(\..*?)(["']\)[;,])/g;
    let data = readFile(file);
    data = data.replace(regexp, (match, ...groups: string[]) => {
      const renamedFile = groups[1] + ".cjs";
      const dirname = path.dirname(file).replace("lib", "src");
      const fileName = groups[1] + ".ts";
      const sourceFilePath = path.join(dirname, fileName);

      let result;
      if (!fs.existsSync(sourceFilePath)) {
        result = groups[0] + groups[1] + "/index.cjs" + groups[2];
      } else {
        result = groups[0] + renamedFile + groups[2];
      }

      return result;
    });
    writeFile(file, data);
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

  private async build(isDev: boolean, mode: Modes, bundle = false) {
    const log = this.log.for(this.build);
    log.info(
      `Building ${this.pkgName} ${this.pkgVersion} module (${mode}) in ${isDev ? "dev" : "prod"} mode...`
    );

    await runCommand(
      `npx tsc --module ${bundle ? "amd" : mode}${isDev ? " --inlineSourceMap" : " --sourceMap false"} --outDir ${bundle ? "dist" : `lib${mode === Modes.ESM ? "/esm" : ""}`}${bundle ? ` --isolatedModules false --outFile ${this.pkgName}` : ""}`
    ).promise;
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
        this.patchCjsImports(f);
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
    for (const cmd of Commands) {
      await this.bundle(Modes.CJS, true, true, `src/bin/${cmd}.ts`, cmd);
      let data = readFile(`bin/${cmd}.cjs`);
      data = "#!/usr/bin/env node\n" + data;
      writeFile(`bin/${cmd}.cjs`, data);
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

  private async buildByEnv(isDev: boolean) {
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
    await this.build(isDev, Modes.CJS);
    await this.build(isDev, Modes.ESM);
    await this.bundle(Modes.CJS, true, false);
    await this.bundle(Modes.ESM, true, false);
    this.patchFiles("lib");
    this.patchFiles("dist");
    this.copyAssets(Modes.CJS);
    this.copyAssets(Modes.ESM);
  }

  async buildDev() {
    return this.buildByEnv(true);
  }

  async buildProd() {
    return this.buildByEnv(false);
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
    const { dev, prod, docs, commands } = answers;

    if (commands) {
      await this.buildCommands();
    }

    if (dev) {
      return await this.buildDev();
    }
    if (prod) {
      return await this.buildProd();
    }
    if (docs) {
      return await this.buildDocs();
    }
  }
}
