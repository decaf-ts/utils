import { Command } from "../../src/cli/command";
import { UserInput } from "../../src/input/input";
import { getPackageVersion } from "../../src/utils/fs";
import { printBanner } from "../../src/output/common";
import { Logging } from "@decaf-ts/logging";

jest.mock("../../src/input/input");
jest.mock("../../src/utils/fs");
jest.mock("../../src/output/common");

class TestCommand extends Command<any, any> {
  constructor() {
    super("TestCommand", {});
  }
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async run(args: any) {
    return "run result";
  }
}

describe("Command", () => {
  let command: TestCommand;
  let mockLogger: any;

  beforeEach(() => {
    mockLogger = {
      info: jest.fn(),
      error: jest.fn(),
      for: jest.fn().mockReturnThis(),
    };
    jest.spyOn(Logging, "for").mockReturnValue(mockLogger);
    command = new TestCommand();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("should execute run method", async () => {
    (UserInput.parseArgs as jest.Mock).mockReturnValue({
      values: {},
    });
    const result = await command.execute();
    expect(result).toBe("run result");
  });

  it("should return version if version flag is set", async () => {
    (UserInput.parseArgs as jest.Mock).mockReturnValue({
      values: { version: true },
    });
    (getPackageVersion as jest.Mock).mockReturnValue("1.0.0");
    const result = await command.execute();
    expect(result).toBe("1.0.0");
  });

  it("should call help if help flag is set", async () => {
    (UserInput.parseArgs as jest.Mock).mockReturnValue({
      values: { help: true },
    });
    const helpSpy = jest.spyOn(command as any, "help");
    await command.execute();
    expect(helpSpy).toHaveBeenCalled();
  });

  it("should print banner if banner flag is set", async () => {
    (UserInput.parseArgs as jest.Mock).mockReturnValue({
      values: { banner: true },
    });
    await command.execute();
    expect(printBanner).toHaveBeenCalled();
  });
});
