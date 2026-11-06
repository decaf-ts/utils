import { RegexpOutputWriter } from "../../src/writers/RegexpOutputWriter";
import { PromiseExecutor } from "../../src/utils/types";
import { Logging } from "@decaf-ts/logging";

describe("RegexpOutputWriter", () => {
  let writer: RegexpOutputWriter;
  let mockLock: PromiseExecutor<string, Error>;
  let mockLogger: { info: jest.Mock; debug: jest.Mock };
  const testCmd = "test-command";
  const testRegex = "test-pattern";

  beforeEach(() => {
    mockLogger = {
      info: jest.fn(),
      debug: jest.fn(),
    };
    jest.spyOn(Logging, "for").mockReturnValue(mockLogger as any);
    jest.spyOn(console, "debug").mockImplementation();

    mockLock = {
      resolve: jest.fn(),
      reject: jest.fn(),
    };
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("constructor", () => {
    it("should initialize with string regex pattern", () => {
      writer = new RegexpOutputWriter(testCmd, mockLock, testRegex);
      expect(writer["regexp"]).toBeInstanceOf(RegExp);
      expect(writer["regexp"].source).toBe(testRegex);
      expect(writer["regexp"].flags).toBe("g");
    });

    it("should initialize with RegExp object", () => {
      const regex = /test-pattern/i;
      writer = new RegexpOutputWriter(testCmd, mockLock, regex);
      expect(writer["regexp"]).toBe(regex);
    });

    it("should initialize with custom flags", () => {
      writer = new RegexpOutputWriter(testCmd, mockLock, testRegex, "gi");
      expect(writer["regexp"].flags).toBe("gi");
    });
  });

  describe("test", () => {
    beforeEach(() => {
      writer = new RegexpOutputWriter(testCmd, mockLock, testRegex);
    });

    it("should return match when pattern is found", () => {
      const result = writer["test"]("some test-pattern here");
      expect(result).toBeTruthy();
      expect(result![0]).toBe("test-pattern");
    });

    it("should return null when pattern is not found", () => {
      const result = writer["test"]("no match here");
      expect(result).toBeNull();
    });

    it("should reset lastIndex before each test", () => {
      const input = "test-pattern test-pattern";
      const result1 = writer["test"](input);
      const result2 = writer["test"](input);
      expect(result1![0]).toBe("test-pattern");
      expect(result2![0]).toBe("test-pattern");
    });
  });

  describe("testAndResolve", () => {
    beforeEach(() => {
      writer = new RegexpOutputWriter(testCmd, mockLock, testRegex);
    });

    it("should resolve when pattern matches", () => {
      writer["testAndResolve"]("found test-pattern here");
      expect(mockLock.resolve).toHaveBeenCalledWith("test-pattern");
    });

    it("should not resolve when pattern does not match", () => {
      writer["testAndResolve"]("no match here");
      expect(mockLock.resolve).not.toHaveBeenCalled();
    });
  });

  describe("testAndReject", () => {
    beforeEach(() => {
      writer = new RegexpOutputWriter(testCmd, mockLock, testRegex);
    });

    it("should reject when pattern matches", () => {
      writer["testAndReject"]("found test-pattern here");
      expect(mockLock.reject).toHaveBeenCalled();
    });

    it("should not reject when pattern does not match", () => {
      writer["testAndReject"]("no match here");
      expect(mockLock.reject).not.toHaveBeenCalled();
    });
  });

  describe("data", () => {
    beforeEach(() => {
      writer = new RegexpOutputWriter(testCmd, mockLock, testRegex);
    });

    it("should process data and resolve on match", () => {
      writer.data("found test-pattern here");
      expect(mockLogger.info).toHaveBeenCalled();
      expect(mockLock.resolve).toHaveBeenCalledWith("test-pattern");
    });

    it("should process data without resolving on no match", () => {
      writer.data("no match here");
      expect(mockLogger.info).toHaveBeenCalled();
      expect(mockLock.resolve).not.toHaveBeenCalled();
    });

    it("should handle non-string input", () => {
      const input = { toString: () => "test-pattern" };
      writer.data(input);
      expect(mockLock.resolve).toHaveBeenCalledWith("test-pattern");
    });
  });

  describe("error", () => {
    beforeEach(() => {
      writer = new RegexpOutputWriter(testCmd, mockLock, testRegex);
    });

    it("should process error and reject on match", () => {
      writer.error("found test-pattern here");
      expect(mockLogger.info).toHaveBeenCalled();
      expect(mockLock.reject).toHaveBeenCalled();
    });

    it("should process error without rejecting on no match", () => {
      writer.error("no match here");
      expect(mockLogger.info).toHaveBeenCalled();
      expect(mockLock.reject).not.toHaveBeenCalled();
    });

    it("should handle non-string input", () => {
      const input = { toString: () => "test-pattern" };
      writer.error(input);
      expect(mockLock.reject).toHaveBeenCalled();
    });
  });
});
