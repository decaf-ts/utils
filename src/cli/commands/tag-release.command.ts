/* istanbul ignore file */
import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";
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
 */
/**
 * @description Inputs a {@link PublishStrategy} needs to run the local npm publish step.
 * @interface PublishContext
 * @property {string} npmToken - Resolved npm auth token
 * @property {"public" | "restricted"} accessValue - npm `--access` value
 * @property {boolean} isPrerelease - Whether the bump was a prerelease (needs `--tag prerelease`)
 * @property {string} cwd - Repository root
 * @memberOf module:utils
 */
export interface PublishContext {
  npmToken: string;
  accessValue: "public" | "restricted";
  isPrerelease: boolean;
  cwd: string;
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

/**
 * @description Default publish strategy: `npm publish` from the repository root.
 * @class RootPublishStrategy
 * @implements {PublishStrategy}
 * @memberOf module:utils
 */
export class RootPublishStrategy implements PublishStrategy {
  publish(ctx: PublishContext): void {
    const tagFlag = ctx.isPrerelease ? " --tag prerelease" : "";
    execSync(
      `NPM_TOKEN="${ctx.npmToken}" npm publish --ignore-scripts --access "${ctx.accessValue}"${tagFlag}`,
      { cwd: ctx.cwd, stdio: "inherit" }
    );
  }
}

/**
 * @description Publishes a subdirectory's own package.json, optionally building it first.
 * @summary For repos whose publishable output lives in a subdirectory with its own
 * package.json -- e.g. `dist/lib` from ng-packagr -- rather than the repo root.
 * @class SubdirectoryPublishStrategy
 * @implements {PublishStrategy}
 * @param {string} dir - Directory (relative to the repo root) to publish
 * @param {string} [prePublishScript] - npm script to run before publishing
 * @memberOf module:utils
 */
export class SubdirectoryPublishStrategy implements PublishStrategy {
  constructor(
    private readonly dir: string,
    private readonly prePublishScript?: string
  ) {}

  publish(ctx: PublishContext): void {
    if (this.prePublishScript) {
      execSync(`npm run ${this.prePublishScript}`, {
        cwd: ctx.cwd,
        stdio: "inherit",
      });
    }
    // A bare relative path (e.g. "dist/lib") is ambiguous to npm -- it can be parsed
    // as a <github-user>/<repo> spec instead of a local folder. "./" disambiguates it.
    const dir =
      this.dir.startsWith(".") || this.dir.startsWith("/")
        ? this.dir
        : `./${this.dir}`;
    const tagFlag = ctx.isPrerelease ? " --tag prerelease" : "";
    execSync(
      `NPM_TOKEN="${ctx.npmToken}" npm publish "${dir}" --ignore-scripts --access "${ctx.accessValue}"${tagFlag}`,
      { cwd: ctx.cwd, stdio: "inherit" }
    );
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
  root: () => new RootPublishStrategy(),
  subdirectory: (config) =>
    new SubdirectoryPublishStrategy(
      config.publishDir || ".",
      config.prePublishScript
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
            "Append [skip ci] to the release message (unless it already ends with -no-ci or a GitHub skip-CI keyword) and publish to npm locally instead of waiting for CI.",
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
        "A successful run updates the package version, creates a git tag, pushes tags, and optionally publishes to npm.",
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
      if (hasSecret(npmTokenName)) {
        const npmToken = resolveSecret(npmTokenName);
        const strategy = this.resolvePublishStrategy();
        strategy.publish({
          npmToken,
          accessValue: publishAccessValue as "public" | "restricted",
          isPrerelease: tag === SemVersion.PRERELEASE,
          cwd: process.cwd(),
        });
      } else {
        log.warn(
          `Release message ends with a skip-CI flag, so CI will skip publishing too, but no npm token was found (checked secret '${npmTokenName}') — this release will not be published anywhere. Publish it manually or configure the token.`
        );
      }
    } else {
      log.info("Skipping local npm publish; CI will publish this release.");
    }
  }
}
