import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";
import { LoggingConfig, Logger } from "@decaf-ts/logging";
import { NotFoundError, ValidationError } from "@decaf-ts/db-decorators";
import { Command } from "../command";
import { DefaultCommandValues } from "../constants";
import { printCommandHelp } from "./help.command";
import { resolveSecret, hasSecret } from "./credentials.command";

const options = {
  basePath: {
    type: "string",
    default: process.cwd(),
  },
  target: {
    type: "string",
    default: undefined,
  },
  templates: {
    type: "string",
    default: undefined,
  },
  timeout: {
    type: "string",
    default: undefined,
  },
  "dry-run": {
    type: "boolean",
    default: false,
  },
  "git-token": {
    type: "string",
    default: "github",
  },
  "npm-token": {
    type: "string",
    default: "npm",
  },
};

/**
 * @description Credential files symlinked into each generated bundle folder.
 * @summary Legacy npm/git auth files expected next to the bundle manifests so
 * that `npm install`/`npm publish` inside the bundle folder can authenticate.
 * Missing files are skipped with a warning.
 * @memberOf module:utils
 */
const FILES_TO_LINK = [".npmtoken", ".token", ".npmrc"];

/**
 * @description Declarative definition of one aggregate `@decaf-ts/dist-*` bundle.
 * @summary Accepts either a bare dependency list (shorthand for
 * `dependencies`) or a full entry. `overrides` are npm-config overrides merged
 * (recursively, later sources winning) into the generated manifest.
 * @interface BundleEntry
 * @property {string[]} [dependencies] - Runtime dependencies bundled into the aggregate package
 * @property {string[]} [devDependencies] - Dev dependencies bundled into the aggregate package
 * @property {string} [license] - License applied to the bundle (falls back to the workspace root license)
 * @property {string[]} [keywords] - Extra npm keywords merged into the bundle manifest
 * @property {Record<string, unknown>} [overrides] - npm overrides collected into the bundle manifest
 * @memberOf module:utils
 */
interface BundleEntry {
  dependencies?: string[];
  devDependencies?: string[];
  license?: string;
  keywords?: string[];
  overrides?: Record<string, unknown>;
}

/**
 * @description Parsed shape of the `bundles.json` command asset.
 * @summary Maps a bundle folder name (e.g. `dist-core`) to either a plain
 * dependency list or a full {@link BundleEntry}.
 * @interface BundlesConfig
 * @memberOf module:utils
 */
interface BundlesConfig {
  [bundle: string]: string[] | BundleEntry;
}

/**
 * @description Type guard for plain (non-array) objects.
 * @summary Used everywhere the command distinguishes npm-manifest objects
 * from lists and other JSON values.
 * @param {unknown} value - Value to test.
 * @return {boolean} `true` when the value is a non-null, non-array object.
 * @function isPlainObject
 * @memberOf module:utils
 */
function isPlainObject(value: unknown): value is Record<string, any> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

/**
 * @description Reads a JSON file without failing when it is absent or invalid.
 * @summary Used for best-effort manifest lookups across the workspace and the
 * generated target folders; both a missing file and a parse error yield `null`
 * so callers can fall through to the next resolution step.
 * @param {string} filePath - Absolute or cwd-relative path of the JSON file.
 * @return {Record<string, any> | null} Parsed object, or `null` when the file does not exist or is not valid JSON.
 * @function readJsonIfExists
 * @memberOf module:utils
 */
function readJsonIfExists(filePath: string): Record<string, any> | null {
  if (!fs.existsSync(filePath)) return null;
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch {
    return null;
  }
}

/**
 * @description Normalizes a `bundles.json` entry to a full {@link BundleEntry}.
 * @summary A bare dependency list is promoted to `{ dependencies: [...] }`;
 * `null`/`undefined` entries become an empty entry.
 * @param {string[] | BundleEntry} raw - Raw entry as read from `bundles.json`.
 * @return {BundleEntry} Normalized bundle entry (never `null`).
 * @function normalizeBundleEntry
 * @memberOf module:utils
 */
