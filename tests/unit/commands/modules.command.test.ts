import fs from "node:fs";
import path from "node:path";
import {
  ModulesCommand,
  readGitModules,
  readGitModulesDeep,
} from "../../../src/cli/commands/modules.command";
import {
  makeScratchDir,
  runCommand,
  writeGitModules,
} from "./test-support";

describe("readGitModules", () => {
  it("parses every submodule path from .gitmodules", () => {
    const dir = makeScratchDir("modules-parse-");
    writeGitModules(dir, ["core", "logging", "for-angular/nested"]);

    expect(readGitModules(dir)).toEqual([
      "core",
      "logging",
      "for-angular/nested",
    ]);
  });

  it("returns an empty list when no submodule paths exist", () => {
    const dir = makeScratchDir("modules-empty-");
    fs.writeFileSync(path.join(dir, ".gitmodules"), "", "utf-8");

    expect(readGitModules(dir)).toEqual([]);
  });
});

describe("readGitModulesDeep", () => {
  it("traverses nested .gitmodules files and prefixes nested paths", () => {
    const dir = makeScratchDir("modules-deep-");
    writeGitModules(dir, ["outer"]);
    writeGitModules(path.join(dir, "outer"), ["inner"]);
    fs.mkdirSync(path.join(dir, "outer", "inner"), { recursive: true });

    const modules = readGitModulesDeep(dir, 2);

    expect(modules).toContain("outer");
    expect(modules).toContain(path.join("outer", "inner"));
    expect(modules).toHaveLength(2);
  });

  it("respects maxTraversal=0 by not descending into nested modules", () => {
    const dir = makeScratchDir("modules-depth0-");
    writeGitModules(dir, ["outer"]);
    writeGitModules(path.join(dir, "outer"), ["inner"]);
    fs.mkdirSync(path.join(dir, "outer", "inner"), { recursive: true });

    const modules = readGitModulesDeep(dir, 0);

    expect(modules).toEqual(["outer"]);
  });

  it("deduplicates modules reachable through multiple paths", () => {
    const dir = makeScratchDir("modules-dedup-");
    writeGitModules(dir, ["outer"]);
    writeGitModules(path.join(dir, "outer"), ["inner"]);
    fs.mkdirSync(path.join(dir, "outer", "inner"), { recursive: true });

    const modules = readGitModulesDeep(dir, 2);

    expect(modules).toContain("outer");
    expect(modules).toContain(path.join("outer", "inner"));
    // no duplicates even though inner is reachable through the outer walk
    expect(new Set(modules).size).toBe(modules.length);
  });
});

describe("ModulesCommand", () => {
  it("logs every discovered module on its own line", async () => {
    const dir = makeScratchDir("modules-command-");
    writeGitModules(dir, ["alpha", "beta"]);

    const cmd = new ModulesCommand();
     
    const logged: string[] = [];
    const fakeLogger = {
      info: (msg: string) => logged.push(msg),
      warn: () => undefined,
      for: () => fakeLogger,
    };
    // LoggedClass caches the logger in the private _log field
     
    (cmd as any)._log = fakeLogger;

    await runCommand(cmd, { basePath: dir });

    expect(logged).toEqual(["alpha", "beta"]);
  });
});
