import fs from "node:fs";
import path from "node:path";
import { LoggingConfig } from "@decaf-ts/logging";
import { Command } from "../command";
import { DefaultCommandValues } from "../constants";
import { readGitModulesDeep } from "./modules";
import { printCommandHelp } from "./help";

const options = {
  maxTraversal: {
    type: "string",
    default: "2",
  },
  tokenFiles: {
    type: "string",
    multiple: true,
    default: [".token", ".npmtoken"],
  },
};

function normalizeList(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map((item) => `${item}`.trim()).filter(Boolean);
  }
  if (typeof value === "string" && value.length > 0) {
    return value
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  }
  return [];
}

export class NpmTokenCommand extends Command<typeof options, void> {
  constructor() {
    super("NpmTokenCommand", options);
  }

  protected override help(): void {
    printCommandHelp(
      this.log,
      "npm-token",
      "Link token files into every module discovered in .gitmodules.",
      "npm-token [options]",
      [
        {
          flag: "--max-traversal <depth>",
          description: "How many nested .gitmodules levels to traverse",
          defaultValue: "2",
        },
        {
          flag: "--token-files <files...>",
          description: "Token files to link into each selected module",
          defaultValue: ".token,.npmtoken",
        },
        {
          flag: "-h, --help",
          description: "Show this help text and exit",
        },
      ],
      [
        "The command creates symlinks from each selected module back to the token files in the repository root.",
      ],
      [
        "npm-token",
        "npm-token --token-files .token .npmtoken secrets/npm.token",
      ]
    );
  }

  protected async run(
    answers: LoggingConfig &
      typeof DefaultCommandValues & {
        maxTraversal: unknown;
        tokenFiles: unknown;
      }
  ): Promise<void> {
    const maxTraversal = Number.parseInt(`${answers.maxTraversal || "2"}`, 10);
    const tokenFiles = normalizeList(answers.tokenFiles);
    const effectiveTokenFiles =
      tokenFiles.length > 0 ? tokenFiles : [".token", ".npmtoken"];
    const modules = readGitModulesDeep(
      process.cwd(),
      Number.isFinite(maxTraversal) ? maxTraversal : 2
    );

    for (const moduleName of modules) {
      const moduleRoot = path.join(process.cwd(), moduleName);
      try {
        for (const tokenFile of effectiveTokenFiles) {
          console.log(`linking ${tokenFile} to ${moduleName}`);
          fs.rmSync(path.join(moduleRoot, tokenFile), {
            force: true,
            recursive: true,
          });
          fs.symlinkSync(path.join("..", tokenFile), path.join(moduleRoot, tokenFile));
        }
      } catch {
        process.exit(1);
      }
    }
  }
}
