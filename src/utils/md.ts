/**
 * @description Single line markdown element type
 * @summary Represents the possible header levels in markdown
 * @typedef {"h1"|"h2"|"h3"|"h4"|"h5"|"h6"} MdSingleLineElement
 * @memberOf @decaf-ts/utils
 */
export type MdSingleLineElement = "h1" | "h2" | "h3" | "h4" | "h5" | "h6";

/**
 * @description Multi-line element types in markdown
 * @summary Defines the available multi-line element types
 * @typedef {"p"|"blockquote"} MdMultiLineElement
 * @memberOf @decaf-ts/utils
 */
export type MdMultiLineElement = "p" | "blockquote";

/**
 * @description List element types in markdown
 * @summary Defines the available list types
 * @typedef {"ul"|"ol"} MdListElement
 * @memberOf @decaf-ts/utils
 */
export type MdListElement = "ul" | "ol";

/**
 * @description List element types in markdown
 * @summary Defines the available list types
 * @typedef {Object} MdSingleLine
 * @property {string} [ul] - unordered list
 * @property {string} [ol] - ordered list
 * @memberOf @decaf-ts/utils
 */
export type MdSingleLine = {
  [k in MdSingleLineElement]?: string;
};
/**
 * @description Multi-line markdown element type
 * @summary Represents markdown elements that can contain multiple lines of text
 * @typedef {Object} MdMultiLine
 * @property {string|string[]} [p] - Paragraph content
 * @property {string|string[]} [blockquote] - Blockquote content
 * @memberOf @decaf-ts/utils
 */
export type MdMultiLine = { [k in MdMultiLineElement]?: string | string[] };

/**
 * @description Image definition type in markdown
 * @summary Defines the structure for image elements
 * @typedef {Object} MdImageDefinition
 * @property {string} [title] - Optional image title
 * @property {string} source - Image source URL
 * @property {string} [alt] - Optional alternative text
 * @memberOf @decaf-ts/utils
 */
export type MdImageDefinition = {
  title?: string;
  source: string;
  alt?: string;
};

/**
 * @description Image element type in markdown
 * @summary Represents an image element with its properties
 * @typedef {Object} MdImage
 * @property {MdImageDefinition} img - The image definition object
 * @memberOf @decaf-ts/utils
 */
export type MdImage = { img: MdImageDefinition };

/**
 * @description List item element type in markdown
 * @summary Represents ordered and unordered lists in markdown
 * @typedef {Object} MdListItem
 * @property {string[]} ul - Unordered list items
 * @property {string[]} ol - Ordered list items
 * @memberOf @decaf-ts/utils
 */
export type MdListItem = { [k in MdListElement]: string[] };

/**
 * @description Table definition type in markdown
 * @summary Defines the structure for table elements
 * @typedef {Object} MdTableDefinition
 * @property {string[]} headers - Array of table header names
 * @property {Object[]} rows - Array of row objects containing column values
 * @memberOf @decaf-ts/utils
 */
export type MdTableDefinition = {
  headers: string[];
  rows: { [column: string]: string | string[] }[];
};

/**
 * @description Table element type in markdown
 * @summary Represents a table structure with headers and rows
 * @typedef {Object} MdTable
 * @property {MdTableDefinition} table - The table definition object
 * @memberOf @decaf-ts/utils
 */
export type MdTable = { table: MdTableDefinition };

/**
 * @description Code block definition type in markdown
 * @summary Defines the structure for code blocks
 * @typedef {Object} MdCodeDefinition
 * @property {string} [language] - Optional programming language specification
 * @property {string|string[]} content - The code content as string or array of strings
 * @memberOf @decaf-ts/utils
 */
export type MdCodeDefinition = {
  language?: string;
  content: string | string[];
};

/**
 * @description Code block element type in markdown
 * @summary Represents a code block with optional language specification
 * @typedef {Object} MdCode
 * @property {MdCodeDefinition} code - The code block definition object
 * @memberOf @decaf-ts/utils
 */
export type MdCode = { code: MdCodeDefinition };

/**
 * @description Horizontal rule element type in markdown
 * @summary Represents a horizontal rule separator
 * @typedef {Object} MdSeparator
 * @property {string} hr - The horizontal rule representation
 * @memberOf @decaf-ts/utils
 */
export type MdSeparator = { hr: string };

/**
 * @description Link element type in markdown
 * @summary Represents a hyperlink with title and source
 * @typedef {Object} MdLink
 * @property {{title: string, source: string}} link - The link definition object
 * @memberOf @decaf-ts/utils
 */
export type MdLink = {
  link: {
    title: string;
    source: string;
  };
};

/**
 * @description Markdown element type definition
 * @summary Represents all possible markdown elements that can be used in document generation.
 * This type combines various markdown elements including headers, paragraphs, images, lists,
 * tables, code blocks, separators, and links into a union type for flexible markdown content creation.
 * @typedef {(MdSingleLine | MdMultiLine | MdImage | MdListItem | MdTable | MdCode | MdSeparator | MdLink)} MdElements
 * @memberOf @decaf-ts/utils
 */
export type MdElements =
  | MdSingleLine
  | MdMultiLine
  | MdImage
  | MdListItem
  | MdTable
  | MdCode
  | MdSeparator
  | MdLink;
