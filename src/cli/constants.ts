/**
 * @description Default command options for CLI commands.
 * @summary Defines the structure and default values for common command-line options used across various CLI commands.
 * @const DefaultCommandOptions
 * @typedef {Object} DefaultCommandOptions
 * @property {Object} verbose - Verbosity level option.
 * @property {string} verbose.type - The type of the verbose option (number).
 * @property {string} verbose.short - The short flag for the verbose option (V).
 * @property {number} verbose.default - The default value for verbosity (0).
 * @property {Object} version - Version display option.
 * @property {string} version.type - The type of the version option (boolean).
 * @property {string} version.short - The short flag for the version option (v).
 * @property {undefined} version.default - The default value for version display (undefined).
 * @property {Object} help - Help display option.
 * @property {string} help.type - The type of the help option (boolean).
 * @property {string} help.short - The short flag for the help option (h).
 * @property {boolean} help.default - The default value for help display (false).
 * @property {Object} logLevel - Log level option.
 * @property {string} logLevel.type - The type of the logLevel option (string).
 * @property {string} logLevel.default - The default value for log level ("info").
 * @property {Object} logStyle - Log styling option.
 * @property {string} logStyle.type - The type of the logStyle option (boolean).
 * @property {boolean} logStyle.default - The default value for log styling (true).
 * @property {Object} timestamp - Timestamp display option.
 * @property {string} timestamp.type - The type of the timestamp option (boolean).
 * @property {boolean} timestamp.default - The default value for timestamp display (true).
 * @property {Object} banner - Banner display option.
 * @property {string} banner.type - The type of the banner option (boolean).
 * @property {boolean} banner.default - The default value for banner display (false).
 */
export const DefaultCommandOptions = {
  verbose: {
    type: "number",
    short: "V",
    default: 0
  },
  version: {
    type: "boolean",
    short: "v",
    default: undefined
  },
  help: {
    type: "boolean",
    short: "h",
    default: false
  },
  logLevel: {
    type: "string",
    default: "info"
  },
  logStyle: {
    type: "boolean",
    default: true,
  },
  timestamp: {
    type: "boolean",
    default: true,
  },
  banner: {
    type: "boolean",
    default: false,
  }
};

/**
 * @description Default command values derived from DefaultCommandOptions.
 * @summary Creates an object with the default values of all options defined in DefaultCommandOptions.
 * @const DefaultCommandValues
 * @typedef {Object} DefaultCommandValues
 * @property {unknown} [key: string] - The default value for each option in DefaultCommandOptions.
 */
export const DefaultCommandValues: {[k in keyof typeof DefaultCommandOptions]: unknown} = Object.keys(DefaultCommandOptions)
  .reduce((acc: Record<keyof typeof DefaultCommandOptions, unknown>, key: string) => {
    acc[key as keyof typeof DefaultCommandOptions] = DefaultCommandOptions[key as keyof typeof DefaultCommandOptions].default;
    return acc;
}, {} as Record<keyof typeof DefaultCommandValues, unknown>)
