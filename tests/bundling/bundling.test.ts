import { Dirent } from "fs";
import * as fs from "fs";
import * as path from "path";

describe("Distribution Tests", () => {
  it("reads lib", () => {
    const { Command, VERSION } = require("../../lib/index.cjs");
    expect(VERSION).toBeDefined();
    expect(Command).toBeDefined();
  });

  it("reads JS Bundle", () => {
    let distFile: Dirent[];
    try {
      distFile = fs
        .readdirSync(path.join(__dirname, "../../dist"), {
          withFileTypes: true,
        })
        .filter((d) => d.isFile() && !d.name.endsWith("esm.js"));
    } catch (e: unknown) {
      throw new Error("Error reading JS bundle: " + e);
    }

    if (distFile.length === 0)
      throw new Error("There should only be a js file in directory");

    const { Command, VERSION } = require(`../../dist/${distFile[0].name}`);
    expect(VERSION).toBeDefined();
    expect(Command).toBeDefined();
  });
});
