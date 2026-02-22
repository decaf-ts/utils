import fs from "fs";
import path from "path";
import {
  getAllFiles,
  writeFile,
  readFile,
  patchFile,
  renameFile,
  copyFile,
  deletePath,
  getPackage,
  setPackageAttribute,
} from "../../src/utils/fs";

describe("fs utils - real filesystem", () => {
  const baseDir = path.join(process.cwd(), "tests", "tmpfs");
  const pkgDir = path.join(baseDir, "pkg");
  const treeDir = path.join(baseDir, "tree");

  beforeAll(() => {
    fs.rmSync(baseDir, { recursive: true, force: true });
    fs.mkdirSync(baseDir, { recursive: true });
    fs.mkdirSync(pkgDir, { recursive: true });
    fs.mkdirSync(path.join(treeDir, "a", "b"), { recursive: true });

    // seed files for tree
    fs.writeFileSync(path.join(treeDir, "root.txt"), "root");
    fs.writeFileSync(path.join(treeDir, "a", "a.txt"), "a");
    fs.writeFileSync(path.join(treeDir, "a", "b", "b.txt"), "b");

    // seed package.json
    fs.writeFileSync(
      path.join(pkgDir, "package.json"),
      JSON.stringify({ name: "tmp-pkg", version: "0.0.1" }, null, 2)
    );
  });

  afterAll(() => {
    fs.rmSync(baseDir, { recursive: true, force: true });
  });

  it("getAllFiles collects recursively", () => {
    const files = getAllFiles(treeDir)
      .map((f) => path.relative(treeDir, f))
      .sort();
    expect(files).toEqual([
      "a/a.txt",
      "a/b/b.txt",
      "root.txt",
    ].sort());
  });

  it("readFile/writeFile/patchFile roundtrip", () => {
    const f = path.join(baseDir, "patch.txt");
    writeFile(f, "Hello, ##NAME##!");
    expect(readFile(f)).toBe("Hello, ##NAME##!");
    patchFile(f, { "##NAME##": "World" });
    expect(readFile(f)).toBe("Hello, World!");
  });

  it("renameFile renames files and copyFile copies directories", async () => {
    const srcFile = path.join(baseDir, "to-rename.txt");
    const dstFile = path.join(baseDir, "renamed.txt");
    fs.writeFileSync(srcFile, "data");
    await renameFile(srcFile, dstFile);
    expect(fs.existsSync(dstFile)).toBe(true);
    expect(fs.existsSync(srcFile)).toBe(false);

    const srcDir = path.join(baseDir, "copy-src");
    const dstDir = path.join(baseDir, "copy-dst");
    fs.mkdirSync(srcDir, { recursive: true });
    fs.writeFileSync(path.join(srcDir, "file.txt"), "x");
    copyFile(srcDir, dstDir);
    expect(fs.existsSync(path.join(dstDir, "file.txt"))).toBe(true);
  });

  it("deletePath removes files and directories", () => {
    const f = path.join(baseDir, "todelete.txt");
    const d = path.join(baseDir, "deltree");
    fs.writeFileSync(f, "x");
    fs.mkdirSync(path.join(d, "sub"), { recursive: true });
    fs.writeFileSync(path.join(d, "sub", "x.txt"), "x");
    deletePath(f);
    deletePath(d);
    expect(fs.existsSync(f)).toBe(false);
    expect(fs.existsSync(d)).toBe(false);
  });


  it("patchFile throws when file is missing", () => {
    const missing = path.join(baseDir, "does-not-exist.txt");
    expect(() => patchFile(missing, { KEY: "value" })).toThrow(
      /File not found/
    );
  });

  it("readFile propagates fs errors", () => {
    const missing = path.join(baseDir, "missing.txt");
    expect(() => readFile(missing)).toThrow(/Error reading file/);
  });

  it("getAllFiles applies filter when provided", () => {
    const filtered = getAllFiles(treeDir, (f) => f.endsWith("a.txt"));
    expect(filtered.every((f) => f.endsWith("a.txt"))).toBe(true);
    expect(filtered.length).toBe(1);
  });

  it("renameFile rejects when destination already exists", async () => {
    const src = path.join(baseDir, "existing-src.txt");
    const dest = path.join(baseDir, "existing-dest.txt");
    fs.writeFileSync(src, "data");
    fs.writeFileSync(dest, "other");
    await expect(renameFile(src, dest)).rejects.toThrow(/Destination path/);
  });

  it("copyFile throws when source is missing", () => {
    const src = path.join(baseDir, "missing-src.txt");
    const dest = path.join(baseDir, "unused-dest.txt");
    expect(() => copyFile(src, dest)).toThrow(/Source path/);
  });

  it("deletePath errors on missing path", () => {
    const missing = path.join(baseDir, "missing-dir");
    expect(() => deletePath(missing)).toThrow(/Error Deleting/);
  });

  it("getPackage and setPackageAttribute work on custom path", () => {
    const pkg = getPackage(pkgDir) as any;
    expect(pkg.name).toBe("tmp-pkg");
    setPackageAttribute("custom", "ok", pkgDir);
    const updated = JSON.parse(
      fs.readFileSync(path.join(pkgDir, "package.json"), "utf8")
    );
    expect(updated.custom).toBe("ok");
  });
});
