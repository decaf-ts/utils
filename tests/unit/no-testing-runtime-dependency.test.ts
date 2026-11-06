import fs from "node:fs";
import path from "node:path";

describe("utils dependency boundary", () => {
  it("does not depend on or import the testing package", () => {
    const pkg = JSON.parse(
      fs.readFileSync(path.resolve(__dirname, "../../package.json"), "utf8")
    ) as Record<string, unknown>;
    const dependencyFields = [
      "dependencies",
      "devDependencies",
      "peerDependencies",
      "optionalDependencies",
    ];

    for (const field of dependencyFields) {
      const dependencies = (pkg[field] ?? {}) as Record<string, unknown>;
      expect(Object.keys(dependencies)).not.toContain("@decaf-ts/for-testing");
    }

    const sourceRoot = path.resolve(__dirname, "../../src");
    const offenders: string[] = [];
    const visit = (directory: string): void => {
      for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
        const entryPath = path.join(directory, entry.name);
        if (entry.isDirectory()) {
          visit(entryPath);
        } else if (entry.name.endsWith(".ts")) {
          const source = fs.readFileSync(entryPath, "utf8");
          if (/@decaf-ts\/for-testing/.test(source)) offenders.push(entryPath);
        }
      }
    };
    visit(sourceRoot);

    expect(offenders).toEqual([]);
  });
});
