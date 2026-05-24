import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";
import { LoggingConfig } from "@decaf-ts/logging";
import { Command } from "../command";
import { DefaultCommandValues } from "../constants";
import { readGitModules } from "./modules";
import { printCommandHelp } from "./help";

const options = {
  basePath: {
    type: "string",
    default: process.cwd(),
  },
  command: {
    type: "string",
    default: undefined,
  },
};

export class RunAllCommand extends Command<typeof options, void> {
  constructor() {
    super("RunAllCommand", options);
  }

  protected override help(): void {
    printCommandHelp(
      this.log,
      "run-all",
      "Run a shell command in every module listed in .gitmodules.",
      "run-all [options] --command <cmd>",
      [
        {
          flag: "--base-path <path>",
          description: "Directory to read .gitmodules from",
          defaultValue: "current working directory",
        },
        {
          flag: "--command <cmd>",
          description: "Shell command to execute in each module",
        },
        {
          flag: "-h, --help",
          description: "Show this help text and exit",
        },
      ],
      [
        "The command fails fast if any module invocation fails.",
      ],
      [
        "run-all --command npm test",
        "run-all --base-path ../repo --command npm run lint",
      ]
    );
  }

  protected async run(
    answers: LoggingConfig &
      typeof DefaultCommandValues & {
        basePath: unknown;
        command: unknown;
      }
  ): Promise<void> {
    const basePath =
      typeof answers.basePath === "string" && answers.basePath.trim().length > 0
        ? answers.basePath.trim()
        : process.cwd();
    const command =
      typeof answers.command === "string" ? answers.command.trim() : "";

    if (command.length === 0) {
      throw new Error("run-all requires a command to execute");
    }

    const modules = readGitModules(basePath);
    for (const moduleName of modules) {
      const moduleRoot = path.join(basePath, moduleName);
      if (!fs.existsSync(moduleRoot)) continue;

      console.log(`running ${command} ${moduleName}`);
      try {
        execSync(command, {
          cwd: moduleRoot,
          env: process.env,
          stdio: "inherit",
        });
      } catch {
        process.exit(1);
      }
    }
  }
}
