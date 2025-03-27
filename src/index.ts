export * from "./cli";
export * from "./input";
export * from "./output";
export * from "./utils";
export * from "./writers";

/**
 * @module @decaf-ts/utils
 * @description
 * This module serves a light version of Decaf CLI tool, providing a comprehensive set of utilities
 * and functionalities for command-line interface operations. It encompasses several key components:
 * 
 * 1. Input Handling: Manages user input and command-line arguments processing.
 * 2. Utility Functions: Offers a collection of helper functions and constants for various operations.
 * 3. Type Definitions: Defines custom types and interfaces used throughout the module.
 * 4. Output Management: Provides different output writing strategies for flexible console output handling.
 * 
 * The module is designed to facilitate the creation of robust CLI applications by offering:
 * - Standardized input parsing and validation
 * - Consistent output formatting and handling
 * - Reusable utility functions for common CLI tasks
 * - Extensible architecture for adding new commands and features
 * 
 * It supports various output modes, including standard console output and regular expression-based output,
 * allowing for versatile data presentation and processing. The modular structure enables easy maintenance
 * and extension of the CLI functionality.
 * 
 * This module is particularly useful for developers building complex command-line tools that require
 * structured input handling, flexible output formatting, and a rich set of utility functions.
 */


/**
 * @description Represents the current version of the module.
 * @summary This constant stores the version number of the @decaf-ts/utils module. 
 * The actual version number is replaced during the build process, 
 * with the placeholder "##VERSION##" being substituted with the current version.
 * 
 * @const VERSION
 * @memberOf module:@decaf-ts/utils
 */
export const VERSION = "##VERSION##";