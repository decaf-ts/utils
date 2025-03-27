import { StandardOutputWriter } from "./StandardOutputWriter";
import { PromiseExecutor } from "../utils/types";
import { style } from "../utils/strings";

/**
 * @description A specialized output writer that uses regular expressions to process output.
 * @summary This class extends StandardOutputWriter to provide regex-based output processing.
 * It allows for pattern matching in the output stream and can trigger specific actions
 * based on matched patterns.
 * 
 * @template T - The type of the resolved value, defaulting to string.
 * 
 * @param lock - A PromiseExecutor to control the asynchronous flow.
 * @param regexp - A string or RegExp to match against the output.
 * @param flags - Optional flags for the RegExp constructor.
 * 
 * @class
 */
export class RegexpOutputWriter extends StandardOutputWriter<string> {

  /**
   * @description The regular expression used for matching output.
   * @summary This readonly property stores the compiled RegExp used for pattern matching.
   */
  protected readonly regexp: RegExp;

  /**
   * @description Initializes a new instance of RegexpOutputWriter.
   * @summary Constructs the RegexpOutputWriter with a lock mechanism and a regular expression.
   * 
   * @param lock - A PromiseExecutor to control the asynchronous flow.
   * @param regexp - A string or RegExp to match against the output.
   * @param flags - Optional flags for the RegExp constructor, defaults to "g".
   */
  constructor(lock: PromiseExecutor<string, number>, regexp: string | RegExp, flags = "g") {
    super(lock);
    this.regexp = typeof regexp === "string"? new RegExp(regexp, flags) : regexp;
  }

  /**
   * @description Tests the input data against the stored regular expression.
   * @summary Executes the regular expression on the input data and returns the match result.
   * 
   * @param data - The string to test against the regular expression.
   * @return The result of the regular expression execution, or undefined if an error occurs.
   */
  private test(data: string){
    this.regexp.lastIndex = 0;
    let match;
    try {
      match = this.regexp.exec(data);
    } catch (e: unknown){
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
  protected testAndResolve(data: string){
    const match = this.test(data);
    if (match)
      this.resolve(match[0]);
  }

  /**
   * @description Tests the data and rejects the promise if a match is found.
   * @summary Executes the test method and rejects the promise with the first match group if successful.
   * 
   * @param data - The string to test against the regular expression.
   */
  protected testAndReject(data: string){
    const match = this.test(data);
    if (match)
      this.reject(match[0]);
  }

  /**
   * @description Processes incoming data chunks.
   * @summary Calls the parent class data method and then tests the data for a match to potentially resolve the promise.
   * 
   * @param chunk - The data chunk to process.
   */
  data(chunk: any){
    super.data(chunk);
    this.testAndResolve(String(chunk));
  }

  /**
   * @description Processes incoming error chunks.
   * @summary Calls the parent class error method and then tests the data for a match to potentially reject the promise.
   * 
   * @param chunk - The error chunk to process.
   */
  error(chunk: any){
    super.error(chunk);
    this.testAndReject(String(chunk));
  }

  /**
   * @description Handles the rejection of the promise.
   * @summary Logs an error message and rejects the promise with an error code.
   * 
   * @param reason - The reason for the rejection.
   */
  protected reject(reason: string){
    this.log("stderr", `${this.cmd} failed to execute: ${style(reason).red.bold}`);
    this.lock.reject(1);
  }
}
