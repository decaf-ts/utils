![Banner](./workdocs/assets/decaf-logo.svg)

## Decaf's Utils Module

A comprehensive TypeScript utility library providing robust tools for command-line interfaces, input handling, output management, file system operations, HTTP requests, text processing, and more. This module serves as a foundation for building powerful CLI applications with standardized input parsing, flexible output formatting, and a rich set of utility functions.


![Licence](https://img.shields.io/github/license/decaf-ts/utils.svg?style=plastic)
![GitHub language count](https://img.shields.io/github/languages/count/decaf-ts/utils?style=plastic)
![GitHub top language](https://img.shields.io/github/languages/top/decaf-ts/utils?style=plastic)

[![Build & Test](https://github.com/decaf-ts/utils/actions/workflows/nodejs-build-prod.yaml/badge.svg)](https://github.com/decaf-ts/utils/actions/workflows/nodejs-build-prod.yaml)
[![CodeQL](https://github.com/decaf-ts/utils/actions/workflows/codeql-analysis.yml/badge.svg)](https://github.com/decaf-ts/utils/actions/workflows/codeql-analysis.yml)[![Snyk Analysis](https://github.com/decaf-ts/utils/actions/workflows/snyk-analysis.yaml/badge.svg)](https://github.com/decaf-ts/utils/actions/workflows/snyk-analysis.yaml)
[![Pages builder](https://github.com/decaf-ts/utils/actions/workflows/pages.yaml/badge.svg)](https://github.com/decaf-ts/utils/actions/workflows/pages.yaml)
[![.github/workflows/release-on-tag.yaml](https://github.com/decaf-ts/utils/actions/workflows/release-on-tag.yaml/badge.svg?event=release)](https://github.com/decaf-ts/utils/actions/workflows/release-on-tag.yaml)

![Open Issues](https://img.shields.io/github/issues/decaf-ts/utils.svg)
![Closed Issues](https://img.shields.io/github/issues-closed/decaf-ts/utils.svg)
![Pull Requests](https://img.shields.io/github/issues-pr-closed/decaf-ts/utils.svg)
![Maintained](https://img.shields.io/badge/Maintained%3F-yes-green.svg)

![Forks](https://img.shields.io/github/forks/decaf-ts/utils.svg)
![Stars](https://img.shields.io/github/stars/decaf-ts/utils.svg)
![Watchers](https://img.shields.io/github/watchers/decaf-ts/utils.svg)

![Node Version](https://img.shields.io/badge/dynamic/json.svg?url=https%3A%2F%2Fraw.githubusercontent.com%2Fbadges%2Fshields%2Fmaster%2Fpackage.json&label=Node&query=$.engines.node&colorB=blue)
![NPM Version](https://img.shields.io/badge/dynamic/json.svg?url=https%3A%2F%2Fraw.githubusercontent.com%2Fbadges%2Fshields%2Fmaster%2Fpackage.json&label=NPM&query=$.engines.npm&colorB=purple)

Documentation available [here](https://decaf-ts.github.io/utils/)

Minimal size: 187.3 KB kb gzipped

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


### How to Use

- [Initial Setup](./tutorials/For%20Developers.md#_initial-setup_)
- [Installation](./tutorials/For%20Developers.md#installation)

## Examples

### CLI Module

#### Creating a Custom Command

The Command class provides a foundation for creating custom CLI commands with standardized input handling and execution flow.

```typescript
import { Command, CommandOptions } from '@decaf-ts/utils';

// Define input options interface
interface MyCommandOptions {
  filename: string;
  dryRun: boolean;
}

// Create a custom command class
class MyCommand extends Command<MyCommandOptions, string> {
  constructor() {
    // Define command options with their configurations
    const options: CommandOptions<MyCommandOptions> = {
      filename: {
        type: 'string',
        short: 'f',
        default: 'output.txt'
      },
      dryRun: {
        type: 'boolean',
        short: 'd',
        default: false
      }
    };

    super('my-command', options);
  }

  // Override the help method to provide custom help information
  protected help(): void {
    this.log.info(`
      Usage: my-command [options]

      Options:
        -f, --filename  Specify output filename (default: output.txt)
        -d, --dryRun    Run without making changes (default: false)
        -h, --help      Show help information
        -v, --version   Show version information
    `);
  }

  // Implement the run method to define command behavior
  protected async run(answers: { filename: string; dryRun: boolean }): Promise<string> {
    this.log.info(`Running command with filename: ${answers.filename}, dryRun: ${answers.dryRun}`);

    // Command implementation here

    return 'Command executed successfully';
  }
}

// Execute the command
async function main() {
  const command = new MyCommand();
  const result = await command.execute();
  console.log(result);
}

main().catch(console.error);
```

#### Managing Secrets with the Credentials Command

The `CredentialsCommand` provides a secure, cross-platform way to manage tokens
and other secrets used by release scripts, CI pipelines, and local development.
It replaces the old approach of storing tokens in plaintext files (`.npmtoken`,
`.token`, `.confluence-token`) with OS keychain storage while preserving
backwards compatibility.

**Resolution order** (checked in this order for `get` / `resolveSecret()`):

1. **Environment variable** — highest priority; this is what CI uses
2. **OS keychain** — macOS Keychain, Linux libsecret, Linux Python keyring, Windows Credential Manager
3. **Legacy plaintext file** — deprecated fallback with a warning

**Built-in secrets:**

| Name       | Env var               | Keychain service        | Account  | Legacy file         |
|------------|-----------------------|-------------------------|----------|---------------------|
| `npm`      | `NPM_TOKEN`           | `decaf-ts:npm`          | publish  | `.npmtoken`         |
| `github`   | `GH_TOKEN`            | `decaf-ts:github`       | git      | `.token`            |
| `confluence`| `ATLASSIAN_API_TOKEN`| `decaf-ts:confluence`   | api      | `.confluence-token` |

Custom secret names are also supported — the env var defaults to
`<NAME>_TOKEN`, the service to `decaf-ts:<name>`, and the legacy file to
`.<name>-token`.

##### CLI usage (standalone)

```sh
# Resolve the npm publish token (prints to stdout, no trailing newline)
credentials --action get --name npm

# Resolve the github token using a non-default env var name
credentials --action get --name github --envVar GH_PAT

# Store a secret in the OS keychain
credentials --action store --name github --value ghp_xxxxxxxxxxxx

# Store a custom secret with fully overridden metadata
credentials --action store --name my-api \
  --envVar MY_API_TOKEN \
  --service "my-app:api" \
  --account "ci" \
  --value "sk_live_xxx"

# Interactive one-time setup (prompts for all built-in secrets, configures git helper)
credentials --action setup

# Setup and auto-delete legacy plaintext token files (.npmtoken, .token, .confluence-token)
credentials --action setup --rm

# Configure only the git credential helper (no secret enrollment)
credentials --action git-helper

# Use in a shell pipeline (e.g., set npm auth for publish)
npm config set //registry.npmjs.org/:_authToken "$(credentials --action get --name npm)"
```

##### CLI usage (via decaf CLI)

```sh
# All subcommands are also available under the decaf CLI
decaf utils credentials get --name npm
decaf utils credentials store --name github --value ghp_xxxxxxxxxxxx
decaf utils credentials setup
decaf utils credentials setup --rm   # auto-deletes legacy token files
decaf utils credentials git-helper

# View help for any subcommand
decaf utils credentials --help
decaf utils credentials get --help
```

##### CI usage (GitHub Actions / GitLab CI)

No keychain access is needed in CI — simply set the environment variable as a
secret and `resolveSecret()` picks it up immediately:

```yaml
# .github/workflows/release.yml
- name: Publish to npm
  env:
    NPM_TOKEN: ${{ secrets.NPM_TOKEN }}
  run: |
    npm config set //registry.npmjs.org/:_authToken "$NPM_TOKEN"
    npm publish
```

The release scripts (`tag-release`, `npm publish`, `git push`) call
`resolveSecret("npm")` and `resolveSecret("github")` internally, so they
automatically prefer env vars in CI and the keychain locally.

##### Programmatic usage (TypeScript)

```typescript
import { resolveSecret, hasSecret } from '@decaf-ts/utils';

// Resolves using the same order: env var -> keychain -> legacy file
// Throws if no source provides a value.
const token = resolveSecret('npm');

// Non-throwing check
if (hasSecret('github')) {
  const ghToken = resolveSecret('github');
}

// Custom secret with overrides
const apiKey = resolveSecret('my-api', {
  envVar: 'MY_API_TOKEN',
  service: 'my-app:api',
  account: 'ci',
  legacyFile: '.my-api-token',
});
```

##### Local setup walkthrough

```sh
# 1. Run interactive setup with --rm (enrolls npm, github, confluence in the keychain
#    and auto-deletes legacy plaintext files)
credentials --action setup --rm

# 2. Verify resolution works
credentials --action get --name npm    # should print the token
credentials --action get --name github # should print the token

# 3. Future release scripts will now use the keychain automatically
```

### Input Module

#### Creating Interactive Prompts

The UserInput class allows you to create interactive prompts for collecting user input.

```typescript
import { UserInput } from '@decaf-ts/utils';

async function collectUserInfo() {
  // Create a text input for name
  const nameInput = new UserInput('name')
    .setMessage('What is your name?')
    .setInitial('User');

  // Create a number input for age with validation
  const ageInput = new UserInput('age')
    .setType('number')
    .setMessage('How old are you?')
    .setMin(0)
    .setMax(120)
    .setValidate(value => {
      if (value < 18) return 'You must be at least 18 years old';
      return true;
    });

  // Create a confirmation input
  const confirmInput = new UserInput('confirm')
    .setType('confirm')
    .setMessage('Is this information correct?')
    .setInitial(true);

  // Ask for all inputs and get the answers
  const answers = await UserInput.ask([nameInput, ageInput, confirmInput]);

  console.log(`Hello ${answers.name}, you are ${answers.age} years old.`);
  console.log(`Information confirmed: ${answers.confirm ? 'Yes' : 'No'}`);

  return answers;
}

collectUserInfo().catch(console.error);
```

#### Using Convenience Methods for Input

UserInput provides static convenience methods for common input scenarios.

```typescript
import { UserInput } from '@decaf-ts/utils';

async function quickInputExample() {
  // Ask for text input
  const name = await UserInput.askText('name', 'What is your name?', undefined, 'User');

  // Ask for number input
  const age = await UserInput.askNumber('age', 'How old are you?', 0, 120);

  // Ask for confirmation
  const confirm = await UserInput.askConfirmation('confirm', 'Is this information correct?', true);

  // Ask for text with validation and retry until valid
  const email = await UserInput.insistForText(
    'email',
    'What is your email address?',
    (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value),
    undefined,
    undefined,
    false,
    3 // Maximum 3 attempts
  );

  console.log(`Name: ${name}, Age: ${age}, Email: ${email}, Confirmed: ${confirm}`);
}

quickInputExample().catch(console.error);
```

#### Parsing Command-Line Arguments

```typescript
import { UserInput, ParseArgsOptionsConfig } from '@decaf-ts/utils';

// Define command-line options
const options: ParseArgsOptionsConfig = {
  verbose: {
    type: 'boolean',
    short: 'V',
    default: false
  },
  output: {
    type: 'string',
    short: 'o',
    default: 'output.txt'
  },
  count: {
    type: 'string',
    short: 'c',
    default: '10'
  }
};

// Parse command-line arguments
const args = UserInput.parseArgs(options);

console.log('Parsed arguments:', args.values);
console.log('Positional arguments:', args.positionals);
```

### Utils Module

#### File System Operations

```typescript
import { 
  readFile, 
  writeFile, 
  patchFile, 
  getAllFiles, 
  copyFile, 
  renameFile, 
  deletePath 
} from '@decaf-ts/utils';

// Read a file
const content = readFile('./config.json');
console.log('File content:', content);

// Write to a file
writeFile('./output.txt', 'Hello, world!');

// Patch a file with replacements
patchFile('./template.txt', {
  '{{name}}': 'John Doe',
  '{{date}}': new Date().toISOString()
});

// Get all files in a directory
const files = getAllFiles('./src', (file) => file.endsWith('.ts'));
console.log('TypeScript files:', files);

// Copy a file
copyFile('./source.txt', './destination.txt');

// Rename a file
renameFile('./old-name.txt', './new-name.txt');

// Delete a file or directory
deletePath('./temp');
```

#### Package Management

```typescript
import { 
  getPackage, 
  getPackageVersion, 
  setPackageAttribute, 
  getDependencies, 
  installDependencies 
} from '@decaf-ts/utils';

// Get package information
const pkg = getPackage();
console.log('Package:', pkg);

// Get package version
const version = getPackageVersion();
console.log('Version:', version);

// Set a package attribute
setPackageAttribute('version', '1.0.1');

// Get dependencies
async function manageDependencies() {
  const deps = await getDependencies();
  console.log('Production dependencies:', deps.prod);
  console.log('Development dependencies:', deps.dev);
  console.log('Peer dependencies:', deps.peer);

  // Install dependencies
  await installDependencies({
    prod: ['lodash', 'axios'],
    dev: ['typescript', 'jest']
  });
}

manageDependencies().catch(console.error);
```

#### HTTP Utilities

```typescript
import { HttpClient } from '@decaf-ts/utils';

async function downloadExample() {
  try {
    // Download a file from a URL
    const content = await HttpClient.downloadFile('https://example.com/api/data.json');
    console.log('Downloaded content:', content);

    // Parse JSON content
    const data = JSON.parse(content);
    console.log('Parsed data:', data);

    return data;
  } catch (error) {
    console.error('Download failed:', error);
    throw error;
  }
}

downloadExample().catch(console.error);
```

#### Text Processing

```typescript
import { 
  padEnd, 
  patchPlaceholders, 
  patchString, 
  toCamelCase, 
  toSnakeCase, 
  toKebabCase, 
  toPascalCase, 
  toENVFormat 
} from '@decaf-ts/utils';

// Pad a string
const padded = padEnd('Hello', 10, '-');
console.log(padded); // 'Hello-----'

// Replace placeholders
const template = 'Hello, ${name}! Today is ${day}.';
const filled = patchPlaceholders(template, {
  name: 'Alice',
  day: 'Monday'
});
console.log(filled); // 'Hello, Alice! Today is Monday.'

// Replace strings
const patched = patchString('Hello, world!', {
  'world': 'universe'
});
console.log(patched); // 'Hello, universe!'

// Case conversion
const text = 'hello world';
console.log(toCamelCase(text));   // 'helloWorld'
console.log(toSnakeCase(text));   // 'hello_world'
console.log(toKebabCase(text));   // 'hello-world'
console.log(toPascalCase(text));  // 'HelloWorld'
console.log(toENVFormat(text));   // 'HELLO_WORLD'
```

### Testing Helpers (`@decaf-ts/utils/tests`)

The `@decaf-ts/utils/tests` subpath packages a test-support toolkit backported verbatim from
`@decaf-ts/for-testing`. It has no `utils -> testing` dependency edge: the reported-testing
API is copied into this package, so depending on `@decaf-ts/utils/tests` never pulls in
`@decaf-ts/for-testing`. The provider teardowns (`runJestXrayTeardown`,
`runJestAgileTestTeardown`) and the `decaf test report` CLI stay in `@decaf-ts/for-testing`.

```typescript
import { it, expect } from '@decaf-ts/utils/tests';
```

#### Reported tests with `it` and `it.report`

`it` is a jest-analog registration facade: `it`, `it.skip`, `it.only`, `it.todo`, `it.each`
and `it.concurrent` proxy straight to the host test runner's own primitives, and
`it.report(name, fn, opts?)` additionally wraps the test so a thrown failure's `message` and
`cause` are persisted through the test-scoped reporter before the error is rethrown.
`it.report.skip`, `it.report.only` and `it.report.each` (array form and tagged-template table
form with `$field` / `$row.field` and `$#` name substitution) are also available. The optional
options object accepts `reporter` (defaults to `getReporter()`) and `timeout` (forwarded to
the framework when supported):

```typescript
import { it, expect } from '@decaf-ts/utils/tests';

it.report("creates a resource", async () => {
  const response = await fetch("https://example.org/api/resource", { method: "POST" });
  expect(response.status).referredToAs("status").to.be(200);
});

it.report.each`
  value | expected
  ${1}  | ${2}
  ${3}  | ${4}
`("doubles $value", ({ value, expected }: { value: number; expected: number }) => {
  expect(value * 2).referredToAs("doubled").to.be(expected);
});
```

#### Assertions with `expect`

`expect(actual)` builds a chainable, framework-agnostic assertion facade. Supported matchers:
`to.be`, `to.equal`, `to.contain`, `to.beGreaterThan`, `to.beGreaterThanOrEqual`,
`to.beLessThan`, `to.beLessThanOrEqual`, `to.beDefined` and `to.beTruthy`; `.not` negates only
the next matcher. Each matcher records one report line and one failure entry instead of
aborting the test, and the underlying assertion runs through the host runner's own `expect`,
so failure semantics match the framework. Accumulated assertions are persisted with
`reportObjects(reporter, reporter.expect, response)`, which writes the response and report
objects and throws when the report carries failed assertions.

Two accumulator scopes share the same API: the reporter-scoped `TestReporter#expect` facade
(all assertions through one reporter instance accumulate on a single report) and the
standalone `expect` export, which reuses the installed reporter's facade when one exists
(see `setReporter`) and otherwise falls back to a shared standalone accumulator.

#### Framework adapters

Registration and assertions are proxied to the host test runner through a framework adapter.
Selection order: `configure({ framework: "jest" | "vitest" | "playwright" })`, then the
`DECAF_TEST_FRAMEWORK=jest|vitest|playwright` environment variable, then runner environment
sniffing (`JEST_WORKER_ID`, `VITEST`/`VITEST_WORKSPACE_ID`/`VITEST_MODE`,
`PLAYWRIGHT_TEST`/`PLAYWRIGHT_TEST_BASE_URL`/`PLAYWRIGHT_BROWSERS_PATH`), then the default
order jest → vitest → playwright until one resolves. The adapter is cached process-wide
(`resetAdapter()` clears it); when nothing resolves, the error names both override knobs.
Playwright deviations: `it.todo` maps to `test.fixme`, `it.each` and `it.concurrent` are not
available (descriptive error), and the `timeout` option is ignored.

#### Reporter plumbing and retrocompatibility

- `setReporter(rep)` / `getReporter()` install and read the test-scoped reporter instance,
  typically from a jest setup file; `ensureReporterCollectsEvidencesConfig()` defaults
  `TEST_REPORTER_STORAGE_ENABLED` and `TEST_REPORTER_STORAGE_PATH` so evidence collection is
  on for tests using the helpers.
- `reportObjects(reporter, report, response, reportKeyValuePairs?)` writes the response and
  accumulated report objects and throws when the report carries failed assertions.
- The legacy helpers still work but are deprecated: `itReportsOnFailure(name, handler, skip?)`
  is a thin wrapper over `it.report(name, fn)` / `it.report.skip(name, fn)`, and the
  `ReportExpect` chain (`assertToBe`, `assertToContain`, ...) is replaced by
  `expect(actual).referredToAs("property").to.*`.

### Writers Module

#### Using StandardOutputWriter

```typescript
import { StandardOutputWriter } from '@decaf-ts/utils';

// Create a promise executor
const executor = {
  resolve: (value: string) => console.log(`Command succeeded with: ${value}`),
  reject: (error: Error) => console.error(`Command failed with: ${error.message}`)
};

// Create a standard output writer
const writer = new StandardOutputWriter('ls -la', executor);

// Handle command output
writer.data('File list output...');
writer.data('file1.txt');
writer.data('file2.txt');

// Handle command completion
writer.exit(0, ['Command executed successfully']);
```

#### Using RegexpOutputWriter

```typescript
import { RegexpOutputWriter } from '@decaf-ts/utils';

// Create a promise executor
const executor = {
  resolve: (value: string) => console.log(`Found version: ${value}`),
  reject: (error: Error) => console.error(`Error: ${error.message}`)
};

// Create a regexp output writer that matches version numbers
const writer = new RegexpOutputWriter('node --version', executor, /v(\d+\.\d+\.\d+)/);

// Process output that contains a version number
writer.data('v14.17.0');  // This will automatically resolve with "v14.17.0"

// Process error output
writer.error('Command not found: node');  // This will be logged as an error
```


## Coding Principles

- group similar functionality in folders (analog to namespaces but without any namespace declaration)
- one class per file;
- one interface per file (unless interface is just used as a type);
- group types as other interfaces in a types.ts file per folder;
- group constants or enums in a constants.ts file per folder;
- group decorators in a decorators.ts file per folder;
- always import from the specific file, never from a folder or index file (exceptions for dependencies on other packages);
- prefer the usage of established design patters where applicable:
  - Singleton (can be an anti-pattern. use with care);
  - factory;
  - observer;
  - strategy;
  - builder;
  - etc;


### Related

[![Readme Card](https://github-readme-stats.vercel.app/api/pin/?username=decaf-ts&repo=decaf-ts)](https://github.com/decaf-ts/decaf-ts)

### Social

[![LinkedIn](https://img.shields.io/badge/LinkedIn-0077B5?style=for-the-badge&logo=linkedin&logoColor=white)](https://www.linkedin.com/in/decaf-ts/)




#### Languages

![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)
![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black)
![NodeJS](https://img.shields.io/badge/Node.js-43853D?style=for-the-badge&logo=node.js&logoColor=white)
![ShellScript](https://img.shields.io/badge/Shell_Script-121011?style=for-the-badge&logo=gnu-bash&logoColor=white)

## Getting help

If you have bug reports, questions or suggestions please [create a new issue](https://github.com/decaf-ts/ts-workspace/issues/new/choose).

## Contributing

I am grateful for any contributions made to this project. Please read [this](./workdocs/98-Contributing.md) to get started.

## Supporting

The first and easiest way you can support it is by [Contributing](./workdocs/98-Contributing.md). Even just finding a typo in the documentation is important.

Financial support is always welcome and helps keep both me and the project alive and healthy.

So if you can, if this project in any way. either by learning something or simply by helping you save precious time, please consider donating.

## License

This project is released under the [MIT License](./LICENSE.md).

By developers, for developers...
