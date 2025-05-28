import { Encoding } from "../utils/constants";
import { OutputWriter } from "./OutputWriter";
import { PromiseExecutor } from "../utils/types";
import { OutputType } from "./types";
import { style } from "styled-string-builder";
import { Logger, Logging } from "@decaf-ts/logging";

/**
 * @description A standard output writer for handling command execution output.
 * @summary This class implements the OutputWriter interface and provides methods for
 * handling various types of output from command execution, including standard output,
 * error output, and exit codes. It also includes utility methods for parsing commands
 * and resolving or rejecting promises based on execution results.
 *
 * @template R - The type of the resolved value, defaulting to string.
 *
 * @param cmd - The command string to be executed.
 * @param lock - A PromiseExecutor to control the asynchronous flow.
 * @param args - Additional arguments (unused in the current implementation).
 *
 * @class
 * @example
 * ```typescript
 * import { StandardOutputWriter } from '@decaf-ts/utils';
 * import { PromiseExecutor } from '@decaf-ts/utils';
 * 
 * // Create a promise executor
 * const executor: PromiseExecutor<string> = {
 *   resolve: (value) => console.log(`Resolved: ${value}`),
 *   reject: (error) => console.error(`Rejected: ${error.message}`)
 * };
 * 
 * // Create a standard output writer
 * const writer = new StandardOutputWriter('ls -la', executor);
 * 
 * // Use the writer to handle command output
 * writer.data('File list output...');
 * writer.exit(0, ['Command executed successfully']);
 * ```
 *
 * @mermaid
 * sequenceDiagram
 *   participant Client
 *   participant StandardOutputWriter
 *   participant Logger
 *   participant PromiseExecutor
 *   
 *   Client->>StandardOutputWriter: new StandardOutputWriter(cmd, lock)
 *   StandardOutputWriter->>Logger: Logging.for(cmd)
 *   
 *   Client->>StandardOutputWriter: data(chunk)
 *   StandardOutputWriter->>StandardOutputWriter: log("stdout", chunk)
 *   StandardOutputWriter->>Logger: logger.info(log)
 *   
 *   Client->>StandardOutputWriter: error(chunk)
 *   StandardOutputWriter->>StandardOutputWriter: log("stderr", chunk)
 *   StandardOutputWriter->>Logger: logger.info(log)
 *   
 *   Client->>StandardOutputWriter: exit(code, logs)
 *   StandardOutputWriter->>StandardOutputWriter: log("stdout", exitMessage)
 *   alt code === 0
 *     StandardOutputWriter->>StandardOutputWriter: resolve(logs)
 *     StandardOutputWriter->>PromiseExecutor: lock.resolve(reason)
 *   else code !== 0
 *     StandardOutputWriter->>StandardOutputWriter: reject(error)
 *     StandardOutputWriter->>PromiseExecutor: lock.reject(reason)
 *   end
 */
export class StandardOutputWriter<R = string> implements OutputWriter {
  protected logger: Logger;

  constructor(
    protected cmd: string,
    protected lock: PromiseExecutor<R>,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    ...args: unknown[]
  ) {
    this.logger = Logging.for(this.cmd);
  }

  /**
   * @description Logs output to the console.
   * @summary Formats and logs the given data with a timestamp and type indicator.
   *
   * @param type - The type of output (stdout or stderr).
   * @param data - The data to be logged.
   */
  protected log(type: OutputType, data: string | Buffer) {
    data = Buffer.isBuffer(data) ? data.toString(Encoding) : data;
    const log = type === "stderr" ? style(data).red.text : data;
    this.logger.info(log);
  }

  /**
   * @description Handles standard output data.
   * @summary Logs the given chunk as standard output.
   *
   * @param chunk - The data chunk to be logged.
   */
  data(chunk: any) {
    this.log("stdout", String(chunk));
  }

  /**
   * @description Handles error output data.
   * @summary Logs the given chunk as error output.
   *
   * @param chunk - The error data chunk to be logged.
   */
  error(chunk: any) {
    this.log("stderr", String(chunk));
  }

  /**
   * @description Handles error objects.
   * @summary Logs the error message from the given Error object.
   *
   * @param err - The Error object to be logged.
   */
  errors(err: Error) {
    this.log("stderr", `Error executing command exited : ${err}`);
  }

  /**
   * @description Handles the exit of a command.
   * @summary Logs the exit code and resolves or rejects the promise based on the code.
   *
   * @param code - The exit code of the command.
   * @param logs - Array of log messages to be processed before exiting.
   */
  exit(code: number | string, logs: string[]) {
    this.log(
      "stdout",
      `command exited code : ${code === 0 ? style(code.toString()).green.text : style(code === null ? "null" : code.toString()).red.text}`
    );
    if (code === 0) {
      this.resolve(logs.map((l) => l.trim()).join("\n") as R);
    } else {
      this.reject(new Error(logs.length ? logs.join("\n") : code.toString()));
    }
  }

  /**
   * @description Parses a command string or array into components.
   * @summary Converts the command into a consistent format and stores it, then returns it split into command and arguments.
   *
   * @param command - The command as a string or array of strings.
   * @return A tuple containing the command and its arguments as separate elements.
   */
  parseCommand(command: string | string[]): [string, string[]] {
    command = typeof command === "string" ? command.split(" ") : command;
    this.cmd = command.join(" ");
    return [command[0], command.slice(1)];
  }

  /**
   * @description Resolves the promise with a success message.
   * @summary Logs a success message and resolves the promise with the given reason.
   *
   * @param reason - The reason for resolving the promise.
   */
  protected resolve(reason: R) {
    this.log(
      "stdout",
      `${this.cmd} executed successfully: ${style(reason ? "ran to completion" : (reason as string)).green}`
    );
    this.lock.resolve(reason);
  }

  /**
   * @description Rejects the promise with an error message.
   * @summary Logs an error message and rejects the promise with the given reason.
   *
   * @param reason - The reason for rejecting the promise, either a number (exit code) or a string.
   */
  protected reject(reason: number | string | Error) {
    if (!(reason instanceof Error)) {
      reason = new Error(
        typeof reason === "number" ? `Exit code ${reason}` : reason
      );
    }
    this.log(
      "stderr",
      `${this.cmd} failed to execute: ${style(reason.message).red}`
    );
    this.lock.reject(reason);
  }
}
