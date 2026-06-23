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
});
