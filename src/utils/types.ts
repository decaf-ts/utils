import { ChildProcessWithoutNullStreams } from "child_process";
import { Environment } from "@decaf-ts/logging";

/**
 * @description Defines the structure for promise resolution and rejection.
 * @summary Provides methods to resolve or reject a promise.
 * @template R - The type of the resolved value.
 * @template E - The type of the error value, defaulting to Error.
 * @typedef {Object} PromiseExecutor
 * @property {function(R): void} resolve - Function to resolve the promise.
 * @property {function(E): void} reject - Function to reject the promise.
 * @memberOf module:utils
 */
export interface PromiseExecutor<R, E = Error> {
  resolve: (value: R | PromiseLike<R>) => void;
  reject: (error: E) => void;
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
 * @memberOf module:utils
 */
export interface CommandResult<R = void> {
  promise: Promise<R>;

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
  cmd?: ChildProcessWithoutNullStreams;

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

/**
 * @description Factory type for creating Environment instances.
 * @summary Defines a function type that creates and returns Environment instances.
 *
 * @template T - The type of object the Environment will accumulate.
 * @template E - The specific Environment type to be created, extending Environment<T>.
 * @typedef {function(...unknown[]): E} EnvironmentFactory
 * @memberOf module:utils
 */
export type EnvironmentFactory<T extends object, E extends Environment<T>> = (
  ...args: unknown[]
) => E;

/**
 * @description Map of project dependencies with detailed information.
 * @summary Represents the structure of project dependencies categorized by type (production, development, peer).
 * Each category contains an array of objects with name and version information.
 *
 * @typedef {Object} DependencyMap
 * @property {Array<{name: string, version: string}>} prod - Production dependencies with name and version.
 * @property {Array<{name: string, version: string}>} dev - Development dependencies with name and version.
 * @property {Array<{name: string, version: string}>} peer - Peer dependencies with name and version.
 * @memberOf module:utils
 */
export type DependencyMap = {
  prod: { name: string; version: string }[];
  dev: { name: string; version: string }[];
  peer: { name: string; version: string }[];
};

/**
 * @description Simplified map of project dependencies.
 * @summary Represents a simplified structure of project dependencies categorized by type.
 * Each category contains an optional array of dependency names without version information.
 *
 * @typedef {Object} SimpleDependencyMap
 * @property {string[]} [prod] - Optional array of production dependency names.
 * @property {string[]} [dev] - Optional array of development dependency names.
 * @property {string[]} [peer] - Optional array of peer dependency names.
 * @memberOf module:utils
 */
export type SimpleDependencyMap = {
  prod?: string[];
  dev?: string[];
  peer?: string[];
};
