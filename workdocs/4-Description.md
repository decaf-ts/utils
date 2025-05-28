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
