import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { LoggingConfig, Logger } from "@decaf-ts/logging";
import { Command } from "../command";
import { DefaultCommandValues } from "../constants";
import { printCommandHelp } from "./help";

type Env = NodeJS.ProcessEnv;

function makeAuthUrl(baseUrl: string, token: string): string {
  const [scheme, rest] = baseUrl.split("://", 2) as [string, string];
  return `${scheme}://x-access-token:${encodeURIComponent(token)}@${rest}`;
}

interface ParsedGitUrl {
  host: string;
  owner: string;
  repoName: string;
  httpsUrl: string;
  mirrorSlug: string;
}

function parseGitUrl(raw: string): ParsedGitUrl {
  let host: string, cleanPath: string;

  if (raw.startsWith("git@")) {
    const rest = raw.slice(4);
    const c = rest.indexOf(":");
    if (c === -1) throw new Error(`invalid SSH URL: ${raw}`);
    host = rest.slice(0, c);
    cleanPath = rest.slice(c + 1);
  } else {
    const u = new URL(raw);
    host = u.hostname;
    cleanPath = u.pathname.slice(1);
  }

  cleanPath = cleanPath.replace(/^\/+|\/+$/g, "").replace(/\.git$/, "");
  const parts = cleanPath.split("/").filter(Boolean);
  if (parts.length < 2) throw new Error(`URL missing owner/repo: ${raw}`);

  const owner = parts[0];
  const repoName = parts[parts.length - 1];
  const httpsUrl = `https://${host}/${owner}/${repoName}.git`;
  const mirrorSlug = `mirror-${host}-${owner}-${repoName}`
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/-{2,}/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase();

  return { host, owner, repoName, httpsUrl, mirrorSlug };
}

function spawnExec(
  prog: string,
  args: string[],
  env?: Env,
  cwd?: string
): void {
  const result = spawnSync(prog, args, {
    stdio: "inherit",
    env: env ?? process.env,
    cwd,
  });
  if (result.error) throw result.error;
  if (result.status !== 0)
    throw new Error(`${prog} exited with code ${result.status}`);
}

function spawnCapture(prog: string, args: string[], env?: Env): string {
  const result = spawnSync(prog, args, {
    stdio: ["ignore", "pipe", "pipe"],
    encoding: "utf-8",
    env: env ?? process.env,
  });
  if (result.error) throw result.error;
  if (result.status !== 0)
    throw new Error(
      `${prog} exited with code ${result.status}: ${result.stderr as string}`
    );
  return (result.stdout as string).trim();
}

function spawnTry(prog: string, args: string[], env?: Env): boolean {
  const result = spawnSync(prog, args, {
    stdio: "pipe",
    env: env ?? process.env,
  });
  return result.status === 0 && !result.error;
}

function spawnTryCapture(prog: string, args: string[], env?: Env): string {
  try {
    return spawnCapture(prog, args, env);
  } catch {
    return "";
  }
}

