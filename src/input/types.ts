
/**
 * @description Configuration for a single command-line argument option.
 * @summary Defines the structure and behavior of a command-line option.
 * @interface ParseArgsOptionConfig
 * @property {("string" | "boolean")} type - The data type of the option.
 * @property {boolean} [multiple] - Whether the option can be specified multiple times.
 * @property {string} [short] - The short (single-character) alias for the option.
 * @property {string | boolean | string[] | boolean[]} [default] - The default value(s) for the option.
 * @memberOf module:@decaf-ts/utils
 */
export interface ParseArgsOptionConfig {
  type: "string" | "boolean";
  multiple?: boolean | undefined;
  short?: string | undefined;
  default?: string | boolean | string[] | boolean[] | undefined;
}

/**
 * @description Configuration for all command-line argument options.
 * @summary A mapping of long option names to their configurations.
 * @interface ParseArgsOptionsConfig
 * @memberOf module:@decaf-ts/utils
 */
export interface ParseArgsOptionsConfig {
  [longOption: string]: ParseArgsOptionConfig;
}

/**
 * @description Represents a parsed command-line option token.
 * @summary Can be either an option with a value or an option without a value.
 * @typedef {Object} OptionToken
 * @memberOf module:@decaf-ts/utils
 */
export type OptionToken =
  | { kind: "option"; index: number; name: string; rawName: string; value: string; inlineValue: boolean }
  | { kind: "option"; index: number; name: string; rawName: string; value: undefined; inlineValue: undefined };

/**
 * @description Represents a parsed command-line token.
 * @summary Can be an option, a positional argument, or an option terminator.
 * @typedef {OptionToken | Object} Token
 * @memberOf module:@decaf-ts/utils
 */
export type Token =
  | OptionToken
  | { kind: "positional"; index: number; value: string }
  | { kind: "option-terminator"; index: number };

/**
 * @description The result of parsing command-line arguments.
 * @summary Contains parsed values, positional arguments, and optionally the parsed tokens.
 * @typedef {Object} ParseArgsResult
 * @property {Object.<string, string | boolean | (string | boolean)[] | undefined>} values - Parsed option values.
 * @property {string[]} positionals - Positional arguments.
 * @property {Token[]} [tokens] - Parsed tokens (if requested).
 * @memberOf module:@decaf-ts/utils
 */
export type ParseArgsResult = {values: {[p: string]: string | boolean | (string | boolean)[] | undefined}, positionals: string[], tokens?: Token[]};
