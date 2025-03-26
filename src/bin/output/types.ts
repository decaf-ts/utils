import {
  BrightBackgroundColors,
  BrightForegroundColors,
  LogLevel,
  StandardBackgroundColors,
  StandardForegroundColors, styles,
} from "../utils/constants";



/**
 * @description Interface for a logger with verbosity levels.
 * @summary Defines methods for logging at different verbosity levels.
 * @interface VerbosityLogger
 * @memberOf module:@decaf-ts/utils
 */
export interface VerbosityLogger {
  /**
   * @description Logs a `way too verbose` or a silly message.
   * @param {string} msg - The message to log.
   */
  silly(msg: string): void;
  /**
   * @description Logs a verbose message.
   * @param {string} msg - The message to log.
   * @param {number} verbosity - The verbosity level of the message.
   */
  verbose(msg: string, verbosity?: number): void;

  /**
   * @description Logs an info message.
   * @param {string} msg - The message to log.
   */
  info(msg: string): void;

  /**
   * @description Logs an error message.
   * @param {string} msg - The message to log.
   */
  error(msg: string | Error): void;

  /**
   * @description Logs a debug message.
   * @param {string} msg - The message to log.
   */
  debug(msg: string): void;
  for(method?: string | Function): VerbosityLogger
}

/**
 * @description Configuration for logging.
 * @summary Defines the log level and verbosity for logging.
 * @typedef {Object} LoggingConfig
 * @property {LogLevel} level - The logging level.
 * @property {number} verbose - The verbosity level.
 * @memberOf module:@decaf-ts/utils
 */
export type LoggingConfig = {
  level: LogLevel,
  verbose: number
  style?: boolean,
  timestamp?: boolean,
  timestampFormat?: string,
  context?: boolean,
  theme?: Theme
}


/**
 /**
 * @description Represents a theme option for console output styling.
 * @summary Defines the structure for styling a specific element in the console output.
 * It allows for customization of foreground color, background color, and additional styles.
 * Colors can be specified as a single number, an RGB array, or left undefined for default.
 *
 * @interface ThemeOption
 * @memberOf module:@decaf-ts/utils
 */
export interface ThemeOption {
  /**
   * @description The foreground color code for the styled element.
   * @summary Can be a single number for predefined colors, an RGB array, or undefined for default color.
   */
  fg?: number | [number] | [number, number, number];

  /**
   * @description The background color code for the styled element.
   * @summary Can be a single number for predefined colors, an RGB array, or undefined for default color.
   */
  bg?: number | [number] | [number, number, number];

  /**
   * @description An array of style codes to apply to the element.
   * @summary These codes represent additional styling options such as bold, italic, etc.
   * Undefined means no additional styles are applied.
   */
  style?: number[] | [keyof typeof styles];
}

export type ThemeOptionByLogLevel = Partial<Record<LogLevel, ThemeOption>>;

/**
 /**
 * @description Defines the color theme for console output.
 * @summary This interface specifies the color scheme for various elements of console output,
 * including styling for different log levels and components. It uses ThemeOption to
 * define the styling for each element, allowing for customization of colors and styles
 * for different parts of the log output.
 *
 * @interface Theme
 * @memberOf module:@decaf-ts/utils
 */
export interface Theme {
  /**
   * @description Styling for class names in the output.
   */
  class: ThemeOption | ThemeOptionByLogLevel,

  /**
   * @description Styling for timestamps in the output.
   */
  timestamp: ThemeOption | ThemeOptionByLogLevel,

  /**
   * @description Styling for the main message text in the output.
   */
  message: ThemeOption | ThemeOptionByLogLevel,

  /**
   * @description Styling for method names in the output.
   */
  method: ThemeOption | ThemeOptionByLogLevel,

  /**
   * @description Styling for identifier elements in the output.
   */
  id: ThemeOption | ThemeOptionByLogLevel,

  /**
   * @description Styling for identifier elements in the output.
   */
  stack: ThemeOption,

  /**
   * @description Styling for different log levels in the output.
   */
  logLevel: ThemeOptionByLogLevel
}

/**
 * @description Represents a color function in the Kleur library.
 * @summary The Color interface defines a function that can be called with or without arguments
 * to apply color styling to text or chain multiple color operations.
 *
 * @interface Color
 * @memberOf module:@decaf-ts/input
 */
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
 * @memberOf module:@decaf-ts/input
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