function mirrorRepoRecursive(
  srcUrl: string,
  tgtOwner: string,
  tgtHost: string,
  srcToken: string,
  tgtToken: string,
  globalWorkDir: string,
  recursive: boolean,
  log: Logger,
  depth = 0
): void {
  if (depth > 5) {
    log.warn(`Max recursion depth reached; skipping ${srcUrl}`);
    return;
  }

  let parsed: ParsedGitUrl;
  try {
    parsed = parseGitUrl(srcUrl);
  } catch (err) {
    log.warn(`Cannot parse ${srcUrl}: ${(err as Error).message}`);
    return;
  }

  const { httpsUrl, owner: srcOwner, repoName, mirrorSlug } = parsed;
  const display = `${srcOwner}/${repoName}`;
  const tgtFull = `${tgtOwner}/${mirrorSlug}`;
  const repoParent = join(globalWorkDir, `d${depth}-${mirrorSlug}`);
  const repoDir = join(repoParent, "mirror.git");
  mkdirSync(repoParent, { recursive: true });

  const srcAuth = makeAuthUrl(httpsUrl, srcToken);
  const tgtAuth = makeAuthUrl(
    `https://${tgtHost}/${tgtOwner}/${mirrorSlug}.git`,
    tgtToken
  );
  const ghEnv: Env = { ...process.env, GH_TOKEN: tgtToken, GH_HOST: tgtHost };
  const gitEnv: Env = { ...process.env, GIT_TERMINAL_PROMPT: "0" };

  log.warn(`[depth=${depth}] Mirroring ${display} -> ${tgtFull}`);

  if (spawnTry("gh", ["repo", "view", tgtFull], ghEnv)) {
    log.warn(`Repository ${tgtFull} exists; cloning existing mirror.`);
    spawnExec("git", ["clone", "--mirror", tgtAuth, repoDir], gitEnv);
    spawnTry("git", ["-C", repoDir, "remote", "rename", "origin", "target"]);
  } else {
    log.warn(`Creating private repository ${tgtFull}`);
    spawnExec(
      "gh",
      [
        "repo",
        "create",
        tgtFull,
        "--private",
        "--disable-issues",
        "--disable-wiki",
        "--description",
        `Automated mirror of ${display}`,
      ],
      ghEnv
    );
    log.warn(`Cloning ${display}`);
    spawnExec("git", ["clone", "--mirror", srcAuth, repoDir], gitEnv);
    spawnTry("git", ["-C", repoDir, "remote", "rename", "origin", "source"]);
  }

  if (spawnTry("git", ["-C", repoDir, "remote", "get-url", "target"])) {
    spawnExec("git", ["-C", repoDir, "remote", "set-url", "target", tgtAuth]);
  } else {
    spawnExec("git", ["-C", repoDir, "remote", "add", "target", tgtAuth]);
  }

  if (spawnTry("git", ["-C", repoDir, "remote", "get-url", "source"])) {
    spawnExec("git", ["-C", repoDir, "remote", "set-url", "source", srcAuth]);
  } else {
    spawnExec("git", ["-C", repoDir, "remote", "add", "source", srcAuth]);
  }

  log.warn(`Fetching latest refs from ${display}`);
  spawnExec(
    "git",
    ["-C", repoDir, "fetch", "--prune", "source", "+refs/*:refs/*"],
    gitEnv
  );

  // git clone --mirror sets remote.<name>.mirror=true, which forbids explicit refspecs.
  // Unset it so we can pass a negative refspec to exclude refs/pull/*.
  spawnTry("git", ["-C", repoDir, "config", "--unset", "remote.target.mirror"]);

  log.warn(`Pushing mirror to ${tgtFull}`);
  // --prune removes stale refs on the target (equivalent to --mirror's deletion behaviour).
  // ^refs/pull/* excludes GitHub-internal hidden refs that reject pushes (git 2.29+).
  spawnExec(
    "git",
    ["-C", repoDir, "push", "--prune", "target", "+refs/*:refs/*", "^refs/pull/*"],
    gitEnv
  );

  log.warn(`Completed mirror for ${display}`);

  if (recursive && depth < 5) {
    const gitmodules = spawnTryCapture("git", [
      "-C",
      repoDir,
      "show",
      "HEAD:.gitmodules",
    ]);
    if (gitmodules) {
      log.warn(
        `Found .gitmodules in ${display}; recursing into submodules (depth=${depth + 1})...`
      );
      for (const line of gitmodules.split("\n")) {
        const match = /^\s*url\s*=\s*(.+)$/.exec(line);
        if (match) {
          const subUrl = match[1].trim();
          log.warn(`Submodule: ${subUrl}`);
          try {
            mirrorRepoRecursive(
              subUrl,
              tgtOwner,
              tgtHost,
              srcToken,
              tgtToken,
              globalWorkDir,
              true,
              log,
              depth + 1
            );
          } catch (err) {
            log.warn(
              `Failed to mirror submodule ${subUrl}: ${(err as Error).message}`
            );
          }
        }
      }
    }
  }
}

