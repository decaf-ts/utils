import path from "path";
import { Command } from "../cli/command";
import { CommandOptions } from "../cli/types";
import {
  getPackage,
  HttpClient,
  patchPlaceholders,
  patchString,
  setPackageAttribute,
  writeFile,
} from "../utils";
import { LoggingConfig } from "../output";
import { DefaultCommandValues } from "../cli";

const baseUrl =
  "https://raw.githubusercontent.com/decaf-ts/ts-workspace/master";

const options = {
  templates: [
    ".github/ISSUE_TEMPLATE/bug_report.md",
    ".github/ISSUE_TEMPLATE/feature_request.md",
    ".github/FUNDING.yml",
  ],
  workflows: [
    ".github/workflows/codeql-analysis.yml",
    ".github/workflows/jest-coverage.yaml",
    ".github/workflows/nodejs-build-prod.yaml",
    ".github/workflows/pages.yaml",
    ".github/workflows/publish-on-release.yaml",
    ".github/workflows/release-on-tag.yaml",
    ".github/workflows/snyk-analysis.yaml",
  ],
  ide: [
    ".run/All Tests.run.xml",
    ".run/build.run.xml",
    ".run/build_prod.run.xml",
    ".run/coverage.run.xml",
    ".run/docs.run.xml",
    ".run/drawings.run.xml",
    ".run/flash-forward.run.xml",
    ".run/Integration Tests.run.xml",
    ".run/lint-fix.run.xml",
    ".run/test_circular.run.xml",
    ".run/uml.run.xml",
    ".run/Unit Tests.run.xml",
    ".run/update-scripts.run.xml",
  ],
  docs: [
    "workdocs/tutorials/Contributing.md",
    "workdocs/tutorials/Documentation.md",
    "workdocs/tutorials/For Developers.md",
  ],
  styles: [".prettierrc", "eslint.config.js"],
  scripts: [
    "bin/tag-release.sh",
    "bin/template_setup.sh",
    "bin/update-scripts.cjs",
    "bin/tag-release.cjs",
    "bin/template-setup.cjs",
  ],
};

const argzz = {
  all: {
    type: "boolean",
    default: true,
  },
  license: {
    type: "string",
    message: "Pick the license",
    default: "MIT",
  },
  scripts: {
    type: "boolean",
    default: false,
  },
  styles: {
    type: "boolean",
    default: false,
  },
  docs: {
    type: "boolean",
    default: false,
  },
  ide: {
    type: "boolean",
    default: false,
  },
  workflows: {
    type: "boolean",
    default: false,
  },
  templates: {
    type: "boolean",
    default: false,
  },
};

/**
 * @class TemplateSync
 * @extends {Command<CommandOptions<typeof args>, void>}
 * @category scripts
 * @description A command-line tool for synchronizing project templates and configurations.
 * @summary This class provides functionality to download and update various project files and configurations from a remote repository.
 * It supports updating licenses, IDE configurations, scripts, styles, documentation, workflows, and templates.
 *
 * @param {CommandOptions<typeof args>} args - The command options for TemplateSync
 */
class TemplateSync extends Command<CommandOptions<typeof argzz>, void> {
  private replacements: Record<string, string | number> = {};

  constructor() {
    super("TemplateSync", argzz);
  }

  private loadValuesFromPackage() {
    const p = process.cwd();
    const author = getPackage(p, "author") as string;
    const scopedName = getPackage(p, "name");
    let name: string = scopedName as string;
    let org: string | undefined;
    if (name.startsWith("@")) {
      const split = name.split("/");
      name = split[1];
      org = split[0].replace("@", "");
    }
    ["Tiago Venceslau", "TiagoVenceslau", "${author}"].forEach(
      (el) => (this.replacements[el] = author)
    );
    ["TS-Workspace", "ts-workspace", "${name}"].forEach(
      (el) => (this.replacements[el] = name)
    );
    ["decaf-ts", "${org}"].forEach(
      (el) => (this.replacements[el] = org as string)
    );
    this.replacements["${org_or_owner}"] = org || name;
  }