function normalizeBundleEntry(raw: string[] | BundleEntry): BundleEntry {
  return Array.isArray(raw) ? { dependencies: raw } : raw || {};
}

/**
 * @description Derives the workspace folder name of a dependency.
 * @summary Scoped `@decaf-ts/<name>` dependencies map to their unscoped
 * `<name>` folder; any other dependency maps to itself.
 * @param {string} dependency - Package name (e.g. `@decaf-ts/core` or `chalk`).
 * @return {string} Folder name of the dependency inside the workspace.
 * @function dependencyFolderName
 * @memberOf module:utils
 */
function dependencyFolderName(dependency: string): string {
  return dependency.includes("@decaf-ts/")
    ? dependency.split("@decaf-ts/")[1]
    : dependency;
}

/**
 * @description Deeply merges npm override objects into a target.
 * @summary Non-object sources are ignored; plain-object values are merged
 * recursively so nested overrides accumulate instead of being replaced.
 * @param {Record<string, any>} target - Object mutated in place with the merged overrides.
 * @param {unknown} source - Candidate overrides object (ignored when not a plain object).
 * @return {Record<string, any>} The same `target`, for chaining.
 * @function mergeOverrides
 * @memberOf module:utils
 */
function mergeOverrides(
  target: Record<string, any>,
  source: unknown
): Record<string, any> {
  if (!isPlainObject(source)) return target;
  for (const [key, value] of Object.entries(source)) {
    if (isPlainObject(value)) {
      if (!isPlainObject(target[key])) {
        target[key] = {};
      }
      mergeOverrides(target[key], value);
      continue;
    }
    target[key] = value;
  }
  return target;
}

/**
 * @description Strips caret ranges from a version spec.
 * @summary Bundle manifests pin exact versions, so `^x.y.z` entries collected
 * from workspace overrides are normalized to `x.y.z`; non-string values pass
 * through untouched.
 * @param {unknown} value - Version spec (or any other override value).
 * @return {unknown} The version without a leading `^`, or the original value.
 * @function normalizeVersionSpec
 * @memberOf module:utils
 */
function normalizeVersionSpec(value: unknown): unknown {
  if (typeof value !== "string") return value;
  return value.startsWith("^") ? value.slice(1) : value;
}

/**
 * @description Recursively normalizes every version spec of an overrides map.
 * @summary Walks nested plain objects and applies {@link normalizeVersionSpec}
 * to leaf values, in place.
 * @param {Record<string, any>} map - Overrides map mutated in place.
 * @return {Record<string, any>} The same `map`, for chaining.
 * @function normalizeVersionMap
 * @memberOf module:utils
 */
function normalizeVersionMap(map: Record<string, any>): Record<string, any> {
  if (!isPlainObject(map)) return map;
  for (const [key, value] of Object.entries(map)) {
    if (isPlainObject(value)) {
      normalizeVersionMap(value);
      continue;
    }
    map[key] = normalizeVersionSpec(value);
  }
  return map;
}

/**
 * @description Collects the dependency names declared by an npm manifest.
 * @summary Union of `dependencies`, `devDependencies`, `peerDependencies` and
 * `optionalDependencies` keys; non-manifest inputs yield an empty list.
 * @param {unknown} manifest - Parsed `package.json`-like object.
 * @return {string[]} Declared dependency names (may be empty).
 * @function getNestedDependencyNames
 * @memberOf module:utils
 */
function getNestedDependencyNames(manifest: unknown): string[] {
  if (!isPlainObject(manifest)) return [];
  return [
    ...Object.keys(manifest.dependencies || {}),
    ...Object.keys(manifest.devDependencies || {}),
    ...Object.keys(manifest.peerDependencies || {}),
    ...Object.keys(manifest.optionalDependencies || {}),
  ];
}

