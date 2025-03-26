import { toENVFormat } from "./text";

/**
 * @description A singleton class for managing environment variables.
 * @summary Provides a centralized way to access and modify environment variables, with caching and lazy initialization.
 * @class
 */
export class Environment {
  /**
   * @description The singleton instance of the Environment class.
   * @summary Stores the single instance of the Environment class, following the singleton pattern.
   */
  private static _instance?: Environment;

  /**
   * @description A cache for storing environment variables.
   * @summary Provides a Map to store and retrieve environment variables efficiently.
   */
  private static cache: Map<string, unknown> = new Map();

  /**
   * @description A factory function for creating Environment instances.
   * @summary Defines how new instances of the Environment class should be created.
   * @param {...unknown[]} args - Arguments passed to the factory function.
   * @return {Environment} A new instance of the Environment class.
   */
  protected static factory: (...args: unknown[]) => Environment = () => new Environment()

  /**
   * @description Protected constructor to prevent direct instantiation.
   * @summary Ensures that the Environment class can only be instantiated through the singleton pattern.
   */
  protected constructor() {
  }

  /**
   * @description Retrieves all keys of the environment variables.
   * @summary Returns an array of all environment variable keys, optionally converting them to ENV format.
   * @param {boolean} [toEnv=true] - Whether to convert keys to ENV format.
   * @return {string[]} An array of environment variable keys.
   */
  static keys(toEnv = true): string[]{
    return Object.keys(this.instance).map(k => toEnv ? toENVFormat(k): k);
  }

  /**
   * @description Processes an object of environment variables.
   * @summary Adds or updates environment variables based on the provided object, with fallback to process.env.
   * @param {Object} obj - An object containing environment variables to process.
   * @mermaid
   * sequenceDiagram
   *   participant Environment
   *   participant Object
   *   participant process.env
   *   Environment->>Environment: keys(false)
   *   loop For each entry in obj
   *     Environment->>Object: Check if key exists
   *     alt Key exists
   *       Environment->>Environment: Update existing property
   *     else Key doesn't exist
   *       Environment->>Environment: Define new property
   *       Environment->>process.env: Check for existing env var
   *       Environment->>Environment: Set value (from process.env or obj)
   *     end
   *   end
   */
  static process(obj: {[k: string]: any}) {
    const keys = this.keys(false);
    Object.entries(obj).forEach(([key, value]) => {
      if (keys.includes(key)) {
        this[key as keyof typeof Environment] = value;
        return;
      }
      Object.defineProperty(this, key, {
        get: () => this.cache.get(key),
        set: (val: unknown) => this.cache.set(key, val),
        enumerable: true,
        configurable: false,
      })
      this[key as keyof typeof Environment] = process.env[toENVFormat(key)] || value;
    })
  }


  /**
   * @description Retrieves or creates the singleton instance of the Environment class.
   * @summary Ensures that only one instance of the Environment class exists, creating it if necessary.
   * @param {...unknown[]} args - Arguments to pass to the factory function if a new instance is created.
   * @return {Environment} The singleton instance of the Environment class.
   */
  protected static instance(...args: unknown[]): Environment {
    this._instance = !this._instance ? this.factory(...args) : this._instance;
    return this._instance;
  }
}
