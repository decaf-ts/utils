/**
 * @description Defines the structure for output writing operations.
 * @summary The OutputWriter interface provides a standardized set of methods for handling
 * various types of output in a command-line interface (CLI) application. It includes
 * methods for writing data, handling errors, and managing the program's exit process.
 * This interface allows for consistent output handling across different parts of the application.
 *
 * @interface OutputWriter
 * @memberOf module:@decaf-ts/utils
 */
export interface OutputWriter {
  /**
   * @description Handles the output of data chunks.
   * @summary Processes and writes a chunk of data to the output stream.
   * This method is typically used for standard output operations.
   * 
   * @param chunk - The data to be written. Can be of any type.
   * @return void
   */
  data(chunk: any): void

  /**
   * @description Handles error output.
   * @summary Processes and writes error information to the error output stream.
   * This method is used for non-critical errors or warnings.
   * 
   * @param chunk - The error data to be written. Can be of any type.
   * @return void
   */
  error(chunk: any): void;

  /**
   * @description Handles critical errors.
   * @summary Processes and writes critical error information.
   * This method is used for handling and reporting Error objects.
   * 
   * @param err - The Error object to be processed and written.
   * @return void
   */
  errors(err: Error): void;

  /**
   * @description Manages the program exit process.
   * @summary Handles the termination of the program with a specified exit code.
   * This method is called when the program needs to exit, either successfully or due to an error.
   * 
   * @param code - The exit code to be used when terminating the program.
   * @return void
   */
  exit(code: number): void;
}