import path from "path";
import { Command } from "../cli/command";
import { CommandOptions } from "../cli/types";
import { ParseArgsResult } from "../input";
import { HttpClient, setPackageAttribute, writeFile } from "../utils";

const baseUrl = "https://raw.githubusercontent.com/decaf-ts/ts-workspace/master"

const options = {
  templates: [
    ".github/ISSUE_TEMPLATE/bug_report.md",
    ".github/ISSUE_TEMPLATE/feature_request.md",
    ".github/FUNDING.yml"
  ],
  workflows: [
    ".github/workflows/codeql_analysis.yml",
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
  docs : [
    "workdocs/tutorials/Contributing.md",
    "workdocs/tutorials/Documentation.md",
    "workdocs/tutorials/For Developers.md",
  ],
  styles: [
    ".prettierrc",
    ".eslint.config.js",
  ],
  scripts: [
    "bin/tag-release.sh",
    "bin/template_setup.sh",
    "bin/update-scripts.cjs",
    "bin/tag-release.cjs",
    "bin/template-setup.cjs"
  ]
}

const args = {
  all: {
    type: "boolean",
    default: true
  },
  license: {
    type: 'multiselect',
    name: 'license',
    message: 'Pick the license',
    choices: [
      { title: 'MIT', value: 'MIT' },
      { title: 'GPL', value: 'GPL' },
      { title: 'LGPL', value: 'LGPL' },
      { title: 'AGPL', value: 'AGPL' },
      { title: 'Apache', value: 'Apache' },
    ],
    default: "MIT"
  },
  scripts: {
    type: "boolean",
    default: false
  },
  styles: {
    type: "boolean",
    default: false
  },
  docs: {
    type: "boolean",
    default: false
  },
  ide: {
    type: "boolean",
    default: false
  },
  workflows: {
    type: "boolean",
    default: false
  },
  templates: {
    type: "boolean",
    default: false
  }
}

class TemplateSync extends Command<CommandOptions<typeof args>, void> {
  constructor(options: CommandOptions<typeof args>) {
    super("TemplateSync", options);
  }

  async downloadOption(key: keyof typeof options): Promise<void> {
    if (!(key in options)) {
      throw new Error(`Option "${key}" not found in options`);
    }
    const files = options[key as keyof typeof options];

    for (const file of files) {
      this.log.info(`Downloading ${file}`);

      const data = await HttpClient.downloadFile(`${baseUrl}/${file}`);
      writeFile(path.join(process.cwd(), file), data);
    }
  }

  async getLicense(license: "MIT" | "GPL" | "Apache" | "LGPL" | "AGPL"){
    this.log.info(`Downloading ${license} license`);
    const data = await HttpClient.downloadFile(`${baseUrl}/workdocs/licenses/${license}.md`);
    writeFile(path.join(process.cwd(), "LICENSE.md"), data);
    setPackageAttribute("license", license);
  }

  getIde = () => this.downloadOption("ide");
  getScripts = () => this.downloadOption("scripts");
  getStyles = () => this.downloadOption("styles");
  getTemplates = () => this.downloadOption("templates");
  getWorkflows = () => this.downloadOption("workflows");
  getDocs = () => this.downloadOption("docs");

}

new TemplateSync(args).run(async function(this: TemplateSync, args: ParseArgsResult){
  const {license} = args.values;
  let {all, scripts, styles, docs, ide, workflows, templates } = args.values;

  if (scripts || styles || docs || ide || workflows || templates)
    all = false;

  if (all){
    scripts = true;
    styles = true;
    docs = true;
    ide = true;
    workflows = true;
    templates = true;
  }
  if (license)
    await this.getLicense(license as "MIT");
  if (ide)
    await this.getIde();
  if (scripts)
    await this.getScripts();
  if (styles)
    await this.getStyles();
  if (docs)
    await this.getDocs();
  if (workflows)
    await this.getWorkflows();
  if (templates)
    await this.getTemplates();
}).then(() => TemplateSync.log.info("Template updated successfully"))
  .catch((e: unknown) => {
    TemplateSync.log.error(`Error preparing template: ${e}`);
    process.exit(1);
  });
