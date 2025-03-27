import {
  BrightBackgroundColors,
  BrightForegroundColors,
  StandardBackgroundColors,
  StandardForegroundColors, styles,
} from "./constants";
import { clear, colorize256, colorizeANSI, colorizeRGB, raw, applyStyle } from "./colors";

/**
 * @description Options for text colorization using ANSI codes.
 * @summary This type defines the structure of the object returned by the colorize function.
 * It includes methods for applying various color and style options to text using ANSI escape codes.
 *
 * @typedef ColorizeOptions
 *
 * @property {string} [key: StandardForegroundColors] - Getter for each standard foreground color.
 * @property {string} [key: BrightForegroundColors] - Getter for each bright foreground color.
 * @property {string} [key: StandardBackgroundColors] - Getter for each standard background color.
 * @property {string} [key: BrightBackgroundColors] - Getter for each bright background color.
 * @property {string} [key: styles] - Getter for each text style.
 * @property {function} clear - Removes all styling from the text.
 * @property {function} raw - Applies raw ANSI codes to the text.
 * @property {function} foreground - Applies a foreground color using ANSI codes.
 * @property {function} background - Applies a background color using ANSI codes.
 * @property {function} style - Applies a text style using ANSI codes.
 * @property {function} color256 - Applies a 256-color foreground color.
 * @property {function} bgColor256 - Applies a 256-color background color.
 * @property {function} rgb - Applies an RGB foreground color.
 * @property {function} bgRgb - Applies an RGB background color.
 *
 * @memberOf module:@decaf-ts/utils
 */
export type ColorizeOptions = {[k in keyof typeof StandardForegroundColors]: StyledString}
  & {[k in keyof typeof BrightForegroundColors]: StyledString}
  & {[k in keyof typeof StandardBackgroundColors]: StyledString}
  & {[k in keyof typeof BrightBackgroundColors]: StyledString}
  & {[k in keyof typeof styles]: StyledString}
  & {
  clear: () => StyledString,
  raw: (raw: string) => StyledString,
  foreground: (n: number) => StyledString,
  background: (n: number) => StyledString,
  style: (n: number | keyof typeof styles) => StyledString,
  color256: (n: number) => StyledString,
  bgColor256: (n: number) => StyledString,
  rgb: (r: number, g: number, b: number) => StyledString,
  bgRgb: (r: number, g: number, b: number) => StyledString,
  text: string
}

/**
 * @description A class that extends string functionality with ANSI color and style options.
 * @summary StyledString provides methods to apply various ANSI color and style options to text strings.
 * It implements the ColorizeOptions interface and proxies native string methods to the underlying text.
 * This class allows for chaining of styling methods and easy application of colors and styles to text.
 *
 * @class
 * @param {string} text - The initial text string to be styled.
 */
export class StyledString implements ColorizeOptions {
  /**
   * @description Applies black color to the text.
   * @summary Getter that returns a new StyledString with black foreground color.
   */
  black!: StyledString;

  /**
   * @description Applies red color to the text.
   * @summary Getter that returns a new StyledString with red foreground color.
   */
  red!: StyledString;

  /**
   * @description Applies green color to the text.
   * @summary Getter that returns a new StyledString with green foreground color.
   */
  green!: StyledString;

  /**
   * @description Applies yellow color to the text.
   * @summary Getter that returns a new StyledString with yellow foreground color.
   */
  yellow!: StyledString;

  /**
   * @description Applies blue color to the text.
   * @summary Getter that returns a new StyledString with blue foreground color.
   */
  blue!: StyledString;

  /**
   * @description Applies magenta color to the text.
   * @summary Getter that returns a new StyledString with magenta foreground color.
   */
  magenta!: StyledString;

  /**
   * @description Applies cyan color to the text.
   * @summary Getter that returns a new StyledString with cyan foreground color.
   */
  cyan!: StyledString;

  /**
   * @description Applies white color to the text.
   * @summary Getter that returns a new StyledString with white foreground color.
   */
  white!: StyledString;

  /**
   * @description Applies bright black (gray) color to the text.
   * @summary Getter that returns a new StyledString with bright black foreground color.
   */
  brightBlack!: StyledString;

  /**
   * @description Applies bright red color to the text.
   * @summary Getter that returns a new StyledString with bright red foreground color.
   */
  brightRed!: StyledString;

  /**
   * @description Applies bright green color to the text.
   * @summary Getter that returns a new StyledString with bright green foreground color.
   */
  brightGreen!: StyledString;

  /**
   * @description Applies bright yellow color to the text.
   * @summary Getter that returns a new StyledString with bright yellow foreground color.
   */
  brightYellow!: StyledString;

