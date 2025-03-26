module.exports = {
  verbose: true,
  transform: { "^.+\\.ts?$": "ts-jest", },
  testEnvironment: "node",
  testRegex: "/tests/.*\\.(test|spec)\\.(ts|tsx)$",
  moduleFileExtensions: ["ts", "tsx", "js", "jsx", "json", "node",],
  collectCoverage: true,
  coverageDirectory: "./workdocs/coverage",
  collectCoverageFrom: ["src/**/*.{ts,jsx}",],
  coveragePathIgnorePatterns: ["src/cli.ts",],
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 100,
      lines: 80,
      statements: 90,
    },
  },
  coverageReporters: ["json-summary", "text-summary", "text", "html",],
  reporters: [
    "default",
    [
      "jest-junit",
      {
        outputDirectory: "./workdocs/resources/reports/junit",
        outputName: "junit-report.xml",
      },
    ],
    ["./node_modules/jest-html-reporter", {
      "pageTitle": "ts-workspace tests",
      "outputPath": "./workdocs/reports/html/test-results.html"
    }]
  ],
};
