import fs from "node:fs";
import path from "node:path";
import { RunAllCommand } from "../../../src/cli/commands/run-all.command";
import {
  makeScratchDir,
  runCommand,
  writeGitModules,
} from "./test-support";

const MARKER_COMMAND =
  'node -e "require(\'fs\').writeFileSync(\'marker.txt\', \'ok\')"';

function workspaceWithModules(): string {
  const dir = makeScratchDir("run-all-");
  writeGitModules(dir, ["alpha", "beta", "missing"]);
  fs.mkdirSync(path.join(dir, "alpha"), { recursive: true });
  fs.mkdirSync(path.join(dir, "beta"), { recursive: true });
  return dir;
}

describe("RunAllCommand", () => {
  it("requires a command to execute", async () => {
    const dir = workspaceWithModules();
    const cmd = new RunAllCommand();

    await expect(
      runCommand(cmd, { basePath: dir, command: undefined })
    ).rejects.toThrow("run-all requires a command to execute");
  });

  it("executes the command inside every existing module directory", async () => {
    const dir = workspaceWithModules();
    const cmd = new RunAllCommand();

    await runCommand(cmd, { basePath: dir, command: MARKER_COMMAND });

    expect(
      fs.readFileSync(path.join(dir, "alpha", "marker.txt"), "utf-8")
    ).toBe("ok");
    expect(
      fs.readFileSync(path.join(dir, "beta", "marker.txt"), "utf-8")
    ).toBe("ok");
  });

  it("skips modules whose directories do not exist locally", async () => {
    const dir = workspaceWithModules();
    const cmd = new RunAllCommand();

    await runCommand(cmd, { basePath: dir, command: MARKER_COMMAND });

    expect(fs.existsSync(path.join(dir, "missing"))).toBe(false);
  });

  it("stops with exit code 1 when a module command fails", async () => {
    const dir = workspaceWithModules();
    const cmd = new RunAllCommand();
    const exitSpy = jest
      .spyOn(process, "exit")
      .mockImplementation((() => undefined) as never);

    try {
      await runCommand(cmd, {
        basePath: dir,
        command: 'node -e "process.exit(3)"',
      });

      expect(exitSpy).toHaveBeenCalledWith(1);
    } finally {
      exitSpy.mockRestore();
    }
  });

  it("falls back to the current working directory when no base path is given", async () => {
    const dir = workspaceWithModules();
    const cmd = new RunAllCommand();
    const originalCwd = process.cwd();
    process.chdir(dir);

    try {
      await runCommand(cmd, { basePath: undefined, command: MARKER_COMMAND });

      expect(
        fs.existsSync(path.join(dir, "alpha", "marker.txt"))
      ).toBe(true);
    } finally {
      process.chdir(originalCwd);
    }
  });
});
