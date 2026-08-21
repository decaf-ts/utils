/**
 * @description Default encoding for text operations.
 * @summary The standard UTF-8 encoding used for text processing.
 * @const {string} Encoding
 * @memberOf module:utils
 */
export const Encoding = "utf-8";

/**
 * @description Regular expression for semantic versioning.
 * @summary A regex pattern to match and parse semantic version strings.
 * @const {RegExp} SemVersionRegex
 * @memberOf module:utils
 */
export const SemVersionRegex =
  /^(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z-]+(?:\.[0-9A-Za-z])))/g;

/**
 * @description Enum for semantic version components.
 * @summary Defines the three levels of semantic versioning: PATCH, MINOR, and MAJOR.
 * @enum {string}
 * @memberOf module:utils
 */
export enum SemVersion {
  /** Patch version for backwards-compatible bug fixes. */
  PATCH = "patch",
  /** Minor version for backwards-compatible new features. */
  MINOR = "minor",
  /** Major version for changes that break backwards compatibility. */
  MAJOR = "major",
  /** Prerelease version, published under the "prerelease" npm dist-tag. */
  PRERELEASE = "prerelease",
}

/**
 * @description Flag to indicate non-CI environment.
 * @summary Used to specify that a command should run outside of a Continuous Integration environment.
 * @const {string} NoCIFLag
 * @memberOf module:utils
 */
export const NoCIFLag = "-no-ci";

/**
 * @description GitHub's natively-recognized commit-message skip-CI keywords.
 * @summary GitHub Actions automatically skips creating a workflow run (before any
 * job starts, for `push`/`pull_request` events only) when the commit message ends
 * with one of these exact strings. Not configurable, not a regex -- these are the
 * fixed set the platform checks for. Distinct from {@link NoCIFLag}, which is this
 * project's own convention that GitHub doesn't recognize natively.
 * @const {string[]} GithubNativeSkipCiFlags
 * @memberOf module:utils
 */
export const GithubNativeSkipCiFlags: string[] = [
  "[skip ci]",
  "[ci skip]",
  "[no ci]",
  "[skip actions]",
  "[actions skip]",
];

/**
 * @description The native skip-CI keyword to prefer when generating a message.
 * @summary Whenever this tooling needs to mark a release message as "skip CI" itself
 * (rather than just recognizing one a human already typed), it appends this one --
 * `[skip ci]` is the most widely recognized form, including by GitHub's own native
 * skip mechanism -- so CI is skipped both by our own job-level checks and, for
 * `push`/`pull_request`-triggered workflows, natively by GitHub before any run starts.
 * @const {string} PreferredSkipCiFlag
 * @memberOf module:utils
 */
export const PreferredSkipCiFlag = GithubNativeSkipCiFlags[0];

/**
 * @description Every skip-CI suffix this tooling recognizes.
 * @summary {@link NoCIFLag} plus every entry in {@link GithubNativeSkipCiFlags}. Used to
 * detect whether a release message asks to skip CI, regardless of which convention
 * the author used.
 * @const {string[]} AllSkipCiFlags
 * @memberOf module:utils
 */
export const AllSkipCiFlags: string[] = [NoCIFLag, ...GithubNativeSkipCiFlags];

/**
 * @description Checks whether a message ends with any recognized skip-CI suffix.
 * @summary Trims trailing whitespace before comparing, so "-bug [skip ci]" is
 * detected the same as "-bug[skip ci]".
 * @param {string} message - The message to check
 * @returns {boolean} Whether the message ends with a recognized skip-CI flag
 * @function hasSkipCiSuffix
 * @memberOf module:utils
 */
export function hasSkipCiSuffix(message: string): boolean {
  const trimmed = message.trimEnd();
  return AllSkipCiFlags.some((flag) => trimmed.endsWith(flag));
}

/**
 * @description Strips a trailing skip-CI suffix (and the whitespace before it) from a message.
 * @summary Used to look past the skip-CI flag when deriving the semver bump type from
 * a message's *other* suffix (e.g. -bug/-fix/-breaking/-prerelease). Only the first
 * matching flag (checked in {@link AllSkipCiFlags} order) is stripped.
 * @param {string} message - The message to strip
 * @returns {string} The message with any trailing skip-CI flag removed
 * @function stripSkipCiSuffix
 * @memberOf module:utils
 */
export function stripSkipCiSuffix(message: string): string {
  const trimmed = message.trimEnd();
  for (const flag of AllSkipCiFlags) {
    if (trimmed.endsWith(flag)) {
      return trimmed.slice(0, -flag.length).trimEnd();
    }
  }
  return trimmed;
}

/**
 * @description Release-message suffix flags used to derive the semver bump type.
 * @summary Appended to a tag-release message to pick the version bump: -bug/-fix bump
 * patch, -breaking bumps major, -prerelease triggers a prerelease bump. No matching
 * suffix defaults to minor. Checked after stripping a trailing {@link NoCIFLag}.
 * @const {string} BugFlag
 * @const {string} FixFlag
 * @const {string} BreakingFlag
 * @const {string} PrereleaseFlag
 * @memberOf module:utils
 */
export const BugFlag = "-bug";
export const FixFlag = "-fix";
export const BreakingFlag = "-breaking";
export const PrereleaseFlag = "-prerelease";

/**
 * @description Key for the setup script in package.json.
 * @summary Identifies the script that runs after package installation.
 * @const {string} SetupScriptKey
 * @memberOf module:utils
 */
export const SetupScriptKey = "postinstall";

/**
 * @description Enum for various authentication tokens.
 * @summary Defines the file names for storing different types of authentication tokens.
 * @enum {string}
 * @memberOf module:utils
 */
export enum Tokens {
  /** Git authentication token file name. */
  GIT = ".token",
  /** NPM authentication token file name. */
  NPM = ".npmtoken",
  /** Docker authentication token file name. */
  DOCKER = ".dockertoken",
  /** Confluence authentication token file name. */
  CONFLUENCE = ".confluence-token",
}

/**
 * @description Code used to indicate an operation was aborted.
 * @summary Standard message used when a process is manually terminated.
 * @const {string} AbortCode
 * @memberOf module:utils
 */
export const AbortCode = "Aborted";
