/**
 * @function isBrowser
 * @description Determines if the current environment is a browser by checking the prototype chain of the global object.
 * @summary Checks if the code is running in a browser environment.
 * @returns {boolean} True if the environment is a browser, false otherwise.
 */
export function isBrowser(): boolean {
  return (
    Object.getPrototypeOf(Object.getPrototypeOf(globalThis)) !==
    Object.prototype
  );
}
