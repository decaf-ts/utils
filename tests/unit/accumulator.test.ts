import { ObjectAccumulator } from "../../src/utils/accumulator";

describe("ObjectAccumulator", () => {
  let accumulator: ObjectAccumulator<any>;

  beforeEach(() => {
    accumulator = new ObjectAccumulator();
  });

  it("should accumulate multiple objects and correctly update the union type", () => {
    const accumulator = new ObjectAccumulator();

    const obj1 = { name: "John", age: 30 };
    const obj2 = { city: "New York", country: "USA" };
    const obj3 = { isActive: true, score: 95.5 };

    const result1 = accumulator.accumulate(obj1);
    const result2 = result1.accumulate(obj2);
    const result3 = result2.accumulate(obj3);

    expect(result3.isActive).toBe("John");
    expect(result3.get("name")).toBe("John");
    expect(result3.get("age")).toBe(30);
    expect(result3.get("city")).toBe("New York");
    expect(result3.get("country")).toBe("USA");
    expect(result3.get("isActive")).toBe(true);
    expect(result3.get("score")).toBe(95.5);

    expect(result3.keys()).toEqual([
      "name",
      "age",
      "city",
      "country",
      "isActive",
      "score",
    ]);
    expect(result3.size()).toBe(6);

    const mappedValues = result3.map((value, key) => `${key}: ${value}`);
    expect(mappedValues).toEqual([
      "name: John",
      "age: 30",
      "city: New York",
      "country: USA",
      "isActive: true",
      "score: 95.5",
    ]);
  });

  it("should retrieve a registered object by its key", () => {
    const testObj1 = { name: "John", age: 30 };
    const testObj2 = { city: "New York", country: "USA" };

    const accumulatorWithObjects = accumulator
      .accumulate(testObj1)
      .accumulate(testObj2);

    expect(accumulatorWithObjects.get("name")).toBe("John");
    expect(accumulatorWithObjects.get("age")).toBe(30);
    expect(accumulatorWithObjects.get("city")).toBe("New York");
    expect(accumulatorWithObjects.get("country")).toBe("USA");
    expect(accumulatorWithObjects.get("nonexistent")).toBeUndefined();
  });

  it("should return undefined when getting a non-existent key", () => {
    const accumulator = new ObjectAccumulator<{ testKey: string }>();
    // @ts-expect-error deliberately passing a non-existing key
    const result = accumulator.get("nonExistentKey");
    expect(result).toBeUndefined();
  });

  it("should correctly check if an object is registered using the 'has' method", () => {
    const testObj = { key1: "value1", key2: "value2" };
    const accumulatorWithObj = accumulator.accumulate(testObj);

    expect(accumulatorWithObj.has("key1")).toBe(true);
    expect(accumulatorWithObj.has("key2")).toBe(true);
    expect(accumulatorWithObj.has("nonExistentKey")).toBe(false);
  });

  it("should successfully remove a registered object", () => {
    const testObject = { key1: "value1", key2: "value2" };
    const accumulator = new ObjectAccumulator<typeof testObject>();
    const updatedAccumulator = accumulator.accumulate(testObject);

    expect(updatedAccumulator.has("key1")).toBe(true);
    expect(updatedAccumulator.has("key2")).toBe(true);

    const removeResult = updatedAccumulator.remove("key1");

    expect(updatedAccumulator.has("key1")).toBe(false);
    expect(updatedAccumulator.has("key2")).toBe(true);
    expect(removeResult.has("key1")).toBe(false);
    expect(removeResult.has("key2")).toBe(true);
  });

  it("should return an array of all registered keys", () => {
    const testObj1 = { key1: "value1", key2: "value2" };
    const testObj2 = { key3: "value3" };

    const accumulatedObj = accumulator
      .accumulate(testObj1)
      .accumulate(testObj2);

    const keys = accumulatedObj.keys();

    expect(keys).toEqual(expect.arrayContaining(["key1", "key2", "key3"]));
    expect(keys.length).toBe(3);
  });

  it("should accurately report the number of registered objects", () => {
    const accumulator1 = new ObjectAccumulator<{ [key: string]: string }>();

    expect(accumulator1.size()).toBe(0);

    const accumulator2 = accumulator1.accumulate({ key1: "value1" });
    expect(accumulator2.size()).toBe(1);

    const accumulator3 = accumulator2.accumulate({
      key2: "value2",
      key3: "value3",
    });
    expect(accumulator3.size()).toBe(3);

    accumulator3.remove("key2");
    expect(accumulator3.size()).toBe(2);

    const resetAccumulator = accumulator3.clear();
    expect(resetAccumulator.size()).toBe(0);
  });

  it("should clear all registered objects and return an empty accumulator", () => {
    const accumulator = new ObjectAccumulator<{ test: string }>();
    const updatedAccumulator = accumulator.accumulate({ test: "value" });

    expect(updatedAccumulator.size()).toBe(1);
    expect(updatedAccumulator.has("test")).toBe(true);

    const clearedAccumulator = updatedAccumulator.clear();

    expect(clearedAccumulator).toBeInstanceOf(ObjectAccumulator);
    expect(clearedAccumulator.size()).toBe(0);
    expect(clearedAccumulator.has("test")).toBe(false);
    expect(clearedAccumulator.keys()).toEqual([]);
  });

  it("Should execute a callback for each registered object in the accumulator", () => {
    const accumulator = new ObjectAccumulator<{ [key: string]: number }>();
    const testData = { a: 1, b: 2, c: 3 };
    const accumulatedData = accumulator.accumulate(testData);

    const mockCallback = jest.fn();
    accumulatedData.forEach(mockCallback);

    expect(mockCallback).toHaveBeenCalledTimes(3);
    expect(mockCallback).toHaveBeenCalledWith(1, "a", 0);
    expect(mockCallback).toHaveBeenCalledWith(2, "b", 1);
    expect(mockCallback).toHaveBeenCalledWith(3, "c", 2);
  });
});
