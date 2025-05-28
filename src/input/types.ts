/**
 * @description Represents a color function in the Kleur library.
 * @summary The Color interface defines a function that can be called with or without arguments
 * to apply color styling to text or chain multiple color operations.
 *
 * @interface Color
 * @memberOf module:utils
 * */
export interface Color {
  /**
   * @description Applies the color to the given text.
   * @param {string | number} x - The text or number to be colored.
   * @return {string} The colored text.
   */
  (x: string | number): string;

  /**
   * @description Allows chaining of multiple color operations.
   * @return {Kleur} The Kleur instance for method chaining.
   */
  (): Kleur;
}

/**
 * @description Represents the main Kleur interface with all available color and style methods.
 * @summary The Kleur interface provides methods for applying various colors, background colors,
 * and text styles to strings in terminal output.
 *
 * @interface Kleur
 * @memberOf module:utils
 */
export interface Kleur {
  // Colors
  /** @description Applies black color to the text. */
  black: Color;
  /** @description Applies red color to the text. */
  red: Color;
  /** @description Applies green color to the text. */
  green: Color;
  /** @description Applies yellow color to the text. */
  yellow: Color;
  /** @description Applies blue color to the text. */
  blue: Color;
  /** @description Applies magenta color to the text. */
  magenta: Color;
  /** @description Applies cyan color to the text. */
  cyan: Color;
  /** @description Applies white color to the text. */
  white: Color;
  /** @description Applies gray color to the text. */
  gray: Color;
  /** @description Alias for gray color. */
  grey: Color;

  // Backgrounds
  /** @description Applies black background to the text. */
  bgBlack: Color;
  /** @description Applies red background to the text. */
  bgRed: Color;
  /** @description Applies green background to the text. */
  bgGreen: Color;
  /** @description Applies yellow background to the text. */
  bgYellow: Color;
  /** @description Applies blue background to the text. */
  bgBlue: Color;
  /** @description Applies magenta background to the text. */
  bgMagenta: Color;
  /** @description Applies cyan background to the text. */
  bgCyan: Color;
  /** @description Applies white background to the text. */
  bgWhite: Color;

  // Modifiers
  /** @description Resets all applied styles. */
  reset: Color;
  /** @description Applies bold style to the text. */
  bold: Color;
  /** @description Applies dim (decreased intensity) style to the text. */
  dim: Color;
  /** @description Applies italic style to the text. */
  italic: Color;
  /** @description Applies underline style to the text. */
  underline: Color;
  /** @description Inverts the foreground and background colors. */
  inverse: Color;
  /** @description Hides the text (same color as background). */
  hidden: Color;
  /** @description Applies strikethrough style to the text. */
  strikethrough: Color;
}

/**
 * @description Configuration for a single command-line argument option.
 * @summary Defines the structure and behavior of a command-line option.
 * @interface ParseArgsOptionConfig
 * @property {("string" | "boolean")} type - The data type of the option.
 * @property {boolean} [multiple] - Whether the option can be specified multiple times.
 * @property {string} [short] - The short (single-character) alias for the option.
 * @property {string | boolean | string[] | boolean[]} [default] - The default value(s) for the option.
 * @memberOf module:utils
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
 * @memberOf module:utils
 */
export interface ParseArgsOptionsConfig {
  [longOption: string]: ParseArgsOptionConfig;
}

/**
 * @description Represents a parsed command-line option token.
 * @summary Can be either an option with a value or an option without a value.
 * @typedef {Object} OptionToken
 * @memberOf module:utils
 */
export type OptionToken =
  | {
      kind: "option";
      index: number;
      name: string;
      rawName: string;
      value: string;
      inlineValue: boolean;
    }
  | {
      kind: "option";
      index: number;
      name: string;
      rawName: string;
      value: undefined;
      inlineValue: undefined;
    };

/**
 * @description Represents a parsed command-line token.
 * @summary Can be an option, a positional argument, or an option terminator.
 * @typedef {OptionToken | Object} Token
 * @memberOf module:utils
 */
export type Token =
  | OptionToken
  | { kind: "positional"; index: number; value: string }
  | { kind: "option-terminator"; index: number };

/**
 * @description The result of parsing command-line arguments.
 * @summary Contains parsed values, positional arguments, and optionally the parsed tokens.
 * @typedef {Object} ParseArgsResult
 * @property {string | boolean | string[] | boolean[] | undefined} values - Parsed option values.
 * @property {string[]} positionals - Positional arguments.
 * @property {Token[]} [tokens] - Parsed tokens (if requested).
 * @memberOf module:utils
 */
export type ParseArgsResult = {
  values: { [p: string]: string | boolean | (string | boolean)[] | undefined };
  positionals: string[];
  tokens?: Token[];
};
