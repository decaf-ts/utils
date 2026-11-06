import fs from "fs";
import os from "os";
import path from "path";
import { BuildScripts } from "../../src";

describe("BuildScripts.buildCjsFromEsm", () => {
  it("keeps emitted paths consistent for filenames containing dots", async () => {
    const originalCwd = process.cwd();
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "decaf-build-cjs-"));
    const esmFile = path.join(
      tempDir,
      "lib",
      "esm",
      "nested",
      "file.with.dots.js"
    );
    const cjsFile = path.join(
      tempDir,
      "lib",
      "cjs",
      "nested",
      "file.with.dots.cjs"
    );
    const mapFile = `${cjsFile}.map`;

    fs.mkdirSync(path.dirname(esmFile), { recursive: true });
    fs.writeFileSync(esmFile, "export const answer = 42;\n", "utf8");

    try {
      const scripts = new BuildScripts();
      process.chdir(tempDir);

      await (scripts as any).buildCjsFromEsm(false);

      expect(fs.existsSync(cjsFile)).toBe(true);
      expect(fs.existsSync(mapFile)).toBe(true);

      const output = fs.readFileSync(cjsFile, "utf8");
      expect(output).toContain(
        "//# sourceMappingURL=file.with.dots.cjs.map"
      );

      const map = JSON.parse(fs.readFileSync(mapFile, "utf8"));
      expect(map.file).toBe("nested/file.with.dots.cjs");
      expect(map.sources).toEqual(["nested/file.with.dots.js"]);
    } finally {
      process.chdir(originalCwd);
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it("does not corrupt source files that contain a sourceMappingURL comment mid-file", async () => {
    const originalCwd = process.cwd();
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "decaf-build-cjs-"));
    const esmFile = path.join(tempDir, "lib", "esm", "self-referencing.js");
    const cjsFile = path.join(tempDir, "lib", "cjs", "self-referencing.cjs");

    fs.mkdirSync(path.dirname(esmFile), { recursive: true });
    // Mimics two real-world cases that must not confuse the trailing-comment
    // rewrite: a leftover sourceMappingURL comment carried over from the ESM
    // build, and source code (like buildCjsFromEsm itself) that contains the
    // literal "//# sourceMappingURL=" text as part of a string/regex.
    fs.writeFileSync(
      esmFile,
      [
        "export function rewrite(text, mapFileName) {",
        "  return text.replace(",
        "    /\\/\\/# sourceMappingURL=.*$/m,",
        "    `//# sourceMappingURL=${mapFileName}`",
        "  );",
        "}",
        "export const answer = 42;",
        "//# sourceMappingURL=self-referencing.js.map",
        "",
      ].join("\n"),
      "utf8"
    );

    try {
      const scripts = new BuildScripts();
      process.chdir(tempDir);

      await (scripts as any).buildCjsFromEsm(false);

      const output = fs.readFileSync(cjsFile, "utf8");

      expect(() => new Function(output)).not.toThrow();
      expect(output).toContain("`//# sourceMappingURL=${mapFileName}`");

      const lines = output.trimEnd().split("\n");
      expect(lines[lines.length - 1]).toBe(
        "//# sourceMappingURL=self-referencing.cjs.map"
      );
    } finally {
      process.chdir(originalCwd);
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });
});