/**
 * Locates the relocated bundle template assets.
 *
 * Candidate order:
 * 1. explicit `--templates` directory;
 * 2. `<utils package>/lib/assets/releases` (compiled layout);
 * 3. `<utils package>/src/assets/releases` (source layout);
 * 4. `<cwd>/bin/releases` (legacy in-tree location, compatibility fallback).
 */
function resolveTemplatesDir(explicit?: string): string {
  const candidates: string[] = [];
  if (explicit) candidates.push(path.resolve(process.cwd(), explicit));
  try {
    // compiled layout: <pkg>/lib/{cjs,esm}/cli/commands -> <pkg>/lib/assets/releases
    candidates.push(path.resolve(__dirname, "../../../assets/releases"));
    // source layout: <pkg>/src/cli/commands -> <pkg>/src/assets/releases
    candidates.push(path.resolve(__dirname, "../../assets/releases"));
  } catch {
    // ignore - fall through to cwd based candidates
  }
  candidates.push(path.join(process.cwd(), "bin", "releases"));
  for (const candidate of candidates) {
    if (
      fs.existsSync(path.join(candidate, "bundles.json")) &&
      fs.existsSync(path.join(candidate, "package-template.json"))
    ) {
      return candidate;
    }
  }
  throw new NotFoundError(
    `Bundle templates not found. Searched: ${candidates.join(", ")}`
  );
}

/**
 * @class BundleCommand
 * @extends {Command<typeof options, void>}
 * @description Builds and publishes the aggregated `@decaf-ts/dist-*` bundle
 * packages.
 * @summary Mirrors the legacy `bin/bundle.js` script: reads `bundles.json` and
 * `package-template.json` from the relocated single-copy command assets,
 * resolves the version of every bundled dependency from the workspace,
 * collects and normalizes npm overrides, then runs `npm install` and
 * `npm publish --access public` in each generated bundle folder.
 * Credentials are resolved through the `credentials` command resolver
 * (env var -> OS keychain -> legacy file) and are never logged.
 */
export class BundleCommand extends Command<typeof options, void> {
  constructor() {
    super("BundleCommand", options);
  }

  protected override help(): void {
    printCommandHelp(
      this.log,
      "bundle",
      "Build and publish the @decaf-ts/dist-* aggregate bundle packages.",
      "bundle [options]",
      [
        {
          flag: "--base-path <path>",
          description: "Workspace root holding the decaf-ts packages",
          defaultValue: "current working directory",
        },
        {
          flag: "--target <dir>",
          description: "Output folder for the generated bundles",
          defaultValue: "<base-path>/bin/releases",
        },
        {
          flag: "--templates <dir>",
          description: "Folder holding bundles.json and package-template.json",
          defaultValue: "the relocated command assets in @decaf-ts/utils",
        },
        {
          flag: "--timeout <seconds>",
          description: "Wait between publishing two bundles",
          defaultValue: "TIMEOUT env var or 20",
        },
        {
          flag: "--dry-run",
          description: "Generate manifests only; skip install/publish",
          defaultValue: "DRY_RUN=1 env var",
        },
        {
          flag: "--git-token <name>",
          description: "Secret name for the git token",
          defaultValue: "github",
        },
        {
          flag: "--npm-token <name>",
          description: "Secret name for the npm token",
          defaultValue: "npm",
        },
        {
          flag: "-h, --help",
          description: "Show this help text and exit",
        },
      ],
      [
        "Set DRY_RUN=1 or pass --dry-run to generate package.json manifests without installing or publishing.",
        "Token values are resolved via the credentials resolver and are never logged or echoed.",
      ],
      ["bundle --dry-run", "bundle --target ./releases --timeout 30"]
    );
  }

