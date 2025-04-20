import * as fs from "fs";
import * as path from "path";
import { TestReporter, PayloadType } from "../../src/utils/tests";
import { MdTableDefinition } from "../../src/utils/md";
import * as fsUtils from "../../src/utils/fs";

// Mock dependencies
jest.mock("fs");
jest.mock("path");
jest.mock("../../src/utils/fs");

// Mock imports that will be dynamically loaded
jest.mock(
  "jest-html-reporters/helper",
  () => ({
    addMsg: jest.fn().mockResolvedValue(undefined),
    addAttach: jest.fn().mockResolvedValue(undefined),
  }),
  { virtual: true }
);

jest.mock(
  "json2md",
  () => jest.fn().mockImplementation(() => "mocked-markdown"),
  { virtual: true }
);

jest.mock(
  "chartjs-node-canvas",
  () => ({
    ChartJSNodeCanvas: jest.fn().mockImplementation(() => ({
      renderToBuffer: jest.fn().mockResolvedValue(Buffer.from("mocked-image")),
    })),
  }),
  { virtual: true }
);

describe("TestReporter", () => {
  let reporter: TestReporter;
  const mockBasePath = "/mock/base/path";
  const mockTestCase = "mock-test-case";
  const mockFullPath = "/mock/base/path/mock-test-case";

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock path.join to return predictable paths
    (path.join as jest.Mock).mockImplementation((...args) => {
      if (args.includes(mockTestCase)) {
        return mockFullPath;
      }
      return mockBasePath;
    });

    // Mock fs.existsSync and fs.mkdirSync
    (fs.existsSync as jest.Mock).mockReturnValue(false);
    (fs.mkdirSync as jest.Mock).mockReturnValue(undefined);

    // Mock installIfNotAvailable
    (fsUtils.installIfNotAvailable as jest.Mock).mockResolvedValue({
      "jest-html-reporters": "mocked-path",
      json2md: "mocked-path",
      "chartjs-node-canvas": "mocked-path",
    });

    // Create a new reporter instance for each test
    reporter = new TestReporter(mockTestCase, mockBasePath);
  });

  describe("constructor", () => {
    it("should create directory if it does not exist", () => {
      expect(fs.existsSync).toHaveBeenCalledWith(mockFullPath);
      expect(fs.mkdirSync).toHaveBeenCalledWith(mockBasePath, {
        recursive: true,
      });
    });

    it("should not create directory if it already exists", () => {
      jest.clearAllMocks();
      (fs.existsSync as jest.Mock).mockReturnValue(true);

      new TestReporter(mockTestCase, mockBasePath);

      expect(fs.existsSync).toHaveBeenCalledWith(mockFullPath);
      expect(fs.mkdirSync).not.toHaveBeenCalled();
    });

    it("should use default values if not provided", () => {
      jest.clearAllMocks();

      // Mock process.cwd()
      const originalCwd = process.cwd;
      process.cwd = jest.fn().mockReturnValue("/mock/cwd");

      new TestReporter();

      expect(path.join).toHaveBeenCalledWith(
        "/mock/cwd",
        "workdocs",
        "reports",
        "evidences"
      );

      // Restore original process.cwd
      process.cwd = originalCwd;
    });
  });

  describe("importHelpers", () => {
    it("should import helper functions and set static properties", async () => {
      // Access the private method using type assertion
      await (reporter as any).importHelpers();

      expect(fsUtils.installIfNotAvailable).toHaveBeenCalledWith([
        "jest-html-reporters",
      ]);

      // Verify that static functions are set
      expect(TestReporter["addMsgFunction"]).toBeDefined();
      expect(TestReporter["addAttachFunction"]).toBeDefined();
    });
  });

  describe("addReportMessage", () => {
    it("should import helpers if not already imported and add message", async () => {
      const title = "Test Title";
      const message = "Test Message";

      await reporter.addReportMessage(title, message);

      expect(fsUtils.installIfNotAvailable).toHaveBeenCalled();
      expect(TestReporter["addMsgFunction"]).toHaveBeenCalledWith({
        message: `${title}\n${message}`,
      });
    });

    it("should handle object messages", async () => {
      const title = "Test Title";
      const message = { key: "value" };

      await reporter.addReportMessage(title, message);

      expect(TestReporter["addMsgFunction"]).toHaveBeenCalledWith({
        message: `${title}\n${JSON.stringify(message)}`,
      });
    });

    it("should handle empty messages", async () => {
      const title = "Test Title";

      await reporter.addReportMessage(title, "");

      expect(TestReporter["addMsgFunction"]).toHaveBeenCalledWith({
        message: `${title}`,
      });
    });
  });

  describe("addReportAttachment", () => {
    it("should import helpers if not already imported and add attachment", async () => {
      const title = "Test Title";
      const attachment = "Test Attachment";

      await reporter.addReportAttachment(title, attachment);

      expect(fsUtils.installIfNotAvailable).toHaveBeenCalled();
      expect(TestReporter["addAttachFunction"]).toHaveBeenCalledWith({
        attach: attachment,
        description: title,
      });
    });

    it("should handle Buffer attachments", async () => {
      const title = "Test Title";
      const attachment = Buffer.from("Test Buffer");

      await reporter.addReportAttachment(title, attachment);

      expect(TestReporter["addAttachFunction"]).toHaveBeenCalledWith({
        attach: attachment,
        description: title,
      });
    });
  });

  describe("addToReport", () => {
    it("should handle text type correctly", async () => {
      const reference = "test-reference";
      const data = "test-data";

      // Access the protected method using type assertion
      await (reporter as any).addToReport(reference, data, "text");

      expect(TestReporter["addMsgFunction"]).toHaveBeenCalledWith(
        "test-reference.txt",
        "test-data"
      );
    });

    it("should handle json type correctly", async () => {
      const reference = "test-reference";
      const data = { key: "value" };

      await (reporter as any).addToReport(reference, data, "json");

      expect(TestReporter["addMsgFunction"]).toHaveBeenCalledWith(
        "test-reference.json",
        data
      );
    });

    it("should handle json type with trimming", async () => {
      const reference = "test-reference";
      const data = {
        key: "value",
        request: "should be removed",
        config: "should be removed",
      };

      await (reporter as any).addToReport(reference, data, "json", true);

      // The request and config properties should be removed
      expect(TestReporter["addMsgFunction"]).toHaveBeenCalledWith(
        "test-reference.json",
        { key: "value" }
      );
    });

    it("should handle md type correctly", async () => {
      const reference = "test-reference";
      const data = "# Markdown";

      await (reporter as any).addToReport(reference, data, "md");

      expect(TestReporter["addMsgFunction"]).toHaveBeenCalledWith(
        "test-reference.md",
        data
      );
    });

    it("should handle image type correctly", async () => {
      const reference = "test-reference";
      const data = Buffer.from("image-data");

      await (reporter as any).addToReport(reference, data, "image");

      expect(TestReporter["addAttachFunction"]).toHaveBeenCalledWith(
        "test-reference.png",
        expect.any(Buffer)
      );
    });

    it("should handle reference with newlines", async () => {
      const reference = "test\nreference";
      const data = "test-data";

      await (reporter as any).addToReport(reference, data, "text");

      expect(TestReporter["addMsgFunction"]).toHaveBeenCalledWith(
        "test\nreference",
        "test-data"
      );
    });

    it("should handle default case for unknown type", async () => {
      const reference = "test-reference";
      const data = "test-data";
      const consoleSpy = jest.spyOn(console, "log").mockImplementation();

      await (reporter as any).addToReport(
        reference,
        data,
        "unknown" as PayloadType
      );

      expect(consoleSpy).toHaveBeenCalledWith(
        "Unsupported type unknown. assuming text"
      );
      expect(TestReporter["addMsgFunction"]).toHaveBeenCalledWith(
        "test-reference.txt",
        "test-data"
      );

      consoleSpy.mockRestore();
    });

    it("should throw error when attachment fails", async () => {
      const reference = "test-reference";
      const data = "test-data";

      // Mock addMsgFunction to throw an error
      TestReporter["addMsgFunction"] = jest
        .fn()
        .mockRejectedValue(new Error("Mock error"));

      await expect(
        (reporter as any).addToReport(reference, data, "text")
      ).rejects.toThrow(
        `Could not store attach artifact test-reference.txt under to test report mock-test-case - Error: Mock error`
      );
    });
  });

  describe("generatePath", () => {
    it("should generate correct path", () => {
      const step = "test-step";
      const result = reporter.generatePath(step);

      expect(path.join).toHaveBeenCalledWith(mockFullPath, step);
      expect(result).toBe(mockFullPath); // Using our mocked path.join
    });
  });

  describe("outputPayload", () => {
    it("should call addToReport with correct parameters", async () => {
      const reference = "test-reference";
      const data = { key: "value" };
      const addToReportSpy = jest
        .spyOn(reporter as any, "addToReport")
        .mockResolvedValue(undefined);

      await reporter.outputPayload(reference, data);

      expect(addToReportSpy).toHaveBeenCalledWith(
        reference,
        data,
        "json",
        false
      );

      addToReportSpy.mockRestore();
    });

    it("should use provided type and trim parameters", async () => {
      const reference = "test-reference";
      const data = { key: "value" };
      const addToReportSpy = jest
        .spyOn(reporter as any, "addToReport")
        .mockResolvedValue(undefined);

      await reporter.outputPayload(reference, data, "text", true);

      expect(addToReportSpy).toHaveBeenCalledWith(
        reference,
        data,
        "text",
        true
      );

      addToReportSpy.mockRestore();
    });
  });

  describe("outputJSON", () => {
    it("should call addToReport with json type", async () => {
      const reference = "test-reference";
      const data = { key: "value" };
      const addToReportSpy = jest
        .spyOn(reporter as any, "addToReport")
        .mockResolvedValue(undefined);

      await reporter.outputJSON(reference, data);

      expect(addToReportSpy).toHaveBeenCalledWith(
        reference,
        data,
        "json",
        false
      );

      addToReportSpy.mockRestore();
    });

    it("should use provided trim parameter", async () => {
      const reference = "test-reference";
      const data = { key: "value" };
      const addToReportSpy = jest
        .spyOn(reporter as any, "addToReport")
        .mockResolvedValue(undefined);

      await reporter.outputJSON(reference, data, true);

      expect(addToReportSpy).toHaveBeenCalledWith(
        reference,
        data,
        "json",
        true
      );

      addToReportSpy.mockRestore();
    });
  });

  describe("outputMDTable", () => {
    it("should convert table definition to markdown and call addToReport", async () => {
      const reference = "test-reference";
      const tableDef: MdTableDefinition = {
        headers: ["Col1", "Col2"],
        rows: [{ Col1: "val1", Col2: "val2" }],
      };
      const addToReportSpy = jest
        .spyOn(reporter as any, "addToReport")
        .mockResolvedValue(undefined);

      await reporter.outputMDTable(reference, tableDef);

      expect(fsUtils.installIfNotAvailable).toHaveBeenCalledWith(["json2md"]);
      expect(addToReportSpy).toHaveBeenCalledWith(
        reference,
        "mocked-markdown",
        "md"
      );

      addToReportSpy.mockRestore();
    });

    it("should throw error when json2md conversion fails", async () => {
      const reference = "test-reference";
      const tableDef: MdTableDefinition = {
        headers: ["Col1", "Col2"],
        rows: [{ Col1: "val1", Col2: "val2" }],
      };

      // Mock import to throw an error
      jest.doMock(
        "json2md",
        () => {
          throw new Error("Mock conversion error");
        },
        { virtual: true }
      );

      await expect(reporter.outputMDTable(reference, tableDef)).rejects.toThrow(
        "Could not convert JSON to Markdown - Error: Mock conversion error"
      );
    });
  });

  describe("outputGraph", () => {
    it("should render chart and call outputImage", async () => {
      const reference = "test-reference";
      const config = { type: "bar", data: {} };
      const outputImageSpy = jest
        .spyOn(reporter, "outputImage")
        .mockResolvedValue(undefined);

      await reporter.outputGraph(reference, config);

      expect(fsUtils.installIfNotAvailable).toHaveBeenCalledWith([
        "chartjs-node-canvas",
      ]);
      expect(outputImageSpy).toHaveBeenCalledWith(
        reference,
        Buffer.from("mocked-image")
      );

      outputImageSpy.mockRestore();
    });
  });

  describe("outputImage", () => {
    it("should call addToReport with image type", async () => {
      const reference = "test-reference";
      const buffer = Buffer.from("image-data");
      const addToReportSpy = jest
        .spyOn(reporter as any, "addToReport")
        .mockResolvedValue(undefined);

      await reporter.outputImage(reference, buffer);

      expect(addToReportSpy).toHaveBeenCalledWith(reference, buffer, "image");

      addToReportSpy.mockRestore();
    });
  });
});
