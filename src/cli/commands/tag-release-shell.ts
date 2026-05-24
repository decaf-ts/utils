import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";
import { LoggingConfig } from "@decaf-ts/logging";
import { Command } from "../command";
import { DefaultCommandValues } from "../constants";
import { UserInput } from "../../input/input";
import { NoCIFLag } from "../../utils/constants";
import { printCommandHelp } from "./help";

const options = {
  public: {
    type: "boolean",
    default: false,
  },
  private: {
    type: "boolean",
    default: false,
  },
  gitToken: {
    type: "string",
    default: ".token",
  },
  npmToken: {
    type: "string",
    default: ".npmtoken",
  },
  gitUser: {
    type: "string",
    default: undefined,
  },
  allowFromBranch: {
    type: "boolean",
    default: false,
  },
  tag: {
    type: "string",
    default: undefined,
  },
  message: {
    type: "string",
    default: undefined,
  },
};

export class TagReleaseCommand extends Command<typeof options, void> {
  constructor() {
    super("TagReleaseCommand", options);
  }

  private async ensureReleaseBranch(allowFromBranch = false): Promise<void> {
    if (allowFromBranch) return;

    const currentBranch = execSync("git rev-parse --abbrev-ref HEAD", {
      cwd: process.cwd(),
      encoding: "utf8",
    }).trim();
    if (currentBranch !== "master" && currentBranch !== "main") {
      throw new Error(
        `release must be run from 'master' or 'main' branch. Current branch: ${currentBranch}`
      );
    }
  }

  private async prepareTag(tag?: string): Promise<string> {
    tag = `${tag || ""}`.trim();
    if (tag.length > 0) {
      return tag;
    }

    execSync("git tag --sort=-taggerdate | head -n 5", {
      cwd: process.cwd(),
      stdio: "inherit",
    });

    return UserInput.insistForText(
      "tag",
      "What should be the new tag? (accepts v*.*.*[-...])",
      (val) => !!val.toString().match(/^v[0-9]+\.[0-9]+\.[0-9]+(-[0-9a-zA-Z-]+)?$/)
    );
  }

  private async prepareMessage(message?: string): Promise<string> {
    message = `${message || ""}`.trim();
    if (message.length > 0) {
      return message;
    }

    return UserInput.insistForText(
      "message",
      "Tag Message",
      (val) => !!val && val.toString().length > 0
    );
  }

  private hasToken(fileName: string): boolean {
    try {
      return fs.statSync(path.join(process.cwd(), fileName)).size > 0;
    } catch {
      return false;
    }
  }

  private readToken(fileName: string): string {
    return fs.readFileSync(path.join(process.cwd(), fileName), "utf8").trim();
  }

  protected override help(): void {
    printCommandHelp(
      this.log,
      "tag-release",
      "Prepare a release, create a git tag, push, and optionally publish to npm.",
      "tag-release [options] [tag] [message]",
      [
        {
          flag: "--public",
          description: "Publish to the public npm registry",
          defaultValue: "false",
        },
        {
          flag: "--private",
          description: "Publish to the restricted npm registry",
          defaultValue: "false",
        },
        {
          flag: "--git-token <file>",
          description: "File containing the token used for authenticated git pushes",
          defaultValue: ".token",
        },
        {
          flag: "--npm-token <file>",
          description: "File containing the token used for npm publish",
          defaultValue: ".npmtoken",
        },
        {
          flag: "--git-user <name>",
          description: "Git user name embedded in authenticated pushes",
        },
        {
          flag: "--allow-from-branch",
          description: "Skip the master/main branch guard",
          defaultValue: "false",
        },
        {
          flag: "--tag <version>",
          description: "Release tag to create",
        },
        {
          flag: "--message <text>",
          description: "Release message to use",
        },
        {
          flag: "-h, --help",
          description: "Show this help text and exit",
        },
      ],
      [
        "If tag or message are omitted, the command prompts interactively.",
        "The command uses .token for git pushes and .npmtoken for npm publish unless overridden.",
      ],
      [
        "tag-release --public --tag v1.2.3 --message \"Release 1.2.3\"",
        "tag-release --private --allow-from-branch --tag v1.2.3",
      ]
    );
  }

  protected async run(
    answers: LoggingConfig &
      typeof DefaultCommandValues & {
        public: unknown;
        private: unknown;
        gitToken: unknown;
        npmToken: unknown;
        gitUser: unknown;
        allowFromBranch: unknown;
        tag: unknown;
        message: unknown;
      }
  ): Promise<void> {
    await this.ensureReleaseBranch(answers.allowFromBranch === true);

    const publishAccessFlag =
      answers.private === true ? "private" : "public";
    const tag = await this.prepareTag(answers.tag as string | undefined);
    const message = await this.prepareMessage(answers.message as string | undefined);
    const gitTokenFile = `${answers.gitToken || ".token"}`;
    const npmTokenFile = `${answers.npmToken || ".npmtoken"}`;
    const gitUser =
      typeof answers.gitUser === "string" && answers.gitUser.trim().length > 0
        ? answers.gitUser.trim()
        : execSync("git config user.name", {
            cwd: process.cwd(),
            encoding: "utf8",
          }).trim();

    execSync("npm run prepare-release", {
      cwd: process.cwd(),
      stdio: "inherit",
    });

    const status = execSync("git status --porcelain", {
      cwd: process.cwd(),
      encoding: "utf8",
    });
    if (status.trim().length > 0) {
      execSync("git add .", { cwd: process.cwd(), stdio: "inherit" });
      execSync(
        `git commit -m "${tag} - ${message} - after release preparation"`,
        {
          cwd: process.cwd(),
          stdio: "inherit",
        }
      );
    }

    execSync(`npm version "${tag}" -m "${message}"`, {
      cwd: process.cwd(),
      stdio: "inherit",
    });

    const remoteUrl = execSync("git remote get-url origin", {
      cwd: process.cwd(),
      encoding: "utf8",
    }).trim();

    if (this.hasToken(gitTokenFile)) {
      const currentBranch = execSync("git rev-parse --abbrev-ref HEAD", {
        cwd: process.cwd(),
        encoding: "utf8",
      });
      let upstream = "";
      try {
        upstream = execSync(
          "git rev-parse --abbrev-ref --symbolic-full-name '@{u}'",
          {
            cwd: process.cwd(),
            encoding: "utf8",
          }
        );
      } catch {
        upstream = "";
      }

      const token = this.readToken(gitTokenFile);
      execSync(
        `git push "https://${gitUser}:${token}@${remoteUrl.replace(/^https:\/\//, "")}" --follow-tags`,
        {
          cwd: process.cwd(),
          stdio: "inherit",
        }
      );

      if (upstream.trim().length > 0) {
        try {
          execSync(
            `git branch --set-upstream-to="${upstream.trim()}" "${currentBranch.trim()}"`,
            {
              cwd: process.cwd(),
              stdio: "inherit",
            }
          );
        } catch {
          // ignore restore failures
        }
      }
    } else {
      execSync("git push --follow-tags", {
        cwd: process.cwd(),
        stdio: "inherit",
      });
    }

    const npmAccessValue =
      publishAccessFlag === "public" ? "public" : "restricted";
    if (message.endsWith(NoCIFLag) && this.hasToken(npmTokenFile)) {
      const npmToken = this.readToken(npmTokenFile);
      execSync(`NPM_TOKEN="${npmToken}" npm publish --access "${npmAccessValue}"`, {
        cwd: process.cwd(),
        stdio: "inherit",
      });
    }
  }
}
