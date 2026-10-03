import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";
import { LoggingConfig } from "@decaf-ts/logging";
import { Command } from "../command";
import { DefaultCommandValues } from "../constants";
import { readGitModulesDeep } from "./modules.command";
import { printCommandHelp } from "./help.command";

const DEFAULT_EXCLUDES = ["@decaf-ts/utils", "@decaf-ts/logging"];
const DECAF_SCOPE = "@decaf-ts/";

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
  onlyModules: {
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
  decafSourcePath: {
    type: "string",
    default: "",
  },
  hub: {
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

function isDecafDependency(dependency: string): boolean {
  return dependency.startsWith(DECAF_SCOPE);
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
          flag: "--onlyModules <items...>",
          description:
            "Isolate the run to these modules: only they are processed and only their sources may be linked. Any other dependency keeps its installed registry version",
        },
        {
          flag: "--packages <items...>",
          description:
            "Additional non-scoped packages to link from --mainPackagePath or --decafSourcePath",
        },
        {
          flag: "--mainPackagePath <path>",
          description:
            "Source root for --packages dependencies (e.g. brain/node_modules/@decaf-ts)",
        },
        {
          flag: "--decafSourcePath <path>",
          description:
            "Path to a decaf source checkout; @decaf-ts/* links point at the source itself",
        },
        {
          flag: "--hub <module>",
          description:
            "Module that centers the linked dependencies; every other module resolves them through the hub's node_modules",
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
        "non-scoped dependencies passed via --packages are resolved from --mainPackagePath or --decafSourcePath",
        "@decaf-ts/* dependencies are resolved to the decaf source itself when --decafSourcePath is set",
        "--hub centers every linked dependency in one module so all dependents share a single instance",
        "--onlyModules confines processing and link sources to the listed modules; unlisted sources keep their registry version",
        "dependencies whose source lives inside the consuming module are skipped (self-reference)",
        "unlink removes those links and reinstalls dependencies via npm run do-install",
        "any other operation is passed through to npm in each selected module",
      ],
      [
        "npm-link --operation link",
        "npm-link --operation unlink",
        "npm-link --packages @decaf-ts/* --mainPackagePath brain/node_modules/@decaf-ts --excludes @pdmfcsa/*",
        "npm-link --packages @decaf-ts/* --decafSourcePath ../decaf-ts",
        "npm-link --hub utils",
        "npm-link --onlyModules core,for-typeorm",
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
        onlyModules: unknown;
        packages: unknown;
        mainPackagePath: unknown;
        decafSourcePath: unknown;
        hub: unknown;
        operation: unknown;
      }
  ): Promise<void> {
    const maxTraversal = Number.parseInt(`${answers.maxTraversal || "2"}`, 10);
    const include = normalizeList(answers.include);
    const onlyModules = normalizeList(answers.onlyModules);
    const packages = normalizeList(answers.packages);
    const mainPackagePath = `${answers.mainPackagePath || ""}`.trim();
    const decafSourcePath = `${answers.decafSourcePath || ""}`.trim();
    const hub = `${answers.hub || ""}`.trim();
    const operation = `${answers.operation || "link"}`.trim() || "link";

    const excludesRaw = answers.excludes;
    const excludesProvided =
      excludesRaw !== undefined && excludesRaw !== null;
    const excludes = excludesProvided ? normalizeList(excludesRaw) : [];
    const effectiveExcludes = excludesProvided ? excludes : DEFAULT_EXCLUDES;

    const sourceBasePath = mainPackagePath
      ? path.resolve(mainPackagePath)
      : process.cwd();
    const decafSourceBase = decafSourcePath
      ? path.resolve(decafSourcePath)
      : "";

    if (packages.length > 0 && !mainPackagePath && !decafSourcePath) {
      console.log(
        "--mainPackagePath or --decafSourcePath is required when --packages is provided"
      );
      process.exit(1);
      return;
    }

    if (decafSourceBase && !fs.existsSync(decafSourceBase)) {
      console.log(`--decafSourcePath ${decafSourceBase} does not exist`);
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

    const matchesAny = (value: string, patterns: string[]) =>
      patterns.some((pattern) => matchesPattern(value, pattern));

    let hubModule: string | undefined;
    if (hub) {
      hubModule =
        moduleByName.get(hub) ||
        modules.find(
          (moduleName) => moduleName === hub || path.basename(moduleName) === hub
        );
      if (!hubModule && fs.existsSync(path.join(process.cwd(), hub))) {
        hubModule = hub;
      }
      if (!hubModule) {
        console.log(`--hub module ${hub} was not found in the workspace`);
        process.exit(1);
        return;
      }
    }

    const selectedModules = modules.filter(
      (moduleName) =>
        (include.length === 0 || matchesAny(moduleName, include)) &&
        (onlyModules.length === 0 || matchesAny(moduleName, onlyModules))
    );

    if (hubModule && !selectedModules.includes(hubModule)) {
      selectedModules.unshift(hubModule);
    }

    const eligibleSourceModules = new Set(
      onlyModules.length > 0
        ? modules.filter((moduleName) => matchesAny(moduleName, onlyModules))
        : modules
    );

    // The hub is always processed, so its scoped dependencies must stay
    // linkable to their real sources even when --onlyModules omits them.
    // This exemption is scoped to the hub's own dependency set.
    if (hubModule) {
      const hubRoot = path.join(process.cwd(), hubModule);
      const hubPkg = readPackageJson(path.join(hubRoot, "package.json"));
      const hubCandidates = hubPkg
        ? Array.from(
            new Set([
              ...getDependencyList(hubPkg),
              ...readInstalledPackages(hubRoot),
            ])
          )
        : [];
      for (const dependency of hubCandidates) {
        const sourceModule = moduleByName.get(dependency);
        if (sourceModule) eligibleSourceModules.add(sourceModule);
      }
    }

    const shouldIgnoreDependency = (dependency: string) =>
      effectiveExcludes.some((pattern) => matchesPattern(dependency, pattern));
    const shouldLinkDependency = (dependency: string) =>
      dependency.startsWith(scope) ||
      packages.some((pattern) => matchesPattern(dependency, pattern));
    const isSourceEligible = (dependency: string): boolean => {
      if (!dependency.startsWith(scope)) return true;
      const sourceModule = moduleByName.get(dependency);
      if (!sourceModule) return true;
      return eligibleSourceModules.has(sourceModule);
    };

    const resolveSource = (
      dependency: string,
      moduleName: string
    ): string | undefined => {
      const packageName = getPackageName(dependency);
      if (hubModule && moduleName !== hubModule) {
        return path.join(process.cwd(), hubModule, "node_modules", dependency);
      }
      if (decafSourceBase && isDecafDependency(dependency)) {
        return path.join(decafSourceBase, packageName);
      }
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
      const dependencies = candidates.filter(
        (dep) => shouldLinkDependency(dep) && isSourceEligible(dep)
      );

      if (operation === "link") {
        for (const dependency of dependencies) {
          if (shouldIgnoreDependency(dependency)) continue;

          const innerCodePath = dependency.endsWith("styles")
            ? "dist"
            : "lib";
          const sourceDir = resolveSource(dependency, moduleName);
          if (!sourceDir) {
            console.log(
              `Skipping ${dependency} - could not resolve source`
            );
            continue;
          }
          const sourcePath = path.join(sourceDir, innerCodePath);
          if (!fs.existsSync(sourcePath)) {
            console.log(
              `Skipping ${dependency} as ${sourcePath} does not exist in the local workspace`
            );
            continue;
          }

          if (isWithin(moduleRoot, sourceDir)) {
            console.log(
              `Skipping ${dependency} in ${moduleName} - source is the module itself`
            );
            continue;
          }

          const depRoot = path.join(moduleRoot, "node_modules", dependency);
          const linkPath = path.join(depRoot, innerCodePath);

          try {
            console.log(`linking ${dependency} as a dependency of ${moduleName}`);
            // If the package root is itself a symlink (e.g. from a previous
            // whole-directory link), remove it so we restore the installed package
            try {
              if (fs.lstatSync(depRoot).isSymbolicLink()) {
                fs.rmSync(depRoot, { force: true, recursive: true });
              }
            } catch {
              // depRoot doesn't exist — that's fine
            }
            fs.mkdirSync(depRoot, { recursive: true });
            fs.rmSync(linkPath, { force: true, recursive: true });
            fs.symlinkSync(
              path.relative(path.dirname(linkPath), sourcePath),
              linkPath,
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
