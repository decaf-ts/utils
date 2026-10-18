### Description

The Decaf Utils module is a comprehensive TypeScript utility library designed to standardize APIs across repositories and provide a robust foundation for building command-line interface (CLI) applications. The library is organized into several key components:

#### CLI Module
The CLI module provides a structured framework for creating command-line applications:
- Abstract `Command` class for implementing custom CLI commands with standardized input handling, logging, and execution flow
- Command option handling with support for common flags like verbose, version, help, etc.
- Standardized command execution flow with proper error handling

#### Input Module
The Input module offers tools for handling user input and command-line arguments:
- `UserInput` class for creating interactive prompts with various input types (text, number, confirmation, etc.)
- Support for input validation, formatting, and default values
- Command-line argument parsing with type checking and validation
- Methods for repeatedly asking for input until valid responses are received

#### Utils Module
The Utils module contains a wide range of utility functions:
- **File System Operations**: Reading, writing, copying, and deleting files and directories
- **Package Management**: Retrieving package information, managing dependencies, and version handling
- **HTTP Utilities**: Simple client for downloading files from URLs
- **Text Processing**: String interpolation, case conversion (camelCase, snake_case, etc.), and regular expression utilities
- **Environment Handling**: Working with environment variables and configuration

#### Writers Module
The Writers module provides different strategies for handling command output:
- `OutputWriter` interface defining a standard contract for output handling
- `StandardOutputWriter` for handling standard command-line output with proper logging
- `RegexpOutputWriter` for processing output with regular expressions and pattern matching

#### Output Module
The Output module offers utilities for formatting and displaying output:
- Common output formatting functions
- Banner display capabilities

#### Testing Helpers Subpath (`@decaf-ts/utils/tests`)
The `./tests` subpath packages a test-support toolkit backported verbatim from
`@decaf-ts/for-testing`, with no `utils -> testing` dependency edge (the API is copied, not
re-exported, so depending on `@decaf-ts/utils/tests` never pulls in `@decaf-ts/for-testing`):
- `it` / `it.report` — jest-analog test registration; `it.report(...)` (with `.skip`/`.only`/
  `.each`, array and tagged-table forms) reports a failing test's `message` and `cause`
  through the test-scoped reporter before rethrowing.
- `expect` — chainable, framework-agnostic assertion facade
  (`expect(actual).referredToAs(label).to.*`, with `.not` negating the next matcher), also
  available reporter-scoped as `TestReporter#expect`; assertions are proxied to the host
  runner (jest, vitest or Playwright) through framework adapters selected via
  `configure({ framework })`, the `DECAF_TEST_FRAMEWORK` environment variable or runner
  environment sniffing.
- Reporter plumbing — `setReporter` / `getReporter`,
  `ensureReporterCollectsEvidencesConfig` and `reportObjects`.
- Retrocompat helpers — `itReportsOnFailure` and `ReportExpect`, both deprecated in favor of
  `it.report` / `expect` but still fully functional.

The provider teardowns (Xray / AgileTest) and the `decaf test report` CLI remain exclusive to
`@decaf-ts/for-testing`.

This library serves as a light version of the Decaf CLI tool, providing all the essential utilities needed for building robust command-line applications with consistent input handling, output formatting, and error management.
