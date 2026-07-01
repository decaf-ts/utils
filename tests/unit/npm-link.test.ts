import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";
import { Logging } from "@decaf-ts/logging";
import { NpmLinkCommand } from "../../src/cli/commands/npm-link";
import { readGitModulesDeep } from "../../src/cli/commands/modules";

jest.mock("node:fs", () => ({
  readFileSync: jest.fn(),
  existsSync: jest.fn(),
  lstatSync: jest.fn(),
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

function packageLock(packages: string[]): string {
  return JSON.stringify({
    lockfileVersion: 3,
    packages: Object.fromEntries(
      packages.map((p) => [`node_modules/${p}`, {}])
    ),
  });
}

function fakeStat(isSym: boolean) {
  return { isSymbolicLink: () => isSym, isDirectory: () => !isSym };
}

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
    // installed package roots are real directories by default
    (fs.lstatSync as jest.Mock).mockImplementation(() => fakeStat(false));
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

  it("links only the lib subfolder of scoped and extra packages", async () => {
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
      if (filePath === path.join("/repo", "brain", "package-lock.json")) {
        return packageLock(["@decaf-ts/core"]);
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
      if (filePath === path.join("/repo", "backend", "package-lock.json")) {
        return packageLock([
          "@pdmfcsa/brain",
          "@decaf-ts/core",
          "@decaf-ts/decoration",
          "lodash",
        ]);
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
    // backend links lib subfolders for scoped + declared decaf + transitive decaf
    // brain skips @decaf-ts/core (self-reference)
    expect(fs.symlinkSync).toHaveBeenCalledTimes(3);
    expect((fs.symlinkSync as jest.Mock).mock.calls).toEqual(
      expect.arrayContaining([
        [
          expect.any(String),
          "/repo/backend/node_modules/@pdmfcsa/brain/lib",
          "dir",
        ],
        [
          expect.any(String),
          "/repo/backend/node_modules/@decaf-ts/core/lib",
          "dir",
        ],
        [
          expect.any(String),
          "/repo/backend/node_modules/@decaf-ts/decoration/lib",
          "dir",
        ],
      ])
    );
    // the @pdmfcsa/brain/lib link points at the brain submodule lib
    const brainCall = (fs.symlinkSync as jest.Mock).mock.calls.find(
      (call: any[]) =>
        call[1] === "/repo/backend/node_modules/@pdmfcsa/brain/lib"
    );
    expect(brainCall[0]).toBe(
      path.relative(
        "/repo/backend/node_modules/@pdmfcsa/brain",
        "/repo/brain/lib"
      )
    );
    // the @decaf-ts/core/lib link points at brain's node_modules instance lib
    const coreCall = (fs.symlinkSync as jest.Mock).mock.calls.find(
      (call: any[]) => call[1] === "/repo/backend/node_modules/@decaf-ts/core/lib"
    );
    expect(coreCall[0]).toBe(
      path.relative(
        "/repo/backend/node_modules/@decaf-ts/core",
        "/repo/brain/node_modules/@decaf-ts/core/lib"
      )
    );
  });

  it("links transitive deps from package-lock.json not declared in package.json", async () => {
    (readGitModulesDeep as jest.Mock).mockReturnValue(["backend"]);
    (fs.readFileSync as jest.Mock).mockImplementation((filePath: string) => {
      if (filePath === path.join("/repo", "package.json")) {
        return JSON.stringify({ name: "@pdmfcsa/workspace" });
      }
      if (filePath === path.join("/repo", "backend", "package.json")) {
        return JSON.stringify({
          name: "@pdmfcsa/backend",
          dependencies: { "@decaf-ts/core": "^1.0.0" },
        });
      }
      if (filePath === path.join("/repo", "backend", "package-lock.json")) {
        return packageLock([
          "@decaf-ts/core",
          "@decaf-ts/decoration",
          "lodash",
        ]);
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

    // @decaf-ts/decoration is not in package.json but IS in package-lock
    expect(fs.symlinkSync).toHaveBeenCalledTimes(2);
    expect((fs.symlinkSync as jest.Mock).mock.calls).toEqual(
      expect.arrayContaining([
        [
          expect.any(String),
          "/repo/backend/node_modules/@decaf-ts/core/lib",
          "dir",
        ],
        [
          expect.any(String),
          "/repo/backend/node_modules/@decaf-ts/decoration/lib",
          "dir",
        ],
      ])
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
      if (
        filePath === path.join("/repo", "packages/app", "package-lock.json")
      ) {
        return packageLock([
          "@decaf-ts/core",
          "@decaf-ts/utils",
          "@decaf-ts/logging",
          "@decaf-ts/decoration",
        ]);
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

    // @decaf-ts/utils and @decaf-ts/logging are excluded by default;
    // @decaf-ts/decoration is transitive from package-lock but not excluded
    expect(fs.symlinkSync).toHaveBeenCalledTimes(2);
    const targets = (fs.symlinkSync as jest.Mock).mock.calls.map(
      (call: any[]) => call[1]
    );
    expect(targets).toEqual(
      expect.arrayContaining([
        "/repo/packages/app/node_modules/@decaf-ts/core/lib",
        "/repo/packages/app/node_modules/@decaf-ts/decoration/lib",
      ])
    );
  });

  it("removes a previous whole-directory symlink before linking lib", async () => {
    (readGitModulesDeep as jest.Mock).mockReturnValue(["backend"]);
    (fs.readFileSync as jest.Mock).mockImplementation((filePath: string) => {
      if (filePath === path.join("/repo", "package.json")) {
        return JSON.stringify({ name: "@pdmfcsa/workspace" });
      }
      if (filePath === path.join("/repo", "backend", "package.json")) {
        return JSON.stringify({
          name: "@pdmfcsa/backend",
          dependencies: { "@decaf-ts/core": "^1.0.0" },
        });
      }
      if (filePath === path.join("/repo", "backend", "package-lock.json")) {
        return packageLock(["@decaf-ts/core"]);
      }
      throw new Error(`Unexpected file read: ${filePath}`);
    });
    (fs.existsSync as jest.Mock).mockReturnValue(true);
    // the installed package root is a leftover whole-directory symlink
    (fs.lstatSync as jest.Mock).mockImplementation(() => fakeStat(true));

    const command = new NpmLinkCommand();
    await (command as any).run({
      maxTraversal: "2",
      excludes: [],
      include: [],
      packages: ["@decaf-ts/*"],
      mainPackagePath: "/repo/brain/node_modules/@decaf-ts",
      operation: "link",
    });

    // the whole-directory symlink should be removed before creating the lib link
    expect(fs.rmSync).toHaveBeenCalledWith(
      "/repo/backend/node_modules/@decaf-ts/core",
      { force: true, recursive: true }
    );
    expect(fs.symlinkSync).toHaveBeenCalledTimes(1);
    expect((fs.symlinkSync as jest.Mock).mock.calls[0][1]).toBe(
      "/repo/backend/node_modules/@decaf-ts/core/lib"
    );
  });
});
