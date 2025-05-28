/**
 * @description Pads the end of a string with a specified character.
 * @summary Extends the input string to a specified length by adding a padding character to the end.
 * If the input string is already longer than the specified length, it is returned unchanged.
 *
 * @param {string} str - The input string to be padded.
 * @param {number} length - The desired total length of the resulting string.
 * @param {string} [char=" "] - The character to use for padding. Defaults to a space.
 * @return {string} The padded string.
 * @throws {Error} If the padding character is not exactly one character long.
 *
 * @function padEnd
 *
 * @memberOf module:utils
 */
export function padEnd(
  str: string,
  length: number,
  char: string = " "
): string {
  if (char.length !== 1)
    throw new Error("Invalid character length for padding. must be one!");
  return str.padEnd(length, char);
}

/**
 * @description Replaces placeholders in a string with provided values.
 * @summary Interpolates a string by replacing placeholders of the form ${variableName}
 * with corresponding values from the provided object. If a placeholder doesn't have
 * a corresponding value, it is left unchanged in the string.
 *
 * @param {string} input - The input string containing placeholders to be replaced.
 * @param {Record<string, number | string>} values - An object containing key-value pairs for replacement.
 * @return {string} The interpolated string with placeholders replaced by their corresponding values.
 *
 * @function patchPlaceholders
 *
 * @mermaid
 * sequenceDiagram
 *   participant Caller
 *   participant patchString
 *   participant String.replace
 *   Caller->>patchString: Call with input and values
 *   patchString->>String.replace: Call with regex and replacement function
 *   String.replace->>patchString: Return replaced string
 *   patchString-->>Caller: Return patched string
 *
 * @memberOf module:utils
 */
export function patchPlaceholders(
  input: string,
  values: Record<string, number | string>
): string {
  return input.replace(
    /\$\{([a-zA-Z0-9_]+)\}/g,
    (match, variable) => (values[variable as string] as string) || match
  );
}

/**
 * @description Replaces occurrences of keys with their corresponding values in a string.
 * @summary Iterates through a set of key-value pairs and replaces all occurrences of each key
 * in the input string with its corresponding value. Supports regular expression flags for customized replacement.
 *
 * @param {string} input - The input string in which replacements will be made.
 * @param {Record<string, number | string>} values - An object containing key-value pairs for replacement.
 * @param {string} [flags="g"] - Regular expression flags to control the replacement behavior.
 * @return {string} The string with all specified replacements applied.
 *
 * @function patchString
 *
 * @memberOf module:utils
 */
export function patchString(
  input: string,
  values: Record<string, number | string>,
  flags: string = "g"
): string {
  Object.entries(values).forEach(([key, val]) => {
    const regexp = new RegExp(escapeRegExp(key), flags);
    input = input.replace(regexp, val as string);
  });
  return input;
}

/**
 * @description Converts a string to camelCase.
 * @summary Transforms the input string into camelCase format, where words are joined without spaces
 * and each word after the first starts with a capital letter.
 *
 * @param {string} text - The input string to be converted.
 * @return {string} The input string converted to camelCase.
 *
 * @function toCamelCase
 *
 * @memberOf module:utils
 */
export function toCamelCase(text: string): string {
  return text
    .replace(/(?:^\w|[A-Z]|\b\w)/g, (word, index) =>
      index === 0 ? word.toLowerCase() : word.toUpperCase()
    )
    .replace(/\s+/g, "");
}

/**
 * @description Converts a string to ENVIRONMENT_VARIABLE format.
 * @summary Transforms the input string into uppercase with words separated by underscores,
 * typically used for environment variable names.
 *
 * @param {string} text - The input string to be converted.
 * @return {string} The input string converted to ENVIRONMENT_VARIABLE format.
 *
 * @function toENVFormat
 *
 * @memberOf module:utils
 */
export function toENVFormat(text: string): string {
  return toSnakeCase(text).toUpperCase();
}

/**
 * @description Converts a string to snake_case.
 * @summary Transforms the input string into lowercase with words separated by underscores.
 *
 * @param {string} text - The input string to be converted.
 * @return {string} The input string converted to snake_case.
 *
 * @function toSnakeCase
 *
 * @memberOf module:utils
 */
export function toSnakeCase(text: string): string {
  return text
    .replace(/([a-z])([A-Z])/g, "$1_$2")
    .replace(/[\s-]+/g, "_")
    .toLowerCase();
}

/**
 * @description Converts a string to kebab-case.
 * @summary Transforms the input string into lowercase with words separated by hyphens.
 *
 * @param {string} text - The input string to be converted.
 * @return {string} The input string converted to kebab-case.
 *
 * @function toKebabCase
 *
 * @memberOf module:utils
 */
export function toKebabCase(text: string): string {
  return text
    .replace(/([a-z])([A-Z])/g, "$1-$2")
    .replace(/[\s_]+/g, "-")
    .toLowerCase();
}

/**
 * @description Converts a string to PascalCase.
 * @summary Transforms the input string into PascalCase format, where words are joined without spaces
 * and each word starts with a capital letter.
 *
 * @param {string} text - The input string to be converted.
 * @return {string} The input string converted to PascalCase.
 *
 * @function toPascalCase
 *
 * @memberOf module:utils
 */
export function toPascalCase(text: string): string {
  return text
    .replace(/(?:^\w|[A-Z]|\b\w)/g, (word) => word.toUpperCase())
    .replace(/\s+/g, "");
}

/**
 * @description Escapes special characters in a string for use in a regular expression.
 * @summary Adds backslashes before characters that have special meaning in regular expressions,
 * allowing the string to be used as a literal match in a RegExp.
 *
 * @param {string} string - The string to escape for regular expression use.
 * @return {string} The escaped string safe for use in regular expressions.
 *
 * @function escapeRegExp
 *
 * @memberOf module:utils
 */
export function escapeRegExp(string: string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); // $& means the whole matched string
}
