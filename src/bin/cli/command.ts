import { ParseArgsResult } from "../input/types";
import { VerbosityLogger } from "../output/types";
import { CliFunction, CommandOptions } from "./types";
import { Logging } from "../output/logging";
import { DefaultLoggingConfig, LogLevel } from "../utils/constants";
import { UserInput } from "../input/input";
import { DefaultCommandValues } from "./constants";
import { getDependencies, getPackageVersion } from "../utils/fs";
import { printBanner } from "../output/common";

/**
 * @description Abstract base class for command implementation.
 * @summary Provides a structure for creating command-line interface commands with input handling, logging, and execution flow.
 * @template I - The type of input options for the command.
 * @template R - The return type of the command execution.
 * @param name - The name of the command.
 * @param inputs - The input options for the command.
 * @param requirements - The list of required dependencies for the command.
 * @class
 */
export abstract class Command<I, R> {
  /**
   * @description Static logger for the Command class.
   */
  static log: VerbosityLogger;

  /**
   * @description Instance logger for the command.
   */
  protected log: VerbosityLogger;

  /**
   * @description Creates an instance of Command.
   * @summary Initializes the command with a name, input options, and requirements. Sets up logging for the command.
   * @param name - The name of the command.
   * @param inputs - The input options for the command.
   * @param requirements - The list of required dependencies for the command.
   */
  protected constructor(protected name: string,
                        protected inputs: CommandOptions<I> = Object.assign({}, DefaultCommandValues, DefaultLoggingConfig) as unknown as CommandOptions<I>,
                        protected requirements: string[] = []){
    if (!Command.log){
      Object.defineProperty(Command, "log",{
        writable: false,
        value: Logging.for(this.name)
      })
      this.log = Command.log;
    }
    this.log = Command.log.for(this.name);
  }

  /**
   * @description Checks if all required dependencies are present.
   * @summary Retrieves the list of dependencies and compares it against the required dependencies for the command.
   * @return {Promise<void>} A promise that resolves when the check is complete.
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
    const {prod, dev, peer} = await getDependencies();
    const missing = [];
    const fullList =  Array.from(new Set([...prod, ...dev, ...peer]).values()).map(d => d.name)
    for (const dep of this.requirements)
      if (!fullList.includes(dep))
        missing.push(dep);

    if (!missing.length)
      return;

  }

  /**
   * @description Provides help information for the command.
   * @summary This method should be overridden in derived classes to provide specific help information.
   * @param args - The parsed command-line arguments.
   * @return {string | void} The help information as a string, or void if no information is provided.
   */
  protected help(args: ParseArgsResult): string | void {
    return this.log.info(`This is help. I'm no use because I should have been overridden.`);
  }

  /**
   * @description Runs the command with the provided function.
   * @summary Parses arguments, sets up logging, handles version and help requests, and executes the provided function.
   * @template C - The type of the command instance.
   * @param func - The function to be executed as part of the command.
   * @return {Promise<R | void | string>} A promise that resolves with the result of the command execution.
   * @mermaid
   * sequenceDiagram
   *   participant Command
   *   participant UserInput
   *   participant Logging
   *   participant getPackageVersion
   *   participant printBanner
   *   Command->>UserInput: parseArgs(inputs)
   *   UserInput-->>Command: Return ParseArgsResult
   *   Command->>Logging: setConfig(options)
   *   alt version requested
   *     Command->>getPackageVersion: Call
   *     getPackageVersion-->>Command: Return version
   *   else help requested
   *     Command->>Command: help(args)
   *   else banner requested
   *     Command->>printBanner: Call
   *   end
   *   Command->>Command: Execute func
   *   alt Error occurs
   *     Command->>Command: Log error
   *     Command->>Command: Throw error
   *   end
   *   Command-->>Command: Return result
   */
  async run<C extends Command<I, R>>(func: CliFunction<I, R, C>): Promise<R | void | string> {
    const args: ParseArgsResult = UserInput.parseArgs(this.inputs);
    const options = Object.assign({}, DefaultCommandValues, args.values);
    const {timestamp, verbose, version, help, logLevel, logStyle, banner} = options;
    Logging.setConfig({
      ...options,
      timestamp: !!timestamp,
      level: logLevel as LogLevel,
      style: !!logStyle,
      verbose: verbose as number || 0
    })
    if (version) {
      return getPackageVersion()
    }

    if (help) {
      return this.help(args)
    }

    if (banner)
      printBanner(this.log);

    let result;
    try {
      result = await func.call(this as unknown as C, args, this.log)
    } catch (e: unknown) {
      this.log.error(`Error while running provided cli function: ${e}`);
      throw e;
    }

    return result as R | void | string
  }
}