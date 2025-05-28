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
