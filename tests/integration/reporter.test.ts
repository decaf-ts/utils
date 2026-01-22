import * as fs from "fs";
import * as path from "path";
import { runAndReport, TestReporter } from "../../src/tests";
import { MdTableDefinition } from "../../src/utils/md";
import * as fsUtils from "../../src/utils/fs";
import { StandardOutputWriter } from "../../src/index";

process.env.JEST_HTML_REPORTERS_TEMP_DIR_PATH = path.join(
  __dirname,
  "../../workdocs/reports/evidences"
);

describe("TestReporter", () => {
  let reporter: TestReporter;

  beforeEach(async () => {
    jest.clearAllMocks();

    // Create a new reporter instance for each test
    reporter = new TestReporter();

    (reporter as any).importHelpers();
  });

  it("reports", async () => {
    const reporter = new TestReporter();

    await (reporter as any).importHelpers();

    const cmd = runAndReport(
      'echo "laalla"',
      { env: { ...process.env } },
      StandardOutputWriter,
      reporter
    );

    console.log("test");

    await cmd.promise;
  });
});
