import {
  AnsiReset,
  styles,
} from "./constants";



/**
 * @description Applies a basic ANSI color code to text.
 * @summary This function takes a string, an ANSI color code number, and an optional background flag.
 * It returns the text wrapped in the appropriate ANSI escape codes for either foreground or background coloring.
 * This function is used for basic 16-color ANSI formatting.
 *
 * @param {string} text - The text to be colored.
 * @param {number} n - The ANSI color code number.
 * @param {boolean} [bg=false] - If true, applies the color to the background instead of the foreground.
 * @return {string} The text wrapped in ANSI color codes.
 *
 * @function colorizeANSI
 * @memberOf module:@decaf-ts/utils
 */
export function colorizeANSI(text: string, n: number, bg = false) {

  if (isNaN(n)){
    console.warn(`Invalid color number on the ANSI scale: ${n}. ignoring...`);
    return text;
  }
  if (bg && (
        (n > 30 && n <= 40)
          || (n > 90 && n <= 100) )){
    n = n + 10
  }
  return `\x1b[${n}m${text}${AnsiReset}`;

}


/**
 * @description Applies a 256-color ANSI code to text.
 * @summary This function takes a string and a color number (0-255) and returns the text
 * wrapped in ANSI escape codes for either foreground or background coloring.
 *
 * @param {string} text - The text to be colored.
 * @param {number} n - The color number (0-255).
 * @param {boolean} [bg=false] - If true, applies the color to the background instead of the foreground.
 * @return {string} The text wrapped in ANSI color codes.
 *
 * @function colorize256
 * @memberOf module:@decaf-ts/utils
 */
export function colorize256(text: string, n: number, bg = false) {

  if (isNaN(n)){
    console.warn(`Invalid color number on the 256 scale: ${n}. ignoring...`);
    return text;
  }
  if (n < 0 || n > 255) {
    console.warn(`Invalid color number on the 256 scale: ${n}. ignoring...`);
    return text;
  }
  return `\x1b[${bg ? 48 : 38};5;${n}m${text}${AnsiReset}`;
}

/**
 * @description Applies an RGB color ANSI code to text.
 * @summary This function takes a string and RGB color values (0-255 for each component)
 * and returns the text wrapped in ANSI escape codes for either foreground or background coloring.
 *
 * @param {string} text - The text to be colored.
 * @param {number} r - The red component of the color (0-255).
 * @param {number} g - The green component of the color (0-255).
 * @param {number} b - The blue component of the color (0-255).
 * @param {boolean} [bg=false] - If true, applies the color to the background instead of the foreground.
 * @return {string} The text wrapped in ANSI color codes.
 *
 * @function colorizeRGB
 * @memberOf module:@decaf-ts/utils
 */
export function colorizeRGB(text: string, r: number, g: number, b: number, bg = false) {
  if (isNaN(r) || isNaN(g) || isNaN(b)){
    console.warn(`Invalid RGB color values: r=${r}, g=${g}, b=${b}. Ignoring...`);
    return text;
  }
  if ([r, g, b].some(v => v < 0 || v > 255)) {
    console.warn(`Invalid RGB color values: r=${r}, g=${g}, b=${b}. Ignoring...`);
    return text;
  }
  return `\x1b[${bg ? 48 : 38};2;${r};${g};${b}m${text}${AnsiReset}`;
}

/**
 * @description Applies an ANSI style code to text.
 * @summary This function takes a string and a style code (either a number or a key from the styles object)
 * and returns the text wrapped in the appropriate ANSI escape codes for that style.
 *
 * @param {string} text - The text to be styled.
 * @param {number | keyof typeof styles} n - The style code or style name.
 * @return {string} The text wrapped in ANSI style codes.
 *
 * @function applyStyle
 * @memberOf module:@decaf-ts/utils
 */
export function applyStyle(text: string, n: number | keyof typeof styles): string {
  const styleCode = typeof n === "number" ? n : styles[n];
  return `\x1b[${styleCode}m${text}${AnsiReset}`;
}

/**
 * @description Removes all ANSI formatting codes from text.
 * @summary This function takes a string that may contain ANSI escape codes for formatting
 * and returns a new string with all such codes removed, leaving only the plain text content.
 * It uses a regular expression to match and remove ANSI escape sequences.
 *
 * @param {string} text - The text potentially containing ANSI formatting codes.
 * @return {string} The input text with all ANSI formatting codes removed.
 *
 * @function clear
 * @memberOf module:@decaf-ts/utils
 */
export function clear(text: string): string {
  // Regular expression to match ANSI escape codes
  const ansiRegex = /\x1B\[[0-9;]*[JKmsu]/g;
  return text.replace(ansiRegex, '');
}

/**
 * @description Applies raw ANSI escape codes to text.
 * @summary This function takes a string and a raw ANSI escape code, and returns the text
 * wrapped in the provided raw ANSI code and the reset code. This allows for applying custom
 * or complex ANSI formatting that may not be covered by other utility functions.
 *
 * @param {string} text - The text to be formatted.
 * @param {string} raw - The raw ANSI escape code to be applied.
 * @return {string} The text wrapped in the raw ANSI code and the reset code.
 *
 * @function raw
 * @memberOf module:@decaf-ts/utils
 */
export function raw(text: string, raw: string): string {
  return `${raw}${text}${AnsiReset}`;
}
