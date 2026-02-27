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

Minimal size: 14 KB kb gzipped

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
