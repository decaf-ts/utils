import { ReleaseScript } from "../../src/cli/commands";
import { UserInput } from "../../src";

jest.mock("../../src/input/input");

describe("ReleaseScript", () => {
  let releaseScript: ReleaseScript;

  beforeEach(() => {
    releaseScript = new ReleaseScript();
  });

  describe.skip("testVersion", () => {
    it("should return the version if it's a valid SemVer", () => {
      const version = "v1.2.3";
      expect(releaseScript.testVersion(version)).toBe(version);
    });

    it("should return PATCH, MINOR, or MAJOR for valid update types", () => {
      expect(releaseScript.testVersion("patch")).toBe("patch");
      expect(releaseScript.testVersion("minor")).toBe("minor");
      expect(releaseScript.testVersion("major")).toBe("major");
    });

    it("should return undefined for an invalid version", () => {
      expect(releaseScript.testVersion("invalid-version")).toBeUndefined();
    });
  });

  describe.skip("prepareVersion", () => {
    it("should return the provided valid tag", async () => {
      jest.spyOn(releaseScript, "testVersion").mockReturnValue("v1.2.3");
      const tag = await releaseScript.prepareVersion("v1.2.3");
      expect(tag).toBe("v1.2.3");
    });

    it("should prompt for a new tag if the tag is invalid or not provided", async () => {
      jest.spyOn(releaseScript, "testVersion").mockReturnValue(undefined);
      jest.spyOn(UserInput, "insistForText").mockResolvedValue("v2.0.0");
      const tag = await releaseScript.prepareVersion("");
      expect(tag).toBe("v2.0.0");
    });
  });

  describe.skip("prepareMessage", () => {
    it("should return the provided message if it's valid", async () => {
      const message = "Release 1.2.3";
      const result = await releaseScript.prepareMessage(message);
      expect(result).toBe(message);
    });

    it("should prompt for a new message if it is not provided", async () => {
      jest.spyOn(UserInput, "insistForText").mockResolvedValue("Valid message");
      const result = await releaseScript.prepareMessage();
      expect(result).toBe("Valid message");
    });
  });

  describe.skip("run", () => {
    it("should execute the release process", async () => {
      jest.spyOn(releaseScript, "prepareVersion").mockResolvedValue("v1.2.3");
      jest
        .spyOn(releaseScript, "prepareMessage")
        .mockResolvedValue("Release 1.2.3");
      const runCommand = jest
        .fn()
        .mockReturnValue({ promise: Promise.resolve() });
      jest.mock("../../src/utils/runCommand", () => ({ runCommand }));

      jest.spyOn(UserInput, "askConfirmation").mockResolvedValue(true);

      const args = { ci: true, tag: "v1.2.3", message: "Release 1.2.3" };
      await releaseScript.run(args as any);

      expect(releaseScript.prepareVersion).toHaveBeenCalledWith("v1.2.3");
      expect(releaseScript.prepareMessage).toHaveBeenCalledWith(
        "Release 1.2.3"
      );
      expect(runCommand).toHaveBeenCalledTimes(7);
    });
  });
});
