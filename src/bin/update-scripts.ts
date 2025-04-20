import path from "path";
import { Command } from "../cli/command";
import { CommandOptions } from "../cli/types";
import {
  getPackage,
  HttpClient,
  patchFile,
  patchString,
  runCommand,
  setPackageAttribute,
  SetupScriptKey,
  Tokens,
  writeFile,
} from "../utils";
import { LoggingConfig } from "../output";
import { DefaultCommandValues } from "../cli";
import { UserInput } from "../input";
import fs from "fs";

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
    ".idea/runConfigurations/All Tests.run.xml",
    ".idea/runConfigurations/build.run.xml",
    ".idea/runConfigurations/build_prod.run.xml",
    ".idea/runConfigurations/coverage.run.xml",
    ".idea/runConfigurations/docs.run.xml",
    ".idea/runConfigurations/drawings.run.xml",
    ".idea/runConfigurations/flash-forward.run.xml",
    ".idea/runConfigurations/Integration_Tests.run.xml",
    ".idea/runConfigurations/Bundling_Tests.run.xml",
    ".idea/runConfigurations/lint-fix.run.xml",
    ".idea/runConfigurations/test_circular.run.xml",
    ".idea/runConfigurations/uml.run.xml",
    ".idea/runConfigurations/Unit Tests.run.xml",
    ".idea/runConfigurations/update-scripts.run.xml",
  ],
  docs: [
    "workdocs/tutorials/Contributing.md",
    "workdocs/tutorials/Documentation.md",
    "workdocs/tutorials/For Developers.md",
    "workdocs/2-Badges.md",
    "workdocs/jsdocs.json",
    "workdocs/readme-md.json",
  ],
  styles: [".prettierrc", "eslint.config.js"],
  scripts: [
    "bin/tag-release.sh",
    "bin/template_setup.sh",
    "bin/update-scripts.cjs",
    "bin/tag-release.cjs",
    "bin/template-setup.cjs",
  ],
  typescript: ["tsconfig.json"],
  docker: ["Dockerfile"],
  automation: [
    "workdocs/confluence/Continuou%20Integration-Deployment/GitHub.md",
    "workdocs/confluence/Continuou%20Integration-Deployment/Jira.md",
    "workdocs/confluence/Continuou%20Integration-Deployment/Teams.md",
  ],
};

