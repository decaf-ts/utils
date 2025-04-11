import fs from "fs";
import { Encoding, SetupScriptKey, Tokens } from "../utils/constants";
import {
  patchFile,
  pushToGit,
  updateDependencies,
  writeFile,
} from "../utils/fs";
import { Command } from "../cli/command";
import { CommandOptions } from "../cli/types";
import { HttpClient, patchString, runCommand } from "../utils";
import path from "path";
import { LoggingConfig } from "../output";
import { DefaultCommandValues } from "../cli";
import { UserInput } from "../input/input";

const baseUrl =
  "https://raw.githubusercontent.com/decaf-ts/ts-workspace/master";

const options = {
  org: {
    type: "string",
    short: "o",
    default: "decaf-ts",
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
  license: {
    type: "string",
    message: "Choose a license",
    default: "MIT",
  },
};

class TemplateSetupScript extends Command<
  CommandOptions<typeof options>,
  void
> {
  private replacements: Record<string, string | number> = {};

  constructor() {
    super("TemplateSetupScript", options);
  }

  async fixPackage(pkgName: string, author: string, license: string) {
    try {
      const pkg = JSON.parse(fs.readFileSync("package.json", Encoding));
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
    Object.values(Tokens).forEach((token) => {
      try {
        let status;
        try {
          status = fs.existsSync(token);
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
        } catch (e: unknown) {
          log.info(`Token file ${token} not found. Creating a new one...`);
          fs.writeFileSync(token, "");
          return;
        }
        if (!status) {
          fs.writeFileSync(token, "");
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
    if (!confirmation) {
      return this.getOrg();
    }
    return org;
  }

  async getLicense(license: string): Promise<void> {
    this.log.info(`Downloading license ${license}`);
    let data = await HttpClient.downloadFile(
      `${baseUrl}/workdocs/licenses/${license}.md`
    );
    data = patchString(data, this.replacements);
    writeFile(path.join(process.cwd(), "LICENSE.md"), data);
  }

  patchFiles() {
    const files = [
      ...fs.readdirSync(path.join(process.cwd(), "src"), {
        recursive: true,
        withFileTypes: true,
      }),
      ...fs.readdirSync(path.join(process.cwd(), "workdocs"), {
        recursive: true,
        withFileTypes: true,
      }),
      ".gitlab-ci.yml",
      "jsdocs.json",
    ];

    for (const file of files) {
      patchFile(path.join(process.cwd(), file as string), this.replacements);
    }
  }

  async auditFix() {
    return await runCommand("npm audit fix --force").promise;
  }

  async run(
    args: LoggingConfig &
      typeof DefaultCommandValues & { [k in keyof typeof options]: unknown }
  ): Promise<void> {
    let { org, name, author, license } = args;
    if (!org) org = await this.getOrg();

    if (!name)
      name = await UserInput.insistForText(
        "name",
        "Enter the name of your project:",
        (val) => !!val && val.toString().length > 3
      );

    if (!author)
      author = await UserInput.insistForText(
        "author",
        "Enter the name of the project's author:",
        (val) => !!val && val.toString().length > 3
      );

    if (!license) license = "MIT";

    const pkgName = org ? `@${org}/${name}` : name;

    await this.fixPackage(
      pkgName as string,
      author as string,
      license as string
    );

    this.replacements = {
      "decaf-ts/ts-workspace": `${org ? `${org}/` : ""}${name}`,
      "decaf-ts": `${org || name}`,
      "${org}": `${org || name}`,
      "${org_or_author}": `${org || author}`,
      "${name}": name as string,
      "ts-workspace": name as string,
      "TS-workspace": name as string,
      "${author}": author as string,
      "Tiago Venceslau": author as string,
      TiagoVenceslau: author as string,
    };

    await this.createTokenFiles();
    if (license) await this.getLicense(license as string);
    this.patchFiles();
    await updateDependencies();
    await this.auditFix();
    await pushToGit();
  }
}

new TemplateSetupScript()
  .execute()
  .then(() => TemplateSetupScript.log.info("Template updated successfully"))
  .catch((e: unknown) => {
    TemplateSetupScript.log.error(`Error preparing template: ${e}`);
    process.exit(1);
  });
