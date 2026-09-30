import { execSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import {
  DEFAULT_PUBLISH_TARGETS,
  JsrPublishTarget,
  NpmPublishTarget,
  PnpmPublishTarget,
  PUBLISH_STRATEGIES,
  PUBLISH_TARGETS,
  PublishTarget,
  RootPublishStrategy,
  SubdirectoryPublishStrategy,
  normalizePublishDir,
  resolveJsrConfigFile,
  resolvePublishTargets,
} from "../../../src/cli/commands/tag-release.command";
import type { PublishContext } from "../../../src/cli/commands/tag-release.command";
import { makeScratchDir, writePackageJson } from "./test-support";

// Every publish target shells out; block the real exec in every test.
jest.mock("node:child_process", () => ({
  execSync: jest.fn(),
}));

// with the mock factory in place the imported execSync is the jest mock
const execSyncMock = execSync as unknown as jest.Mock;

// Placeholder only -- never a real credential value.
const PLACEHOLDER_TOKEN = "placeholder-npm-token-value";

const calls = (): Array<[string, any]> =>
  execSyncMock.mock.calls as unknown as Array<[string, any]>;

function writeJsrJson(dir: string): string {
  mkdirSync(dir, { recursive: true });
  const file = join(dir, "jsr.json");
  writeFileSync(file, JSON.stringify({ name: "@scope/pkg", version: "1.0.0" }), "utf-8");
  return file;
}

function ctx(cwd: string, overrides: Partial<PublishContext> = {}): PublishContext {
  return {
    npmToken: PLACEHOLDER_TOKEN,
    accessValue: "public",
    isPrerelease: false,
    cwd,
    interactivePublish: false,
    ...overrides,
  };
}

describe("tag-release multi-registry publish targets", () => {
  beforeEach(() => {
    execSyncMock.mockClear();
  });

  describe("npm target", () => {
    it("emits npm publish with --ignore-scripts and --access public", () => {
      new NpmPublishTarget().publish(ctx(makeScratchDir("tr-npm-")));

      expect(execSyncMock).toHaveBeenCalledTimes(1);
      const [command, options] = calls()[0];
      expect(command).toContain("npm publish");
      expect(command).toContain("--ignore-scripts");
      expect(command).toContain('--access "public"');
      expect(command).not.toContain("--tag prerelease");
      expect(options.cwd).toBeDefined();
    });

    it("adds --tag prerelease for prerelease bumps", () => {
      new NpmPublishTarget().publish(
        ctx(makeScratchDir("tr-npm-pre-"), { isPrerelease: true })
      );

      expect(calls()[0][0]).toContain("--tag prerelease");
    });

    it("publishes a subdirectory as ./dist/lib", () => {
      new NpmPublishTarget("dist/lib").publish(ctx(makeScratchDir("tr-npm-sub-")));

      expect(calls()[0][0]).toContain('npm publish "./dist/lib"');
    });
  });

  describe("pnpm target", () => {
    it("emits pnpm publish with --no-git-checks and --access public", () => {
      new PnpmPublishTarget().publish(ctx(makeScratchDir("tr-pnpm-")));

      expect(execSyncMock).toHaveBeenCalledTimes(1);
      const [command, options] = calls()[0];
      expect(command).toContain("pnpm publish");
      expect(command).toContain("--no-git-checks");
      expect(command).toContain('--access "public"');
      expect(command).not.toContain("--tag prerelease");
      expect(options.cwd).toBeDefined();
    });

    it("adds --tag prerelease for prerelease bumps", () => {
      new PnpmPublishTarget().publish(
        ctx(makeScratchDir("tr-pnpm-pre-"), { isPrerelease: true })
      );

      expect(calls()[0][0]).toContain("--tag prerelease");
    });

    it("publishes a subdirectory as ./dist/lib", () => {
      new PnpmPublishTarget("dist/lib").publish(ctx(makeScratchDir("tr-pnpm-sub-")));

      expect(calls()[0][0]).toContain('pnpm publish "./dist/lib"');
    });
  });

  describe("jsr target", () => {
    it("emits npx jsr publish when a jsr.json is discoverable", () => {
      const dir = makeScratchDir("tr-jsr-");
      writeJsrJson(dir);

      new JsrPublishTarget().publish(ctx(dir));

      expect(execSyncMock).toHaveBeenCalledTimes(1);
      const [command, options] = calls()[0];
      expect(command).toBe("npx jsr publish");
      expect(options.cwd).toBe(dir);
    });

    it("skips silently when no JSR config is discoverable", () => {
      const dir = makeScratchDir("tr-jsr-skip-");

      new JsrPublishTarget().publish(ctx(dir));

      expect(execSyncMock).not.toHaveBeenCalled();
    });

    it("skips when enabled is false even with a jsr.json present", () => {
      const dir = makeScratchDir("tr-jsr-disabled-");
      writeJsrJson(dir);

      new JsrPublishTarget(".", { enabled: false }).publish(ctx(dir));

      expect(execSyncMock).not.toHaveBeenCalled();
    });

    it("emits even without config when enabled is true", () => {
      const dir = makeScratchDir("tr-jsr-forced-");

      new JsrPublishTarget(".", { enabled: true }).publish(ctx(dir));

      expect(execSyncMock).toHaveBeenCalledTimes(1);
      expect(calls()[0][0]).toBe("npx jsr publish");
    });

    it("appends --dry-run from the context dryRun flag", () => {
      const dir = makeScratchDir("tr-jsr-dry-ctx-");
      writeJsrJson(dir);

      new JsrPublishTarget().publish(ctx(dir, { dryRun: true }));

      expect(calls()[0][0]).toBe("npx jsr publish --dry-run");
    });

    it("appends --dry-run from the target's own dryRun config", () => {
      const dir = makeScratchDir("tr-jsr-dry-cfg-");
      writeJsrJson(dir);

      new JsrPublishTarget(".", { dryRun: true }).publish(ctx(dir));

      expect(calls()[0][0]).toBe("npx jsr publish --dry-run");
    });
  });

  describe("combined simultaneous run", () => {
    it("root strategy emits exactly npm, pnpm then jsr", () => {
      const dir = makeScratchDir("tr-combined-root-");
      writeJsrJson(dir);

      new RootPublishStrategy().publish(ctx(dir));

      const commands = calls().map((c) => c[0]);
      expect(commands).toHaveLength(3);
      expect(commands[0]).toContain("npm publish");
      expect(commands[1]).toContain("pnpm publish");
      expect(commands[2]).toBe("npx jsr publish");
    });

    it("subdirectory strategy builds first, then publishes all three from ./dist/lib", () => {
      const dir = makeScratchDir("tr-combined-sub-");
      writeJsrJson(join(dir, "dist/lib"));

      new SubdirectoryPublishStrategy("dist/lib", "build:prod").publish(ctx(dir));

      const commands = calls().map((c) => c[0]);
      expect(commands).toHaveLength(4);
      expect(commands[0]).toBe("npm run build:prod");
      expect(commands[1]).toContain('npm publish "./dist/lib"');
      expect(commands[2]).toContain('pnpm publish "./dist/lib"');
      expect(commands[3]).toBe("npx jsr publish");
    });
  });

  describe("config-driven targets and backward compatibility", () => {
    it("defaults to npm, pnpm and jsr in order", () => {
      expect(DEFAULT_PUBLISH_TARGETS).toEqual(["npm", "pnpm", "jsr"]);

      const targets: PublishTarget[] = resolvePublishTargets({}, ".");
      expect(targets.map((t) => t.name)).toEqual(["npm", "pnpm", "jsr"]);
    });

    it("resolves only the configured subset", () => {
      const targets = resolvePublishTargets({ targets: ["npm"] }, ".");
      expect(targets).toHaveLength(1);
      expect(targets[0]).toBeInstanceOf(NpmPublishTarget);
      expect(targets[0].name).toBe("npm");
    });

    it("ignores unknown target names", () => {
      const targets = resolvePublishTargets(
        { targets: ["npm", "not-a-registry"] },
        "."
      );
      expect(targets.map((t) => t.name)).toEqual(["npm"]);
    });

    it("maps the deno alias to the jsr target", () => {
      const targets = resolvePublishTargets({ targets: ["deno"] }, ".");
      expect(targets).toHaveLength(1);
      expect(targets[0]).toBeInstanceOf(JsrPublishTarget);
      expect(targets[0].name).toBe("jsr");
    });

    it("exposes the registry factories", () => {
      expect(PUBLISH_TARGETS.npm).toBeInstanceOf(Function);
      expect(PUBLISH_TARGETS.pnpm).toBeInstanceOf(Function);
      expect(PUBLISH_TARGETS.jsr).toBeInstanceOf(Function);
    });

    it("preserves the pre-existing strategy resolution contract", () => {
      expect(PUBLISH_STRATEGIES.root({})).toBeInstanceOf(RootPublishStrategy);
      expect(
        PUBLISH_STRATEGIES.subdirectory({
          publishDir: "dist/lib",
          prePublishScript: "build",
        })
      ).toBeInstanceOf(SubdirectoryPublishStrategy);
    });

    it("normalizes publish directories for npm", () => {
      expect(normalizePublishDir("dist/lib")).toBe("./dist/lib");
      expect(normalizePublishDir("./dist/lib")).toBe("./dist/lib");
      expect(normalizePublishDir("/abs/dist")).toBe("/abs/dist");
    });
  });

  describe("token safety", () => {
    let original: string | undefined;

    beforeEach(() => {
      original = process.env.NPM_TOKEN;
      delete process.env.NPM_TOKEN;
    });

    afterEach(() => {
      if (original === undefined) delete process.env.NPM_TOKEN;
      else process.env.NPM_TOKEN = original;
    });

    it("passes NPM_TOKEN via env and never in the command for npm and pnpm", () => {
      const dir = makeScratchDir("tr-token-");

      new NpmPublishTarget().publish(ctx(dir));
      new PnpmPublishTarget().publish(ctx(dir));

      const recorded = calls();
      expect(recorded).toHaveLength(2);
      for (const [command, options] of recorded) {
        expect(command).not.toContain(PLACEHOLDER_TOKEN);
        expect(options.env.NPM_TOKEN).toBe(PLACEHOLDER_TOKEN);
      }
    });

    it("does not inject NPM_TOKEN when interactivePublish is true", () => {
      const dir = makeScratchDir("tr-token-interactive-");

      new NpmPublishTarget().publish(
        ctx(dir, { interactivePublish: true })
      );
      new PnpmPublishTarget().publish(
        ctx(dir, { interactivePublish: true })
      );

      const recorded = calls();
      expect(recorded).toHaveLength(2);
      for (const [command, options] of recorded) {
        expect(command).not.toContain(PLACEHOLDER_TOKEN);
        expect(options.env).not.toHaveProperty("NPM_TOKEN");
      }
    });

    it("passes JSR_TOKEN via env and never in the command", () => {
      const dir = makeScratchDir("tr-token-jsr-");
      writeJsrJson(dir);

      new JsrPublishTarget().publish(
        ctx(dir, { jsrToken: "placeholder-jsr-token-value" })
      );

      const [command, options] = calls()[0];
      expect(command).toBe("npx jsr publish");
      expect(command).not.toContain("placeholder-jsr-token-value");
      expect(options.env.JSR_TOKEN).toBe("placeholder-jsr-token-value");
    });
  });

  describe("JSR config resolution", () => {
    it("returns jsr.json when present", () => {
      const dir = makeScratchDir("tr-jsrcfg-json-");
      const expected = writeJsrJson(dir);
      expect(resolveJsrConfigFile(dir)).toBe(expected);
    });

    it("falls back to a package.json with a jsr field", () => {
      const dir = makeScratchDir("tr-jsrcfg-field-");
      writePackageJson(dir, { name: "pkg", jsr: { name: "@scope/pkg" } });
      expect(resolveJsrConfigFile(dir)).toBe(join(dir, "package.json"));
    });

    it("falls back to a package.json with publishConfig.jsr", () => {
      const dir = makeScratchDir("tr-jsrcfg-publish-jsr-");
      writePackageJson(dir, {
        name: "pkg",
        publishConfig: { jsr: { name: "@scope/pkg" } },
      });
      expect(resolveJsrConfigFile(dir)).toBe(join(dir, "package.json"));
    });

    it("falls back to a package.json with a JSR registry", () => {
      const dir = makeScratchDir("tr-jsrcfg-registry-");
      writePackageJson(dir, {
        name: "pkg",
        publishConfig: { registry: "https://jsr.io" },
      });
      expect(resolveJsrConfigFile(dir)).toBe(join(dir, "package.json"));
    });

    it("prefers an explicit config file when it exists", () => {
      const dir = makeScratchDir("tr-jsrcfg-explicit-");
      const expected = writeJsrJson(dir);
      expect(resolveJsrConfigFile(dir, "jsr.json")).toBe(expected);
    });

    it("returns undefined for a missing explicit config file", () => {
      const dir = makeScratchDir("tr-jsrcfg-missing-");
      expect(resolveJsrConfigFile(dir, "jsr.json")).toBeUndefined();
    });

    it("returns undefined when no JSR configuration is present", () => {
      const dir = makeScratchDir("tr-jsrcfg-none-");
      expect(resolveJsrConfigFile(dir)).toBeUndefined();
    });
  });
});