  /**
   * @description Applies bright blue color to the text.
   * @summary Getter that returns a new StyledString with bright blue foreground color.
   */
  brightBlue!: StyledString;

  /**
   * @description Applies bright magenta color to the text.
   * @summary Getter that returns a new StyledString with bright magenta foreground color.
   */
  brightMagenta!: StyledString;

  /**
   * @description Applies bright cyan color to the text.
   * @summary Getter that returns a new StyledString with bright cyan foreground color.
   */
  brightCyan!: StyledString;

  /**
   * @description Applies bright white color to the text.
   * @summary Getter that returns a new StyledString with bright white foreground color.
   */
  brightWhite!: StyledString;

  /**
   * @description Applies black background color to the text.
   * @summary Getter that returns a new StyledString with black background color.
   */
  bgBlack!: StyledString;

  /**
   * @description Applies red background color to the text.
   * @summary Getter that returns a new StyledString with red background color.
   */
  bgRed!: StyledString;

  /**
   * @description Applies green background color to the text.
   * @summary Getter that returns a new StyledString with green background color.
   */
  bgGreen!: StyledString;

  /**
   * @description Applies yellow background color to the text.
   * @summary Getter that returns a new StyledString with yellow background color.
   */
  bgYellow!: StyledString;

  /**
   * @description Applies blue background color to the text.
   * @summary Getter that returns a new StyledString with blue background color.
   */
  bgBlue!: StyledString;

  /**
   * @description Applies magenta background color to the text.
   * @summary Getter that returns a new StyledString with magenta background color.
   */
  bgMagenta!: StyledString;

  /**
   * @description Applies cyan background color to the text.
   * @summary Getter that returns a new StyledString with cyan background color.
   */
  bgCyan!: StyledString;

  /**
   * @description Applies white background color to the text.
   * @summary Getter that returns a new StyledString with white background color.
   */
  bgWhite!: StyledString;

  /**
   * @description Applies bright black (gray) background color to the text.
   * @summary Getter that returns a new StyledString with bright black background color.
   */
  bgBrightBlack!: StyledString;

  /**
   * @description Applies bright red background color to the text.
   * @summary Getter that returns a new StyledString with bright red background color.
   */
  bgBrightRed!: StyledString;

  /**
   * @description Applies bright green background color to the text.
   * @summary Getter that returns a new StyledString with bright green background color.
   */
  bgBrightGreen!: StyledString;

  /**
   * @description Applies bright yellow background color to the text.
   * @summary Getter that returns a new StyledString with bright yellow background color.
   */
  bgBrightYellow!: StyledString;

  /**
   * @description Applies bright blue background color to the text.
   * @summary Getter that returns a new StyledString with bright blue background color.
   */
  bgBrightBlue!: StyledString;

  /**
   * @description Applies bright magenta background color to the text.
   * @summary Getter that returns a new StyledString with bright magenta background color.
   */
  bgBrightMagenta!: StyledString;

  /**
   * @description Applies bright cyan background color to the text.
   * @summary Getter that returns a new StyledString with bright cyan background color.
   */
  bgBrightCyan!: StyledString;

  /**
   * @description Applies bright white background color to the text.
   * @summary Getter that returns a new StyledString with bright white background color.
   */
  bgBrightWhite!: StyledString;

  /**
   * @description Resets all styling applied to the text.
   * @summary Getter that returns a new StyledString with all styling reset.
   */
  reset!: StyledString;

  /**
   * @description Applies bold style to the text.
   * @summary Getter that returns a new StyledString with bold style.
   */
  bold!: StyledString;

  /**
   * @description Applies dim (decreased intensity) style to the text.
   * @summary Getter that returns a new StyledString with dim style.
   */
  dim!: StyledString;

  /**
   * @description Applies italic style to the text.
   * @summary Getter that returns a new StyledString with italic style.
   */
  italic!: StyledString;

  /**
   * @description Applies underline style to the text.
   * @summary Getter that returns a new StyledString with underline style.
   */
  underline!: StyledString;

  /**
   * @description Applies blinking style to the text.
   * @summary Getter that returns a new StyledString with blinking style.
   */
  blink!: StyledString;

  /**
   * @description Inverts the foreground and background colors of the text.
   * @summary Getter that returns a new StyledString with inverted colors.
   */
  inverse!: StyledString;

  /**
   * @description Hides the text (same color as background).
   * @summary Getter that returns a new StyledString with hidden text.
   */
  hidden!: StyledString;

