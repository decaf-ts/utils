import fs from "fs";
import path from "path";
import { execSync } from "node:child_process";
import { Logging } from "@decaf-ts/logging";

export interface ReleaseChainOptions {
  metaRepoUrl: string;
  branch: string;
  currentRepo?: string;
  packageName: string;
  workspace?: string;
  token?: string;
  submoduleFile?: string;
  submodulePath?: string;
  targetBaseBranch?: string;
}

export interface ReleaseChainDispatchOptions {
  metaRepoUrl: string;
  branch: string;
  workflowFile?: string;
  repoSlug?: string;
  currentRepo?: string;
  token?: string;
  ref?: string;
  targetBaseBranch?: string;
}

type SubmoduleEntry = {
  name: string;
  path: string;
  url: string;
  slug: string | undefined;
};

const releaseLog = Logging.for("ReleaseChainRunner");

export class ReleaseChainRunner {
  private readonly workspace: string;
  private readonly clonesRoot: string;
  private readonly token?: string;
  private readonly metaRepoSlug: string;
  private readonly currentRepo?: string;

  constructor(private readonly options: ReleaseChainOptions) {
    this.workspace = options.workspace ?? process.cwd();
    this.clonesRoot = path.join(this.workspace, ".release-chain");
    this.token =
      options.token ||
      process.env.RELEASE_CHAIN_TOKEN ||
      process.env.GITHUB_TOKEN ||
      process.env.GH_TOKEN;
    this.metaRepoSlug =
      normalizeRepoSlug(options.metaRepoUrl) ||
      throwOnMissing("Unable to normalize META repo URL");
    this.currentRepo =
      normalizeRepoSlug(options.currentRepo) || detectCurrentRepoSlug();
  }

  async run(): Promise<void> {
    const modules = await this.loadSubmodules();
    if (!modules.length) {
      releaseLog.warn("No modules detected in provided .gitmodules file");
      return;
    }

    const startIndex = this.currentRepo
      ? modules.findIndex((module) => module.slug === this.currentRepo)
      : -1;
    const queue = startIndex >= 0 ? modules.slice(startIndex + 1) : modules;

    releaseLog.info(
      `Evaluating ${queue.length} repositories for ${this.options.packageName}`
    );

    for (const module of queue) {
      await this.evaluateModule(module);
    }
  }

