import { LoggingConfig } from "@decaf-ts/logging";
import { Command } from "../command";
import { DefaultCommandValues } from "../constants";
import { printCommandHelp } from "./help.command";

export interface RepoEntry {
  source_url: string;
  https_url: string;
  source_host: string;
  source_owner: string;
  repo_name: string;
  display_name: string;
  source_host_secret: string;
  source_owner_secret: string;
  target_owner: string;
  target_repo: string;
  target_host: string;
  target_owner_secret: string;
  target_owner_fallback_secret: string;
  target_host_secret: string;
  recursive: boolean;
}

function sanitizeSecret(name: string): string {
  return name.toUpperCase().replace(/[^A-Z0-9]/g, "_");
}

function slugify(parts: string[]): string {
  return parts
    .filter(Boolean)
    .join("-")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/-{2,}/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase();
}

export function parseRepo(
  rawUrl: string,
  targetOwner: string,
  targetHost: string,
  recursive = false
): RepoEntry {
  rawUrl = rawUrl.trim();
  if (!rawUrl) throw new Error("empty entry");

  let host: string, cleanPath: string;

  if (rawUrl.startsWith("git@")) {
    const rest = rawUrl.slice(4);
    const colonIdx = rest.indexOf(":");
    if (colonIdx === -1) throw new Error("invalid SSH URL");
    host = rest.slice(0, colonIdx);
    cleanPath = rest.slice(colonIdx + 1);
  } else {
    const parsed = new URL(rawUrl);
    host = parsed.hostname;
    cleanPath = parsed.pathname.slice(1);
  }

  cleanPath = cleanPath.replace(/^\/+|\/+$/g, "");
  if (cleanPath.endsWith(".git")) cleanPath = cleanPath.slice(0, -4);

  const segments = cleanPath.split("/").filter(Boolean);
  if (segments.length < 2)
    throw new Error("missing owner or repository portion");

  const owner = segments[0];
  const repoName = segments[segments.length - 1];
  const httpsUrl = `https://${host}/${owner}/${repoName}.git`;
  const mirrorRepo = slugify(["mirror", host, owner, repoName]);
  if (!mirrorRepo) throw new Error("unable to derive mirror repository name");

  return {
    source_url: rawUrl,
    https_url: httpsUrl,
    source_host: host,
    source_owner: owner,
    repo_name: repoName,
    display_name: `${owner}/${repoName}`,
    source_host_secret: `HOST_${sanitizeSecret(host)}_KEY`,
    source_owner_secret: `HOST_${sanitizeSecret(owner)}_KEY`,
    target_owner: targetOwner,
    target_repo: mirrorRepo,
    target_host: targetHost,
    target_owner_secret: `HOST_${sanitizeSecret(targetOwner)}_KEY`,
    target_owner_fallback_secret: `HOST_${sanitizeSecret(owner)}_KEY`,
    target_host_secret: `HOST_${sanitizeSecret(targetHost)}_KEY`,
    recursive,
  };
}

function parseReposVar(
  raw: string
): Array<{ url: string; recursive: boolean }> {
  const entries: Array<{ url: string; recursive: boolean }> = [];
  for (const line of raw.split("\n")) {
    for (const chunk of line.split(",")) {
      const trimmed = chunk.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const parts = trimmed.split(/\s+/);
      const url = parts[0];
      const recursive = parts.includes("--recursive");
      if (url) entries.push({ url, recursive });
    }
  }
  return entries;
}

const options = {
  banner: {
    type: "boolean" as const,
    default: false,
  },
};

export class CompileMatrixCommand extends Command<typeof options, void> {
  constructor() {
    super("CompileMatrixCommand", options);
  }

  protected override help(): void {
    printCommandHelp(
      this.log,
      "compile-matrix",
      "Build the GitHub Actions job matrix from a REPOS environment variable.",
      "compile-matrix",
      [
        { flag: "-h, --help", description: "Show this help text and exit" },
        {
          flag: "-v, --version",
          description: "Print package version and exit",
        },
      ],
      [
        "Reads TARGET_OWNER and REPOS from the environment.",
        "REPOS is a newline- or comma-separated list of Git URLs, each optionally followed by --recursive.",
        "Outputs a JSON array to stdout suitable for use as a GitHub Actions matrix.",
        "All informational output is written to stderr to keep stdout clean for capture.",
      ],
      ["compile-matrix"]
    );
  }

  protected async run(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _answers: LoggingConfig & typeof DefaultCommandValues & { banner: unknown }
  ): Promise<void> {
    const log = this.log.for(this.run);
    const targetOwner = process.env["TARGET_OWNER"] ?? "";
    const targetHost = "github.com";
    const raw = (process.env["REPOS"] ?? "").trim();

    if (!raw) {
      log.warn("REPOS environment variable is empty; outputting empty matrix.");
      process.stdout.write("[]\n");
      return;
    }

    const entries: RepoEntry[] = [];
    for (const { url, recursive } of parseReposVar(raw)) {
      try {
        entries.push(parseRepo(url, targetOwner, targetHost, recursive));
      } catch (err) {
        log.warn(`Skipping '${url}': ${(err as Error).message}`);
      }
    }

    process.stdout.write(JSON.stringify(entries) + "\n");
  }
}
