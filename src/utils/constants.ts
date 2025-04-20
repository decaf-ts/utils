import { LoggingConfig, Theme } from "../output/types";

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

/**
 * @description Enum for log levels.
 * @summary Defines different levels of logging for the application.
 * @enum {string}
 * @memberOf @decaf-ts/utils
 */
export enum LogLevel {
  /** Error events that are likely to cause problems. */
  error = "error",
  /** Routine information, such as ongoing status or performance. */
  info = "info",
  /** Additional relevant information. */
  verbose = "verbose",
  /** Debug or trace information. */
  debug = "debug",
  /** way too verbose or silly information. */
  silly = "silly",
}

/**
 * @description Numeric values associated with log levels.
 * @summary Provides a numeric representation of log levels for comparison and filtering.
 * @const {Object} NumericLogLevels
 * @property {number} error - Numeric value for error level (0).
 * @property {number} info - Numeric value for info level (2).
 * @property {number} verbose - Numeric value for verbose level (4).
 * @property {number} debug - Numeric value for debug level (5).
 * @property {number} silly - Numeric value for silly level (8).
 * @memberOf @decaf-ts/utils
 */
export const NumericLogLevels = {
  error: 2,
  info: 4,
  verbose: 6,
  debug: 7,
  silly: 9,
};

/**
 * @description Default theme for styling log output.
 * @summary Defines the default color and style settings for various components of log messages.
 * @const DefaultTheme
 * @typedef {Theme} DefaultTheme
 * @property {Object} class - Styling for class names.
 * @property {number} class.fg - Foreground color code for class names (4).
 * @property {Object} id - Styling for identifiers.
 * @property {number} id.fg - Foreground color code for identifiers (36).
 * @property {Object} stack - Styling for stack traces (empty object).
 * @property {Object} timestamp - Styling for timestamps (empty object).
 * @property {Object} message - Styling for different types of messages.
 * @property {Object} message.error - Styling for error messages.
 * @property {number} message.error.fg - Foreground color code for error messages (34).
 * @property {Object} method - Styling for method names (empty object).
 * @property {Object} logLevel - Styling for different log levels.
 * @property {Object} logLevel.error - Styling for error level logs.
 * @property {number} logLevel.error.fg - Foreground color code for error level logs (6).
 * @property {Object} logLevel.info - Styling for info level logs (empty object).
 * @property {Object} logLevel.verbose - Styling for verbose level logs (empty object).
 * @property {Object} logLevel.debug - Styling for debug level logs.
 * @property {number} logLevel.debug.fg - Foreground color code for debug level logs (7).
 * @memberOf @decaf-ts/utils
 */
export const DefaultTheme: Theme = {
  class: {
    fg: 34,
  },
  id: {
    fg: 36,
  },
  stack: {},
  timestamp: {},
  message: {
    error: {
      fg: 31,
    },
  },
  method: {},
  logLevel: {
    error: {
      fg: 31,
      style: ["bold"],
    },
    info: {},
    verbose: {},
    debug: {
      fg: 33,
    },
  },
};

/**
 * @description Default configuration for logging.
 * @summary Defines the default settings for the logging system, including verbosity, log level, styling, and timestamp format.
 * @const DefaultLoggingConfig
 * @typedef {LoggingConfig} DefaultLoggingConfig
 * @property {number} verbose - Verbosity level (0).
 * @property {LogLevel} level - Default log level (LogLevel.info).
 * @property {boolean} style - Whether to apply styling to log output (false).
 * @property {boolean} timestamp - Whether to include timestamps in log messages (true).
 * @property {string} timestampFormat - Format for timestamps ("HH:mm:ss.SSS").
 * @property {boolean} context - Whether to include context information in log messages (true).
 * @property {Theme} theme - The theme to use for styling log messages (DefaultTheme).
 * @memberOf @decaf-ts/utils
 */
export const DefaultLoggingConfig: LoggingConfig = {
  verbose: 0,
  level: LogLevel.info,
  style: false,
  timestamp: true,
  timestampFormat: "HH:mm:ss.SSS",
  context: true,
  theme: DefaultTheme,
};

export const AbortCode = "Aborted";
