import { LoggingConfig } from "../output/types";
import { ParseArgsOptionConfig } from "../input/types";

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
  verbose?: number;
  version?: boolean;
  banner?: boolean;
  help?: boolean;
};

/**
 * @description Type definition for command options.
 * @summary Combines input options, input option configurations, and logging configurations into a single type.
 * @template I - The type of additional input options specific to the command.
 * @typedef {Object} CommandOptions
 */
export type CommandOptions<I> = I &
  Partial<{ [k in keyof InputOptions]: ParseArgsOptionConfig }> &
  Partial<{ [k in keyof LoggingConfig]: ParseArgsOptionConfig }>;