const argzz = {
  // init attributes
  boot: {
    type: "boolean",
  },
  org: {
    type: "string",
    short: "o",
  },
  name: {
    type: "string",
    short: "n",
    default: undefined,
  },
  author: {
    type: "string",
    short: "a",
    default: undefined,
  },
  // update attributes
  all: {
    type: "boolean",
  },
  license: {
    type: "string",
    message: "Pick the license",
  },
  scripts: {
    type: "boolean",
  },
  styles: {
    type: "boolean",
  },
  docs: {
    type: "boolean",
  },
  ide: {
    type: "boolean",
  },
  workflows: {
    type: "boolean",
  },
  templates: {
    type: "boolean",
  },
  typescript: {
    type: "boolean",
  },
  docker: {
    type: "boolean",
  },
  automation: {
    type: "boolean",
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
      (el) => (this.replacements[el] = (org as string) || '""')
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
      data = patchString(data, this.replacements);
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
  async getIde() {
    fs.mkdirSync(path.join(process.cwd(), ".idea", "runConfigurations"), {
      recursive: true,
    });
    await this.downloadOption("ide");
  }

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
   * @description Downloads typescript config files.
   * @returns {Promise<void>}
   */
  getTypescript = () => this.downloadOption("typescript");

  /**
   * @description Downloads automation documentation files.
   * @returns {Promise<void>}
   */
  getAutomation = () => this.downloadOption("automation");

  /**
   * @description Downloads docker image files.
   * @returns {Promise<void>}
   */
  getDocker = () => this.downloadOption("docker");

  async initPackage(pkgName: string, author: string, license: string) {
    try {
      const pkg = getPackage() as Record<string, unknown>;
      delete pkg[SetupScriptKey];
      pkg.name = pkgName;
      pkg.version = "0.0.1";
      pkg.author = author;
      pkg.license = license;
      fs.writeFileSync("package.json", JSON.stringify(pkg, null, 2));
    } catch (e: unknown) {
      throw new Error(`Error fixing package.json: ${e}`);
    }
  }

  async createTokenFiles() {
    const log = this.log.for(this.createTokenFiles);
    const gitToken = await UserInput.insistForText(
      "token",
      "please input your github token",
      (res: string) => {
        return !!res.match(/^ghp_[0-9a-zA-Z]{36}$/g);
      }
    );
    Object.values(Tokens).forEach((token) => {
      try {
        let status;
        try {
          status = fs.existsSync(token);
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
        } catch (e: unknown) {
          log.info(`Token file ${token} not found. Creating a new one...`);
          fs.writeFileSync(token, token === ".token" ? gitToken : "");
          return;
        }
        if (!status) {
          fs.writeFileSync(token, token === ".token" ? gitToken : "");
        }
      } catch (e: unknown) {
        throw new Error(`Error creating token file ${token}: ${e}`);
      }
    });
  }

  async getOrg(): Promise<string> {
    const org = await UserInput.askText(
      "Organization",
      "Enter the organization name (will be used to scope your npm project. leave blank to create a unscoped project):"
    );
    const confirmation = await UserInput.askConfirmation(
      "Confirm organization",
      "Is this organization correct?",
      true
    );
    if (!confirmation) return this.getOrg();

    return org;
  }

  async auditFix() {
    return await runCommand("npm audit fix --force").promise;
  }

  patchFiles() {
    const files = [
      ...fs
        .readdirSync(path.join(process.cwd(), "src"), {
          recursive: true,
          withFileTypes: true,
        })
        .filter((entry) => entry.isFile())
        .map((entry) => path.join(entry.parentPath, entry.name)),
      ...fs
        .readdirSync(path.join(process.cwd(), "workdocs"), {
          recursive: true,
          withFileTypes: true,
        })
        .filter((entry) => entry.isFile() && entry.name.endsWith(".md"))
        .map((entry) => path.join(entry.parentPath, entry.name)),
      path.join(process.cwd(), ".gitlab-ci.yml"),
      path.join(process.cwd(), "workdocs", "jsdocs.json"),
    ];

    for (const file of files) {
      patchFile(file as string, this.replacements);
    }
  }

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
    let { license } = args;
    const { boot } = args;
    let {
      all,
      scripts,
      styles,
      docs,
      ide,
      workflows,
      templates,
      docker,
      typescript,
      automation,
    } = args;
    if (
      scripts ||
      styles ||
      docs ||
      ide ||
      workflows ||
      templates ||
      docker ||
      typescript ||
      automation
    )
      all = false;

    if (boot) {
      const org = await this.getOrg();
      const name = await UserInput.insistForText(
        "Project name",
        "Enter the project name:",
        (res: string) => res.length > 1
      );
      const author = await UserInput.insistForText(
        "Author",
        "Enter the author name:",
        (res: string) => res.length > 1
      );
      const pkgName = org ? `@${org}/${name}` : name;

      await this.initPackage(pkgName, author, license as string);
      await this.createTokenFiles();
      await this.auditFix();
    }

    if (all) {
      scripts = true;
      styles = true;
      docs = true;
      ide = true;
      workflows = true;
      templates = true;
      docker = true;
      typescript = true;
      automation = false;
    }

    this.loadValuesFromPackage();
    if (typeof license === "undefined") {
      const confirmation = await UserInput.askConfirmation(
        "license",
        "Do you want to set a license?",
        true
      );
      if (confirmation)
        license = await UserInput.insistForText(
          "license",
          "Enter the desired License (MIT|GPL|Apache|LGPL|AGPL):",
          (val) => !!val && !!val.match(/^(MIT|GPL|Apache|LGPL|AGPL)$/g)
        );
    }

    await this.getLicense(
      license as "MIT" | "GPL" | "Apache" | "LGPL" | "AGPL"
    );

    if (typeof ide === "undefined")
      ide = await UserInput.askConfirmation(
        "ide",
        "Do you want to get ide configs?",
        true
      );

    if (ide) await this.getIde();

    if (typeof typescript === "undefined")
      typescript = await UserInput.askConfirmation(
        "typescript",
        "Do you want to get typescript configs?",
        true
      );
    if (typescript) await this.getTypescript();

    if (typeof docker === "undefined")
      docker = await UserInput.askConfirmation(
        "docker",
        "Do you want to get docker configs?",
        true
      );

    if (docker) await this.getDocker();
    if (typeof automation === "undefined")
      automation = await UserInput.askConfirmation(
        "automation",
        "Do you want to get automation configs?",
        true
      );
    if (automation) await this.getAutomation();

    if (typeof scripts === "undefined")
      scripts = await UserInput.askConfirmation(
        "scripts",
        "Do you want to get scripts?",
        true
      );

    if (scripts) await this.getScripts();
    if (typeof styles === "undefined")
      styles = await UserInput.askConfirmation(
        "styles",
        "Do you want to get styles?",
        true
      );
    if (styles) await this.getStyles();
    if (typeof docs === "undefined")
      docs = await UserInput.askConfirmation(
        "docs",
        "Do you want to get docs?",
        true
      );
    if (docs) await this.getDocs();
    if (typeof workflows === "undefined")
      workflows = await UserInput.askConfirmation(
        "workflows",
        "Do you want to get workflows?",
        true
      );
    if (workflows) await this.getWorkflows();
    if (typeof templates === "undefined")
      templates = await UserInput.askConfirmation(
        "templates",
        "Do you want to get templates?",
        true
      );
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
