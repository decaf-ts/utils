import { ChildProcessWithoutNullStreams } from "child_process";

/**
 * @description Defines the structure for promise resolution and rejection.
 * @summary Provides methods to resolve or reject a promise.
 * @template R - The type of the resolved value.
 * @template E - The type of the error value, defaulting to Error.
 * @typedef {Object} PromiseExecutor
 * @property {function(value: R | PromiseLike<R>): void} resolve - Function to resolve the promise.
 * @property {function(error: E): void} reject - Function to reject the promise.
 * @memberOf module:@decaf-ts/utils
 */
export interface PromiseExecutor<R, E = Error> {
  resolve: (value: R | PromiseLike<R>) => void,
  reject: (error: E) => void
}

/**
 * @description Represents the result of a command execution.
 * @summary Extends Promise with additional properties related to the command execution.
 * This interface provides a comprehensive way to handle and interact with the results
 * of an asynchronous command execution, including access to the command details,
 * output logs, and the ability to abort the execution.
 *
 * @template R - The type of the resolved value, defaulting to void.
 * @interface CommandResult
 * @extends Promise<R>
 * @memberOf module:@decaf-ts/utils
 */
export interface CommandResult<R = void> extends Promise<R> {
  /**
   * @description Controller to abort the command execution.
   * @summary Provides a mechanism to cancel the ongoing command execution.
   */
  abort: AbortController;

  /**
   * @description The executed command string.
   * @summary Contains the actual command that was executed.
   */
  command: string;

  /**
   * @description The child process object.
   * @summary Represents the Node.js child process that was spawned to execute the command.
   */
  cmd: ChildProcessWithoutNullStreams;

  /**
   * @description Array of stdout logs.
   * @summary Contains all the standard output messages produced during the command execution.
   */
  logs: string[];

  /**
   * @description Array of stderr logs.
   * @summary Contains all the standard error messages produced during the command execution.
   */
  errs: string[];

  /**
   * @description allows chaining commands.
   * @summary allows chaining commands (or piping).
   */
  pipe: <E>(cb: (r: R) => E) => Promise<E>;
}

