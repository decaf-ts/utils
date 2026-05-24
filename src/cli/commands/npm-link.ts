import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";
import { LoggingConfig } from "@decaf-ts/logging";
import { Command } from "../command";
import { DefaultCommandValues } from "../constants";
import { readGitModulesDeep } from "./modules";
import { printCommandHelp } from "./help";

const options = {
  maxTraversal: {
    type: "string",
    default: "2",
  },
  excludes: {
    type: "string",
    multiple: true,
    default: ["@decaf-ts/utils", "@decaf-ts/logging"],
  },
  include: {
    type: "string",
    multiple: true,
    default: [],
  },
  operation: {
    type: "string",
    default: "link",
  },
};

function getScope(packageName: string): string {
  return packageName.split("/")[0] || "";
}

function getPackageName(packageName: string): string {
  return packageName.split("/")[1] || packageName;
}

function getDependencyList(pkg: Record<string, any>): string[] {
  return [
    ...Object.keys(pkg.dependencies || {}),
    ...Object.keys(pkg.devDependencies || {}),
    ...Object.keys(pkg.peerDependencies || {}),
  ];
}

function normalizeList(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map((item) => `${item}`.trim()).filter(Boolean);
  }
  if (typeof value === "string" && value.length > 0) {
    return value
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  }
  return [];
}

function matchesPattern(value: string, pattern: string): boolean {
  return (
    value === pattern ||
    path.basename(value) === pattern ||
    value.endsWith(`/${pattern}`)
  );
}

export class NpmLinkCommand extends Command<typeof options, void> {
  constructor() {
    super("NpmLinkCommand", options);
  }

  protected override help(): void {
    printCommandHelp(
      this.log,
      "npm-link",
      "Link or unlink decaf-ts package outputs across linked modules.",
      "npm-link [options]",
      [
        {
          flag: "--max-traversal <depth>",
          description: "How many nested .gitmodules levels to traverse",
          defaultValue: "2",
        },
        {
          flag: "--excludes <items...>",
          description: "Dependency names or patterns to ignore",
          defaultValue: "@decaf-ts/utils,@decaf-ts/logging",
        },
        {
          flag: "--include <items...>",
          description: "Module names or paths to target explicitly",
        },
        {
          flag: "--operation <name>",
          description: "Operation to run in each module",
          defaultValue: "link",
        },
        {
          flag: "-h, --help",
          description: "Show this help text and exit",
        },
      ],
      [
        "link creates symlinks for decaf-ts dependencies",
        "unlink removes those links and reinstalls dependencies",
        "any other operation is passed through to npm in each selected module",
      ],
      [
        "npm-link --operation link",
        "npm-link --operation unlink",
        "npm-link --operation install --include packages/app",
      ]
    );
  }

  protected async run(
    answers: LoggingConfig &
      typeof DefaultCommandValues & {
        maxTraversal: unknown;
        excludes: unknown;
        include: unknown;
        operation: unknown;
      }
  ): Promise<void> {
    const maxTraversal = Number.parseInt(`${answers.maxTraversal || "2"}`, 10);
    const include = normalizeList(answers.include);
    const excludes = normalizeList(answers.excludes);
    const defaultExcludes = ["@decaf-ts/utils", "@decaf-ts/logging"];
    const operation = `${answers.operation || "link"}`.trim() || "link";

    const outerPkg = JSON.parse(
      fs.readFileSync(path.join(process.cwd(), "package.json"), "utf8")
    ) as { name: string };
    const scope = getScope(outerPkg.name);
    const modules = readGitModulesDeep(
      process.cwd(),
      Number.isFinite(maxTraversal) ? maxTraversal : 2
    );
    const selectedModules = modules.filter((moduleName) =>
      include.length > 0
        ? include.some((pattern) => matchesPattern(moduleName, pattern))
        : true
    );

    const shouldIgnoreDependency = (dependency: string) =>
      (excludes.length > 0 ? excludes : defaultExcludes).some((pattern) =>
        matchesPattern(dependency, pattern)
      );

    for (const moduleName of selectedModules) {
      const moduleRoot = path.join(process.cwd(), moduleName);
      let pkg: Record<string, any>;
      try {
        pkg = JSON.parse(
          fs.readFileSync(path.join(moduleRoot, "package.json"), "utf8")
        ) as Record<string, any>;
      } catch {
        continue;
      }

      const dependencies = getDependencyList(pkg).filter((dep) =>
        dep.startsWith(scope)
      );

      if (operation === "link") {
        for (const dependency of dependencies) {
          if (shouldIgnoreDependency(dependency)) continue;

          const innerCodePath = dependency.endsWith("styles") ? "dist" : "lib";
          const packageName = getPackageName(dependency);

          try {
            const packageRoot = path.join(
              moduleRoot,
              "node_modules",
              scope,
              packageName
            );
            const dependencyTarget = path.join(
              moduleRoot,
              "node_modules",
              dependency
            );
            const sourcePath = path.join(process.cwd(), packageName, innerCodePath);
            const linkPath = path.join(packageRoot, innerCodePath);

            if (!fs.existsSync(sourcePath)) {
              console.log(
                `Skipping ${dependency} as it does not exist in the master repository`
              );
              continue;
            }

            console.log(`linking ${dependency} as a dependency of ${moduleName}`);
            fs.rmSync(dependencyTarget, { force: true, recursive: true });
            fs.mkdirSync(packageRoot, { recursive: true });
            fs.rmSync(linkPath, { force: true, recursive: true });
            fs.symlinkSync(path.relative(packageRoot, sourcePath), linkPath, "dir");
          } catch (error) {
            console.log(
              `Failed to link ${dependency} as a dependency of ${moduleName}: ${error}`
            );
            process.exit(1);
          }
        }
        continue;
      }

      if (operation === "unlink") {
        for (const dependency of dependencies) {
          if (shouldIgnoreDependency(dependency)) continue;

          console.log(`unlinking ${dependency} as a dependency of ${moduleName}`);
          try {
            fs.rmSync(path.join(moduleRoot, "node_modules", dependency), {
              force: true,
              recursive: true,
            });
          } catch {
            process.exit(1);
          }
        }

        try {
          execSync("npm run do-install", {
            cwd: moduleRoot,
            env: process.env,
            stdio: "inherit",
          });
        } catch {
          process.exit(1);
        }
        continue;
      }

      console.log(`${operation}ing ${moduleName}`);
      try {
        execSync(`npm ${operation}`, {
          cwd: moduleRoot,
          env: process.env,
          stdio: "inherit",
        });
      } catch {
        process.exit(1);
      }
    }
  }
}
