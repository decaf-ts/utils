import { Command } from "../../src/cli/command";
import { UserInput } from "../../src/input/input";
import { Environment } from "../../src/utils/environment";
import * as fsUtils from "../../src/utils/fs";
import { ParseArgsResult } from "../../src/input/types";
import { DefaultLoggingConfig, Logger, Logging } from "@decaf-ts/logging";

// Mock dependencies
jest.mock("@decaf-ts/logging");
jest.mock("../../src/input/input");
jest.mock("../../src/utils/fs");

// Create a concrete implementation of the abstract Command class for testing
class TestCommand extends Command<{ testOption?: string }, string> {
  constructor(
    name: string = "test-command",
    inputs = {},
    requirements: string[] = []
  ) {
    super(name, inputs, requirements);
  }

  // Expose protected methods for testing
  public testCheckRequirements(): Promise<void> {
    return this.checkRequirements();
  }

  public testHelp(args: ParseArgsResult): void {
    return this.help(args);
  }

  // Implement the abstract run method
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  protected async run<R>(answers: any): Promise<R | string | void> {
    return "Test command executed successfully";
  }
}

describe("Command", () => {
  let command: TestCommand;
  let mockLog: jest.Mocked<Logger>;

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup mock for Logging
    mockLog = {
      for: jest.fn().mockReturnThis(),
      setConfig: jest.fn(),
      info: jest.fn(),
      error: jest.fn(),
      debug: jest.fn(),
      verbose: jest.fn(),
      silly: jest.fn(),
    } as unknown as jest.Mocked<Logger>;

    (Logging.for as jest.Mock).mockReturnValue(mockLog);

    // Create a new command instance for each test
    command = new TestCommand();
  });

  describe("constructor", () => {
    it("should initialize with default values", () => {
      expect(Logging.for).toHaveBeenCalledWith("Command");
      expect(mockLog.for).toHaveBeenCalledWith("test-command");
    });
  });

  describe("checkRequirements", () => {
    it("should not throw when all requirements are met", async () => {
      // Mock getDependencies to return all required dependencies
      (fsUtils.getDependencies as jest.Mock).mockResolvedValue({
        prod: [{ name: "required-dep" }],
        dev: [],
        peer: [],
      });

      command = new TestCommand("test-command", {}, ["required-dep"]);

      await expect(command.testCheckRequirements()).resolves.not.toThrow();
    });

    it("should handle missing dependencies", async () => {
      // Mock getDependencies to return no dependencies
      (fsUtils.getDependencies as jest.Mock).mockResolvedValue({
        prod: [],
        dev: [],
        peer: [],
      });

      command = new TestCommand("test-command", {}, ["missing-dep"]);

      await expect(command.testCheckRequirements()).resolves.not.toThrow();
      // In the actual implementation, this would log an error or throw,
      // but the current implementation just returns
    });
  });

  describe("execute", () => {
    it("should parse args and run the command", async () => {
      // Mock UserInput.parseArgs
      const mockArgs = { values: {}, positionals: [] };
      (UserInput.parseArgs as jest.Mock).mockReturnValue(mockArgs);

      const envMock = jest.spyOn(Environment, "accumulate");

      const result = await command.execute();

      expect(UserInput.parseArgs).toHaveBeenCalled();
      expect(envMock).toHaveBeenCalledWith(DefaultLoggingConfig);
      expect(result).toBe("Test command executed successfully");
    });

    it("should return version when version flag is true", async () => {
      // Mock UserInput.parseArgs
      const mockArgs = {
        values: {
          version: true,
        },
        positionals: [],
      };
      (UserInput.parseArgs as jest.Mock).mockReturnValue(mockArgs);

      // Mock getPackageVersion
      (fsUtils.getPackageVersion as jest.Mock).mockResolvedValue("1.0.0");

      const result = await command.execute();

      expect(fsUtils.getPackageVersion).toHaveBeenCalled();
      expect(result).toBe("1.0.0");
    });

    it("should handle errors during command execution", async () => {
      // Mock UserInput.parseArgs
      const mockArgs = { values: {}, positionals: [] };
      (UserInput.parseArgs as jest.Mock).mockReturnValue(mockArgs);

      // Mock run method to throw an error
      const error = new Error("Test error");
      jest.spyOn(command as any, "run").mockRejectedValue(error);

      await expect(command.execute()).rejects.toThrow("Test error");
    });
  });
});