  /**
   * @description Downloads files for a specific option category.
   * @summary This method downloads all files associated with a given option key from the remote repository.
   * @param {keyof typeof options} key - The key representing the option category to download
   * @returns {Promise<void>}
   * @throws {Error} If the specified option key is not found
   */
  async downloadOption(key: keyof typeof options): Promise<void> {
    if (!(key in options)) {
      throw new Error(`Option "${key}" not found in options`);
    }
    const files = options[key as keyof typeof options];

    for (const file of files) {
      this.log.info(`Downloading ${file}`);

      let data = await HttpClient.downloadFile(`${baseUrl}/${file}`);
      data = patchPlaceholders(data, this.replacements);
      writeFile(path.join(process.cwd(), file), data);
    }
  }

  /**
   * @description Downloads and sets up the specified license.
   * @summary This method downloads the chosen license file, saves it to the project, and updates the package.json license field.
   * @param {"MIT" | "GPL" | "Apache" | "LGPL" | "AGPL"} license - The license to download and set up
   * @returns {Promise<void>}
   */
  async getLicense(license: "MIT" | "GPL" | "Apache" | "LGPL" | "AGPL") {
    this.log.info(`Downloading ${license} license`);
    const url = `${baseUrl}/workdocs/licenses/${license}.md`;
    let data = await HttpClient.downloadFile(url);
    data = patchString(data, this.replacements);
    writeFile(path.join(process.cwd(), "LICENSE.md"), data);
    setPackageAttribute("license", license);
  }

  /**
   * @description Downloads IDE configuration files.
   * @returns {Promise<void>}
   */
  getIde = () => this.downloadOption("ide");

  /**
   * @description Downloads script files.
   * @returns {Promise<void>}
   */
  getScripts = () => this.downloadOption("scripts");

  /**
   * @description Downloads style configuration files.
   * @returns {Promise<void>}
   */
  getStyles = () => this.downloadOption("styles");

  /**
   * @description Downloads template files.
   * @returns {Promise<void>}
   */
  getTemplates = () => this.downloadOption("templates");

  /**
   * @description Downloads workflow configuration files.
   * @returns {Promise<void>}
   */
  getWorkflows = () => this.downloadOption("workflows");

  /**
   * @description Downloads documentation files.
   * @returns {Promise<void>}
   */
  getDocs = () => this.downloadOption("docs");

  /**
   * @description Runs the template synchronization process.
   * @summary This method orchestrates the downloading of various project components based on the provided arguments.
   * @param {ParseArgsResult} args - The parsed command-line arguments
   * @returns {Promise<void>}
   *
   * @mermaid
   * sequenceDiagram
   *   participant T as TemplateSync
   *   participant L as getLicense
   *   participant I as getIde
   *   participant S as getScripts
   *   participant St as getStyles
   *   participant D as getDocs
   *   participant W as getWorkflows
   *   participant Te as getTemplates
   *   T->>T: Parse arguments
   *   alt all flag is true
   *     T->>T: Set all component flags to true
   *   end
   *   alt license is specified
   *     T->>L: getLicense(license)
   *   end
   *   alt ide flag is true
   *     T->>I: getIde()
   *   end
   *   alt scripts flag is true
   *     T->>S: getScripts()
   *   end
   *   alt styles flag is true
   *     T->>St: getStyles()
   *   end
   *   alt docs flag is true
   *     T->>D: getDocs()
   *   end
   *   alt workflows flag is true
   *     T->>W: getWorkflows()
   *   end
   *   alt templates flag is true
   *     T->>Te: getTemplates()
   *   end
   */
  async run(
    args: LoggingConfig &
      typeof DefaultCommandValues & { [k in keyof typeof argzz]: unknown }
  ) {
    const { license } = args;
    let { all, scripts, styles, docs, ide, workflows, templates } = args;

    if (scripts || styles || docs || ide || workflows || templates) all = false;

    if (all) {
      scripts = true;
      styles = true;
      docs = true;
      ide = true;
      workflows = true;
      templates = true;
    }
    this.loadValuesFromPackage();
    if (license) await this.getLicense(license as "MIT");
    if (ide) await this.getIde();
    if (scripts) await this.getScripts();
    if (styles) await this.getStyles();
    if (docs) await this.getDocs();
    if (workflows) await this.getWorkflows();
    if (templates) await this.getTemplates();
  }
}

new TemplateSync()
  .execute()
  .then(() => TemplateSync.log.info("Template updated successfully"))
  .catch((e: unknown) => {
    TemplateSync.log.error(`Error preparing template: ${e}`);
    process.exit(1);
  });
