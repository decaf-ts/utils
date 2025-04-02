import { getSlogan, Logging, LogLevel, printBanner } from "../../src";

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

  describe("themeless", () => {
    beforeAll(() => {
      Logging.setConfig({
        style: false,
        timestamp: false,
      });
    });

    afterEach(() => {
      jest.resetAllMocks();
      jest.restoreAllMocks();
      jest.clearAllMocks();
    });

    it("logs an info message properly", () => {
      const consoleMock = jest.spyOn(console, "log");
      logger.info("This is a test message");
      expect(consoleMock).toBeCalledTimes(1);
      expect(consoleMock).toHaveBeenCalledWith("info - This is a test message");
    });
  });

  describe("themefull", () => {
    beforeAll(() => {
      Logging.setConfig({
        style: true,
        timestamp: true,
      });
    });

    afterEach(() => {
      jest.resetAllMocks();
      jest.restoreAllMocks();
      jest.clearAllMocks();
    });

    it("logs an info message properly", () => {
      const consoleMock = jest.spyOn(console, "log");
      logger.info("This is a test message");
      expect(consoleMock).toBeCalledTimes(1);
      expect(consoleMock).toHaveBeenCalledWith(
        expect.stringMatching(/.*?-\sinfo\s-\sThis\sis\sa\stest\smessage$/g)
      );
    });

    it("logs an debug message properly", () => {
      const consoleMock = jest.spyOn(console, "debug");
      logger.debug("This is a debug message");
      expect(consoleMock).toBeCalledTimes(1);
      expect(consoleMock).toHaveBeenCalledWith(
        expect.stringMatching(
          // eslint-disable-next-line no-control-regex
          /.*?-\s\x1b\[33mdebug\x1b\[0m\s-\sThis\sis\sa\sdebug\smessage$/g
        )
      );
    });

    it("logs an error message properly", () => {
      const consoleMock = jest.spyOn(console, "error");
      logger.error("This is a error message");
      expect(consoleMock).toBeCalledTimes(1);
      expect(consoleMock).toHaveBeenCalledWith(
        expect.stringMatching(
          // eslint-disable-next-line no-control-regex
          /.*?-\s\x1b\[1m\x1b\[31merror\x1b\[0m\x1b\[0m\s-\s\x1b\[31mThis\sis\sa\serror\smessage\x1b\[0m$/g
        )
      );
    });
  });

  it("prints banner using logger", () => {
    printBanner(logger);
  });
});
