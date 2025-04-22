import { PromiseExecutor } from "../../src/utils/types";
import { Logging } from "../../src/output/logging";
import { style } from "styled-string-builder";
import { Encoding } from "../../src/utils/constants";
import { StandardOutputWriter } from "../../src";

describe("StandardOutputWriter", () => {
  let writer: StandardOutputWriter;
  let mockLock: PromiseExecutor<string>;
  let mockLogger: { info: jest.Mock };

  beforeEach(() => {
    mockLogger = { info: jest.fn() };
    jest.spyOn(Logging, "for").mockReturnValue(mockLogger as any);

    mockLock = {
      resolve: jest.fn(),
      reject: jest.fn(),
    };

    writer = new StandardOutputWriter("test-command", mockLock);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("constructor", () => {
    it("should initialize with correct parameters", () => {
      expect(Logging.for).toHaveBeenCalledWith("test-command");
      expect(writer["cmd"]).toBe("test-command");
      expect(writer["lock"]).toBe(mockLock);
    });
  });

  describe("log", () => {
    it("should format and log stdout messages", () => {
      writer["log"]("stdout", "test message");
      expect(mockLogger.info).toHaveBeenCalledWith("test message");
    });

    it("should format and log stderr messages with red ERROR text", () => {
      writer["log"]("stderr", "error message");
      expect(mockLogger.info).toHaveBeenCalledWith(
        `${style("error message").red.text}`
      );
    });

    it("should handle Buffer input", () => {
      const buffer = Buffer.from("test buffer", Encoding);
      writer["log"]("stdout", buffer);
      expect(mockLogger.info).toHaveBeenCalledWith("test buffer");
    });
  });

  describe("data", () => {
    it("should log data as stdout", () => {
      writer.data("test output");
      expect(mockLogger.info).toHaveBeenCalledWith("test output");
    });
  });

  describe("error", () => {
    it("should log error as stderr", () => {
      writer.error("test error");
      expect(mockLogger.info).toHaveBeenCalledWith(
        `${style("test error").red.text}`
      );
    });
  });

  describe("errors", () => {
    it("should log Error objects", () => {
      const error = new Error("test error");
      writer.errors(error);
      expect(mockLogger.info).toHaveBeenCalledWith(
        `${style("Error executing command exited : Error: test error").red.text}`
      );
    });
  });

  describe("exit", () => {
    it("should resolve with joined logs on success exit code", () => {
      const logs = ["log1", "log2 "];
      writer.exit(0, logs);
      expect(mockLock.resolve).toHaveBeenCalledWith("log1\nlog2");
    });

    it("should reject with error on non-zero exit code", () => {
      const logs = ["error1", "error2"];
      writer.exit(1, logs);
      expect(mockLock.reject).toHaveBeenCalledWith(new Error("error1\nerror2"));
    });

    it("should use exit code as error message when no logs present", () => {
      writer.exit(1, []);
      expect(mockLock.reject).toHaveBeenCalledWith(new Error("1"));
    });
  });

  describe("parseCommand", () => {
    it("should parse string command", () => {
      const result = writer.parseCommand("npm install package");
      expect(result).toEqual(["npm", ["install", "package"]]);
      expect(writer["cmd"]).toBe("npm install package");
    });

    it("should handle array command", () => {
      const result = writer.parseCommand(["git", "pull", "origin"]);
      expect(result).toEqual(["git", ["pull", "origin"]]);
      expect(writer["cmd"]).toBe("git pull origin");
    });
  });

  describe("resolve", () => {
    it("should resolve with success message", () => {
      writer["resolve"]("test success");
      expect(mockLock.resolve).toHaveBeenCalledWith("test success");
      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining("executed successfully")
      );
    });

    it("should handle empty reason", () => {
      writer["resolve"]("");
      expect(mockLock.resolve).toHaveBeenCalledWith("");
      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining("executed successfully")
      );
    });
  });

  describe("reject", () => {
    it("should reject with Error object", () => {
      const error = new Error("test error");
      writer["reject"](error);
      expect(mockLock.reject).toHaveBeenCalledWith(error);
      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining("failed to execute")
      );
    });

    it("should convert number to Error with exit code message", () => {
      writer["reject"](1);
      expect(mockLock.reject).toHaveBeenCalledWith(new Error("Exit code 1"));
    });

    it("should convert string to Error", () => {
      writer["reject"]("test error");
      expect(mockLock.reject).toHaveBeenCalledWith(new Error("test error"));
    });
  });
});
