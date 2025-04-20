import path from "path";
import fs from "fs";
import { MdTableDefinition } from "./md";
import {
  getDependencies,
  installDependencies,
  installIfNotAvailable,
} from "./fs";
import { SimpleDependencyMap } from "./types";

/**
 * @interface AddAttachParams
 * @description Parameters for adding an attachment to a report
 * @summary Interface for attachment parameters
 * @memberOf module:@decaf-ts/utils
 */
export interface AddAttachParams {
  attach: string | Buffer;
  description: string | object;
  context?: any;
  bufferFormat?: string;
}

/**
 * @interface AddMsgParams
 * @description Parameters for adding a message to a report
 * @summary Interface for message parameters
 * @memberOf module:@decaf-ts/utils
 */
export interface AddMsgParams {
  message: string | object;
  context?: any;
}

/**
 * @typedef {("json"|"image"|"text"|"md")} PayloadType
 * @description Types of payloads that can be handled
 * @summary Union type for payload types
 * @memberOf module:@decaf-ts/utils
 */
export type PayloadType = "json" | "image" | "text" | "md";

export const JestReportersTempPathEnvKey = "JEST_HTML_REPORTERS_TEMP_DIR_PATH";

const dependencies = ["jest-html-reporters", "json2md", "chartjs-node-canvas"];

async function normalizeImport<T>(importPromise: Promise<T>): Promise<T> {
  // CommonJS's `module.exports` is wrapped as `default` in ESModule.
  return importPromise.then((m: any) => (m.default || m) as T);
}

export class TestReporter {
  protected static addMsgFunction: (arg: AddMsgParams) => Promise<void>;
  protected static addAttachFunction: (arg: AddAttachParams) => Promise<void>;

  private deps?: SimpleDependencyMap;

  constructor(
    protected testCase: string = "tests",
    protected basePath = path.join(
      process.cwd(),
      "workdocs",
      "reports",
      "evidences"
    )
  ) {
    this.basePath = path.join(basePath, this.testCase);
    if (!fs.existsSync(this.basePath)) {
      fs.mkdirSync(basePath, { recursive: true });
    }
  }

  private async importHelpers(): Promise<void> {
    this.deps = await installIfNotAvailable([dependencies[0]]);
    // if (!process.env[JestReportersTempPathEnvKey])
    //   process.env[JestReportersTempPathEnvKey] = './workdocs/reports';
    const { addMsg, addAttach } = await normalizeImport(
      import(`${dependencies[0]}/helper`)
    );
    TestReporter.addMsgFunction = addMsg;
    TestReporter.addAttachFunction = addAttach;
  }

  async addReportMessage(
    title: string,
    message: string | object
  ): Promise<void> {
    if (!TestReporter.addMsgFunction) await this.importHelpers();
    const msg = `${title}${message ? `\n${message}` : ""}`;
    await TestReporter.addMsgFunction({ message: msg });
  }

  async addReportAttachment(
    title: string,
    attachment: string | Buffer
  ): Promise<void> {
    if (!TestReporter.addAttachFunction) await this.importHelpers();
    await TestReporter.addAttachFunction({
      attach: attachment,
      description: title,
    });
  }

  protected async addToReport(
    reference: string,
    data: string | number | object | Buffer,
    type: PayloadType,
    trim: boolean = false
  ) {
    try {
      let attachFunction:
        | typeof this.addReportMessage
        | typeof this.addReportAttachment = this.addReportMessage.bind(this);
      let extension: ".png" | ".txt" | ".md" | ".json" = ".txt";

      switch (type) {
        case "image":
          data = Buffer.from(data as Buffer);
          extension = ".png";
          attachFunction = this.addReportAttachment.bind(this);
          break;
        case "json":
          if (trim) {
            if ((data as { request?: unknown }).request)
              delete (data as { request?: unknown })["request"];
            if ((data as { config?: unknown }).config)
              delete (data as { config?: unknown })["config"];
          }
          extension = ".json";
          break;
        case "md":
          extension = ".md";
          break;
        case "text":
          extension = ".txt";
          break;
        default:
          console.log(`Unsupported type ${type}. assuming text`);
      }
      reference = reference.includes("\n")
        ? reference
        : `${reference}${extension}`;
      await attachFunction(reference, data as Buffer | string);
    } catch (e: unknown) {
      throw new Error(
        `Could not store attach artifact ${reference} under to test report ${this.testCase} - ${e}`
      );
    }
  }

  generatePath(step: string) {
    return path.join(this.basePath, step);
  }

  async outputPayload(
    reference: string,
    data: string | number | object,
    type: PayloadType = "json",
    trim = false
  ) {
    return this.addToReport(reference, data, type, trim);
  }

  async outputJSON(reference: string, json: object, trim = false) {
    return this.addToReport(reference, json, "json", trim);
  }

  async outputMDTable(reference: string, tableDef: MdTableDefinition) {
    this.deps = await installIfNotAvailable([dependencies[1]]);
    let txt: string;
    try {
      const json2md = await normalizeImport(import(`${dependencies[1]}`));
      txt = json2md(tableDef);
    } catch (e: unknown) {
      throw new Error(`Could not convert JSON to Markdown - ${e}`);
    }

    return this.addToReport(reference, txt, "md");
  }

  async outputGraph(reference: string, config: any) {
    this.deps = await installIfNotAvailable([dependencies[2]]);
    const { ChartJSNodeCanvas } = await normalizeImport(
      import("chartjs-node-canvas")
    );

    const width = 600; //px
    const height = 800; //px
    const backgroundColour = "white"; // Uses https://www.w3schools.com/tags/canvas_fillstyle.asp
    const chartJSNodeCanvas = new ChartJSNodeCanvas({
      width,
      height,
      backgroundColour,
    });

    const image = await chartJSNodeCanvas.renderToBuffer(config);
    return await this.outputImage(reference, image);
  }

  async outputImage(reference: string, buffer: Buffer) {
    return this.addToReport(reference, buffer, "image");
  }
}
