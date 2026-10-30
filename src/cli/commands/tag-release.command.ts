/* istanbul ignore file */
import { execSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { isAbsolute, join } from "node:path";
import {
  SemVersion,
  SemVersionRegex,
  BugFlag,
  FixFlag,
  BreakingFlag,
  PrereleaseFlag,
  PreferredSkipCiFlag,
  hasSkipCiSuffix,
  stripSkipCiSuffix,
} from "../../utils/constants";
import { UserInput } from "../../input/input";
import { Command } from "../command";
import { DefaultCommandValues } from "../index";
import { LoggingConfig } from "@decaf-ts/logging";
import { printCommandHelp } from "./help.command";
import { resolveSecret, hasSecret } from "./credentials.command";

const options = {
  message: {
    type: "string",
    short: "m",
  },
  tag: {
    type: "string",
    short: "t",
    default: undefined,
  },
  public: {
    type: "boolean",
    default: false,
  },
  private: {
    type: "boolean",
    default: false,
  },
  "no-ci": {
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
  "git-user": {
    type: "string",
    default: undefined,
  },
  "jsr-token": {
    type: "string",
    default: "jsr",
  },
  "dry-run": {
    type: "boolean",
    default: false,
  },
};

/**
 * @class ReleaseScript
 * @extends {Command}
 * @category scripts
 * @description TypeScript-native alternative to bin/tag-release.sh.
 * @summary Automates the release process: derives (or accepts) the semver bump from
 * the release message, updates the version, tags, pushes, and optionally publishes to
 * npm. Mirrors bin/tag-release.sh's flags and message-suffix conventions so both stay
 * interchangeable across decaf-ts repositories. The release message is never stripped
 * of its suffix flags before being committed/tagged, so CI can act on the same
 * -bug/-fix/-breaking/-prerelease convention. Skip-CI detection accepts this project's
 * own -no-ci flag as well as any of GitHub's natively-recognized skip keywords
 * ([skip ci], [ci skip], [no ci], [skip actions], [actions skip]); when this script
 * itself needs to mark a message as skip-CI it appends [skip ci], since that one is
 * also honored natively by GitHub for push/pull_request-triggered workflows.
 * Repo-specific publish quirks (e.g. an Angular library that must be published from
 * its ng-packagr build output rather than the repo root) are handled by a
 * {@link PublishStrategy}, selected via package.json's `tagRelease` key -- see
 * {@link TagReleaseConfig} and {@link PUBLISH_STRATEGIES} -- rather than special-cased
 * here, so each repo's own exceptions live with that repo, and a new kind of exception
 * is a new strategy implementation rather than a change to this class.
 *
 * @param {Object} options - Configuration options for the script
 * @param {string} options.message - The release message (short: 'm')
 * @param {string} options.tag - The version tag to use (short: 't'); derived from the message when omitted
 * @param {boolean} options.public - Publish to the public npm registry (default)
 * @param {boolean} options.private - Publish to the restricted npm registry
 * @param {boolean} options.no-ci - Append [skip ci] to the message (if no skip-CI flag is already present) and publish locally instead of waiting for CI
 * @param {string} options.git-token - Secret name for the git push token (default: 'github')
 * @param {string} options.npm-token - Secret name for the npm publish token (default: 'npm')
 * @param {string} options.git-user - Git user name embedded in authenticated pushes
 *
 * Positional arguments are also accepted, mirroring bin/tag-release.sh: the first
 * positional is the tag, everything after it is joined (unquoted) into the message —
 * `tag-release patch fix a critical login bug` needs no quoting. Positionals only fill
 * in whichever of --tag/--message was not passed as a flag.
 *
 * Local (skip-CI) publish authentication is controlled by `NPM_PUBLISH_INTERACTIVE`:
 * when it is not exactly "0", the publish runs without injecting `NPM_TOKEN` so the
 * ambient npm authentication (credentials resolver / keychain / `.npmrc`) is used;
 * when it is exactly "0", the resolved npm secret is injected as before.
 */
/**
 * @description Inputs a {@link PublishStrategy} needs to run the local npm publish step.
 * @interface PublishContext
 * @property {string} npmToken - Resolved npm auth token
 * @property {"public" | "restricted"} accessValue - npm `--access` value
 * @property {boolean} isPrerelease - Whether the bump was a prerelease (needs `--tag prerelease`)
 * @property {string} cwd - Repository root
 * @property {boolean} interactivePublish - When `true`, publish without injecting `NPM_TOKEN` so npm's ambient authentication (keychain/`.npmrc`) is used; set from `NPM_PUBLISH_INTERACTIVE` (enabled unless it is exactly `0`)
 * @memberOf module:utils
 */
export interface PublishContext {
  npmToken: string;
  accessValue: "public" | "restricted";
  isPrerelease: boolean;
  cwd: string;
  interactivePublish: boolean;
  // When set, every target appends its own dry-run flag (npm/pnpm `--dry-run`,
  // JSR `npx jsr publish --dry-run`) so a release can be rehearsed end-to-end
  // without contacting a registry.
  dryRun?: boolean;
  // Optional JSR token, injected as JSR_TOKEN only when present; JSR publish also
  // supports OIDC/ambient auth, so an absent token is not an error.
  jsrToken?: string;
}

/**
 * @description Strategy for the local (skip-CI) npm publish step.
 * @summary Lets a repo's release process diverge from a plain `npm publish` from the
 * repo root -- e.g. an Angular library published from its ng-packagr build output --
 * without special-casing that repo in this shared class. Add a new implementation for
 * each new kind of exception and register it in {@link PUBLISH_STRATEGIES}; a repo
 * opts in via its own package.json, not by editing this file.
 * @interface PublishStrategy
 * @memberOf module:utils
 */
export interface PublishStrategy {
  publish(ctx: PublishContext): void;
}

// A single registry publishing target (npm, pnpm, JSR/deno). One target runs
// exactly one publish command; a PublishStrategy owns the location (repo root vs a
// build subdirectory) and runs an ordered list of these targets.
export interface PublishTarget {
  readonly name: string;
  publish(ctx: PublishContext): void;
}

// Per-package JSR (deno) publish configuration. JSR publishes from the
// directory holding `jsr.json`/`deno.json`; when `dir` is omitted the location
// strategy's own directory is used. `enabled` forces JSR on/off regardless of
// config-file discovery.
export interface JsrPublishConfig {
  enabled?: boolean;
  dir?: string;
  configFile?: string;
  dryRun?: boolean;
}

// Default registry set: npm (as today) plus pnpm (same npm registry) and JSR.
export const DEFAULT_PUBLISH_TARGETS: string[] = ["npm", "pnpm", "jsr"];

// Config files JSR itself resolves, in its own precedence order.
export const JSR_CONFIG_FILES: string[] = [
  "jsr.json",
  "jsr.jsonc",
  "deno.json",
  "deno.jsonc",
];

// Normalizes a publish directory so npm never parses a bare relative path
// (e.g. "dist/lib") as a `<github-user>/<repo>` spec.
export function normalizePublishDir(dir: string): string {
  return dir.startsWith(".") || dir.startsWith("/") ? dir : `./${dir}`;
}

// Rejects any value that could break out of the double-quoted shell argument it is
// interpolated into. This is the CWE-78 guard for the publish commands.
function assertShellSafe(value: string, label: string): string {
  if (/[\0\n\r"`$\\]/.test(value)) {
    throw new Error(
      `${label} contains characters that are unsafe to interpolate into a shell command: ${JSON.stringify(value)}`
    );
  }
  return value;
}

function accessFlag(ctx: PublishContext): string {
  if (ctx.accessValue !== "public" && ctx.accessValue !== "restricted") {
    throw new Error(
      `Invalid publish access value: ${JSON.stringify(ctx.accessValue)}`
    );
  }
  return `--access "${ctx.accessValue}"`;
}

function publishDirArg(dir: string): string {
  if (!dir || dir === ".") return "";
  return ` "${assertShellSafe(normalizePublishDir(dir), "publish directory")}"`;
}

// npm/pnpm take the token through the child environment, never through the shell
// command string, so a token value can never be interpreted by the shell.
function npmPublishEnv(ctx: PublishContext): NodeJS.ProcessEnv {
  return ctx.interactivePublish || !ctx.npmToken
    ? { ...process.env }
    : { ...process.env, NPM_TOKEN: assertShellSafe(ctx.npmToken, "npm token") };
}

function jsrPublishEnv(ctx: PublishContext): NodeJS.ProcessEnv {
  return ctx.jsrToken
    ? { ...process.env, JSR_TOKEN: assertShellSafe(ctx.jsrToken, "JSR token") }
    : { ...process.env };
}

function dryRunFlag(ctx: PublishContext, targetDryRun?: boolean): string {
  return ctx.dryRun || targetDryRun ? " --dry-run" : "";
}

// npm registry target: `npm publish` from the configured directory. Injects
// `NPM_TOKEN` through the child environment unless `ctx.interactivePublish` is
// set, in which case npm's ambient authentication (keychain/`.npmrc`) is used.
// Appends `--dry-run` when `ctx.dryRun` is set.
export class NpmPublishTarget implements PublishTarget {
  readonly name = "npm";

  constructor(private readonly dir: string = ".") {}

  publish(ctx: PublishContext): void {
    const tagFlag = ctx.isPrerelease ? " --tag prerelease" : "";
    const command = `npm publish${publishDirArg(this.dir)} --ignore-scripts ${accessFlag(ctx)}${tagFlag}${dryRunFlag(ctx)}`;
    execSync(command, {
      cwd: ctx.cwd,
      stdio: "inherit",
      env: npmPublishEnv(ctx),
    });
  }
}

// pnpm registry target: `pnpm publish` against the same npm registry. Reuses
// the npm auth path (`NPM_TOKEN` via the child environment, or ambient auth when
// `ctx.interactivePublish` is set) and disables pnpm's own git checks with
// `--no-git-checks`, since the release script owns the git state.
export class PnpmPublishTarget implements PublishTarget {
  readonly name = "pnpm";

  constructor(private readonly dir: string = ".") {}

  publish(ctx: PublishContext): void {
    const tagFlag = ctx.isPrerelease ? " --tag prerelease" : "";
    const command = `pnpm publish${publishDirArg(this.dir)} --no-git-checks ${accessFlag(ctx)}${tagFlag}${dryRunFlag(ctx)}`;
    execSync(command, {
      cwd: ctx.cwd,
      stdio: "inherit",
      env: npmPublishEnv(ctx),
    });
  }
}

// JSR (deno) target: `npx jsr publish`, no global deno required. Resolves
// the package's JSR config from `jsr.json`/`deno.json` (or a package.json
// `jsr`/`publishConfig` field); when no JSR config is discoverable the target
// is skipped rather than failing an npm-only release. `ctx.dryRun` (or the
// target's own `dryRun`) appends `--dry-run`.
export class JsrPublishTarget implements PublishTarget {
  readonly name = "jsr";

  constructor(
    private readonly dir: string = ".",
    private readonly config: JsrPublishConfig = {}
  ) {}

  publish(ctx: PublishContext): void {
    if (this.config.enabled === false) return;
    const dir = this.config.dir || this.dir;
    const cwd =
      dir === "." ? ctx.cwd : isAbsolute(dir) ? dir : join(ctx.cwd, dir);
    const configFile = resolveJsrConfigFile(cwd, this.config.configFile);
    if (!configFile && this.config.enabled !== true) {
      return;
    }
    const command = `npx jsr publish${dryRunFlag(ctx, this.config.dryRun)}`;
    execSync(command, {
      cwd,
      stdio: "inherit",
      env: jsrPublishEnv(ctx),
    });
  }
}

// Resolves the JSR config file for a package directory, mirroring JSR's own
// discovery order: `jsr.json`, then `deno.json`/`deno.jsonc`; falls back to a
// package.json carrying a `jsr` field or a `publishConfig.jsr`/JSR registry
// declaration. Returns `undefined` when the directory has no JSR configuration,
// which lets npm-only repos opt out.
export function resolveJsrConfigFile(
  dir: string,
  configFile?: string
): string | undefined {
  if (configFile) {
    const explicit = isAbsolute(configFile) ? configFile : join(dir, configFile);
    return existsSync(explicit) ? explicit : undefined;
  }
  for (const name of JSR_CONFIG_FILES) {
    const candidate = join(dir, name);
    if (existsSync(candidate)) return candidate;
  }
  try {
    const pkg = JSON.parse(readFileSync(join(dir, "package.json"), "utf8"));
    if (pkg && typeof pkg === "object") {
      if (pkg.jsr) return join(dir, "package.json");
      const publishConfig = pkg.publishConfig;
      if (publishConfig && typeof publishConfig === "object") {
        if (publishConfig.jsr) return join(dir, "package.json");
        if (
          typeof publishConfig.registry === "string" &&
          publishConfig.registry.includes("jsr")
        ) {
          return join(dir, "package.json");
        }
      }
    }
  } catch {
    // no package.json / unparseable -> not JSR configured
  }
  return undefined;
}

// Registry of publish target factories, keyed by target name.
// `resolvePublishTargets` maps a `tagRelease.targets` list (default: all of
// DEFAULT_PUBLISH_TARGETS) onto these factories; "deno" is an alias of "jsr".
export const PUBLISH_TARGETS: Record<
  string,
  (config: TagReleaseConfig, dir: string) => PublishTarget
> = {
  npm: (_config, dir) => new NpmPublishTarget(dir),
  pnpm: (_config, dir) => new PnpmPublishTarget(dir),
  jsr: (config, dir) => new JsrPublishTarget(dir, config.jsr),
  deno: (config, dir) => new JsrPublishTarget(dir, config.jsr),
};

// Resolves the ordered publish targets from a repo's tagRelease config.
// Missing/empty `targets` defaults to DEFAULT_PUBLISH_TARGETS; unknown names are
// ignored. Target order is preserved so npm always publishes first.
export function resolvePublishTargets(
  config: TagReleaseConfig = {},
  dir: string = "."
): PublishTarget[] {
  const names =
    Array.isArray(config.targets) && config.targets.length > 0
      ? config.targets
      : DEFAULT_PUBLISH_TARGETS;
  const targets: PublishTarget[] = [];
  for (const name of names) {
    const factory = PUBLISH_TARGETS[name];
    if (factory) targets.push(factory(config, dir));
  }
  return targets;
}

// Default targets for a location strategy that was constructed without an explicit
// config: npm, pnpm and JSR, all publishing from the given directory.
function defaultPublishTargets(dir: string): PublishTarget[] {
  return [
    new NpmPublishTarget(dir),
    new PnpmPublishTarget(dir),
    new JsrPublishTarget(dir),
  ];
}

/**
 * @description Default publish strategy: `npm publish` from the repository root.
 * @summary Lets the local (skip-CI) publish run either with an injected
 * `NPM_TOKEN` (non-interactive, token passed via the command environment) or,
 * when `ctx.interactivePublish` is set, without any token so npm's ambient
 * authentication (keychain/`.npmrc`) is used.
 * @class RootPublishStrategy
 * @implements {PublishStrategy}
 * @memberOf module:utils
 */
export class RootPublishStrategy implements PublishStrategy {
  constructor(
    private readonly targets: PublishTarget[] = defaultPublishTargets(".")
  ) {}

  publish(ctx: PublishContext): void {
    for (const target of this.targets) target.publish(ctx);
  }
}

/**
 * @description Publishes a subdirectory's own package.json, optionally building it first.
 * @summary For repos whose publishable output lives in a subdirectory with its own
 * package.json -- e.g. `dist/lib` from ng-packagr -- rather than the repo root.
 * Like {@link RootPublishStrategy}, it injects `NPM_TOKEN` unless
 * `ctx.interactivePublish` is set, in which case npm's ambient authentication
 * is used.
 * @class SubdirectoryPublishStrategy
 * @implements {PublishStrategy}
 * @param {string} dir - Directory (relative to the repo root) to publish
 * @param {string} [prePublishScript] - npm script to run before publishing
 * @memberOf module:utils
 */
export class SubdirectoryPublishStrategy implements PublishStrategy {
  constructor(
    private readonly dir: string,
    private readonly prePublishScript?: string,
    private readonly targets?: PublishTarget[]
  ) {}

  publish(ctx: PublishContext): void {
    if (this.prePublishScript) {
      execSync(`npm run ${this.prePublishScript}`, {
        cwd: ctx.cwd,
        stdio: "inherit",
      });
    }
    const targets = this.targets ?? defaultPublishTargets(this.dir);
    for (const target of targets) target.publish(ctx);
  }
}

/**
 * @description Per-repository release overrides, read from package.json's `tagRelease` key.
 * @summary `strategy` selects a {@link PublishStrategy} by name from
 * {@link PUBLISH_STRATEGIES}; when omitted, "subdirectory" is inferred if `publishDir`
 * or `prePublishScript` is set, else "root". Add fields here as new strategies need
 * their own config, e.g.:
 * `{ "tagRelease": { "strategy": "subdirectory", "publishDir": "dist/lib", "prePublishScript": "build:prod" } }`.
 * @typedef {Object} TagReleaseConfig
 * @property {string} [strategy] - Publish strategy name (a key in {@link PUBLISH_STRATEGIES})
 * @property {string} [publishDir] - Directory to publish (subdirectory strategy)
 * @property {string} [prePublishScript] - npm script to run before publishing (subdirectory strategy)
 * @memberOf module:utils
 */
export interface TagReleaseConfig {
  strategy?: string;
  publishDir?: string;
  prePublishScript?: string;
  targets?: string[];
  dryRun?: boolean;
  jsr?: JsrPublishConfig;
}

/**
 * @description Registry of named publish strategies, resolved from {@link TagReleaseConfig}.
 * @summary Add an entry here for each new {@link PublishStrategy} implementation, so a
 * repo can opt in via `"tagRelease": { "strategy": "<name>" }` in its own package.json
 * -- scaling to new release-process exceptions never requires touching this class.
 * @const PUBLISH_STRATEGIES
 * @memberOf module:utils
 */
export const PUBLISH_STRATEGIES: Record<
  string,
  (config: TagReleaseConfig) => PublishStrategy
> = {
  root: (config) => new RootPublishStrategy(resolvePublishTargets(config, ".")),
  subdirectory: (config) =>
    new SubdirectoryPublishStrategy(
      config.publishDir || ".",
      config.prePublishScript,
      resolvePublishTargets(config, config.publishDir || ".")
    ),
};

export class ReleaseScript extends Command<typeof options, void> {
  constructor() {
    super("ReleaseScript", options);
  }

  /**
   * @description Reads this repo's tag-release config.
   * @summary Missing file/key/parse errors all resolve to "no overrides" -- config is
   * optional, absence just means the default {@link RootPublishStrategy}.
   * @returns {TagReleaseConfig} The repo's tagRelease config, or an empty object
   */
  private readTagReleaseConfig(): TagReleaseConfig {
    try {
      const pkg = JSON.parse(readFileSync("package.json", "utf8"));
      return (pkg.tagRelease as TagReleaseConfig) || {};
    } catch {
      return {};
    }
  }

  /**
   * @description Resolves this repo's {@link PublishStrategy} from its tagRelease config.
   * @summary An explicit `strategy` name wins; otherwise "subdirectory" is inferred
   * when `publishDir`/`prePublishScript` is set, else "root". An unrecognized strategy
   * name logs a warning and falls back to {@link RootPublishStrategy} rather than
   * failing the release outright.
   * @returns {PublishStrategy}
   */
  private resolvePublishStrategy(): PublishStrategy {
    const config = this.readTagReleaseConfig();
    const name =
      config.strategy ||
      (config.publishDir || config.prePublishScript ? "subdirectory" : "root");
    const factory = PUBLISH_STRATEGIES[name];
    if (!factory) {
      this.log
        .for(this.resolvePublishStrategy)
        .warn(
          `Unknown tagRelease.strategy '${name}'; falling back to the root strategy.`
        );
      return new RootPublishStrategy();
    }
    return factory(config);
  }

  private ensureReleaseBranch(): void {
    const currentBranch = execSync("git rev-parse --abbrev-ref HEAD", {
      cwd: process.cwd(),
      encoding: "utf8",
    }).trim();
    if (currentBranch !== "master" && currentBranch !== "main") {
      throw new Error(
        `release must be run from 'master' or 'main' branch. Current branch: ${currentBranch}`
      );
    }
  }

  /**
   * @description Derives the semver bump type from a release message's suffix.
   * @summary -breaking bumps major, -bug/-fix bump patch, -prerelease triggers a
   * prerelease bump, and no matching suffix defaults to minor. Any trailing skip-CI
   * flag (this project's -no-ci, or one of GitHub's native [skip ci]-style keywords)
   * is stripped only for this check; the message itself is returned untouched by the
   * caller so every flag stays in the committed/tagged text.
   * @param {string} message - The release message
   * @returns {string} One of the {@link SemVersion} values
   */
  deriveBumpType(message: string): string {
    const stripped = stripSkipCiSuffix(message);
    if (stripped.endsWith(BreakingFlag)) return SemVersion.MAJOR;
    if (stripped.endsWith(BugFlag) || stripped.endsWith(FixFlag))
      return SemVersion.PATCH;
    if (stripped.endsWith(PrereleaseFlag)) return SemVersion.PRERELEASE;
    return SemVersion.MINOR;
  }

  /**
   * @description Prepares the version for the release.
   * @summary Validates the provided tag, or falls back to the derived bump type
   * (confirmed interactively) if none was given.
   * @param {string} [tag] - The version tag to prepare
   * @param {string} suggested - The bump type derived from the release message
   * @returns {Promise<string>} The prepared version tag
   */
  async prepareVersion(
    tag: string | undefined,
    suggested: string
  ): Promise<string> {
    const log = this.log.for(this.prepareVersion);
    const validated = this.testVersion((tag as string) || "");
    if (validated) return validated;

    log.verbose(
      "No release version provided. Deriving one from the message:"
    );
    log.info(`Listing latest git tags:`);
    execSync("git tag --sort=-taggerdate | head -n 5", {
      cwd: process.cwd(),
      stdio: "inherit",
    });

    const useSuggested = await UserInput.askConfirmation(
      "tag-suggestion",
      `Use '${suggested}' as the version bump?`,
      true
    );
    if (useSuggested) return suggested;

    return await UserInput.insistForText(
      "tag",
      "Enter the new tag number (patch|minor|major|prerelease or v*.*.*[-...])",
      (val) => !!this.testVersion(val.toString())
    );
  }

  /**
   * @description Tests if the provided version is valid.
   * @summary This method checks if the version is a valid semantic version or a predefined update type (PATCH, MINOR, MAJOR, PRERELEASE).
   * @param {string} version - The version to test
   * @returns {string | undefined} The validated version or undefined if invalid
   */
  testVersion(version: string): string | undefined {
    const log = this.log.for(this.testVersion);
    version = version.trim().toLowerCase();
    switch (version) {
      case SemVersion.PATCH:
      case SemVersion.MINOR:
      case SemVersion.MAJOR:
      case SemVersion.PRERELEASE:
        log.verbose(`Using provided SemVer update: ${version}`, 1);
        return version;
      default:
        log.verbose(
          `Testing provided version for SemVer compatibility: ${version}`,
          1
        );
        if (!new RegExp(SemVersionRegex).test(version)) {
          log.debug(`Invalid version number: ${version}`);
          return undefined;
        }
        log.verbose(`version approved: ${version}`, 1);
        return version;
    }
  }

  /**
   * @description Prepares the release message.
   * @summary This method either returns the provided message or prompts the user for a new one if not provided.
   * @param {string} [message] - The release message
   * @returns {Promise<string>} The prepared release message
   */
  async prepareMessage(message?: string): Promise<string> {
    const log = this.log.for(this.prepareMessage);
    if (!message) {
      log.verbose("No release message provided. Prompting for one");
      return await UserInput.insistForText(
        "message",
        "What should be the release message/ticket? (end with -bug/-fix, -breaking or -prerelease to pick the version bump; no matching suffix defaults to minor)",
        (val) => !!val && val.toString().length > 5
      );
    }
    return message;
  }

  protected override help(): void {
    printCommandHelp(
      this.log,
      "tag-release",
      "Prepare, tag, and publish a release from the current repository (TypeScript-native alternative to bin/tag-release.sh).",
      "tag-release [options] [tag] [message...]",
      [
        {
          flag: "--tag <version>, [tag]",
          description:
            "Release tag to use (patch|minor|major|prerelease or v*.*.*[-...]). Also accepted as the first positional argument. Omit to derive it from the message.",
        },
        {
          flag: "--message <text>, [message...]",
          description:
            "Release message or ticket reference. Also accepted as everything after the positional tag, unquoted (e.g. 'tag-release patch fix a bug'). A -bug/-fix suffix bumps patch, -breaking bumps major, -prerelease bumps prerelease; no matching suffix defaults to minor.",
        },
        {
          flag: "--public",
          description: "Publish to the public npm registry",
          defaultValue: "false",
        },
        {
          flag: "--private",
          description: "Publish to the restricted npm registry",
          defaultValue: "false",
        },
        {
          flag: "--no-ci",
          description:
            "Append [skip ci] to the release message (unless it already ends with -no-ci or a GitHub skip-CI keyword) and publish locally (npm, pnpm and JSR) instead of waiting for CI.",
          defaultValue: "false",
        },
        {
          flag: "--git-token <name>",
          description: "Secret name for the git push token",
          defaultValue: "github",
        },
        {
          flag: "--npm-token <name>",
          description: "Secret name for the npm publish token",
          defaultValue: "npm",
        },
        {
          flag: "--git-user <name>",
          description: "Git user name embedded in authenticated pushes",
        },
        {
          flag: "--jsr-token <name>",
          description:
            "Secret name for the JSR (deno) publish token (optional; JSR also supports ambient/OIDC auth)",
          defaultValue: "jsr",
        },
        {
          flag: "--dry-run",
          description:
            "Rehearse publishing to npm, pnpm and JSR without contacting any registry",
          defaultValue: "false",
        },
        {
          flag: "--version",
          description: "Print the package version and exit",
        },
        {
          flag: "-h, --help",
          description: "Show this help text and exit",
        },
      ],
      [
        "If tag or message are omitted (via flag or positional), the command prompts interactively.",
        "A successful run updates the package version, creates a git tag, pushes tags, and optionally publishes to npm, pnpm and JSR (deno).",
        "Tokens are resolved via the credentials command (env var → OS keychain → legacy .token/.npmtoken file).",
        "A message word starting with '-' (e.g. the -bug/-fix/-breaking/-prerelease suffix) needs a leading -- so it isn't parsed as a flag, e.g. tag-release -- fix login crash -bug",
      ],
      [
        "tag-release patch fix login crash",
        "tag-release -- fix login crash -bug",
        "tag-release prerelease JIRA-1234 preview build --no-ci",
      ]
    );
  }

  /**
   * @description Runs the release script.
   * @summary Orchestrates the entire release process: message/version preparation,
   * git tagging, authenticated push, and conditional npm publish. Mirrors
   * bin/tag-release.sh step for step.
   * @param {ParseArgsResult} args - The parsed command-line arguments
   * @returns {Promise<void>}
   */
  async run(
    args: LoggingConfig &
      typeof DefaultCommandValues & {
        [k in keyof typeof options]: unknown;
      } & { positionals: string[] }
  ): Promise<void> {
    const log = this.log.for(this.run);
    this.ensureReleaseBranch();

    const publishAccessValue = args.private === true ? "restricted" : "public";
    const gitTokenName = `${args["git-token"] || "github"}`;
    const npmTokenName = `${args["npm-token"] || "npm"}`;
    const jsrTokenName = `${args["jsr-token"] || "jsr"}`;
    const dryRun =
      args["dry-run"] === true || this.readTagReleaseConfig().dryRun === true;

    // Mirrors bin/tag-release.sh's positional convention, but only consumes the
    // leading positional as the tag when it actually validates as one; otherwise
    // there was no explicit tag and the whole positional list is the message (so a
    // typo'd/omitted tag doesn't silently drop words from the message).
    const positionals = args.positionals || [];
    let tagArg: string | undefined =
      typeof args.tag === "string" && args.tag.trim().length > 0
        ? (args.tag as string)
        : undefined;
    let messageArg: string | undefined =
      typeof args.message === "string" && args.message.trim().length > 0
        ? (args.message as string)
        : undefined;

    if (tagArg === undefined && positionals.length > 0) {
      if (this.testVersion(positionals[0])) {
        tagArg = positionals[0];
        if (messageArg === undefined && positionals.length > 1) {
          messageArg = positionals.slice(1).join(" ");
        }
      } else if (messageArg === undefined) {
        messageArg = positionals.join(" ");
      }
    }

    // Matches bin/tag-release.sh's ordering: prepare-release runs right after args
    // are parsed, before message/tag are resolved (which may prompt interactively).
    execSync("npm run prepare-release", {
      cwd: process.cwd(),
      stdio: "inherit",
    });

    let message: string = await this.prepareMessage(messageArg);
    if (args["no-ci"] === true && !hasSkipCiSuffix(message)) {
      message = `${message} ${PreferredSkipCiFlag}`;
    }
    // Normalize whatever skip-CI flag ended up in the message (-no-ci, a GitHub
    // native keyword, or the one --no-ci just appended) to the one canonical flag,
    // so every downstream consumer only ever needs to test for a single flag.
    if (hasSkipCiSuffix(message)) {
      message = `${stripSkipCiSuffix(message)} ${PreferredSkipCiFlag}`;
    }

    const suggestedBump = this.deriveBumpType(message);
    const tag: string = await this.prepareVersion(tagArg, suggestedBump);

    // Matches bin/tag-release.sh: commit whatever prepare-release changed, no prompt.
    const status = execSync("git status --porcelain", {
      cwd: process.cwd(),
      encoding: "utf8",
    });
    if (status.trim().length > 0) {
      execSync("git add .", { cwd: process.cwd(), stdio: "inherit" });
      execSync(
        `git commit -m "${tag} - ${message} - after release preparation"`,
        { cwd: process.cwd(), stdio: "inherit" }
      );
    }

    execSync(`npm version "${tag}" -m "${message}"`, {
      cwd: process.cwd(),
      stdio: "inherit",
    });

    const remoteUrl = execSync("git remote get-url origin", {
      cwd: process.cwd(),
      encoding: "utf8",
    }).trim();
    const interactivePublish = process.env.NPM_PUBLISH_INTERACTIVE !== "0";

    if (hasSecret(gitTokenName)) {
      const currentBranch = execSync("git rev-parse --abbrev-ref HEAD", {
        cwd: process.cwd(),
        encoding: "utf8",
      }).trim();
      let upstream = "";
      try {
        upstream = execSync(
          "git rev-parse --abbrev-ref --symbolic-full-name '@{u}'",
          { cwd: process.cwd(), encoding: "utf8" }
        ).trim();
      } catch {
        upstream = "";
      }

      const gitUser =
        typeof args["git-user"] === "string" &&
        (args["git-user"] as string).trim().length > 0
          ? (args["git-user"] as string).trim()
          : execSync("git config user.name", {
              cwd: process.cwd(),
              encoding: "utf8",
            }).trim();

      const token = resolveSecret(gitTokenName);
      execSync(
        `git push "https://${gitUser}:${token}@${remoteUrl.replace(/^https:\/\//, "")}" --follow-tags`,
        { cwd: process.cwd(), stdio: "inherit" }
      );

      if (upstream.length > 0) {
        try {
          execSync(
            `git branch --set-upstream-to="${upstream}" "${currentBranch}"`,
            { cwd: process.cwd(), stdio: "inherit" }
          );
        } catch {
          // ignore restore failures
        }
      }
    } else {
      execSync("git push --follow-tags", {
        cwd: process.cwd(),
        stdio: "inherit",
      });
    }

    if (hasSkipCiSuffix(message)) {
      const strategy = this.resolvePublishStrategy();
      const context: PublishContext = {
        npmToken: "",
        accessValue: publishAccessValue as "public" | "restricted",
        isPrerelease: tag === SemVersion.PRERELEASE,
        cwd: process.cwd(),
        interactivePublish,
        dryRun,
      };

      if (dryRun) {
        // A dry-run never contacts a registry, so no token is required.
        strategy.publish({ ...context, interactivePublish: true });
      } else if (interactivePublish) {
        strategy.publish({ ...context, interactivePublish: true });
      } else if (hasSecret(npmTokenName)) {
        context.npmToken = resolveSecret(npmTokenName);
        context.interactivePublish = false;
        if (hasSecret(jsrTokenName)) context.jsrToken = resolveSecret(jsrTokenName);
        strategy.publish(context);
      } else {
        log.warn(
          `Release message ends with a skip-CI flag, so CI will skip publishing too, but no npm token was found (checked secret '${npmTokenName}') — this release will not be published anywhere. Publish it manually or configure the token.`
        );
      }
    } else {
      log.info("Skipping local publish; CI will publish this release.");
    }
  }
}