  /**
   * @description Resolves the version to pin for a bundled dependency.
   * @summary Resolution order: the dependency's own workspace `package.json`,
   * the workspace root version when the dependency is itself a declared bundle,
   * a nested workspace folder named after the full dependency, the root version
   * for `@decaf-ts/dist-*` self-references, and finally a {@link NotFoundError}.
   * @param {string} basePath - Workspace root holding the decaf-ts packages.
   * @param {BundlesConfig} bundles - Parsed `bundles.json` configuration.
   * @param {string} rootVersion - Version of the workspace root `package.json`.
   * @param {string} dependency - Dependency name to resolve.
   * @return {string} Resolved semantic version.
   * @throws {NotFoundError} When no workspace manifest or bundle entry can provide a version.
   */
  private resolveDependencyVersion(
    basePath: string,
    bundles: BundlesConfig,
    rootVersion: string,
    dependency: string
  ): string {
    const name = dependencyFolderName(dependency);
    const localPkgPath = path.join(basePath, name, "package.json");
    const localPkg = readJsonIfExists(localPkgPath);
    if (localPkg && typeof localPkg.version === "string") {
      return localPkg.version;
    }
    if (bundles && bundles[name]) {
      return rootVersion;
    }
    const fallbackPkg = readJsonIfExists(
      path.join(basePath, dependency, "package.json")
    );
    if (fallbackPkg && typeof fallbackPkg.version === "string") {
      return fallbackPkg.version;
    }
    if (dependency.startsWith("@decaf-ts/dist-")) {
      return rootVersion;
    }
    throw new NotFoundError(
      `Cannot resolve version for dependency '${dependency}'. Ensure the package exists in the workspace or the bundles.json entry references a known bundle.`
    );
  }

  /**
   * @description Locates the best manifest describing a dependency.
   * @summary Precedence: an already-generated release manifest in the target
   * folder, the dependency's workspace manifest, and finally its
   * `bundles.json` entry (list or full entry). Used to surface nested
   * dependencies when collecting overrides.
   * @param {string} basePath - Workspace root holding the decaf-ts packages.
   * @param {string} targetPath - Output folder of the generated bundles.
   * @param {BundlesConfig} bundles - Parsed `bundles.json` configuration.
   * @param {string} dependency - Dependency name to look up.
   * @return {Record<string, any> | null} Best matching manifest, or `null` when the dependency is unknown.
   */
  private getManifestForDependency(
    basePath: string,
    targetPath: string,
    bundles: BundlesConfig,
    dependency: string
  ): Record<string, any> | null {
    const name = dependencyFolderName(dependency);
    const releasePkg = readJsonIfExists(
      path.join(targetPath, name, "package.json")
    );
    if (releasePkg) return releasePkg;
    const sourcePkg = readJsonIfExists(
      path.join(basePath, name, "package.json")
    );
    if (sourcePkg) return sourcePkg;
    const bundleEntry = bundles && bundles[name];
    if (bundleEntry) {
      return isPlainObject(bundleEntry)
        ? bundleEntry
        : { dependencies: bundleEntry };
    }
    return null;
  }

