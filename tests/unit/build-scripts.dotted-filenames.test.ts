import fs from "fs";
import os from "os";
import path from "path";
import { BuildScripts } from "../../src";

function writeFile(filePath: string, content: string) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content, "utf8");
}

describe("BuildScripts dotted filenames", () => {
  it("keeps dotted basenames intact across lib and dist outputs", async () => {
    const originalCwd = process.cwd();
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "decaf-build-dot-"));

    writeFile(
      path.join(tempDir, "package.json"),
      JSON.stringify(
        {
          name: "temp-command-build",
          version: "1.0.0",
        },
        null,
        2
      )
    );

    writeFile(
      path.join(tempDir, "tsconfig.json"),
      JSON.stringify(
        {
          compilerOptions: {
            target: "ES2022",
            module: "ESNext",
            moduleResolution: "Bundler",
            rootDir: "./src",
            outDir: "./lib",
            declaration: true,
            declarationMap: false,
            emitDeclarationOnly: false,
            strict: true,
            skipLibCheck: true,
          },
          include: ["src/**/*.ts"],
        },
        null,
        2
      )
    );

    writeFile(
      path.join(tempDir, "src", "dep.command.ts"),
      [
        "export const answer = 42;",
        "",
      ].join("\n")
    );

    writeFile(
      path.join(tempDir, "src", "build-scripts.command.ts"),
      [
        'export { answer } from "./dep.command";',
        'export const commandName = "build-scripts.command";',
        "",
      ].join("\n")
    );

    try {
      process.chdir(tempDir);
      const scripts = new BuildScripts();

      await (scripts as any).buildDev("./src/build-scripts.command.ts", "all");

      const esmFile = path.join(
        tempDir,
        "lib",
        "esm",
        "build-scripts.command.js"
      );
      const cjsFile = path.join(
        tempDir,
        "lib",
        "cjs",
        "build-scripts.command.cjs"
      );
      const esmTypes = path.join(
        tempDir,
        "lib",
        "types",
        "build-scripts.command.d.mts"
      );
      const cjsTypes = path.join(
        tempDir,
        "lib",
        "types",
        "build-scripts.command.d.cts"
      );
      const distEsm = path.join(tempDir, "dist", "temp-command-build.js");
      const distCjs = path.join(tempDir, "dist", "temp-command-build.cjs");

      expect(fs.existsSync(esmFile)).toBe(true);
      expect(fs.existsSync(cjsFile)).toBe(true);
      expect(fs.existsSync(esmTypes)).toBe(true);
      expect(fs.existsSync(cjsTypes)).toBe(true);
      expect(fs.existsSync(distEsm)).toBe(true);
      expect(fs.existsSync(distCjs)).toBe(true);

      const esmOutput = fs.readFileSync(esmFile, "utf8");
      const cjsOutput = fs.readFileSync(cjsFile, "utf8");
      const esmTypesOutput = fs.readFileSync(esmTypes, "utf8");
      const cjsTypesOutput = fs.readFileSync(cjsTypes, "utf8");

      expect(esmOutput).toContain('from "./dep.command.js"');
      expect(cjsOutput).toContain('require("./dep.command.cjs")');
      expect(esmTypesOutput).toContain('from "./dep.command.d.mts"');
      expect(cjsTypesOutput).toContain('from "./dep.command.d.cts"');
    } finally {
      process.chdir(originalCwd);
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });
});
