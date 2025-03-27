import { LoggingConfig, VerbosityLogger } from "../output/types";
import { ParseArgsOptionConfig, ParseArgsResult } from "../input/types";
import { Command } from "./command";

/**
 * @description Type definition for CLI function.
 * @summary Defines the structure of a CLI function that takes a command, parsed arguments, and a logger, and returns a promise.
 * @template I - The type of input options for the command.
 * @template R - The return type of the CLI function.
 * @template C - The type of the command, extending Command<I, R>.
 * @param command - The command instance.
 * @param answers - The parsed command-line arguments.
 * @param logger - The verbosity logger.
 * @return A promise that resolves to the result of type R.
 * @typedef {Function} CliFunction
 */
export type CliFunction<I, R, C extends Command<I,R>> = (this: C, answers: ParseArgsResult, logger: VerbosityLogger) => Promise<R>;

/**
 * @description Interface for input options.
 * @summary Defines the structure of input options for CLI commands.
 * @interface InputOptions
 * @property {number} [verbose] - The verbosity level.
 * @property {boolean} [version] - Flag to show version information.
 * @property {boolean} [banner] - Flag to show banner.
 * @property {boolean} [help] - Flag to show help information.
 */
export type InputOptions = {
  verbose?: number,
  version?: boolean,
  banner?: boolean,
  help?: boolean
}

/**
 * @description Type definition for command options.
 * @summary Combines input options, input option configurations, and logging configurations into a single type.
 * @template I - The type of additional input options specific to the command.
 * @typedef {Object} CommandOptions
 */
export type CommandOptions<I> = I & Partial<{[k in keyof InputOptions]: ParseArgsOptionConfig}> & Partial<{[k in keyof LoggingConfig]: ParseArgsOptionConfig}>