  private async evaluateModule(module: SubmoduleEntry): Promise<void> {
    if (!module.slug) {
      releaseLog.verbose(`Skipping ${module.name}: unsupported repository URL`);
      return;
    }

    releaseLog.info(`\n[release-chain] ${module.slug}`);
    const repoDir = path.join(
      this.clonesRoot,
      module.slug.replace(/\//g, "__")
    );
    fs.rmSync(repoDir, { recursive: true, force: true });
    fs.mkdirSync(repoDir, { recursive: true });

    this.cloneRepository(module.url, repoDir);
    await this.checkoutTargetBranch(repoDir);

    const pkgPath = path.join(repoDir, "package.json");
    if (!fs.existsSync(pkgPath)) {
      releaseLog.debug(`No package.json detected for ${module.slug}`);
      return;
    }

    const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"));
    if (!dependsOnPackage(pkg, this.options.packageName)) {
      releaseLog.debug(
        `${module.slug} does not depend on ${this.options.packageName}`
      );
      return;
    }

    ensureGitIdentity(repoDir);
    this.runCommand("npm install --ignore-scripts", repoDir);
    this.runCommand(`npm update ${this.options.packageName}`, repoDir);
    this.runCommand("npm run build --if-present", repoDir);
    this.runCommand("npm run test --if-present", repoDir);

    if (!hasChanges(repoDir)) {
      releaseLog.info(`No changes detected for ${module.slug}`);
      return;
    }

    this.runCommand("git add -A", repoDir);
    this.runCommand(
      `git commit -m "chore: release chain update for ${this.options.packageName}"`,
      repoDir
    );
    this.runCommand(
      `git push origin ${this.options.branch} --force-with-lease`,
      repoDir
    );

    const existingPr = await this.findExistingPr(module.slug);
    if (existingPr) {
      releaseLog.info(
        `Existing PR #${existingPr.number} detected for ${module.slug}, attempting merge`
      );
      await this.acceptPullRequest(
        module.slug,
        existingPr.number,
        existingPr.head.sha
      );
      return;
    }

    const baseBranch =
      this.options.targetBaseBranch ||
      (await this.getDefaultBranch(module.slug));
    await this.createPullRequest(module.slug, baseBranch);
  }

  private cloneRepository(url: string, target: string) {
    const authUrl = injectAuth(url, this.token);
    this.runCommand(`git clone --no-tags --depth 1 ${authUrl} ${target}`);
  }

  private async checkoutTargetBranch(cwd: string) {
    try {
      this.runCommand(
        `git fetch origin ${this.options.branch}:${this.options.branch}`,
        cwd
      );
      this.runCommand(`git checkout ${this.options.branch}`, cwd);
      this.runCommand(`git reset --hard origin/${this.options.branch}`, cwd);
      return;
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (error: unknown) {
      releaseLog.verbose(
        `Branch ${this.options.branch} not found remotely; creating from default`
      );
    }

    const defaultBranch = detectDefaultBranch(cwd);
    this.runCommand(
      `git checkout -b ${this.options.branch} origin/${defaultBranch}`,
      cwd
    );
  }

  private async loadSubmodules(): Promise<SubmoduleEntry[]> {
    if (
      this.options.submodulePath &&
      fs.existsSync(this.options.submodulePath)
    ) {
      const localContent = fs.readFileSync(this.options.submodulePath, "utf8");
      return parseSubmodules(localContent);
    }

    const candidates = [
      this.options.submoduleFile,
      ".gitsubmodule",
      ".gitmodules",
    ].filter(Boolean) as string[];

    for (const file of candidates) {
      try {
        const content = await fetchRawFile(
          this.metaRepoSlug,
          this.options.branch,
          file,
          this.token
        );
        if (content) {
          return parseSubmodules(content);
        }
      } catch (error) {
        if (file === candidates[candidates.length - 1]) {
          throw error;
        }
      }
    }

    return [];
  }

  private runCommand(command: string, cwd: string = this.workspace) {
    releaseLog.debug(`[${cwd}] ${command}`);
    execSync(command, {
      cwd,
      stdio: "inherit",
      env: Object.assign({}, process.env, {
        RELEASE_CHAIN_TOKEN: this.token,
      }),
    });
  }

  private async githubRequest<T>(path: string, init?: RequestInit): Promise<T> {
    const headers: Record<string, string> = {
      "User-Agent": "decaf-release-chain",
      Accept: "application/vnd.github+json",
    };
    if (this.token) {
      headers.Authorization = `Bearer ${this.token}`;
    }
    const response = await fetch(`https://api.github.com${path}`, {
      method: init?.method || "GET",
      headers: Object.assign({}, headers, init?.headers),
      body: init?.body,
    });
    if (!response.ok) {
      const text = await response.text();
      throw new Error(`GitHub API ${response.status}: ${text}`);
    }
    if (response.status === 204) {
      return undefined as T;
    }
    return (await response.json()) as T;
  }

  private async findExistingPr(slug: string) {
    const [owner] = slug.split("/");
    const list = await this.githubRequest(
      `/repos/${slug}/pulls?head=${owner}%3A${encodeURIComponent(this.options.branch)}&state=open&per_page=1`
    );
    return (list as any[])?.[0];
  }

  private async acceptPullRequest(slug: string, number: number, sha?: string) {
    await this.githubRequest(`/repos/${slug}/pulls/${number}/merge`, {
      method: "PUT",
      body: JSON.stringify({
        merge_method: "squash",
        commit_title: `chore: accept release chain for ${this.options.packageName}`,
        sha,
      }),
    });
  }

  private async createPullRequest(slug: string, base: string) {
    await this.githubRequest(`/repos/${slug}/pulls`, {
      method: "POST",
      body: JSON.stringify({
        title: `${this.options.branch}-release-chain`,
        head: this.options.branch,
        base,
        body: `Automated dependency update for ${this.options.packageName}.`,
      }),
    });
  }

  private async getDefaultBranch(slug: string): Promise<string> {
    const repo = await this.githubRequest(`/repos/${slug}`);
    return (repo as any)?.default_branch || "main";
  }
}

export async function runReleaseChain(options: ReleaseChainOptions) {
  const runner = new ReleaseChainRunner(options);
  await runner.run();
}

export async function dispatchReleaseChainWorkflow(
  options: ReleaseChainDispatchOptions
) {
  const token =
    options.token ||
    process.env.RELEASE_CHAIN_TRIGGER_TOKEN ||
    process.env.RELEASE_CHAIN_TOKEN ||
    process.env.GITHUB_TOKEN ||
    process.env.GH_TOKEN;
  const repoSlug =
    options.repoSlug ||
    detectCurrentRepoSlug() ||
    throwOnMissing("Unable to determine repository slug for dispatch");
  const workflow = options.workflowFile || "release-chain.yaml";
  const ref = options.ref || options.branch;
  const currentRepo = normalizeRepoSlug(options.currentRepo) || repoSlug;

  releaseLog.info(
    `Dispatching ${workflow} on ${repoSlug} for ${options.branch} (current repo ${currentRepo})`
  );

  const headers: Record<string, string> = {
    "User-Agent": "decaf-release-chain-dispatch",
    Accept: "application/vnd.github+json",
    "Content-Type": "application/json",
  };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(
    `https://api.github.com/repos/${repoSlug}/actions/workflows/${workflow}/dispatches`,
    {
      method: "POST",
      headers,
      body: JSON.stringify({
        ref,
        inputs: {
          meta_repo_url: options.metaRepoUrl,
          branch: options.branch,
          current_repo: currentRepo,
          target_branch: options.targetBaseBranch || "",
        },
      }),
    }
  );

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Workflow dispatch failed: ${response.status} ${text}`);
  }
}

function parseSubmodules(content: string): SubmoduleEntry[] {
  return content
    .split("[submodule")
    .slice(1)
    .map((block) => {
      const nameMatch = block.match(/"(.+?)"\]/);
      const pathMatch = block.match(/path\s*=\s*(.+)/);
      const urlMatch = block.match(/url\s*=\s*(.+)/);
      const url = urlMatch?.[1]?.trim() || "";
      return {
        name: nameMatch?.[1]?.trim() || "",
        path: pathMatch?.[1]?.trim() || "",
        url,
        slug: normalizeRepoSlug(url),
      } as SubmoduleEntry;
    })
    .filter((entry) => entry.url);
}

function normalizeRepoSlug(value?: string): string | undefined {
  if (!value) return undefined;
  if (value.includes("github.com")) {
    const normalized = toHttpsUrl(value);
    const parsed = new URL(normalized);
    return parsed.pathname.replace(/^\//, "").replace(/\.git$/, "");
  }
  return value.replace(/^\//, "");
}

function toHttpsUrl(url: string): string {
  if (url.startsWith("git@github.com:")) {
    return `https://github.com/${url.replace("git@github.com:", "")}`;
  }
  if (url.startsWith("ssh://git@github.com/")) {
    return `https://github.com/${url.replace("ssh://git@github.com/", "")}`;
  }
  return url.replace(/\.git$/, "");
}

function injectAuth(url: string, token?: string): string {
  const httpsUrl = toHttpsUrl(url);
  if (!token) {
    return httpsUrl;
  }
  const parsed = new URL(httpsUrl);
  parsed.username = "x-access-token";
  parsed.password = token;
  return parsed.toString();
}

async function fetchRawFile(
  slug: string,
  branch: string,
  file: string,
  token?: string
): Promise<string | null> {
  const url = `https://raw.githubusercontent.com/${slug}/${branch}/${file}`;
  const headers: Record<string, string> = {
    "User-Agent": "decaf-release-chain",
  };
  if (token) headers.Authorization = `Bearer ${token}`;
  const response = await fetch(url, { headers });
  if (response.status === 404) {
    return null;
  }
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Failed to download ${file}: ${response.status} ${text}`);
  }
  return response.text();
}

function detectCurrentRepoSlug(): string | undefined {
  if (process.env.GITHUB_REPOSITORY) {
    return process.env.GITHUB_REPOSITORY;
  }
  try {
    const remote = execSync("git config --get remote.origin.url", {
      encoding: "utf8",
    })
      .trim()
      .replace(/\s+/g, "");
    return normalizeRepoSlug(remote);
  } catch {
    return undefined;
  }
}

function detectDefaultBranch(cwd: string): string {
  try {
    const ref = execSync("git symbolic-ref --short refs/remotes/origin/HEAD", {
      cwd,
      encoding: "utf8",
    }).trim();
    return ref.split("/").pop() || "main";
  } catch {
    return "main";
  }
}

function hasChanges(cwd: string): boolean {
  const status = execSync("git status --porcelain", {
    cwd,
    encoding: "utf8",
  }).trim();
  return Boolean(status);
}

function ensureGitIdentity(cwd: string) {
  try {
    execSync("git config user.name", { cwd, stdio: "pipe" });
    execSync("git config user.email", { cwd, stdio: "pipe" });
  } catch {
    execSync("git config user.name 'release-chain'", { cwd });
    execSync("git config user.email 'release-chain@users.noreply.github.com'", {
      cwd,
    });
  }
}

function dependsOnPackage(
  pkg: Record<string, any>,
  packageName: string
): boolean {
  const sections = [
    "dependencies",
    "devDependencies",
    "peerDependencies",
    "optionalDependencies",
  ];
  return sections.some((section) => Boolean(pkg?.[section]?.[packageName]));
}

function throwOnMissing(message: string): never {
  throw new Error(message);
}
