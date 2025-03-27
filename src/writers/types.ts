import { StandardOutputWriter } from "./StandardOutputWriter";
import { PromiseExecutor } from "../utils/types";

/**
 * @description Represents the type of output stream.
 * @summary A union type for standard output and standard error streams.
 * @typedef {("stdout" | "stderr")} OutputType
 * @memberOf module:@decaf-ts/utils
 */
export type OutputType = "stdout" | "stderr";

/**
 * @description Constructor type for output writers.
 * @summary Defines the structure for creating new output writer instances. This type represents
 * a constructor function that takes a PromiseExecutor and additional arguments to create
 * a new instance of an output writer. It allows for flexible creation of different types
 * of output writers while maintaining a consistent interface.
 *
 * @template R - The type of the resolved value, defaulting to string.
 * @template C - The type of the output writer, extending StandardOutputWriter<R>.
 * @template E - The type of the error value, defaulting to number.
 *
 * @typedef {new(lock: PromiseExecutor<R, E>, ...args: unknown[]) => C} OutputWriterConstructor
 *
 * @param {PromiseExecutor<R, E>} lock - The promise executor for managing asynchronous operations.
 * @param {...unknown[]} args - Additional arguments passed to the constructor.
 * @return {C} An instance of the output writer.
 *
 * @memberOf module:@decaf-ts/utils
 */
export type OutputWriterConstructor<R = string, C extends StandardOutputWriter<R> = StandardOutputWriter<R>, E = number> = {new(lock: PromiseExecutor<R, E>, ...args: unknown[]): C};
