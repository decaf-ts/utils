import { runCommand } from "../utils/utils";
import { NoCIFLag, SemVersion, SemVersionRegex } from "../utils/constants";
import { ParseArgsResult } from "../input/types";
import { VerbosityLogger } from "../output/types";
import { UserInput } from "../input/input";
import { CommandOptions } from "../cli/types";
import { Command } from "../cli/command";

/**
 * @description Configuration for command-line arguments.
 * @summary Defines the accepted command-line options for the script.
 */
const options = {
  ci: {
    type: "boolean",
    default: true
  },
  message: {
    type: "string",
    short: "m",
  },
  tag: {
    type: "string",
    short: "t",
    default: undefined
  }
}

class ReleaseScript extends Command<typeof options, void> {
  constructor(opts: CommandOptions<typeof options>) {
    super("ReleaseScript", opts);
  }

  /**
   * @description Prepares the version tag for the release.
   * @summary Validates and sets the version tag, prompting the user if necessary.
   *
   * @mermaid
   * sequenceDiagram
   *   participant Script
   *   participant User
   *   participant Git
   *   Script->>Script: Test initial tag
   *   alt Tag is valid
   *     Script->>Script: Use provided tag
   *   else Tag is invalid or not provided
   *     Script->>Git: List recent tags
   *     Git-->>Script: Recent tags
   *     Script->>User: Prompt for tag
   *     User-->>Script: Provide tag
   *     Script->>Script: Validate tag
   *     Script->>User: Confirm tag
   *     User-->>Script: Confirmation
   *   end
   */
  async prepareVersion(logger: VerbosityLogger, tag?: string){
    logger = logger.for(this.prepareVersion)
    tag = this.testVersion(tag as string || "", logger);
    if (!tag) {
      logger.verbose("No release message provided. Prompting for one:");
      logger.info(`Listing latest git tags:`)
      await runCommand("git tag --sort=-taggerdate | head -n 5");
      return await UserInput.insistForText("tag", "Enter the new tag number (accepts v*.*.*[-...])", (val) => !!val.toString().match(/^v[0-9]+\.[0-9]+.[0-9]+(\-[0-9a-zA-Z\-]+)?$/));
    }
  }

  /**
   * @description Validates and normalizes version strings.
   * @summary This function checks if a given version string is valid according to semantic versioning rules
   * or if it's one of the predefined increment types (patch, minor, major). It normalizes the input to lowercase.
   *
   * @param {string} version - The version string to test. Can be 'patch', 'minor', 'major', or a semver string.
   * @param {VerbosityLogger} logger
   * @return {string | undefined} The lowercase version string if valid, or undefined if invalid.
   *
   * @mermaid
   * graph TD
   *   A[Start] --> B{Is version patch, minor, or major?}
   *   B -->|Yes| C[Return lowercase version]
   *   B -->|No| D{Does version match SemVer regex?}
   *   D -->|Yes| E[Return lowercase version]
   *   D -->|No| F[Log debug message]
   *   F --> G[Return undefined]
   *   C --> H[End]
   *   E --> H
   *   G --> H
   */
  testVersion(version: string, logger: VerbosityLogger): string | undefined {
    logger = logger.for(this.testVersion);
    version = version.trim().toLowerCase()
    switch (version) {
      case SemVersion.PATCH:
      case SemVersion.MINOR:
      case SemVersion.MAJOR:
        logger.verbose(`Using provided SemVer update: ${version}`, 1);
        return version;
      default:
        logger.verbose(`Testing provided version for SemVer compatibility: ${version}`, 1);
        if (!(new RegExp(SemVersionRegex).test(version))) {
          logger.debug(`Invalid version number: ${version}`);
          return undefined;
        }
        logger.verbose(`version approved: ${version}`, 1);
        return version;
    }
  }


  /**
   * @description Prepares the release message.
   * @summary Prompts the user for a release message if not provided.
   *
   * @function prepareMessage
   */
  async prepareMessage(logger: VerbosityLogger, message?: string){
    logger = logger.for(this.prepareMessage)
    if (!message) {
      logger.verbose("No release message provided. Prompting for one");
      return await UserInput.insistForText("message", "What should be the release message/ticket?", (val) => !!val && val.toString().length > 5);
    }
  }

}

new ReleaseScript(options).run(async function (this: ReleaseScript, args: ParseArgsResult, log: VerbosityLogger) {
  let result: any;
  const {ci} = args.values;
  let {tag, message} = args.values;
  tag = await this.prepareVersion(log, tag as string);
  message = await this.prepareMessage(log, message as string);
  result = await runCommand(`npm run prepare-release -- ${tag} ${message}`, {cwd: process.cwd()});
  result = runCommand("git status --porcelain");
  await result;
  if (result.logs.length && await UserInput.askConfirmation("git-changes", "Do you want to push the changes to the remote repository?", true)) {
    await runCommand("git add .");
    await runCommand(`git commit -m "${tag} - ${message} - after release preparation${ci ? "" : NoCIFLag}"`);
  }
  await runCommand(`npm version "${tag}" -m "${message}${ci ? "" : NoCIFLag}"`);
  await runCommand("git push --follow-tags");
  if(!ci) {
    await runCommand("NPM_TOKEN=$(cat .npmtoken) npm publish --access public");
  }
}).then(() => ReleaseScript.log.info("Release pushed successfully"))
  .catch((e: unknown) => {
    ReleaseScript.log.error(`Error preparing release: ${e}`);
    process.exit(1);
  });

