export * from "./cli";
export * from "./input";
export * from "./output";
export * from "./utils";
export * from "./writers";

/**
 * @module utils
 * @description Utilities and building blocks for Decaf-TS CLI and scripting.
 * @summary Aggregates CLI command infrastructure, input helpers, output writers, filesystem/network utilities,
 * and shared types. Consumers typically use {@link Command}, {@link UserInput}, {@link StandardOutputWriter},
 * {@link printBanner}, and utilities from {@link module:utils|utils}.
 *
 * This entrypoint re-exports subpackages:
 * - CLI framework under `./cli` (command base, options, built-in commands)
 * - Input helpers under `./input` (prompting and arg parsing)
 * - Output helpers under `./output` (banner and styling)
 * - General utilities under `./utils` (fs, http, exec, types)
 * - Writers under `./writers` (stdout/stderr processors)
 *
 * Note: Individual exports are documented in their source files.
 */

/**
 * @description Represents the current version of the module.
 * @summary Stores the version for the @decaf-ts/utils package. The build replaces
 * the placeholder with the actual version number at publish time.
 * @const VERSION
 * @memberOf module:utils
 */
export const VERSION = "##VERSION##";

/**
 * @description Represents the current version of the module.
 * @summary Stores the version for the @decaf-ts/utils package. The build replaces
 * the placeholder with the actual version number at publish time.
 * @const VERSION
 * @memberOf module:utils
 */
export const PACKAGE_NAME = "##PACKAGE##";
