import fs from "node:fs";
import path from "node:path";
import { LoggingConfig } from "@decaf-ts/logging";
import { NotFoundError, ValidationError } from "@decaf-ts/db-decorators";
import { Command } from "../command";
import { DefaultCommandValues } from "../constants";
import { printCommandHelp } from "./help.command";

const options = {
  basePath: {
    type: "string",
    default: process.cwd(),
  },
  readme: {
    type: "string",
    default: undefined,
  },
  docsDir: {
    type: "string",
    default: undefined,
  },
};

/**
 * @class BuildDocsCommand
 * @extends {Command<typeof options, void>}
 * @description Stages the package README into the docs folder.
 * @summary Resolves the package root, README and docs folder (all defaulting
 * under the current working directory), fails fast with a {@link NotFoundError}
 * when the README is missing, then removes and recreates the docs folder and
 * copies the README into it as `docs/README.md`. Keeps the legacy
 * `bin/build-docs.sh` behavior so docs staging stays interchangeable across
 * decaf-ts repositories.
 * @memberOf module:utils
 */
export class BuildDocsCommand extends Command<typeof options, void> {
  constructor() {
    super("BuildDocsCommand", options);
  }

  protected override help(): void {
    printCommandHelp(
      this.log,
      "build-docs",
      "Stage the package README into the docs folder.",
      "build-docs [options]",
      [
        {
          flag: "--base-path <path>",
          description: "Package root",
          defaultValue: "current working directory",
        },
        {
          flag: "--readme <file>",
          description: "README file to stage",
          defaultValue: "<base-path>/README.md",
        },
        {
          flag: "--docs-dir <dir>",
          description: "Documentation output folder",
          defaultValue: "<base-path>/docs",
        },
        {
          flag: "-h, --help",
          description: "Show this help text and exit",
        },
      ],
      [
        "The docs folder is removed and recreated before the README is copied into it.",
      ],
      ["build-docs", "build-docs --base-path ./integrations"]
    );
  }

  /**
   * @description Stages the README into the docs folder.
   * @summary Empty/blank answers fall back to the defaults (`cwd`, `<base-path>/README.md`,
   * `<base-path>/docs`); the docs folder is removed and recreated before the
   * README is copied in.
   * @param {LoggingConfig & typeof DefaultCommandValues & { basePath: unknown; readme: unknown; docsDir: unknown }} answers - Parsed command answers.
   * @return {Promise<void>}
   * @throws {NotFoundError} When the resolved README file does not exist.
   */
  protected async run(
    answers: LoggingConfig &
      typeof DefaultCommandValues & {
        basePath: unknown;
        readme: unknown;
        docsDir: unknown;
      }
  ): Promise<void> {
    const log = this.log.for(this.run);
    const basePath =
      typeof answers.basePath === "string" && answers.basePath.trim().length > 0
        ? answers.basePath.trim()
        : process.cwd();
    const docsDir =
      typeof answers.docsDir === "string" && answers.docsDir.trim().length > 0
        ? path.resolve(process.cwd(), answers.docsDir.trim())
        : path.join(basePath, "docs");
    const readme =
      typeof answers.readme === "string" && answers.readme.trim().length > 0
        ? path.resolve(process.cwd(), answers.readme.trim())
        : path.join(basePath, "README.md");

    if (!fs.existsSync(readme))
      throw new NotFoundError(`README not found: ${readme}`);

    // F3: never let an rmSync run against the filesystem root or the base path
    // itself — a stray --docs-dir could otherwise wipe the whole workspace.
    if (
      docsDir === path.parse(docsDir).root ||
      docsDir === path.resolve(basePath)
    ) {
      throw new ValidationError(
        `Refusing to remove docs directory "${docsDir}": it resolves to the filesystem root or the base path.`
      );
    }

    fs.rmSync(docsDir, { recursive: true, force: true });
    fs.mkdirSync(docsDir, { recursive: true });
    fs.copyFileSync(readme, path.join(docsDir, "README.md"));

    log.info(`Documentation copied to ${docsDir}`);
  }
}
