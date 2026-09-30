import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";
import { BundleCommand } from "../../../src/cli/commands/bundle.command";
import {
  makeScratchDir,
  runCommand,
  writePackageJson,
} from "./test-support";

function templateWorkspace(): string {
  const dir = makeScratchDir("bundle-");

  // workspace root package
  writePackageJson(dir, {
    name: "@decaf-ts/root",
    version: "1.2.3",
    license: "MIT",
    overrides: { lodash: "^4.17.0" },
  });
  fs.writeFileSync(path.join(dir, ".token"), "placeholder", "utf-8");
  fs.writeFileSync(path.join(dir, ".npmtoken"), "placeholder", "utf-8");
  fs.writeFileSync(path.join(dir, ".npmrc"), "placeholder", "utf-8");

  // local packages with their own versions and overrides
  writePackageJson(path.join(dir, "utils"), {
    name: "@decaf-ts/utils",
    version: "1.0.1",
    overrides: { tslib: "^2.5.0" },
  });
  writePackageJson(path.join(dir, "logging"), {
    name: "@decaf-ts/logging",
    version: "1.1.0",
  });

  // relocated command asset templates
  const templates = path.join(dir, "templates");
  fs.mkdirSync(templates, { recursive: true });
  fs.writeFileSync(
    path.join(templates, "bundles.json"),
    JSON.stringify(
      {
        "dist-core": ["@decaf-ts/utils"],
        "dist-extra": {
          dependencies: ["@decaf-ts/logging"],
          devDependencies: ["@decaf-ts/utils"],
          license: "Apache-2.0",
          keywords: ["extra"],
          overrides: { chalk: "^5.0.0" },
        },
      },
      null,
      2
    ),
    "utf-8"
  );
  fs.writeFileSync(
    path.join(templates, "package-template.json"),
    JSON.stringify(
      {
        name: "",
        version: "",
        description: "",
        license: "",
        keywords: ["decaf"],
        main: "lib/cjs/index.js",
      },
      null,
      2
    ),
    "utf-8"
  );

  return dir;
}

function readJson(p: string): Record<string, any> {
  return JSON.parse(fs.readFileSync(p, "utf-8"));
}

// The command shells out for install/publish; block it in every test so a
// bug can never publish anything from the test suite.
jest.mock("node:child_process", () => ({
  execSync: jest.fn(),
}));

// with the mock factory in place the imported execSync is the jest mock
const execSyncMock = execSync as unknown as jest.Mock;

