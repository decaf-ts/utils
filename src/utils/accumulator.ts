/**
 * @class ObjectAccumulator
 * @template T - The type of the accumulated object, extends object
 * @description A class that accumulates objects and provides type-safe access to their properties.
 * It allows for dynamic addition of properties while maintaining type information.
 * @summary Accumulates objects and maintains type information for accumulated properties
 * @memberOf utils
 */
export class ObjectAccumulator<T extends object> {
  /**
   * @private
   * @description The size of the accumulated object
   * @type {number}
   */
  private __size!: number;

  constructor() {
    Object.defineProperty(this, "__size", {
      value: 0,
      writable: true,
      configurable: false,
      enumerable: false,
    });
  }

  /**
   * @protected
   * @description Expands the accumulator with properties from a new object
   * @summary Adds new properties to the accumulator
   * @template V - The type of the object being expanded
   * @param {V} value - The object to expand with
   * @returns {void}
   */
  protected expand<V extends object>(value: V): void {
    Object.entries(value).forEach(([k, v]) => {
      Object.defineProperty(this, k, {
        get: () => v,
        set: (val: V[keyof V]) => {
          v = val;
        },
        configurable: true,
        enumerable: true,
      });
    });
  }

  /**
   * @description Accumulates a new object into the accumulator
   * @summary Adds properties from a new object to the accumulator, maintaining type information
   * @template V - The type of the object being accumulated
   * @param {V} value - The object to accumulate
   * @returns {T & V & ObjectAccumulator<T & V>} A new ObjectAccumulator instance with updated type information
   * @mermaid
   * sequenceDiagram
   *   participant A as Accumulator
   *   participant O as Object
   *   A->>O: Get entries
   *   loop For each entry
   *     A->>A: Define property
   *   end
   *   A->>A: Update size
   *   A->>A: Return updated accumulator
   */
  accumulate<V extends object>(value: V): T & V & ObjectAccumulator<T & V> {
    this.expand(value);
    this.__size = this.__size + Object.keys(value).length;
    return this as unknown as T & V & ObjectAccumulator<T & V>;
  }

  /**
   * @description Retrieves a value from the accumulator by its key
   * @summary Gets a value from the accumulated object using a type-safe key
   * @template K - The key type, must be a key of this
   * @param {K} key - The key of the value to retrieve
   * @returns {this[K] | undefined} The value associated with the key, or undefined if not found
   */
  get<K extends keyof this>(key: K): this[K] | undefined {
    return this[key];
  }

  /**
   * @description Checks if a key exists in the accumulator
   * @summary Determines whether the accumulator contains a specific key
   * @param {string} key - The key to check for existence
   * @returns {boolean} True if the key exists, false otherwise
   */
  has(key: string): boolean {
    return !!this[key as keyof this];
  }

  /**
   * @description Removes a key-value pair from the accumulator
   * @summary Deletes a property from the accumulated object
   * @param {keyof this | string} key - The key of the property to remove
   * @returns {Omit<this, typeof key> & ObjectAccumulator<Omit<this, typeof key>> | this} The accumulator instance with the specified property removed
   */
  remove(
    key: keyof this | string
  ):
    | (Omit<this, typeof key> & ObjectAccumulator<Omit<this, typeof key>>)
    | this {
    if (!(key in this)) return this;

    delete this[key as keyof this];
    this.__size--;
    return this as unknown as Omit<this, typeof key> &
      ObjectAccumulator<Omit<this, typeof key>>;
  }

  /**
   * @description Retrieves all keys from the accumulator
   * @summary Gets an array of all accumulated property keys
   * @returns {string[]} An array of keys as strings
   */
  keys(): string[] {
    return Object.keys(this);
  }

  /**
   * @description Retrieves all values from the accumulator
   * @summary Gets an array of all accumulated property values
   * @returns {T[keyof T][]} An array of values
   */
  values(): T[keyof T][] {
    return Object.values(this);
  }

  /**
   * @description Gets the number of key-value pairs in the accumulator
   * @summary Returns the count of accumulated properties
   * @returns {number} The number of key-value pairs
   */
  size(): number {
    return this.__size;
  }

  /**
   * @description Clears all accumulated key-value pairs
   * @summary Removes all properties from the accumulator and returns a new empty instance
   * @returns {ObjectAccumulator<never>} A new empty ObjectAccumulator instance
   */
  clear(): ObjectAccumulator<never> {
    return new ObjectAccumulator();
  }

  /**
   * @description Executes a callback for each key-value pair in the accumulator
   * @summary Iterates over all accumulated properties, calling a function for each
   * @param {(value: this[keyof this], key: keyof this, i: number) => void} callback - The function to execute for each entry
   * @returns {void}
   */
  forEach(
    callback: (value: this[keyof this], key: keyof this, i: number) => void
  ): void {
    Object.entries(this).forEach(([key, value], i) =>
      callback(value, key as keyof this, i)
    );
  }

  /**
   * @description Creates a new array with the results of calling a provided function on every element in the accumulator
   * @summary Maps each accumulated property to a new value using a callback function
   * @template R - The type of the mapped values
   * @param {(value: this[keyof this], key: keyof this, i: number) => R} callback - Function that produces an element of the new array
   * @returns {R[]} A new array with each element being the result of the callback function
   */
  map<R>(
    callback: (value: this[keyof this], key: keyof this, i: number) => R
  ): R[] {
    return Object.entries(this).map(([key, value], i) =>
      callback(value, key as keyof this, i)
    );
  }
}