  /**
   * @description Applies strikethrough style to the text.
   * @summary Getter that returns a new StyledString with strikethrough style.
   */
  strikethrough!: StyledString;

  /**
   * @description Applies double underline style to the text.
   * @summary Getter that returns a new StyledString with double underline style.
   */
  doubleUnderline!: StyledString;

  /**
   * @description Resets the text color to normal intensity.
   * @summary Getter that returns a new StyledString with normal color intensity.
   */
  normalColor!: StyledString;

  /**
   * @description Removes italic or fraktur style from the text.
   * @summary Getter that returns a new StyledString with italic or fraktur style removed.
   */
  noItalicOrFraktur!: StyledString;

  /**
   * @description Removes underline style from the text.
   * @summary Getter that returns a new StyledString with underline style removed.
   */
  noUnderline!: StyledString;

  /**
   * @description Removes blinking style from the text.
   * @summary Getter that returns a new StyledString with blinking style removed.
   */
  noBlink!: StyledString;

  /**
   * @description Removes color inversion from the text.
   * @summary Getter that returns a new StyledString with color inversion removed.
   */
  noInverse!: StyledString;

  /**
   * @description Removes hidden style from the text.
   * @summary Getter that returns a new StyledString with hidden style removed.
   */
  noHidden!: StyledString;

  /**
   * @description Removes strikethrough style from the text.
   * @summary Getter that returns a new StyledString with strikethrough style removed.
   */
  noStrikethrough!: StyledString;

  /**
   *
   * @description Creates a new StyledString instance.
   * @summary Initializes a StyledString with the given text and sets up getter methods for various color and style options.
   * @param {string} text - The initial text string to be styled.
   */
  constructor(public text: string) {
    // Basic colors
    Object.entries(StandardForegroundColors).forEach(([name, code]) => {
      Object.defineProperty(this, name, {
        get: () => this.foreground(code)
      });
    });

    Object.entries(BrightForegroundColors).forEach(([name, code]) => {
      Object.defineProperty(this, name, {
        get: () => this.foreground(code)
      });
    });

    // Background colors
    Object.entries(StandardBackgroundColors).forEach(([name, code]) => {
      Object.defineProperty(this, name, {
        get: () => this.background(code)
      });
    });

    Object.entries(BrightBackgroundColors).forEach(([name, code]) => {
      Object.defineProperty(this, name, {
        get: () => this.background(code)
      });
    });

    // Styles
    Object.entries(styles).forEach(([name, code]) => {
      Object.defineProperty(this, name, {
        get: () => this.background(code)
      });
    });
  }

  /**
   * @description Clears all styling from the text.
   * @summary Removes all ANSI color and style codes from the text.
   * @return {StyledString} The StyledString instance with cleared styling.
   */
  clear(): StyledString {
    this.text = clear(this.text);
    return this
  }

  /**
   * @description Applies raw ANSI codes to the text.
   * @summary Allows direct application of ANSI escape sequences to the text.
   * @param {string} rawAnsi - The raw ANSI escape sequence to apply.
   * @return {StyledString} The StyledString instance with the raw ANSI code applied.
   */
  raw(rawAnsi: string): StyledString {
    this.text = raw(this.text, rawAnsi);
    return this
  }

  /**
   * @description Applies a foreground color to the text.
   * @summary Sets the text color using ANSI color codes.
   * @param {number} n - The ANSI color code for the foreground color.
   * @return {StyledString} The StyledString instance with the foreground color applied.
   */
  foreground(n: number): StyledString {
    this.text = colorizeANSI(this.text, n);
    return this
  }

  /**
   * @description Applies a background color to the text.
   * @summary Sets the background color of the text using ANSI color codes.
   * @param {number} n - The ANSI color code for the background color.
   * @return {StyledString} The StyledString instance with the background color applied.
   */
  background(n: number): StyledString {
    this.text = colorizeANSI(this.text, n, true);
    return this
  }

  /**
   * @description Applies a text style to the string.
   * @summary Sets text styles such as bold, italic, or underline using ANSI style codes.
   * @param {number | keyof typeof styles} n - The style code or key from the styles object.
   * @return {StyledString} The StyledString instance with the style applied.
   */
  style(n: number | keyof typeof styles): StyledString {
    if (typeof n === "string" && !(n in styles)) {
      console.warn(`Invalid style: ${n}`);
      return this;
    }
    this.text = applyStyle(this.text, n);
    return this
  }

  /**
   * @description Applies a 256-color foreground color to the text.
   * @summary Sets the text color using the extended 256-color palette.
   * @param {number} n - The color number from the 256-color palette.
   * @return {StyledString} The StyledString instance with the 256-color foreground applied.
   */
  color256(n: number): StyledString {
    this.text = colorize256(this.text, n);
    return this
  }

