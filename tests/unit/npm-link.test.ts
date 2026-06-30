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
    jest.clearAllMocks();
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

  it("requires mainPackagePath when linking non-scoped packages", async () => {
    (readGitModulesDeep as jest.Mock).mockReturnValue(["packages/app"]);
    (fs.readFileSync as jest.Mock).mockImplementation((filePath: string) => {
      if (filePath === path.join("/repo", "package.json")) {
        return JSON.stringify({ name: "@decaf-ts/utils" });
      }
      throw new Error(`Unexpected file read: ${filePath}`);
    });

    const command = new NpmLinkCommand();
    await (command as any).run({
      maxTraversal: "2",
      excludes: undefined,
      include: [],
      packages: ["@scope/*"],
      mainPackagePath: "",
      operation: "link",
    });

    expect(process.exit).toHaveBeenCalledWith(1);
    expect(fs.symlinkSync).not.toHaveBeenCalled();
  });

  it("links scoped packages from their submodule path and extra packages from mainPackagePath", async () => {
    (readGitModulesDeep as jest.Mock).mockReturnValue(["brain", "backend"]);
    (fs.readFileSync as jest.Mock).mockImplementation((filePath: string) => {
      if (filePath === path.join("/repo", "package.json")) {
        return JSON.stringify({ name: "@pdmfcsa/workspace" });
      }
      if (filePath === path.join("/repo", "brain", "package.json")) {
        return JSON.stringify({
          name: "@pdmfcsa/brain",
          dependencies: { "@decaf-ts/core": "^1.0.0" },
        });
      }
      if (filePath === path.join("/repo", "backend", "package.json")) {
        return JSON.stringify({
          name: "@pdmfcsa/backend",
          dependencies: {
            "@pdmfcsa/brain": "^1.0.0",
            "@decaf-ts/core": "^1.0.0",
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
      packages: ["@decaf-ts/*"],
      mainPackagePath: "/repo/brain/node_modules/@decaf-ts",
      operation: "link",
    });

    expect(readGitModulesDeep).toHaveBeenCalledWith("/repo", 2);
    expect(execSync).not.toHaveBeenCalled();
    // backend links both its scoped and decaf deps; brain skips @decaf-ts/core (self-reference)
    expect(fs.symlinkSync).toHaveBeenCalledTimes(2);
    expect((fs.symlinkSync as jest.Mock).mock.calls).toEqual(
      expect.arrayContaining([
        [
          expect.any(String),
          "/repo/backend/node_modules/@pdmfcsa/brain",
          "dir",
        ],
        [
          expect.any(String),
          "/repo/backend/node_modules/@decaf-ts/core",
          "dir",
        ],
      ])
    );
    // the @pdmfcsa/brain link points at the brain submodule root
    const brainCall = (fs.symlinkSync as jest.Mock).mock.calls.find(
      (call: any[]) => call[1] === "/repo/backend/node_modules/@pdmfcsa/brain"
    );
    expect(brainCall[0]).toBe(
      path.relative("/repo/backend/node_modules/@pdmfcsa", "/repo/brain")
    );
    // the @decaf-ts/core link points at brain's node_modules instance
    const coreCall = (fs.symlinkSync as jest.Mock).mock.calls.find(
      (call: any[]) => call[1] === "/repo/backend/node_modules/@decaf-ts/core"
    );
    expect(coreCall[0]).toBe(
      path.relative(
        "/repo/backend/node_modules/@decaf-ts",
        "/repo/brain/node_modules/@decaf-ts/core"
      )
    );
  });

  it("uses default excludes when --excludes is not provided", async () => {
    (readGitModulesDeep as jest.Mock).mockReturnValue(["packages/app"]);
    (fs.readFileSync as jest.Mock).mockImplementation((filePath: string) => {
      if (filePath === path.join("/repo", "package.json")) {
        return JSON.stringify({ name: "@decaf-ts/utils" });
      }
      if (filePath === path.join("/repo", "packages/app", "package.json")) {
        return JSON.stringify({
          name: "@decaf-ts/app",
          dependencies: {
            "@decaf-ts/core": "^1.0.0",
            "@decaf-ts/utils": "^1.0.0",
            "@decaf-ts/logging": "^1.0.0",
          },
        });
      }
      throw new Error(`Unexpected file read: ${filePath}`);
    });
    (fs.existsSync as jest.Mock).mockReturnValue(true);

    const command = new NpmLinkCommand();
    await (command as any).run({
      maxTraversal: "2",
      excludes: undefined,
      include: [],
      packages: [],
      mainPackagePath: "",
      operation: "link",
    });

    // @decaf-ts/utils and @decaf-ts/logging are excluded by default
    expect(fs.symlinkSync).toHaveBeenCalledTimes(1);
    expect((fs.symlinkSync as jest.Mock).mock.calls[0][1]).toBe(
      "/repo/packages/app/node_modules/@decaf-ts/core"
    );
  });
});
