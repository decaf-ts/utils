import fs from "node:fs";
import path from "node:path";
import { NpmTokenCommand } from "../../../src/cli/commands/npm-token.command";
import {
  makeScratchDir,
  runCommand,
  writeGitModules,
} from "./test-support";

function workspace(): string {
  const dir = makeScratchDir("npm-token-");
  writeGitModules(dir, ["alpha", "outer"]);
  writeGitModules(path.join(dir, "outer"), ["inner"]);
  fs.mkdirSync(path.join(dir, "alpha"), { recursive: true });
  fs.mkdirSync(path.join(dir, "outer", "inner"), { recursive: true });
  fs.writeFileSync(path.join(dir, ".token"), "placeholder", "utf-8");
  fs.writeFileSync(path.join(dir, ".npmtoken"), "placeholder", "utf-8");
  return dir;
}

function readlinkSafe(p: string): string | null {
  try {
    return fs.readlinkSync(p);
  } catch {
    return null;
  }
}

describe("NpmTokenCommand", () => {
  it("links the default token files into every discovered module", async () => {
    const dir = workspace();
    const originalCwd = process.cwd();
    process.chdir(dir);
    const cmd = new NpmTokenCommand();

    try {
      await runCommand(cmd, {
        maxTraversal: "2",
        tokenFiles: undefined,
      });
    } finally {
      process.chdir(originalCwd);
    }

    expect(readlinkSafe(path.join(dir, "alpha", ".token"))).toBe(
      path.join("..", ".token")
    );
    expect(readlinkSafe(path.join(dir, "alpha", ".npmtoken"))).toBe(
      path.join("..", ".npmtoken")
    );
    // nested modules are discovered through the deep traversal
    const nested = path.join(dir, "outer", "inner");
    expect(readlinkSafe(path.join(nested, ".token"))).toBe(
      path.join("..", ".token")
    );
  });

  it("accepts a custom token file list", async () => {
    const dir = workspace();
    fs.writeFileSync(path.join(dir, "secrets.token"), "placeholder", "utf-8");
    const originalCwd = process.cwd();
    process.chdir(dir);
    const cmd = new NpmTokenCommand();

    try {
      await runCommand(cmd, {
        maxTraversal: "1",
        tokenFiles: ["secrets.token"],
      });
    } finally {
      process.chdir(originalCwd);
    }

    expect(
      readlinkSafe(path.join(dir, "alpha", "secrets.token"))
    ).toBe(path.join("..", "secrets.token"));
    expect(fs.existsSync(path.join(dir, "alpha", ".token"))).toBe(false);
  });

  it("replaces pre-existing files at the link location", async () => {
    const dir = workspace();
    fs.writeFileSync(path.join(dir, "alpha", ".token"), "stale", "utf-8");
    const originalCwd = process.cwd();
    process.chdir(dir);
    const cmd = new NpmTokenCommand();

    try {
      await runCommand(cmd, { maxTraversal: "1", tokenFiles: [".token"] });
    } finally {
      process.chdir(originalCwd);
    }

    expect(readlinkSafe(path.join(dir, "alpha", ".token"))).toBe(
      path.join("..", ".token")
    );
  });
});
