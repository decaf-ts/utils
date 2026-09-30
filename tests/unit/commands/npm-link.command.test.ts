import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";
import { NpmLinkCommand } from "../../../src/cli/commands/npm-link.command";
import {
  makeScratchDir,
  runCommand,
  writeGitModules,
  writePackageJson,
} from "./test-support";

// unlink/passthrough operations shell out to npm; block the real exec so the
// suite can never run npm against the machine
jest.mock("node:child_process", () => ({
  execSync: jest.fn(),
}));

// with the mock factory in place the imported execSync is the jest mock
const execSyncMock = execSync as unknown as jest.Mock;

function linkWorkspace(): string {
  const dir = makeScratchDir("npm-link-");
  writeGitModules(dir, ["core", "styles", "app"]);
  writePackageJson(dir, { name: "@decaf-ts/fake-root", version: "1.0.0" });

  // core exposes lib/, styles exposes dist/
  writePackageJson(path.join(dir, "core"), {
    name: "@decaf-ts/core",
    version: "1.0.0",
  });
  fs.mkdirSync(path.join(dir, "core", "lib"), { recursive: true });
  writePackageJson(path.join(dir, "styles"), {
    name: "@decaf-ts/styles",
    version: "1.0.0",
  });
  fs.mkdirSync(path.join(dir, "styles", "dist"), { recursive: true });

  // app consumes core and styles
  writePackageJson(path.join(dir, "app"), {
    name: "@decaf-ts/app",
    version: "1.0.0",
    dependencies: {
      "@decaf-ts/core": "^1.0.0",
      "@decaf-ts/styles": "^1.0.0",
    },
  });
  fs.mkdirSync(path.join(dir, "app", "node_modules", "@decaf-ts"), {
    recursive: true,
  });
  fs.mkdirSync(
    path.join(dir, "app", "node_modules", "@decaf-ts", "core", "lib"),
    { recursive: true }
  );

  return dir;
}

function runIn(dir: string, answers: Record<string, unknown>) {
  const originalCwd = process.cwd();
  process.chdir(dir);
  const cmd = new NpmLinkCommand();
  return runCommand(cmd, answers).finally(() => process.chdir(originalCwd));
}

describe("NpmLinkCommand", () => {
  it("links scoped dependencies to their local module outputs (lib for regular packages, dist for styles)", async () => {
    const dir = linkWorkspace();

    await runIn(dir, { operation: "link", excludes: [] });

    const coreLink = path.join(
      dir,
      "app",
      "node_modules",
      "@decaf-ts",
      "core",
      "lib"
    );
    expect(fs.realpathSync(coreLink)).toBe(path.resolve(dir, "core", "lib"));

    const stylesLink = path.join(
      dir,
      "app",
      "node_modules",
      "@decaf-ts",
      "styles",
      "dist"
    );
    expect(fs.realpathSync(stylesLink)).toBe(
      path.resolve(dir, "styles", "dist")
    );
  });

  it("skips dependencies that match the exclusion patterns", async () => {
    const dir = linkWorkspace();
    // styles ships a real installed folder that must survive untouched
    const stylesDist = path.join(
      dir,
      "app",
      "node_modules",
      "@decaf-ts",
      "styles",
      "dist"
    );
    fs.mkdirSync(stylesDist, { recursive: true });
    fs.writeFileSync(path.join(stylesDist, "installed.css"), "installed", "utf-8");

    await runIn(dir, {
      operation: "link",
      excludes: ["@decaf-ts/styles"],
    });

    // styles was excluded: the installed folder was not replaced by a symlink
    expect(fs.lstatSync(stylesDist).isSymbolicLink()).toBe(false);
    expect(
      fs.readFileSync(path.join(stylesDist, "installed.css"), "utf-8")
    ).toBe("installed");
    // core was still linked
    expect(
      fs
        .lstatSync(
          path.join(dir, "app", "node_modules", "@decaf-ts", "core", "lib")
        )
        .isSymbolicLink()
    ).toBe(true);
  });

  it("skips dependencies whose local source output does not exist", async () => {
    const dir = linkWorkspace();
    fs.rmSync(path.join(dir, "core", "lib"), { recursive: true });

    await runIn(dir, { operation: "link", excludes: [] });

    // the stale installed directory is left untouched
    expect(
      fs
        .lstatSync(
          path.join(dir, "app", "node_modules", "@decaf-ts", "core", "lib")
        )
        .isSymbolicLink()
    ).toBe(false);
  });

  it("skips self-references where the consuming module owns the source", async () => {
    const dir = linkWorkspace();
    // core now depends on itself
    writePackageJson(path.join(dir, "core"), {
      name: "@decaf-ts/core",
      version: "1.0.0",
      dependencies: { "@decaf-ts/core": "^1.0.0" },
    });

    await runIn(dir, { operation: "link", excludes: [] });

    expect(
      fs.existsSync(path.join(dir, "core", "node_modules"))
    ).toBe(false);
  });

  it("limits processing to modules matching --include patterns", async () => {
    const dir = linkWorkspace();
    writePackageJson(path.join(dir, "styles"), {
      name: "@decaf-ts/styles",
      version: "1.0.0",
      dependencies: { "@decaf-ts/core": "^1.0.0" },
    });

    await runIn(dir, {
      operation: "link",
      excludes: [],
      include: ["app"],
    });

    // app was processed
    expect(
      fs
        .lstatSync(
          path.join(dir, "app", "node_modules", "@decaf-ts", "core", "lib")
        )
        .isSymbolicLink()
    ).toBe(true);
    // styles was filtered out
    expect(
      fs.existsSync(path.join(dir, "styles", "node_modules"))
    ).toBe(false);
  });

  it("exits when --packages is given without --mainPackagePath", async () => {
    const dir = linkWorkspace();
    const exitSpy = jest
      .spyOn(process, "exit")
      .mockImplementation((() => undefined) as never);

    try {
      await runIn(dir, {
        operation: "link",
        excludes: [],
        packages: ["some-package"],
        mainPackagePath: "",
      });

      expect(exitSpy).toHaveBeenCalledWith(1);
    } finally {
      exitSpy.mockRestore();
    }
  });

  it("unlink removes the links and reinstalls via npm run do-install", async () => {
    const dir = linkWorkspace();
    await runIn(dir, { operation: "link", excludes: [] });

    execSyncMock.mockClear();

    await runIn(dir, { operation: "unlink", excludes: [] });

    expect(
      fs.existsSync(path.join(dir, "app", "node_modules", "@decaf-ts", "core"))
    ).toBe(false);
    expect(execSyncMock).toHaveBeenCalledWith(
      "npm run do-install",
      expect.objectContaining({ cwd: path.join(dir, "app") })
    );
  });

  it("passes any other operation through to npm in each module", async () => {
    const dir = linkWorkspace();
    execSyncMock.mockClear();

    await runIn(dir, { operation: "install", excludes: [] });

    const calls = execSyncMock.mock.calls as unknown as [string, ...unknown[]][];
    const installCalls = calls.filter((c) => c[0] === "npm install");
    expect(installCalls.length).toBeGreaterThan(0);
    expect(
      installCalls.every(
        (c) => path.resolve((c[1] as { cwd: string }).cwd).startsWith(dir)
      )
    ).toBe(true);
  });
});
