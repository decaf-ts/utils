import { StandardOutputWriter } from "./StandardOutputWriter";
import { PromiseExecutor } from "../utils/types";

/**
 * @description A specialized output writer that uses regular expressions to process output.
 * @summary This class extends StandardOutputWriter to provide regex-based output processing.
 * It allows for pattern matching in the output stream and can trigger specific actions
 * based on matched patterns.
 *
 * @template T - The type of the resolved value, defaulting to string.
 *
 * @param cmd - The command string to be executed.
 * @param lock - A PromiseExecutor to control the asynchronous flow.
 * @param regexp - A string or RegExp to match against the output.
 * @param flags - Optional flags for the RegExp constructor, defaults to "g".
 *
 * @class
 * @example
 * ```typescript
 * import { RegexpOutputWriter } from '@decaf-ts/utils';
 * import { PromiseExecutor } from '@decaf-ts/utils';
 * 
 * // Create a promise executor
 * const executor: PromiseExecutor<string, Error> = {
 *   resolve: (value) => console.log(`Resolved: ${value}`),
 *   reject: (error) => console.error(`Rejected: ${error.message}`)
 * };
 * 
 * // Create a regexp output writer that matches version numbers
 * const writer = new RegexpOutputWriter('node --version', executor, /v(\d+\.\d+\.\d+)/);
 * 
 * // Use the writer to handle command output
 * writer.data('v14.17.0');  // This will automatically resolve with "v14.17.0"
 * ```
 *
 * @mermaid
 * sequenceDiagram
 *   participant Client
 *   participant RegexpOutputWriter
 *   participant StandardOutputWriter
 *   participant Logger
 *   
 *   Client->>RegexpOutputWriter: new RegexpOutputWriter(cmd, lock, regexp, flags)
 *   RegexpOutputWriter->>StandardOutputWriter: super(cmd, lock)
 *   StandardOutputWriter->>Logger: Logging.for(cmd)
 *   RegexpOutputWriter->>RegexpOutputWriter: compile regexp
 *   
 *   Client->>RegexpOutputWriter: data(chunk)
 *   RegexpOutputWriter->>StandardOutputWriter: super.data(chunk)
 *   StandardOutputWriter->>Logger: logger.info(log)
 *   RegexpOutputWriter->>RegexpOutputWriter: testAndResolve(chunk)
 *   RegexpOutputWriter->>RegexpOutputWriter: test(chunk)
 *   alt match found
 *     RegexpOutputWriter->>RegexpOutputWriter: resolve(match[0])
 *     RegexpOutputWriter->>StandardOutputWriter: resolve(match[0])
 *   end
 *   
 *   Client->>RegexpOutputWriter: error(chunk)
 *   RegexpOutputWriter->>StandardOutputWriter: super.error(chunk)
 *   StandardOutputWriter->>Logger: logger.info(log)
 *   RegexpOutputWriter->>RegexpOutputWriter: testAndReject(chunk)
 *   RegexpOutputWriter->>RegexpOutputWriter: test(chunk)
 *   alt match found
 *     RegexpOutputWriter->>RegexpOutputWriter: reject(match[0])
 *     RegexpOutputWriter->>StandardOutputWriter: reject(match[0])
 *   end
 */
export class RegexpOutputWriter extends StandardOutputWriter<string> {
  /**
   * @description The regular expression used for matching output.
   * @summary This readonly property stores the compiled RegExp used for pattern matching.
   */
  protected readonly regexp: RegExp;

  constructor(
    cmd: string,
    lock: PromiseExecutor<string, Error>,
    regexp: string | RegExp,
    flags = "g"
  ) {
    super(cmd, lock);
    try {
      this.regexp =
        typeof regexp === "string" ? new RegExp(regexp, flags) : regexp;
    } catch (e: unknown) {
      throw new Error(`Invalid regular expression: ${e}`);
    }
  }

  /**
   * @description Tests the input data against the stored regular expression.
   * @summary Executes the regular expression on the input data and returns the match result.
   *
   * @param data - The string to test against the regular expression.
   * @return The result of the regular expression execution, or undefined if an error occurs.
   */
  private test(data: string) {
    this.regexp.lastIndex = 0;
    let match;
    try {
      match = this.regexp.exec(data);
    } catch (e: unknown) {
      return console.debug(`Failed to parse chunk: ${data}\nError: ${e} `);
    }
    return match;
  }

  /**
   * @description Tests the data and resolves the promise if a match is found.
   * @summary Executes the test method and resolves the promise with the first match group if successful.
   *
   * @param data - The string to test against the regular expression.
   */
  protected testAndResolve(data: string) {
    const match = this.test(data);
    if (match) this.resolve(match[0]);
  }

  /**
   * @description Tests the data and rejects the promise if a match is found.
   * @summary Executes the test method and rejects the promise with the first match group if successful.
   *
   * @param data - The string to test against the regular expression.
   */
  protected testAndReject(data: string) {
    const match = this.test(data);
    if (match) this.reject(match[0]);
  }

  /**
   * @description Processes incoming data chunks.
   * @summary Calls the parent class data method and then tests the data for a match to potentially resolve the promise.
   *
   * @param chunk - The data chunk to process.
   */
  override data(chunk: any) {
    super.data(chunk);
    this.testAndResolve(String(chunk));
  }

  /**
   * @description Processes incoming error chunks.
   * @summary Calls the parent class error method and then tests the data for a match to potentially reject the promise.
   *
   * @param chunk - The error chunk to process.
   */
  override error(chunk: any) {
    super.error(chunk);
    this.testAndReject(String(chunk));
  }
}
