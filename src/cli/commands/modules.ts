import fs from "node:fs";
import path from "node:path";
import { Command } from "../command";
import { DefaultCommandValues } from "../constants";
import { LoggingConfig } from "@decaf-ts/logging";
import { printCommandHelp } from "./help";

export function readGitModules(basePath: string = process.cwd()): string[] {
  const gitmodulesPath = path.join(basePath, ".gitmodules");
  const data = fs.readFileSync(gitmodulesPath, "utf8");
  return data.toString().match(/(?<=").*?(?="])/g) || [];
}

export function readGitModulesDeep(
  basePath: string = process.cwd(),
  maxTraversal = 2
): string[] {
  const modules = new Set<string>();
  const visited = new Set<string>();

  const walk = (
    currentBasePath: string,
    depth: number,
    relativePrefix = ""
  ) => {
    const normalizedBase = path.resolve(currentBasePath);
    if (visited.has(normalizedBase)) return;
    visited.add(normalizedBase);

    let entries: string[] = [];
    try {
      entries = readGitModules(currentBasePath);
    } catch {
      return;
    }

    for (const entry of entries) {
      const modulePath = relativePrefix
        ? path.join(relativePrefix, entry)
        : entry;
      modules.add(modulePath);
      if (depth <= 0) continue;

      const nestedBase = path.join(currentBasePath, entry);
      const nestedGitmodules = path.join(nestedBase, ".gitmodules");
      if (fs.existsSync(nestedGitmodules)) {
        walk(nestedBase, depth - 1, modulePath);
      }
    }
  };

  walk(basePath, maxTraversal);
  return Array.from(modules);
}

const options = {
  basePath: {
    type: "string",
    default: process.cwd(),
  },
};

export class ModulesCommand extends Command<typeof options, void> {
  constructor() {
    super("ModulesCommand", options);
  }

  protected override help(): void {
    printCommandHelp(
      this.log,
      "modules",
      "List modules discovered from .gitmodules.",
      "modules [options]",
      [
        {
          flag: "--base-path <path>",
          description: "Directory to read .gitmodules from",
          defaultValue: "current working directory",
        },
        {
          flag: "-h, --help",
          description: "Show this help text and exit",
        },
      ],
      ["Each discovered module path is printed on its own line."],
      ["modules", "modules --base-path ../repo"],
    );
  }

  protected async run(
    answers: LoggingConfig & typeof DefaultCommandValues & { basePath: string }
  ): Promise<void> {
    const modules = readGitModules(answers.basePath as string | undefined);
    modules.forEach((module) => this.log.info(module));
  }
}