  /**
   * @description Recursively collects npm overrides declared by a dependency graph.
   * @summary Reads the dependency's release and workspace manifests (plus its
   * `bundles.json` entry as a fallback), merges their `overrides`, and recurses
   * into every nested dependency name found in any dependency bucket. A `seen`
   * set guards against cycles and duplicate work.
   * @param {string} basePath - Workspace root holding the decaf-ts packages.
   * @param {string} targetPath - Output folder of the generated bundles.
   * @param {BundlesConfig} bundles - Parsed `bundles.json` configuration.
   * @param {string} dependency - Root dependency whose graph is walked.
   * @param {Set<string>} seen - Already-visited dependency folder names.
   * @return {Record<string, any>} Merged overrides for the dependency graph (possibly empty).
   */
  private collectOverrides(
    basePath: string,
    targetPath: string,
    bundles: BundlesConfig,
    dependency: string,
    seen: Set<string> = new Set()
  ): Record<string, any> {
    const name = dependencyFolderName(dependency);
    if (seen.has(name)) return {};
    seen.add(name);

    const collected: Record<string, any> = {};
    const manifests: Record<string, any>[] = [];
    const releasePkg = readJsonIfExists(
      path.join(targetPath, name, "package.json")
    );
    if (releasePkg) manifests.push(releasePkg);
    const sourcePkg = readJsonIfExists(
      path.join(basePath, name, "package.json")
    );
    if (sourcePkg) manifests.push(sourcePkg);
    const bundleEntry = bundles && bundles[name];
    if (!releasePkg && !sourcePkg && bundleEntry) {
      manifests.push(
        isPlainObject(bundleEntry) ? bundleEntry : { dependencies: bundleEntry }
      );
    }

    manifests.forEach((manifest) => {
      mergeOverrides(collected, manifest.overrides);
      getNestedDependencyNames(manifest).forEach((nestedDependency) => {
        const nestedName = dependencyFolderName(nestedDependency);
        if (seen.has(nestedName)) return;
        const nestedManifest = this.getManifestForDependency(
          basePath,
          targetPath,
          bundles,
          nestedDependency
        );
        if (nestedManifest) {
          mergeOverrides(
            collected,
            this.collectOverrides(
              basePath,
              targetPath,
              bundles,
              nestedDependency,
              seen
            )
          );
        }
      });
    });

    return collected;
  }

