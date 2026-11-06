import fs from "fs";
import os from "os";
import path from "path";
import { execSync } from "child_process";
import { BuildScripts, getPackage } from "../../src";

describe("BuildScripts.patchFiles", () => {
  it("replaces version, commit, full version, and package placeholders", () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "decaf-build-"));
    const filePath = path.join(tempDir, "index.ts");
    const pkg = getPackage() as { name: string; version: string };
    const commitHash = execSync("git rev-parse --short HEAD", {
      encoding: "utf8",
    }).trim();

    fs.writeFileSync(
      filePath,
      [
        'export const VERSION = "##VERSION##";',
        'export const COMMIT = "##COMMIT##";',
        'export const FULL_VERSION = "##FULL_VERSION##";',
        'export const PACKAGE_NAME = "##PACKAGE##";',
      ].join("\n"),
      "utf8"
    );

    try {
      new BuildScripts().patchFiles(tempDir);

      const patched = fs.readFileSync(filePath, "utf8");
      expect(patched).toContain(`export const VERSION = "${pkg.version}";`);
      expect(patched).toContain(`export const COMMIT = "${commitHash}";`);
      expect(patched).toContain(
        `export const FULL_VERSION = "${pkg.version}-${commitHash}";`
      );
      expect(patched).toContain(`export const PACKAGE_NAME = "${pkg.name}";`);
    } finally {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });
});
