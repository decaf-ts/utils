import { Environment } from "../../src/utils/environment";
import { ObjectAccumulator } from "../../src/utils/accumulator";
import { isBrowser } from "../../src/utils/web";
import { toENVFormat } from "../../src/utils/text";

jest.mock("../../src/utils/web");

describe("Environment", () => {
  beforeEach(() => {
    jest.resetAllMocks();
    jest.restoreAllMocks();
    jest.clearAllMocks();
  });

  it("should create a new Environment instance when no instance exists", () => {
    const spy = jest.spyOn(Environment, "factory");

    // @ts-expect-error method is not public, but we are just testing
    const instance = Environment.instance();

    expect(spy).toHaveBeenCalledTimes(1);
    expect(instance).toBeInstanceOf(Environment);
    expect(Environment["_instance"]).toBe(instance);

    spy.mockRestore();
  });

  it("Should return the existing instance when calling instance() multiple times", () => {
    const firstInstance = Environment["instance"]();
    const secondInstance = Environment["instance"]();

    expect(firstInstance).toBe(secondInstance);
    expect(Environment["_instance"]).toBe(firstInstance);
  });

  it("should accumulate new properties into the environment", () => {
    const newProps = { testKey: "testValue", anotherKey: 42 };
    const result = Environment.accumulate(newProps);

    expect(result).toHaveProperty("testKey", "testValue");
    expect(result).toHaveProperty("anotherKey", 42);

    // Check if the accumulated properties are accessible via the instance
    expect(Environment["_instance"]).toHaveProperty("testKey", "testValue");
    expect(Environment["_instance"]).toHaveProperty("anotherKey", 42);

    // Verify that the result is an instance of Environment and ObjectAccumulator
    expect(result).toBeInstanceOf(Environment);
    expect(result).toBeInstanceOf(ObjectAccumulator);

    // Check if the keys method returns the accumulated keys
    const keys = Environment.keys(false);
    expect(keys).toContain("testKey");
    expect(keys).toContain("anotherKey");
  });

  it("Should retrieve environment variables from process.env in Node.js", () => {
    const mockProcessEnv = {
      TEST_VAR: "test_value",
    };
    Object.defineProperty(globalThis, "process", {
      value: { env: mockProcessEnv },
      writable: true,
    });

    (isBrowser as jest.Mock).mockReturnValue(false);

    const env = Environment["instance"]();
    const result = env["fromEnv"]("TEST_VAR");

    expect(isBrowser).toHaveBeenCalled();
    expect(result).toBe("test_value");
  });

  it("should retrieve environment variables from globalThis.ENV in browser", () => {
    jest.unmock("../../src/utils/text");
    (isBrowser as jest.Mock).mockReturnValue(true);
    const mockENV = { TEST_VAR: "test_value" };
    (globalThis as any).ENV = mockENV;

    const env = Environment["instance"]();
    const accumulated = env.accumulate({ TEST_VAR: "default_value" });

    expect(accumulated.TEST_VAR).toBe("test_value");

    delete (globalThis as any).ENV;
  });

  it("should return keys in ENV format when keys() is called with default parameter", () => {
    const mockInstance = {
      keys: jest.fn().mockReturnValue(["testKey", "anotherKey"]),
    };
    jest.spyOn(Environment, "instance").mockReturnValue(mockInstance as any);

    const result = Environment.keys();

    expect(mockInstance.keys).toHaveBeenCalled();
    expect(result).toEqual(["TEST_KEY", "ANOTHER_KEY"]);
  });

  it("Should return keys in original format when keys() is called with false parameter", () => {
    const testData = { testKey: "testValue", anotherKey: 123 };
    const env = Environment;
    Environment.accumulate(testData);

    const keys = Environment.keys(false);

    expect(keys).toEqual(expect.arrayContaining(["testKey", "anotherKey"]));
    expect(keys).not.toEqual(
      expect.arrayContaining(["TEST_KEY", "ANOTHER_KEY"])
    );
  });

  it("should override accumulated values with environment variables when available", () => {
    const mockIsBrowser = isBrowser as jest.MockedFunction<typeof isBrowser>;
    mockIsBrowser.mockReturnValue(false);

    const originalEnv = process.env;
    process.env = { ...originalEnv, TEST_KEY: "env_value" };

    const env = Environment.accumulate({
      testKey: "default_value",
    });

    expect(env["testKey"]).toBe("env_value");

    // Clean up
    process.env = originalEnv;
  });

  it("Should allow setting new values for accumulated properties", () => {
    const testObj = { testKey: "testValue" };
    const env = Environment.accumulate(testObj);

    expect(env.testKey).toBe("testValue");

    env.testKey = "newValue";
    expect(env.testKey).toBe("newValue");

    // Check if the original object is not modified
    expect(testObj.testKey).toBe("testValue");
  });

  it("Should handle accumulation of nested objects correctly", () => {
    const nestedObject = {
      level1: {
        level2: {
          level3: "value",
        },
      },
      anotherProp: "test",
    };

    const result = Environment.accumulate(nestedObject);

    expect(result).toHaveProperty("level1.level2.level3", "value");
    expect(result).toHaveProperty("anotherProp", "test");

    expect(Environment.keys(false)).toContain("level1");
    expect(Environment.keys(false)).toContain("anotherProp");

    expect(Environment.keys()).toContain("LEVEL1");
    expect(Environment.keys()).toContain("ANOTHER_PROP");
  });
});
