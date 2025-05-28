import { toENVFormat } from "./text";
import { EnvironmentFactory } from "./types";
import { isBrowser } from "./web";
import { ObjectAccumulator } from "typed-object-accumulator";

/**
 * @class Environment
 * @extends {ObjectAccumulator<T>}
 * @template T
 * @description A class representing an environment with accumulation capabilities.
 * @summary Manages environment-related data and provides methods for accumulation and key retrieval.
 * @param {T} [initialData] - The initial data to populate the environment with.
 */
export class Environment<T extends object> extends ObjectAccumulator<T> {
  /**
   * @static
   * @protected
   * @description A factory function for creating Environment instances.
   * @summary Defines how new instances of the Environment class should be created.
   * @return {Environment<any>} A new instance of the Environment class.
   */
  protected static factory: EnvironmentFactory<any, any> =
    (): Environment<any> => new Environment();

  /**
   * @static
   * @private
   * @description The singleton instance of the Environment class.
   * @type {Environment<any>}
   */
  private static _instance: Environment<any>;

  protected constructor() {
    super();
  }

  /**
   * @description Retrieves a value from the environment
   * @summary Gets a value from the environment variables, handling browser and Node.js environments differently
   * @param {string} k - The key to retrieve from the environment
   * @return {unknown} The value from the environment, or undefined if not found
   */
  protected fromEnv(k: string) {
    let env: Record<string, unknown>;
    if (isBrowser()) {
      env = (globalThis as typeof globalThis & { ENV: Record<string, any> })[
        "ENV"
      ];
    } else {
      env = globalThis.process.env;
      k = toENVFormat(k);
    }
    return env[k];
  }

  /**
   * @description Expands an object into the environment
   * @summary Defines properties on the environment object that can be accessed as getters and setters
   * @template V - Type of the object being expanded
   * @param {V} value - The object to expand into the environment
   * @return {void}
   */
  protected override expand<V extends object>(value: V): void {
    Object.entries(value).forEach(([k, v]) => {
      Object.defineProperty(this, k, {
        get: () => {
          const fromEnv = this.fromEnv(k);
          return typeof fromEnv === "undefined" ? v : fromEnv;
        },
        set: (val: V[keyof V]) => {
          v = val;
        },
        configurable: true,
        enumerable: true,
      });
    });
  }

  /**
   * @protected
   * @static
   * @description Retrieves or creates the singleton instance of the Environment class.
   * @summary Ensures only one instance of the Environment class exists.
   * @template E
   * @param {...unknown[]} args - Arguments to pass to the factory function if a new instance is created.
   * @return {E} The singleton instance of the Environment class.
   */
  protected static instance<E extends Environment<any>>(...args: unknown[]): E {
    Environment._instance = !Environment._instance
      ? Environment.factory(...args)
      : Environment._instance;
    return Environment._instance as E;
  }

  /**
   * @static
   * @description Accumulates the given value into the environment.
   * @summary Adds new properties to the environment from the provided object.
   * @template V
   * @param {V} value - The object to accumulate into the environment.
   * @return {V} The updated environment instance.
   */
  static accumulate<V extends object>(
    value: V
  ): typeof Environment._instance &
    V &
    ObjectAccumulator<typeof Environment._instance & V> {
    const instance = Environment.instance();
    return instance.accumulate(value);
  }

  /**
   * @static
   * @description Retrieves the keys of the environment, optionally converting them to ENV format.
   * @summary Gets all keys in the environment, with an option to format them for environment variables.
   * @param {boolean} [toEnv=true] - Whether to convert the keys to ENV format.
   * @return {string[]} An array of keys from the environment.
   */
  static keys(toEnv: boolean = true): string[] {
    return Environment.instance()
      .keys()
      .map((k) => (toEnv ? toENVFormat(k) : k));
  }
}