describe("BundleCommand", () => {
  beforeEach(() => {
    execSyncMock.mockClear();
  });

  it("generates DRY_RUN manifests without installing or publishing", async () => {
    const dir = templateWorkspace();
    const target = path.join(dir, "out-releases");
    const cmd = new BundleCommand();

    await runCommand(cmd, {
      basePath: dir,
      target,
      templates: path.join(dir, "templates"),
      timeout: "0",
      "dry-run": true,
      "git-token": "github",
      "npm-token": "npm",
    });

    expect(execSyncMock).not.toHaveBeenCalled();

    const core = readJson(path.join(target, "dist-core", "package.json"));
    expect(core.name).toBe("@decaf-ts/dist-core");
    expect(core.version).toBe("1.2.3");
    expect(core.description).toBe("Decaf-ts' dist-core install");
    expect(core.dependencies).toEqual({ "@decaf-ts/utils": "1.0.1" });
    // root license inherited, root overrides merged and normalized (^ stripped)
    expect(core.license).toBe("MIT");
    expect(core.overrides).toEqual({ lodash: "4.17.0", tslib: "2.5.0" });

    const extra = readJson(path.join(target, "dist-extra", "package.json"));
    expect(extra.license).toBe("Apache-2.0");
    expect(extra.dependencies).toEqual({ "@decaf-ts/logging": "1.1.0" });
    expect(extra.devDependencies).toEqual({ "@decaf-ts/utils": "1.0.1" });
    expect(extra.keywords).toContain("decaf");
    expect(extra.keywords).toContain("extra");
    expect(extra.overrides).toEqual({
      lodash: "4.17.0",
      chalk: "5.0.0",
      tslib: "2.5.0",
    });
  });

  it("symlinks the token files into every generated bundle folder", async () => {
    const dir = templateWorkspace();
    const target = path.join(dir, "out-releases");
    const cmd = new BundleCommand();

    await runCommand(cmd, {
      basePath: dir,
      target,
      templates: path.join(dir, "templates"),
      timeout: "0",
      "dry-run": true,
    });

    for (const bundle of ["dist-core", "dist-extra"]) {
      for (const f of [".npmtoken", ".token", ".npmrc"]) {
        const link = path.join(target, bundle, f);
        expect(fs.readlinkSync(link)).toBe(path.join(dir, f));
      }
    }
  });

  it("throws when the version of a dependency cannot be resolved", async () => {
    const dir = templateWorkspace();
    const templates = path.join(dir, "templates");
    const bundles = readJson(path.join(templates, "bundles.json"));
    bundles["dist-core"] = ["@decaf-ts/missing"];
    fs.writeFileSync(
      path.join(templates, "bundles.json"),
      JSON.stringify(bundles, null, 2),
      "utf-8"
    );
    const cmd = new BundleCommand();

    await expect(
      runCommand(cmd, {
        basePath: dir,
        target: path.join(dir, "out"),
        templates,
        timeout: "0",
        "dry-run": true,
      })
    ).rejects.toThrow("Cannot resolve version for dependency '@decaf-ts/missing'");
  });

  it("falls back to the relocated command assets in @decaf-ts/utils when no --templates is given", async () => {
    // read-only against the real decaf-ts workspace: DRY_RUN only generates
    // manifests into a scratch target and never installs/publishes
    const workspaceRoot = path.resolve(__dirname, "../../../..");
    const assets = path.resolve(
      workspaceRoot,
      "utils",
      "src",
      "assets",
      "releases"
    );
    const bundles = readJson(path.join(assets, "bundles.json"));
    const expectedBundles = Object.keys(bundles);
    expect(expectedBundles.length).toBeGreaterThanOrEqual(8);

    const target = path.join(makeScratchDir("bundle-assets-"), "releases");
    const rootPkg = readJson(path.join(workspaceRoot, "package.json"));
    const cmd = new BundleCommand();

    await runCommand(cmd, {
      basePath: workspaceRoot,
      target,
      templates: undefined,
      timeout: "0",
      "dry-run": true,
    });

    expect(execSyncMock).not.toHaveBeenCalled();
    const generated = fs.readdirSync(target).sort();
    expect(generated).toEqual(expectedBundles.sort());
    for (const bundle of expectedBundles) {
      const manifest = readJson(path.join(target, bundle, "package.json"));
      expect(manifest.name).toBe(`@decaf-ts/${bundle}`);
      expect(manifest.version).toBe(rootPkg.version);
    }
  });

  it("falls back to the root version for dist-* dependencies", async () => {
    const dir = templateWorkspace();
    const templates = path.join(dir, "templates");
    const bundles = readJson(path.join(templates, "bundles.json"));
    bundles["dist-core"] = ["@decaf-ts/utils", "@decaf-ts/dist-agg"];
    fs.writeFileSync(
      path.join(templates, "bundles.json"),
      JSON.stringify(bundles, null, 2),
      "utf-8"
    );
    const cmd = new BundleCommand();

    await runCommand(cmd, {
      basePath: dir,
      target: path.join(dir, "out-releases"),
      templates,
      timeout: "0",
      "dry-run": true,
    });

    const core = readJson(
      path.join(dir, "out-releases", "dist-core", "package.json")
    );
    expect(core.dependencies["@decaf-ts/utils"]).toBe("1.0.1");
    expect(core.dependencies["@decaf-ts/dist-agg"]).toBe("1.2.3");
  });

  it("rejects a shell-metacharacter secret name in --git-token/--npm-token (F1)", async () => {
    const dir = templateWorkspace();
    const cmd = new BundleCommand();

    await expect(
      runCommand(cmd, {
        basePath: dir,
        target: path.join(dir, "out"),
        templates: path.join(dir, "templates"),
        timeout: "0",
        "dry-run": true,
        "git-token": "x';touch /tmp/decaf-marker;'",
        "npm-token": "npm",
      })
    ).rejects.toThrow("Invalid --git-token secret name");
  });

  it("rejects a bundle name that could escape the target directory (F2)", async () => {
    const dir = templateWorkspace();
    const templates = path.join(dir, "templates");
    const bundles = readJson(path.join(templates, "bundles.json"));
    bundles["../evil"] = ["@decaf-ts/utils"];
    fs.writeFileSync(
      path.join(templates, "bundles.json"),
      JSON.stringify(bundles, null, 2),
      "utf-8"
    );
    const cmd = new BundleCommand();

    await expect(
      runCommand(cmd, {
        basePath: dir,
        target: path.join(dir, "out"),
        templates,
        timeout: "0",
        "dry-run": true,
        "git-token": "github",
        "npm-token": "npm",
      })
    ).rejects.toThrow("Invalid bundle name");
  });
});