const options = {};

export class MirrorRepoCommand extends Command<typeof options, void> {
  constructor() {
    super("MirrorRepoCommand", options);
  }

  protected override help(): void {
    printCommandHelp(
      this.log,
      "mirror-repo",
      "Mirror a single Git repository to a target host using bare clone/push.",
      "mirror-repo",
      [
        { flag: "-h, --help", description: "Show this help text and exit" },
        {
          flag: "-v, --version",
          description: "Print package version and exit",
        },
      ],
      [
        "All configuration is read from environment variables set by the GitHub Actions matrix job.",
        "SOURCE_HTTPS_URL: normalized HTTPS URL of the source repository.",
        "TARGET_OWNER: owner/org on the target host.",
        "TARGET_HOST: target host (default: github.com).",
        "SOURCE_HOST_TOKEN / SOURCE_OWNER_TOKEN: PAT for reading the source.",
        "TARGET_OWNER_TOKEN / TARGET_OWNER_FALLBACK_TOKEN / TARGET_HOST_TOKEN: PAT for writing to the target.",
        "RECURSIVE: set to 'true' to also mirror all git submodules recursively.",
      ],
      ["mirror-repo"]
    );
  }

  protected async run(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _answers: LoggingConfig & typeof DefaultCommandValues
  ): Promise<void> {
    const log = this.log.for(this.run);

    const sourceHttpsUrl = process.env["SOURCE_HTTPS_URL"] ?? "";
    const sourceDisplayName =
      process.env["SOURCE_DISPLAY_NAME"] ??
      process.env["SOURCE_URL"] ??
      "unknown source";
    const sourceHostSecretName = process.env["SOURCE_HOST_SECRET_NAME"] ?? "";
    const sourceOwnerSecretName = process.env["SOURCE_OWNER_SECRET_NAME"] ?? "";
    const targetOwner = process.env["TARGET_OWNER"] ?? "";
    const targetHost = process.env["TARGET_HOST"] ?? "github.com";
    const targetOwnerSecretName = process.env["TARGET_OWNER_SECRET_NAME"] ?? "";
    const targetOwnerFallbackSecretName =
      process.env["TARGET_OWNER_FALLBACK_SECRET_NAME"] ?? "";
    const targetHostSecretName = process.env["TARGET_HOST_SECRET_NAME"] ?? "";
    const recursive = process.env["RECURSIVE"] === "true";

    if (!sourceHttpsUrl) {
      log.warn(`Skipping ${sourceDisplayName}: missing normalized HTTPS URL.`);
      return;
    }

    const sourceToken =
      process.env["SOURCE_HOST_TOKEN"] ||
      process.env["SOURCE_OWNER_TOKEN"] ||
      "";
    if (!sourceToken) {
      log.warn(
        `Skipping ${sourceDisplayName}: missing source access token` +
          ` (expected secrets ${sourceHostSecretName} or ${sourceOwnerSecretName}).`
      );
      return;
    }

    const targetToken =
      process.env["TARGET_OWNER_TOKEN"] ||
      process.env["TARGET_OWNER_FALLBACK_TOKEN"] ||
      process.env["TARGET_HOST_TOKEN"] ||
      "";
    if (!targetToken) {
      const missing = [
        targetOwnerSecretName,
        targetOwnerFallbackSecretName,
        targetHostSecretName,
      ].filter(Boolean);
      throw new Error(
        `Missing target access token (expected secrets ${missing.join(", ")})` +
          ` for ${sourceDisplayName}.`
      );
    }

    const globalWorkDir = mkdtempSync(join(tmpdir(), "git-mirror-"));
    process.on("exit", () => {
      try {
        rmSync(globalWorkDir, { recursive: true, force: true });
      } catch {
        // best-effort cleanup
      }
    });

    mirrorRepoRecursive(
      sourceHttpsUrl,
      targetOwner,
      targetHost,
      sourceToken,
      targetToken,
      globalWorkDir,
      recursive,
      log,
      0
    );
  }
}