  /**
   * @description Materializes and (unless dry-run) publishes one bundle package.
   * @summary Creates `<targetPath>/<name>`, symlinks the legacy credential
   * files, renders the `package-template.json` with the bundle name/version,
   * resolved dependency versions, merged license/keywords and collected
   * overrides, writes `package.json`, then runs `npm install` and
   * `npm publish --access public` inside the bundle folder. Secrets are passed
   * only through the child process environment and are never logged.
   * @param {Logger} log - Logger for progress and symlink warnings.
   * @param {Object} args - Shared run context.
   * @param {string} args.basePath - Workspace root holding the decaf-ts packages.
   * @param {string} args.targetPath - Output folder of the generated bundles.
   * @param {BundlesConfig} args.bundles - Parsed `bundles.json` configuration.
   * @param {Record<string, any>} args.template - Parsed `package-template.json`.
   * @param {Record<string, any>} args.rootPkg - Parsed workspace root `package.json`.
   * @param {boolean} args.dryRun - When `true`, only the manifest is generated.
   * @param {string} args.gitTokenName - Credentials-resolver name of the git token.
   * @param {string} args.npmTokenName - Credentials-resolver name of the npm token.
   * @param {string} name - Bundle folder/npm name suffix (e.g. `dist-core`).
   * @param {string} version - Version applied to the generated manifest.
   * @param {BundleEntry} entry - Normalized `bundles.json` entry for the bundle.
   * @return {void}
   * @throws {NotFoundError} When a bundled dependency's version cannot be resolved.
   */
  private createBundle(
    log: Logger,
    args: {
      basePath: string;
      targetPath: string;
      bundles: BundlesConfig;
      template: Record<string, any>;
      rootPkg: Record<string, any>;
      dryRun: boolean;
      gitTokenName: string;
      npmTokenName: string;
    },
    name: string,
    version: string,
    entry: BundleEntry
  ): void {
    const {
      basePath,
      targetPath,
      bundles,
      template,
      rootPkg,
      dryRun,
      gitTokenName,
      npmTokenName,
    } = args;
    const bundlePath = path.join(targetPath, name);
    fs.mkdirSync(bundlePath, { recursive: true });
    FILES_TO_LINK.forEach((f) => {
      const target = path.join(basePath, f);
      const link = path.join(bundlePath, f);
      try {
        if (fs.existsSync(link)) fs.unlinkSync(link);
        fs.symlinkSync(target, link);
      } catch (err) {
        const message = err instanceof Error ? err.message : `${err}`;
        log.warn(`could not create symlink ${link} -> ${target}: ${message}`);
      }
    });

    const pkg: Record<string, any> = JSON.parse(JSON.stringify(template));
    pkg.name = `@decaf-ts/${name}`;
    pkg.version = version;
    pkg.description = `Decaf-ts' ${name} install`;

    if (entry && entry.license) {
      pkg.license = entry.license;
    } else if (!pkg.license && rootPkg && rootPkg.license) {
      pkg.license = rootPkg.license;
    }

    const entryKeywords = entry && entry.keywords;
    if (Array.isArray(pkg.keywords) && Array.isArray(entryKeywords)) {
      pkg.keywords = Array.from(new Set([...pkg.keywords, ...entryKeywords]));
    } else if (Array.isArray(entryKeywords)) {
      pkg.keywords = entryKeywords;
    }

    pkg.dependencies = {};
    pkg.devDependencies = {};
    pkg.overrides = {};

    const dependencies: string[] = Array.isArray(entry && entry.dependencies)
      ? (entry.dependencies as string[])
      : [];
    const devs: string[] = Array.isArray(entry && entry.devDependencies)
      ? (entry.devDependencies as string[])
      : [];

    const resolveAll = (list: string[], bucket: string) =>
      list.forEach((dependency) => {
        pkg[bucket][dependency] = this.resolveDependencyVersion(
          basePath,
          bundles,
          rootPkg.version,
          dependency
        );
      });
    resolveAll(dependencies, "dependencies");
    resolveAll(devs, "devDependencies");

    const overrideSources: unknown[] = [];
    if (entry && entry.overrides && isPlainObject(entry.overrides))
      overrideSources.push(entry.overrides);
    if (rootPkg && rootPkg.overrides && isPlainObject(rootPkg.overrides))
      overrideSources.push(rootPkg.overrides);

    [...dependencies, ...devs].forEach((dependency) => {
      const collected = this.collectOverrides(
        basePath,
        targetPath,
        bundles,
        dependency
      );
      if (Object.keys(collected).length) overrideSources.push(collected);
    });

    overrideSources.forEach((source) => mergeOverrides(pkg.overrides, source));
    normalizeVersionMap(pkg.overrides);
    if (!Object.keys(pkg.overrides).length) {
      delete pkg.overrides;
    }

    fs.writeFileSync(
      path.join(bundlePath, "package.json"),
      JSON.stringify(pkg, undefined, 2)
    );

    if (dryRun) {
      log.info(
        `[DRY_RUN] Created package.json for ${name} at ${bundlePath}. Skipping npm install/publish.`
      );
      return;
    }

    // Credentials are resolved via the credentials resolver and only handed to
    // the child process environment - never logged, echoed or persisted.
    const childEnv: Record<string, string | undefined> = { ...process.env };
    if (hasSecret(gitTokenName)) {
      childEnv.TOKEN = resolveSecret(gitTokenName);
    }
    execSync("npm install", {
      cwd: bundlePath,
      stdio: "inherit",
      env: childEnv,
    });

    if (hasSecret(npmTokenName)) {
      childEnv.NPM_TOKEN = resolveSecret(npmTokenName);
    }
    execSync("npm publish --access public", {
      cwd: bundlePath,
      stdio: "inherit",
      env: childEnv,
    });
  }

