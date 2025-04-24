import { getSlogan, printBanner } from "../../src";
import { Logging, LogLevel } from "@decaf-ts/logging";

describe("Logging", () => {
  const logger = Logging.for("testing");

  Logging.setConfig({
    level: LogLevel.debug,
  });

  it("retrieves slogan", () => {
    const slogan = getSlogan();
    expect(slogan).toBeDefined();
  });

  it("prints banner", () => {
    printBanner();
  });

  it("prints banner using logger", () => {
    printBanner(logger);
  });
});
