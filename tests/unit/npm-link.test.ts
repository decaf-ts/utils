import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";
import { Logging } from "@decaf-ts/logging";
import { NpmLinkCommand } from "../../src/cli/commands/npm-link";
import { readGitModulesDeep } from "../../src/cli/commands/modules";

jest.mock("node:fs", () => ({
  readFileSync: jest.fn(),
  existsSync: jest.fn(),
  rmSync: jest.fn(),
  mkdirSync: jest.fn(),
  symlinkSync: jest.fn(),
}));

jest.mock("node:child_process", () => ({
  execSync: jest.fn(),
}));

jest.mock("../../src/cli/commands/modules", () => ({
  readGitModulesDeep: jest.fn(),
}));

jest.mock("../../src/cli/commands/help", () => ({
  printCommandHelp: jest.fn(),
}));

describe("NpmLinkCommand", () => {
  beforeEach(() => {
    jest.spyOn(Logging, "for").mockReturnValue({
      info: jest.fn(),
      error: jest.fn(),
      for: jest.fn().mockReturnThis(),
    } as any);
    jest.spyOn(process, "cwd").mockReturnValue("/repo");
    jest.spyOn(process, "exit").mockImplementation(() => undefined as never);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("requires mainPackagePath when linking non-decaf packages", async () => {
    (readGitModulesDeep as jest.Mock).mockReturnValue(["packages/app"]);
    (fs.readFileSync as jest.Mock).mockImplementation(() => {
      throw new Error("readFileSync should not be called");
    });

    const command = new NpmLinkCommand();
    await (command as any).run({
      maxTraversal: "2",
      excludes: [],
      include: [],
      packages: ["@scope/*"],
      mainPackagePath: "",
      operation: "link",
    });

    expect(process.exit).toHaveBeenCalledWith(1);
    expect(fs.readFileSync).not.toHaveBeenCalled();
  });

  it("links scoped packages and decaf packages from mainPackagePath", async () => {
    (readGitModulesDeep as jest.Mock).mockReturnValue(["packages/app"]);
    (fs.readFileSync as jest.Mock).mockImplementation((filePath: string) => {
      if (filePath === path.join("/main", "package.json")) {
        return JSON.stringify({ name: "@decaf-ts/utils" });
      }
      if (filePath === path.join("/repo", "packages/app", "package.json")) {
        return JSON.stringify({
          dependencies: {
            "@decaf-ts/core": "^1.0.0",
            "@scope/foo": "^1.0.0",
            "@scope/bar": "^1.0.0",
            lodash: "^4.0.0",
          },
        });
      }
      throw new Error(`Unexpected file read: ${filePath}`);
    });
    (fs.existsSync as jest.Mock).mockReturnValue(true);

    const command = new NpmLinkCommand();
    await (command as any).run({
      maxTraversal: "2",
      excludes: [],
      include: [],
      packages: ["@scope/*"],
      mainPackagePath: "/main",
      operation: "link",
    });

    expect(readGitModulesDeep).toHaveBeenCalledWith("/repo", 2);
    expect(execSync).not.toHaveBeenCalled();
    expect(fs.symlinkSync).toHaveBeenCalledTimes(3);
    expect((fs.symlinkSync as jest.Mock).mock.calls).toEqual(
      expect.arrayContaining([
        [
          expect.any(String),
          "/repo/packages/app/node_modules/@decaf-ts/core/lib",
          "dir",
        ],
        [
          expect.any(String),
          "/repo/packages/app/node_modules/@scope/foo/lib",
          "dir",
        ],
        [
          expect.any(String),
          "/repo/packages/app/node_modules/@scope/bar/lib",
          "dir",
        ],
      ])
    );
  });
});