  /**
   * @description Runs the bundle build/publish flow.
   * @summary Resolves every option (falling back to env vars `TIMEOUT` and
   * `DRY_RUN`), loads `bundles.json`/`package-template.json` from the resolved
   * templates folder plus the workspace root manifest, then generates each
   * bundle sequentially via {@link BundleCommand.createBundle}, waiting
   * `timeout` seconds between bundles so the registry catches up.
   * @param {LoggingConfig & typeof DefaultCommandValues & { basePath: unknown; target: unknown; templates: unknown; timeout: unknown; "dry-run": unknown; "git-token": unknown; "npm-token": unknown }} answers - Parsed command answers.
   * @return {Promise<void>}
   * @throws {NotFoundError} When the templates folder or a dependency version cannot be resolved.
   * @throws {ValidationError} When a `--git-token`/`--npm-token` secret name fails the /^[A-Za-z0-9._-]+$/ boundary validation, or a `bundles.json` bundle name could escape the target directory.
   */
  protected async run(
    answers: LoggingConfig &
      typeof DefaultCommandValues & {
        basePath: unknown;
        target: unknown;
        templates: unknown;
        timeout: unknown;
        "dry-run": unknown;
        "git-token": unknown;
        "npm-token": unknown;
      }
  ): Promise<void> {
    const log = this.log.for(this.run);
    const basePath =
      typeof answers.basePath === "string" && answers.basePath.trim().length > 0
        ? answers.basePath.trim()
        : process.cwd();
    const targetPath =
      typeof answers.target === "string" && answers.target.trim().length > 0
        ? path.resolve(process.cwd(), answers.target.trim())
        : path.join(basePath, "bin", "releases");
    const templatesDir = resolveTemplatesDir(
      typeof answers.templates === "string" ? answers.templates : undefined
    );
    const timeoutSeconds =
      typeof answers.timeout === "string" && answers.timeout.trim().length > 0
        ? parseInt(answers.timeout, 10)
        : parseInt(process.env.TIMEOUT || "0", 10) || 20;
    const dryRun =
      answers["dry-run"] === true || process.env.DRY_RUN === "1";
    const gitTokenName =
      typeof answers["git-token"] === "string" ? answers["git-token"] : "github";
    const npmTokenName =
      typeof answers["npm-token"] === "string" ? answers["npm-token"] : "npm";

    // F1 (CWE-78): secret names are interpolated into keychain backend shell
    // commands downstream (credentials.command.ts). Reject anything that is not
    // a plain token name so a malicious --git-token/--npm-token can never reach
    // a shell.
    const secretNamePattern = /^[A-Za-z0-9._-]+$/;
    for (const flag of ["--git-token", "--npm-token"]) {
      const value = flag === "--git-token" ? gitTokenName : npmTokenName;
      if (!secretNamePattern.test(value)) {
        throw new ValidationError(
          `Invalid ${flag} secret name "${value}": must match /^[A-Za-z0-9._-]+$/.`
        );
      }
    }

    const bundles = JSON.parse(
      fs.readFileSync(path.join(templatesDir, "bundles.json"), "utf8")
    ) as BundlesConfig;
    const template = JSON.parse(
      fs.readFileSync(path.join(templatesDir, "package-template.json"), "utf8")
    ) as Record<string, any>;
    const rootPkg = JSON.parse(
      fs.readFileSync(path.join(basePath, "package.json"), "utf8")
    ) as Record<string, any>;

    for (const [bundle, rawEntry] of Object.entries(bundles)) {
      // F2: the bundle name is used as a target subpath below targetPath for
      // rmSync/mkdir; reject anything that could escape the target directory.
      if (!/^[a-z0-9][a-z0-9._-]*$/i.test(bundle)) {
        throw new ValidationError(
          `Invalid bundle name "${bundle}" in bundles.json: must match /^[a-z0-9][a-z0-9._-]*$/i.`
        );
      }
      const entry = normalizeBundleEntry(rawEntry);
      if (!dryRun && fs.existsSync(path.join(targetPath, bundle))) {
        fs.rmSync(path.join(targetPath, bundle), { recursive: true });
      }
      log.info(`Folder created for ${bundle}`);
      this.createBundle(
        log,
        {
          basePath,
          targetPath,
          bundles,
          template,
          rootPkg,
          dryRun,
          gitTokenName,
          npmTokenName,
        },
        bundle,
        rootPkg.version,
        entry
      );
      log.info(
        `${bundle} published. waiting ${timeoutSeconds} seconds before next bundle to ensure the registry is updated`
      );
      await new Promise((resolve) => setTimeout(resolve, timeoutSeconds * 1000));
    }
    log.info("Bundles created and published");
  }
}
