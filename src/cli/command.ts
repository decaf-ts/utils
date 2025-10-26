import { ParseArgsResult } from "../input/types";
import { CommandOptions } from "./types";
import { UserInput } from "../input/input";
import { DefaultCommandOptions, DefaultCommandValues } from "./constants";
import { getDependencies, getPackageVersion } from "../utils/fs";
import { printBanner } from "../output/common";
import {
  LoggedClass,
  LoggedEnvironment,
  Logger,
  Logging,
  LoggingConfig,
} from "@decaf-ts/logging";

/**
 * @class Command
 * @abstract
 * @template I - The type of input options for the command.
 * @template R - The return type of the command execution.
 * @memberOf module:utils
 * @description Abstract base class for command implementation.
 * @summary Provides a structure for creating command-line interface commands with input handling, logging, and execution flow.
 *
 * @param {string} name - The name of the command.
 * @param {CommandOptions<I>} [inputs] - The input options for the command.
 * @param {string[]} [requirements] - The list of required dependencies for the command.
 */
export abstract class Command<I, R> extends LoggedClass {
  /**
   * @static
   * @description Static logger for the Command class.
   * @type {Logger}
   */
  static log: Logger;

  protected constructor(
    protected name: string,
    protected inputs: CommandOptions<I> = {} as unknown as CommandOptions<I>,
    protected requirements: string[] = []
  ) {
    super();
    if (!Command.log) {
      Object.defineProperty(Command, "log", {
        writable: false,
        value: Logging.for(Command.name),
      });
    }
    this.inputs = Object.assign(
      {},
      DefaultCommandOptions,
      inputs
    ) as CommandOptions<I>;
  }

  /**
   * @protected
   * @async
   * @description Checks if all required dependencies are present.
   * @summary Retrieves the list of dependencies and compares it against the required dependencies for the command.
   * @returns {Promise<void>} A promise that resolves when the check is complete.
   *
   * @mermaid
   * sequenceDiagram
   *   participant Command
   *   participant getDependencies
   *   participant Set
   *   Command->>getDependencies: Call
   *   getDependencies-->>Command: Return {prod, dev, peer}
   *   Command->>Set: Create Set from prod, dev, peer
   *   Set-->>Command: Return unique dependencies
   *   Command->>Command: Compare against requirements
   *   alt Missing dependencies
   *     Command->>Command: Add to missing list
   *   end
   *   Note over Command: If missing.length > 0, handle missing dependencies
   */
  protected async checkRequirements(): Promise<void> {
    const { prod, dev, peer } = await getDependencies();
    const missing = [];
    const fullList = Array.from(
      new Set([...prod, ...dev, ...peer]).values()
    ).map((d) => d.name);
    for (const dep of this.requirements)
      if (!fullList.includes(dep)) missing.push(dep);

    if (!missing.length) return;
  }

  /**
   * @protected
   * @description Provides help information for the command.
   * @summary This method should be overridden in derived classes to provide specific help information.
   * @param {ParseArgsResult} args - The parsed command-line arguments.
   * @returns {void}
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  protected help(args: ParseArgsResult): void {
    return this.log.info(
      `This is help. I'm no use because I should have been overridden.`
    );
  }

  /**
   * @protected
   * @abstract
   * @description Runs the command with the provided arguments.
   * @summary This method should be implemented in derived classes to define the command's behavior.
   * @param {ParseArgsResult} answers - The parsed command-line arguments.
   * @returns {Promise<R | string | void>} A promise that resolves with the command's result.
   */
  protected abstract run<R>(
    answers: LoggingConfig &
      typeof DefaultCommandValues & { [k in keyof I]: unknown }
  ): Promise<R | string | void>;

  /**
   * @async
   * @description Executes the command.
   * @summary This method handles the overall execution flow of the command, including parsing arguments,
   * setting up logging, checking for version or help requests, and running the command.
   * @returns {Promise<R | string | void>} A promise that resolves with the command's result.
   *
   * @mermaid
   * sequenceDiagram
   *   participant Command
   *   participant UserInput
   *   participant Logging
   *   participant getPackageVersion
   *   participant printBanner
   *   Command->>UserInput: parseArgs(inputs)
   *   UserInput-->>Command: Return ParseArgsResult
   *   Command->>Command: Process options
   *   Command->>Logging: setConfig(options)
   *   alt version requested
   *     Command->>getPackageVersion: Call
   *     getPackageVersion-->>Command: Return version
   *   else help requested
   *     Command->>Command: help(args)
   *   else banner requested
   *     Command->>printBanner: Call
   *   end
   *   Command->>Command: run(args)
   *   alt error occurs
   *     Command->>Command: Log error
   *   end
   *   Command-->>Command: Return result
   */
  async execute(): Promise<R | string | void> {
    const args: ParseArgsResult = UserInput.parseArgs(this.inputs);
    const env = LoggedEnvironment.accumulate(DefaultCommandValues).accumulate(
      args.values
    );
    const { version, help, banner } = env;

    if (version) {
      return getPackageVersion();
    }

    if (help) {
      return this.help(args);
    }

    if (banner)
      printBanner(
        this.log.for(printBanner, {
          timestamp: false,
          style: false,
          context: false,
          logLevel: false,
        })
      );

    let result;
    // eslint-disable-next-line no-useless-catch
    try {
      result = await this.run(env as any);
    } catch (e: unknown) {
      throw e;
    }

    return result as R;
  }
}