  /**
   * @description Applies a 256-color background color to the text.
   * @summary Sets the background color using the extended 256-color palette.
   * @param {number} n - The color number from the 256-color palette.
   * @return {StyledString} The StyledString instance with the 256-color background applied.
   */
  bgColor256(n: number): StyledString {
    this.text = colorize256(this.text, n, true);
    return this
  }

  /**
   * @description Applies an RGB foreground color to the text.
   * @summary Sets the text color using RGB values.
   * @param {number} r - The red component (0-255).
   * @param {number} g - The green component (0-255).
   * @param {number} b - The blue component (0-255).
   * @return {StyledString} The StyledString instance with the RGB foreground color applied.
   */
  rgb(r: number, g: number, b: number): StyledString {
    this.text = colorizeRGB(this.text, r, g, b);
    return this;
  }

  /**
   * @description Applies an RGB background color to the text.
   * @summary Sets the background color using RGB values.
   * @param {number} r - The red component (0-255).
   * @param {number} g - The green component (0-255).
   * @param {number} b - The blue component (0-255).
   * @return {StyledString} The StyledString instance with the RGB background color applied.
   */
  bgRgb(r: number, g: number, b: number): StyledString {
    this.text = colorizeRGB(this.text, r, g, b, true);
    return this;
  }
}


   /**
 * @description Applies styling to a given text string.
 * @summary This function takes a string and returns a StyledString object, which is an enhanced
 * version of the original string with additional methods for applying various ANSI color and style
 * options. It sets up a mapper object with methods for different styling operations and then
 * defines properties on the text string to make these methods accessible.
 *
 * @param {string[]} t  The input text to be styled.
 * @return {StyledString} A StyledString object with additional styling methods.
 *
 * @function style
 *
 * @memberOf module:@decaf-ts/utils
 */
export function style(...t: string[]): StyledString {
  return new StyledString(t.join(' '));
  // const mapper = {
  //   clear: () => {
  //     text = clear(text);
  //     return text as StyledString;
  //   },
  //   raw: (rawAnsi: string) => {
  //     text = raw(text, rawAnsi);
  //     return text as StyledString;
  //   },
  //   foreground: (n: number) => {
  //     text = colorizeANSI(text, n);
  //     return text as StyledString;
  //   },
  //   background: (n: number) => {
  //     text = colorizeANSI(text, n, true);
  //     return text as StyledString;
  //   },
  //   style: (n: number | keyof typeof styles) => {
  //     text = applyStyle(text, n);
  //     return text as StyledString;
  //   },
  //   // 256 colors
  //   color256: (n: number) => {
  //     text =  colorize256(text, n)
  //     return text as StyledString;
  //   },
  //   bgColor256: (n: number) => {
  //     text =  colorize256(text, n, true)
  //     return text as StyledString;
  //   },
  //   // RGB colors
  //   rgb: (r: number, g: number, b: number) => {
  //     text =  colorizeRGB(text, r, g, b)
  //     return text as StyledString;
  //   },
  //   bgRgb: (r: number, g: number, b: number) => {
  //     text =  colorizeRGB(text, r, g, b, true)
  //     return text as StyledString;
  //   }
  // }
  //
  // // mapped methods
  // Object.entries(mapper).forEach(([name, value]) => {
  //   Object.defineProperty(text, name, {
  //     value: value
  //   });
  // });
  //
  // // Basic colors
  // Object.entries(StandardForegroundColors).forEach(([name, code]) => {
  //   Object.defineProperty(text, name, {
  //     get: () => (text as StyledString).foreground(code)
  //   });
  // });
  //
  // Object.entries(BrightForegroundColors).forEach(([name, code]) => {
  //   Object.defineProperty(text, name, {
  //     get: () => (text as StyledString).foreground(code)
  //   });
  // });
  //
  // // Background colors
  // Object.entries(StandardBackgroundColors).forEach(([name, code]) => {
  //   Object.defineProperty(text, name, {
  //     get: () => (text as StyledString).background(code)
  //   });
  // });
  //
  // Object.entries(BrightBackgroundColors).forEach(([name, code]) => {
  //   Object.defineProperty(text, name, {
  //     get: () => (text as StyledString).background(code)
  //   });
  // });
  //
  // // Styles
  // Object.entries(styles).forEach(([name, code]) => {
  //   Object.defineProperty(text, name, {
  //     get: () => (text as StyledString).background(code)
  //   });
  // });
  //
  // return text as StyledString;
}