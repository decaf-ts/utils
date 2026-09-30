import fs from "node:fs";
import path from "node:path";
import { BuildDocsCommand } from "../../../src/cli/commands/build-docs.command";
import { makeScratchDir, runCommand } from "./test-support";

describe("BuildDocsCommand", () => {
  it("recreates the docs folder and copies the README into it", async () => {
    const dir = makeScratchDir("build-docs-");
    fs.writeFileSync(path.join(dir, "README.md"), "# hello docs", "utf-8");
    // stale docs content must be removed by the rm+mkdir cycle
    fs.mkdirSync(path.join(dir, "docs", "stale"), { recursive: true });
    fs.writeFileSync(path.join(dir, "docs", "stale", "old.md"), "old", "utf-8");
    const cmd = new BuildDocsCommand();

    await runCommand(cmd, { basePath: dir });

    expect(
      fs.readFileSync(path.join(dir, "docs", "README.md"), "utf-8")
    ).toBe("# hello docs");
    expect(fs.existsSync(path.join(dir, "docs", "stale"))).toBe(false);
  });

  it("throws when the README does not exist", async () => {
    const dir = makeScratchDir("build-docs-missing-");
    const cmd = new BuildDocsCommand();

    await expect(runCommand(cmd, { basePath: dir })).rejects.toThrow(
      "README not found"
    );
  });

  it("honors --readme and --docs-dir overrides", async () => {
    const dir = makeScratchDir("build-docs-custom-");
    const source = path.join(dir, "src", "README.md");
    fs.mkdirSync(path.join(dir, "src"), { recursive: true });
    fs.writeFileSync(source, "custom readme", "utf-8");
    const docsDir = path.join(dir, "out", "docs");
    const cmd = new BuildDocsCommand();

    await runCommand(cmd, {
      basePath: dir,
      readme: source,
      docsDir,
    });

    expect(fs.readFileSync(path.join(docsDir, "README.md"), "utf-8")).toBe(
      "custom readme"
    );
  });

  it("defaults both folders relative to the base path", async () => {
    const dir = makeScratchDir("build-docs-defaults-");
    fs.writeFileSync(path.join(dir, "README.md"), "default paths", "utf-8");
    const cmd = new BuildDocsCommand();

    await runCommand(cmd, {
      basePath: dir,
      readme: undefined,
      docsDir: undefined,
    });

    expect(fs.existsSync(path.join(dir, "docs", "README.md"))).toBe(true);
  });

  it("refuses to remove the filesystem root as --docs-dir (F3)", async () => {
    const dir = makeScratchDir("build-docs-root-");
    fs.writeFileSync(path.join(dir, "README.md"), "# hi", "utf-8");
    const cmd = new BuildDocsCommand();

    await expect(
      runCommand(cmd, { basePath: dir, docsDir: path.parse(dir).root })
    ).rejects.toThrow("Refusing to remove docs directory");
  });

  it("refuses to remove a docs dir equal to the base path (F3)", async () => {
    const dir = makeScratchDir("build-docs-basepath-");
    fs.writeFileSync(path.join(dir, "README.md"), "# hi", "utf-8");
    const cmd = new BuildDocsCommand();

    await expect(
      runCommand(cmd, { basePath: dir, docsDir: dir })
    ).rejects.toThrow("Refusing to remove docs directory");
  });
});
