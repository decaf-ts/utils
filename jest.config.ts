module.exports = {
  verbose: true,
  transform: { "^.+\\.ts?$": "ts-jest" },
  testEnvironment: "node",
  testRegex: "/tests/.*\\.(test|spec)\\.(ts|tsx)$",
  moduleFileExtensions: ["ts", "tsx", "js", "jsx", "json", "node"],
  collectCoverage: true,
  coverageDirectory: "./workdocs/coverage",
  collectCoverageFrom: ["src/**/*.{ts,jsx}"],
  coveragePathIgnorePatterns: ["src/cli.ts"],
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 100,
      lines: 80,
      statements: 90,
    },
  },
  coverageReporters: ["json-summary", "text-summary", "text", "html"],
  reporters: [
    "default",
    [
      "jest-junit",
      {
        outputDirectory: "./workdocs/resources/junit",
        outputName: "junit-report.xml",
      },
    ],
    [
      "./node_modules/jest-html-reporter",
      {
        pageTitle: "@decaf-ts/utils tests",
        outputPath: "./workdocs/resources/html/test-results.html",
      },
    ],
  ],
};
