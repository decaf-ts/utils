import { Config } from "@jest/types";
import conf from "../../jest.config";

const config: Config.InitialOptions = {
  collectCoverageFrom: [
    "src/index.ts",
    "src/output/**/*.ts",
    "src/writers/**/*.ts",
    "src/utils/constants.ts",
    "src/utils/timeout.ts",
  ],
  coveragePathIgnorePatterns: [
    "/node_modules/",
    "src/cli/",
    "src/input/",
    "src/utils/fs.ts",
    "src/utils/http.ts",
    "src/utils/tests.ts",
    "src/utils/utils.ts",
  ],
  ...conf,
  collectCoverage: true,
  coverageDirectory: "./workdocs/reports/coverage",
  reporters: [
    "default",
    [
      "jest-junit",
      {
        outputDirectory: "./workdocs/reports/junit",
        outputName: "junit-report.xml",
      },
    ],
    [
      "jest-html-reporters",
      {
        publicPath: "./workdocs/reports/html",
        filename: "test-report.html",
        openReport: true,
        expand: true,
        pageTitle: "@decaf-ts/utils",
        stripSkippedTest: true,
        darkTheme: true,
        enableMergeData: true,
        dataMergeLevel: 2,
      },
    ],
  ],
  coverageThreshold: {
    global: {
      branches: 35,
      functions: 52,
      lines: 46,
      statements: 46,
    },
  },
};

export default config;
