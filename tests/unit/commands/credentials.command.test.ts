import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { resolveSecret } from "../../../src/cli/commands/credentials.command";
import { makeScratchDir } from "./test-support";

const repoRoot = path.resolve(__dirname, "../../../..");
const builtCliBin = path.join(repoRoot, "cli", "lib", "cjs", "bin", "cli.cjs");
const tsxCli = path.join(
  repoRoot,
  "cli",
  "node_modules",
  "tsx",
  "dist",
  "cli.mjs"
);
const sourceCliBin = path.join(repoRoot, "cli", "src", "bin", "cli.ts");

const FAKE_ENV_TOKEN = "fake-npm-token-qa-env-98765";
const FAKE_LEGACY_TOKEN = "fake-npm-token-qa-legacy-43210";

function cliInvocation(): { cmd: string; baseArgs: string[] } {
  if (fs.existsSync(builtCliBin)) {
    return { cmd: process.execPath, baseArgs: [builtCliBin] };
  }
  return { cmd: process.execPath, baseArgs: [tsxCli, sourceCliBin] };
}

function runCredentialsGet(
  name: string,
  options: {
    cwd?: string;
    env?: Record<string, string | undefined>;
  } = {}
) {
  const { cmd, baseArgs } = cliInvocation();
  const env: NodeJS.ProcessEnv = { ...process.env };
  delete env.DECAF_BANNER;
  delete env.NPM_TOKEN;
  delete env.GH_TOKEN;
  delete env.ATLASSIAN_API_TOKEN;
  for (const [key, value] of Object.entries(options.env ?? {})) {
    if (value === undefined) {
      delete env[key];
    } else {
      env[key] = value;
    }
  }
  return spawnSync(
    cmd,
    [
      ...baseArgs,
      "utils",
      "credentials",
      "get",
      "--name",
      name,
      "--logLevel",
      "error",
    ],
    {
      cwd: options.cwd ?? repoRoot,
      env,
      encoding: "buffer",
    }
  );
}

describe("CredentialsCommand", () => {
  describe("resolveSecret", () => {
    const hadNpmToken = process.env.NPM_TOKEN;
    afterEach(() => {
      if (hadNpmToken === undefined) {
        delete process.env.NPM_TOKEN;
      } else {
        process.env.NPM_TOKEN = hadNpmToken;
      }
    });

    it("returns the env-var value when it is set", () => {
      process.env.NPM_TOKEN = FAKE_ENV_TOKEN;
      expect(resolveSecret("npm")).toBe(FAKE_ENV_TOKEN);
    });

    it("throws when no source provides a value", () => {
      delete process.env.NPM_TOKEN;
      expect(() => resolveSecret("qa-missing-secret-xyz")).toThrow(
        /No token found/
      );
    });
  });

  describe("credentials get stdout purity", () => {
    it(
      "writes exactly the resolved env-var value to stdout with the banner suppressed",
      () => {
        const dir = makeScratchDir("credentials-env-");
        const res = runCredentialsGet("npm", {
          cwd: dir,
          env: { DECAF_BANNER: "false", BANNER: "false", NPM_TOKEN: FAKE_ENV_TOKEN },
        });
        expect(res.status).toBe(0);
        expect(res.stdout).toEqual(Buffer.from(FAKE_ENV_TOKEN));
      },
      60000
    );

    it(
      "writes exactly the resolved legacy-file value to stdout when run from a scratch cwd",
      () => {
        const dir = makeScratchDir("credentials-legacy-");
        fs.writeFileSync(
          path.join(dir, ".npmtoken"),
          FAKE_LEGACY_TOKEN,
          "utf8"
        );
        const res = runCredentialsGet("npm", {
          cwd: dir,
          env: { DECAF_BANNER: "false", BANNER: "false" },
        });
        expect(res.status).toBe(0);
        expect(res.stdout).toEqual(Buffer.from(FAKE_LEGACY_TOKEN));
      },
      60000
    );

    it(
      "exits non-zero with empty stdout and the error on stderr when the secret is missing",
      () => {
        const dir = makeScratchDir("credentials-missing-");
        const res = runCredentialsGet("confluence", {
          cwd: dir,
          env: { DECAF_BANNER: "false", BANNER: "false" },
        });
        expect(res.status).not.toBe(0);
        expect(res.stdout.length).toBe(0);
        expect(res.stderr.toString()).toMatch(/No token found/);
        expect(res.stderr.toString()).not.toContain(FAKE_ENV_TOKEN);
      },
      60000
    );
  });
});
