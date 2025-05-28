/**
 * @description Creates a promise that resolves after a specified time.
 * @summary Utility function that pauses execution for a given number of milliseconds.
 *
 * @param {number} ms - The number of milliseconds to wait.
 * @return {Promise<void>} A promise that resolves after the specified timeout.
 *
 * @function awaitTimeout
 *
 * @memberOf module:utils
 */
export async function awaitTimeout(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
