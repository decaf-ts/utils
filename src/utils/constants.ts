/**
 * @description Default encoding for text operations.
 * @summary The standard UTF-8 encoding used for text processing.
 * @const {string} Encoding
 * @memberOf @decaf-ts/utils
 */
export const Encoding = "utf-8";

/**
 * @description Regular expression for semantic versioning.
 * @summary A regex pattern to match and parse semantic version strings.
 * @const {RegExp} SemVersionRegex
 * @memberOf @decaf-ts/utils
 */
export const SemVersionRegex =
  /^(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z-]+(?:\.[0-9A-Za-z])))/g;

/**
 * @description Enum for semantic version components.
 * @summary Defines the three levels of semantic versioning: PATCH, MINOR, and MAJOR.
 * @enum {string}
 * @memberOf @decaf-ts/utils
 */
export enum SemVersion {
  /** Patch version for backwards-compatible bug fixes. */
  PATCH = "patch",
  /** Minor version for backwards-compatible new features. */
  MINOR = "minor",
  /** Major version for changes that break backwards compatibility. */
  MAJOR = "major",
}

/**
 * @description Flag to indicate non-CI environment.
 * @summary Used to specify that a command should run outside of a Continuous Integration environment.
 * @const {string} NoCIFLag
 * @memberOf @decaf-ts/utils
 */
export const NoCIFLag = "-no-ci";

/**
 * @description Key for the setup script in package.json.
 * @summary Identifies the script that runs after package installation.
 * @const {string} SetupScriptKey
 * @memberOf @decaf-ts/utils
 */
export const SetupScriptKey = "postinstall";

/**
 * @description Enum for various authentication tokens.
 * @summary Defines the file names for storing different types of authentication tokens.
 * @enum {string}
 * @memberOf @decaf-ts/utils
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

export const AbortCode = "Aborted";
