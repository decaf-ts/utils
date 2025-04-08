import { runCommand } from "../utils/utils";
import { NoCIFLag, SemVersion, SemVersionRegex } from "../utils/constants";
import { ParseArgsResult } from "../input/types";
import { UserInput } from "../input/input";
import { Command } from "../cli/command";

const options = {
  ci: {
    type: "boolean",
    default: true,
  },
  message: {
    type: "string",
    short: "m",
  },
  tag: {
    type: "string",
    short: "t",
    default: undefined,
  },
};

/**
 * @class ReleaseScript
 * @extends {Command<typeof options, void>}
 * @cavegory scripts
 * @description A command-line script for managing releases and version updates.
 * @summary This script automates the process of creating and pushing new releases. It handles version updates,
 * commit messages, and optionally publishes to NPM. The script supports semantic versioning and can work in both CI and non-CI environments.
 *
 * @param {Object} options - Configuration options for the script
 * @param {boolean} options.ci - Whether the script is running in a CI environment (default: true)
 * @param {string} options.message - The release message (short: 'm')
 * @param {string} options.tag - The version tag to use (short: 't', default: undefined)
 */
class ReleaseScript extends Command<typeof options, void> {
  constructor() {
    super("ReleaseScript", options);
  }

  /**
   * @description Prepares the version for the release.
   * @summary This method validates the provided tag or prompts the user for a new one if not provided or invalid.
   * It also displays the latest git tags for reference.
   * @param {string} tag - The version tag to prepare
   * @returns {Promise<string>} The prepared version tag
   *
   * @mermaid
   * sequenceDiagram
   *   participant R as ReleaseScript
   *   participant T as TestVersion
   *   participant U as UserInput
   *   participant G as Git
   *   R->>T: testVersion(tag)
   *   alt tag is valid
   *     T-->>R: return tag
   *   else tag is invalid or not provided
   *     R->>G: List latest git tags
   *     R->>U: Prompt for new tag
   *     U-->>R: return new tag
   *   end
   */
  async prepareVersion(tag?: string): Promise<string> {
    const log = this.log.for(this.prepareVersion);
    tag = this.testVersion((tag as string) || "");
    if (!tag) {
      log.verbose("No release message provided. Prompting for one:");
      log.info(`Listing latest git tags:`);
      await runCommand("git tag --sort=-taggerdate | head -n 5").promise;
      return await UserInput.insistForText(
        "tag",
        "Enter the new tag number (accepts v*.*.*[-...])",
        (val) =>
          !!val.toString().match(/^v[0-9]+\.[0-9]+.[0-9]+(-[0-9a-zA-Z-]+)?$/)
      );
    }
    return tag;
  }

  /**
   * @description Tests if the provided version is valid.
   * @summary This method checks if the version is a valid semantic version or a predefined update type (PATCH, MINOR, MAJOR).
   * @param {string} version - The version to test
   * @returns {string | undefined} The validated version or undefined if invalid
   */
  testVersion(version: string): string | undefined {
    const log = this.log.for(this.testVersion);
    version = version.trim().toLowerCase();
    switch (version) {
      case SemVersion.PATCH:
      case SemVersion.MINOR:
      case SemVersion.MAJOR:
        log.verbose(`Using provided SemVer update: ${version}`, 1);
        return version;
      default:
        log.verbose(
          `Testing provided version for SemVer compatibility: ${version}`,
          1
        );
        if (!new RegExp(SemVersionRegex).test(version)) {
          log.debug(`Invalid version number: ${version}`);
          return undefined;
        }
        log.verbose(`version approved: ${version}`, 1);
        return version;
    }
  }

  /**
   * @description Prepares the release message.
   * @summary This method either returns the provided message or prompts the user for a new one if not provided.
   * @param {string} [message] - The release message
   * @returns {Promise<string>} The prepared release message
   */
  async prepareMessage(message?: string) {
    const log = this.log.for(this.prepareMessage);
    if (!message) {
      log.verbose("No release message provided. Prompting for one");
      return await UserInput.insistForText(
        "message",
        "What should be the release message/ticket?",
        (val) => !!val && val.toString().length > 5
      );
    }
    return message;
  }

  /**
   * @description Runs the release script.
   * @summary This method orchestrates the entire release process, including version preparation, message creation,
   * git operations, and npm publishing (if not in CI environment).
   * @param {ParseArgsResult} args - The parsed command-line arguments
   * @returns {Promise<void>}
   *
   * @mermaid
   * sequenceDiagram
   *   participant R as ReleaseScript
   *   participant V as PrepareVersion
   *   participant M as PrepareMessage
   *   participant N as NPM
   *   participant G as Git
   *   participant U as UserInput
   *   R->>V: prepareVersion(tag)
   *   R->>M: prepareMessage(message)
   *   R->>N: Run prepare-release script
   *   R->>G: Check git status
   *   alt changes exist
   *     R->>U: Ask for confirmation
   *     U-->>R: Confirm
   *     R->>G: Add and commit changes
   *   end
   *   R->>N: Update npm version
   *   R->>G: Push changes and tags
   *   alt not CI environment
   *     R->>N: Publish to npm
   *   end
   */
  async run(args: ParseArgsResult): Promise<void> {
    let result: any;
    const { ci } = args.values;
    let { tag, message } = args.values;
    tag = await this.prepareVersion(tag as string);
    message = await this.prepareMessage(message as string);
    result = await runCommand(`npm run prepare-release -- ${tag} ${message}`, {
      cwd: process.cwd(),
    }).promise;
    result = await runCommand("git status --porcelain").promise;
    await result;
    if (
      result.logs.length &&
      (await UserInput.askConfirmation(
        "git-changes",
        "Do you want to push the changes to the remote repository?",
        true
      ))
    ) {
      await runCommand("git add .").promise;
      await runCommand(
        `git commit -m "${tag} - ${message} - after release preparation${ci ? "" : NoCIFLag}"`
      ).promise;
    }
    await runCommand(
      `npm version "${tag}" -m "${message}${ci ? "" : NoCIFLag}"`
    ).promise;
    await runCommand("git push --follow-tags").promise;
    if (!ci) {
      await runCommand("NPM_TOKEN=$(cat .npmtoken) npm publish --access public")
        .promise;
    }
  }
}

new ReleaseScript()
  .execute()
  .then(() => ReleaseScript.log.info("Release pushed successfully"))
  .catch((e: unknown) => {
    ReleaseScript.log.error(`Error preparing release: ${e}`);
    process.exit(1);
  });
