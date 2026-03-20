import { Command } from "../command";
import { CommandOptions } from "../types";
import { DefaultCommandOptions, DefaultCommandValues } from "../constants";
import {
  dispatchReleaseChainWorkflow,
  runReleaseChain,
} from "../../release-chain";
import { getPackage } from "../../utils";
import { LoggingConfig } from "@decaf-ts/logging";
import { execSync } from "node:child_process";

const releaseChainArgs = {
  meta: {
    type: "string",
    default: process.env.RELEASE_CHAIN_META_REPO_URL || "",
  },
  branch: {
    type: "string",
    default:
      process.env.RELEASE_CHAIN_BRANCH ||
      process.env.GITHUB_REF_NAME ||
      "main",
  },
  current: {
    type: "string",
    default:
      process.env.RELEASE_CHAIN_CURRENT || process.env.GITHUB_REPOSITORY || "",
  },
  package: {
    type: "string",
    default: "",
  },
  token: {
    type: "string",
    default: process.env.RELEASE_CHAIN_TOKEN || "",
  },
  submoduleFile: {
    type: "string",
    default: process.env.RELEASE_CHAIN_FILE || "",
  },
  submodulePath: {
    type: "string",
    default: process.env.RELEASE_CHAIN_FILE_PATH || "",
  },
  workflow: {
    type: "string",
    default: process.env.RELEASE_CHAIN_WORKFLOW || "release-chain.yaml",
  },
  repo: {
    type: "string",
    default: process.env.RELEASE_CHAIN_REPO || "",
  },
  ref: {
    type: "string",
    default: process.env.RELEASE_CHAIN_REF || "",
  },
  targetBase: {
    type: "string",
    default: process.env.RELEASE_CHAIN_TARGET || "",
  },
};

type ReleaseChainAnswerMap = {
  [K in keyof typeof releaseChainArgs]: unknown;
};

export class ReleaseChainCommand extends Command<
  CommandOptions<typeof releaseChainArgs>,
  void
> {
  constructor() {
    super(
      "ReleaseChain",
      Object.assign({}, DefaultCommandOptions, releaseChainArgs) as CommandOptions<
        typeof releaseChainArgs
      >,
    );
  }

  protected async run(
    options: LoggingConfig &
      typeof DefaultCommandValues &
      ReleaseChainAnswerMap,
  ): Promise<void> {
    const answerMap = options as ReleaseChainAnswerMap;
    const packageName =
      (answerMap.package as string) ||
      (getPackage(process.cwd()) as { name?: string })?.name;
    if (!packageName) {
      throw new Error("Unable to determine package name");
    }
    const metaRepo = (answerMap.meta as string) || detectRemoteUrl();
    if (!metaRepo) {
      throw new Error("A meta repository URL is required");
    }
    const branch = (answerMap.branch as string) || detectBranch();

    await runReleaseChain({
      metaRepoUrl: metaRepo,
      branch,
      currentRepo: answerMap.current as string,
      packageName,
      token: answerMap.token as string,
      submoduleFile: (answerMap.submoduleFile as string) || undefined,
      submodulePath: (answerMap.submodulePath as string) || undefined,
      targetBaseBranch: (answerMap.targetBase as string) || undefined,
    });
  }
}

export class ReleaseChainDispatchCommand extends Command<
  CommandOptions<typeof releaseChainArgs>,
  void
> {
  constructor() {
    super(
      "ReleaseChainDispatch",
      Object.assign({}, DefaultCommandOptions, releaseChainArgs) as CommandOptions<
        typeof releaseChainArgs
      >,
    );
  }

  protected async run(
    options: LoggingConfig &
      typeof DefaultCommandValues &
      ReleaseChainAnswerMap,
  ): Promise<void> {
    const answerMap = options as ReleaseChainAnswerMap;
    const metaRepo = (answerMap.meta as string) || detectRemoteUrl();
    if (!metaRepo) {
      throw new Error("A meta repository URL is required");
    }

    const branch = (answerMap.branch as string) || detectBranch();

    await dispatchReleaseChainWorkflow({
      metaRepoUrl: metaRepo,
      branch,
      workflowFile: (answerMap.workflow as string) || "release-chain.yaml",
      repoSlug: answerMap.repo as string,
      currentRepo: answerMap.current as string,
      token: answerMap.token as string,
      ref: (answerMap.ref as string) || branch,
      targetBaseBranch: (answerMap.targetBase as string) || undefined,
    });
  }
}

function detectRemoteUrl(): string | undefined {
  try {
    return execSync("git config --get remote.origin.url", {
      encoding: "utf8",
    }).trim();
  } catch {
    return undefined;
  }
}

function detectBranch(): string {
  try {
    return execSync("git rev-parse --abbrev-ref HEAD", {
      encoding: "utf8",
    }).trim();
  } catch {
    return "main";
  }
}
