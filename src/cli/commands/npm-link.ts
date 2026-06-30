import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";
import { LoggingConfig } from "@decaf-ts/logging";
import { Command } from "../command";
import { DefaultCommandValues } from "../constants";
import { readGitModulesDeep } from "./modules";
import { printCommandHelp } from "./help";

const DEFAULT_EXCLUDES = ["@decaf-ts/utils", "@decaf-ts/logging"];

const options = {
  maxTraversal: {
    type: "string",
    default: "2",
  },
  excludes: {
    type: "string",
    multiple: true,
  },
  include: {
    type: "string",
    multiple: true,
    default: [],
  },
  packages: {
    type: "string",
    multiple: true,
    default: [],
  },
  mainPackagePath: {
    type: "string",
    default: "",
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
  if (pattern.includes("*")) {
    const escaped = pattern
      .replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
      .replace(/\\\*/g, ".*");
    const regex = new RegExp(`^${escaped}$`);
    return regex.test(value);
  }

  return (
    value === pattern ||
    path.basename(value) === pattern ||
    value.endsWith(`/${pattern}`)
  );
}

function readPackageJson(filePath: string): Record<string, any> | undefined {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8")) as Record<string, any>;
  } catch {
    return undefined;
  }
}

function readInstalledPackages(moduleRoot: string): string[] {
  const lockPath = path.join(moduleRoot, "package-lock.json");
  let lock: Record<string, any>;
  try {
    lock = JSON.parse(fs.readFileSync(lockPath, "utf8")) as Record<string, any>;
  } catch {
    return [];
  }
  const packages = lock.packages as Record<string, unknown> | undefined;
  if (!packages) return [];
  const prefix = "node_modules/";
  return Object.keys(packages)
    .filter(
      (key) =>
        key.startsWith(prefix) &&
        !key.slice(prefix.length).includes("/node_modules/")
    )
    .map((key) => key.slice(prefix.length));
}

function isWithin(parent: string, candidate: string): boolean {
  const rel = path.relative(parent, candidate);
  return !rel || (!rel.startsWith("..") && !path.isAbsolute(rel));
}

export class NpmLinkCommand extends Command<typeof options, void> {
  constructor() {
    super("NpmLinkCommand", options);
  }

  protected override help(): void {
    printCommandHelp(
      this.log,
      "npm-link",
      "Link or unlink package outputs across git submodule workspaces.",
      "npm-link [options]",
      [
        {
          flag: "--maxTraversal <depth>",
          description: "How many nested .gitmodules levels to traverse",
          defaultValue: "2",
        },
        {
          flag: "--excludes <items...>",
          description:
            "Dependency names or patterns to ignore. Pass an empty string to clear the default excludes",
          defaultValue: "@decaf-ts/utils,@decaf-ts/logging",
        },
        {
          flag: "--include <items...>",
          description: "Module names or paths to target explicitly",
        },
        {
          flag: "--packages <items...>",
          description:
            "Additional non-scoped packages to link from --mainPackagePath",
        },
        {
          flag: "--mainPackagePath <path>",
          description:
            "Source root for --packages dependencies (e.g. brain/node_modules/@decaf-ts)",
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
        "link symlinks each discovered dependency to its local source",
        "candidates are gathered from both package.json and package-lock.json (catches transitive deps)",
        "scoped dependencies are resolved to their git submodule path by matching the package name",
        "non-scoped dependencies passed via --packages are resolved from --mainPackagePath",
        "dependencies whose source lives inside the consuming module are skipped (self-reference)",
        "unlink removes those links and reinstalls dependencies via npm run do-install",
        "any other operation is passed through to npm in each selected module",
      ],
      [
        "npm-link --operation link",
        "npm-link --operation unlink",
        "npm-link --packages @decaf-ts/* --mainPackagePath brain/node_modules/@decaf-ts --excludes @pdmfcsa/*",
        "npm-link --operation install --include modules/core",
      ]
    );
  }

  protected async run(
    answers: LoggingConfig &
      typeof DefaultCommandValues & {
        maxTraversal: unknown;
        excludes: unknown;
        include: unknown;
        packages: unknown;
        mainPackagePath: unknown;
        operation: unknown;
      }
  ): Promise<void> {
    const maxTraversal = Number.parseInt(`${answers.maxTraversal || "2"}`, 10);
    const include = normalizeList(answers.include);
    const packages = normalizeList(answers.packages);
    const mainPackagePath = `${answers.mainPackagePath || ""}`.trim();
    const operation = `${answers.operation || "link"}`.trim() || "link";

    const excludesRaw = answers.excludes;
    const excludesProvided =
      excludesRaw !== undefined && excludesRaw !== null;
    const excludes = excludesProvided ? normalizeList(excludesRaw) : [];
    const effectiveExcludes = excludesProvided ? excludes : DEFAULT_EXCLUDES;

    const sourceBasePath = mainPackagePath
      ? path.resolve(mainPackagePath)
      : process.cwd();

    if (packages.length > 0 && !mainPackagePath) {
      console.log(
        "--main-package-path is required when --packages includes non-scoped packages"
      );
      process.exit(1);
      return;
    }

    const outerPkg = readPackageJson(path.join(process.cwd(), "package.json"));
    if (!outerPkg || !outerPkg.name) {
      console.log("Could not determine the workspace package name");
      process.exit(1);
      return;
    }
    const scope = getScope(outerPkg.name);

    const modules = readGitModulesDeep(
      process.cwd(),
      Number.isFinite(maxTraversal) ? maxTraversal : 2
    );

    const moduleByName = new Map<string, string>();
    for (const moduleName of modules) {
      const moduleRoot = path.join(process.cwd(), moduleName);
      const mpkg = readPackageJson(path.join(moduleRoot, "package.json"));
      if (mpkg && mpkg.name) {
        moduleByName.set(mpkg.name, moduleName);
      }
    }

    const selectedModules = modules.filter((moduleName) =>
      include.length > 0
        ? include.some((pattern) => matchesPattern(moduleName, pattern))
        : true
    );

    const shouldIgnoreDependency = (dependency: string) =>
      effectiveExcludes.some((pattern) => matchesPattern(dependency, pattern));
    const shouldLinkDependency = (dependency: string) =>
      dependency.startsWith(scope) ||
      packages.some((pattern) => matchesPattern(dependency, pattern));

    const resolveSource = (dependency: string): string | undefined => {
      const packageName = getPackageName(dependency);
      if (dependency.startsWith(scope)) {
        const modulePath = moduleByName.get(dependency);
        if (modulePath) {
          return path.join(process.cwd(), modulePath);
        }
        return path.join(sourceBasePath, packageName);
      }
      return path.join(sourceBasePath, packageName);
    };

    for (const moduleName of selectedModules) {
      const moduleRoot = path.join(process.cwd(), moduleName);
      const pkg = readPackageJson(path.join(moduleRoot, "package.json"));
      if (!pkg) continue;

      const candidates = Array.from(
        new Set([...getDependencyList(pkg), ...readInstalledPackages(moduleRoot)])
      );
      const dependencies = candidates.filter((dep) =>
        shouldLinkDependency(dep)
      );

      if (operation === "link") {
        for (const dependency of dependencies) {
          if (shouldIgnoreDependency(dependency)) continue;

          const sourcePath = resolveSource(dependency);
          if (!sourcePath || !fs.existsSync(sourcePath)) {
            console.log(
              `Skipping ${dependency} as it does not exist in the local workspace`
            );
            continue;
          }

          if (isWithin(moduleRoot, sourcePath)) {
            console.log(
              `Skipping ${dependency} in ${moduleName} - source is the module itself`
            );
            continue;
          }

          const dependencyTarget = path.join(
            moduleRoot,
            "node_modules",
            dependency
          );

          try {
            console.log(`linking ${dependency} as a dependency of ${moduleName}`);
            fs.rmSync(dependencyTarget, { force: true, recursive: true });
            fs.mkdirSync(path.dirname(dependencyTarget), { recursive: true });
            fs.symlinkSync(
              path.relative(path.dirname(dependencyTarget), sourcePath),
              dependencyTarget,
              "dir"
            );
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
