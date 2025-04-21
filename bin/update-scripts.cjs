(function webpackUniversalModuleDefinition(root, factory) {
	if(typeof exports === 'object' && typeof module === 'object')
		module.exports = factory();
	else if(typeof define === 'function' && define.amd)
		define("utils", [], factory);
	else if(typeof exports === 'object')
		exports["utils"] = factory();
	else
		root["utils"] = factory();
})(this, () => {
return /******/ (() => { // webpackBootstrap
/******/ 	"use strict";
/******/ 	var __webpack_modules__ = ({

/***/ 23:
/***/ ((module) => {

module.exports = require("util");

/***/ }),

/***/ 30:
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.Environment = void 0;
const text_1 = __webpack_require__(547);
const accumulator_1 = __webpack_require__(741);
const web_1 = __webpack_require__(885);
/**
 * @class Environment
 * @extends {ObjectAccumulator<T>}
 * @template T
 * @description A class representing an environment with accumulation capabilities.
 * @summary Manages environment-related data and provides methods for accumulation and key retrieval.
 * @param {T} [initialData] - The initial data to populate the environment with.
 */
class Environment extends accumulator_1.ObjectAccumulator {
    /**
     * @static
     * @protected
     * @description A factory function for creating Environment instances.
     * @summary Defines how new instances of the Environment class should be created.
     * @return {Environment<any>} A new instance of the Environment class.
     */
    static { this.factory = () => new Environment(); }
    constructor() {
        super();
    }
    fromEnv(k) {
        let env;
        if ((0, web_1.isBrowser)()) {
            env = globalThis["ENV"];
        }
        else {
            env = globalThis.process.env;
            k = (0, text_1.toENVFormat)(k);
        }
        return env[k];
    }
    expand(value) {
        Object.entries(value).forEach(([k, v]) => {
            Object.defineProperty(this, k, {
                get: () => {
                    const fromEnv = this.fromEnv(k);
                    return typeof fromEnv === "undefined" ? v : fromEnv;
                },
                set: (val) => {
                    v = val;
                },
                configurable: true,
                enumerable: true,
            });
        });
    }
    /**
     * @protected
     * @static
     * @description Retrieves or creates the singleton instance of the Environment class.
     * @summary Ensures only one instance of the Environment class exists.
     * @template E
     * @param {...unknown[]} args - Arguments to pass to the factory function if a new instance is created.
     * @return {E} The singleton instance of the Environment class.
     */
    static instance(...args) {
        Environment._instance = !Environment._instance
            ? Environment.factory(...args)
            : Environment._instance;
        return Environment._instance;
    }
    /**
     * @static
     * @description Accumulates the given value into the environment.
     * @summary Adds new properties to the environment from the provided object.
     * @template V
     * @param {V} value - The object to accumulate into the environment.
     * @return {typeof Environment._instance & V & ObjectAccumulator<typeof Environment._instance & V>} The updated environment instance.
     */
    static accumulate(value) {
        const instance = Environment.instance();
        return instance.accumulate(value);
    }
    /**
     * @static
     * @description Retrieves the keys of the environment, optionally converting them to ENV format.
     * @summary Gets all keys in the environment, with an option to format them for environment variables.
     * @param {boolean} [toEnv=true] - Whether to convert the keys to ENV format.
     * @return {string[]} An array of keys from the environment.
     */
    static keys(toEnv = true) {
        return Environment.instance()
            .keys()
            .map((k) => (toEnv ? (0, text_1.toENVFormat)(k) : k));
    }
}
exports.Environment = Environment;


/***/ }),

/***/ 154:
/***/ ((__unused_webpack_module, exports) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.AbortCode = exports.DefaultLoggingConfig = exports.DefaultTheme = exports.NumericLogLevels = exports.LogLevel = exports.Tokens = exports.SetupScriptKey = exports.NoCIFLag = exports.SemVersion = exports.SemVersionRegex = exports.Encoding = void 0;
/**
 * @description Default encoding for text operations.
 * @summary The standard UTF-8 encoding used for text processing.
 * @const {string} Encoding
 * @memberOf @decaf-ts/utils
 */
exports.Encoding = "utf-8";
/**
 * @description Regular expression for semantic versioning.
 * @summary A regex pattern to match and parse semantic version strings.
 * @const {RegExp} SemVersionRegex
 * @memberOf @decaf-ts/utils
 */
exports.SemVersionRegex = /^(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z-]+(?:\.[0-9A-Za-z])))/g;
/**
 * @description Enum for semantic version components.
 * @summary Defines the three levels of semantic versioning: PATCH, MINOR, and MAJOR.
 * @enum {string}
 * @memberOf @decaf-ts/utils
 */
var SemVersion;
(function (SemVersion) {
    /** Patch version for backwards-compatible bug fixes. */
    SemVersion["PATCH"] = "patch";
    /** Minor version for backwards-compatible new features. */
    SemVersion["MINOR"] = "minor";
    /** Major version for changes that break backwards compatibility. */
    SemVersion["MAJOR"] = "major";
})(SemVersion || (exports.SemVersion = SemVersion = {}));
/**
 * @description Flag to indicate non-CI environment.
 * @summary Used to specify that a command should run outside of a Continuous Integration environment.
 * @const {string} NoCIFLag
 * @memberOf @decaf-ts/utils
 */
exports.NoCIFLag = "-no-ci";
/**
 * @description Key for the setup script in package.json.
 * @summary Identifies the script that runs after package installation.
 * @const {string} SetupScriptKey
 * @memberOf @decaf-ts/utils
 */
exports.SetupScriptKey = "postinstall";
/**
 * @description Enum for various authentication tokens.
 * @summary Defines the file names for storing different types of authentication tokens.
 * @enum {string}
 * @memberOf @decaf-ts/utils
 */
var Tokens;
(function (Tokens) {
    /** Git authentication token file name. */
    Tokens["GIT"] = ".token";
    /** NPM authentication token file name. */
    Tokens["NPM"] = ".npmtoken";
    /** Docker authentication token file name. */
    Tokens["DOCKER"] = ".dockertoken";
    /** Confluence authentication token file name. */
    Tokens["CONFLUENCE"] = ".confluence-token";
})(Tokens || (exports.Tokens = Tokens = {}));
/**
 * @description Enum for log levels.
 * @summary Defines different levels of logging for the application.
 * @enum {string}
 * @memberOf @decaf-ts/utils
 */
var LogLevel;
(function (LogLevel) {
    /** Error events that are likely to cause problems. */
    LogLevel["error"] = "error";
    /** Routine information, such as ongoing status or performance. */
    LogLevel["info"] = "info";
    /** Additional relevant information. */
    LogLevel["verbose"] = "verbose";
    /** Debug or trace information. */
    LogLevel["debug"] = "debug";
    /** way too verbose or silly information. */
    LogLevel["silly"] = "silly";
})(LogLevel || (exports.LogLevel = LogLevel = {}));
/**
 * @description Numeric values associated with log levels.
 * @summary Provides a numeric representation of log levels for comparison and filtering.
 * @const {Object} NumericLogLevels
 * @property {number} error - Numeric value for error level (0).
 * @property {number} info - Numeric value for info level (2).
 * @property {number} verbose - Numeric value for verbose level (4).
 * @property {number} debug - Numeric value for debug level (5).
 * @property {number} silly - Numeric value for silly level (8).
 * @memberOf @decaf-ts/utils
 */
exports.NumericLogLevels = {
    error: 2,
    info: 4,
    verbose: 6,
    debug: 7,
    silly: 9,
};
/**
 * @description Default theme for styling log output.
 * @summary Defines the default color and style settings for various components of log messages.
 * @const DefaultTheme
 * @typedef {Theme} DefaultTheme
 * @property {Object} class - Styling for class names.
 * @property {number} class.fg - Foreground color code for class names (4).
 * @property {Object} id - Styling for identifiers.
 * @property {number} id.fg - Foreground color code for identifiers (36).
 * @property {Object} stack - Styling for stack traces (empty object).
 * @property {Object} timestamp - Styling for timestamps (empty object).
 * @property {Object} message - Styling for different types of messages.
 * @property {Object} message.error - Styling for error messages.
 * @property {number} message.error.fg - Foreground color code for error messages (34).
 * @property {Object} method - Styling for method names (empty object).
 * @property {Object} logLevel - Styling for different log levels.
 * @property {Object} logLevel.error - Styling for error level logs.
 * @property {number} logLevel.error.fg - Foreground color code for error level logs (6).
 * @property {Object} logLevel.info - Styling for info level logs (empty object).
 * @property {Object} logLevel.verbose - Styling for verbose level logs (empty object).
 * @property {Object} logLevel.debug - Styling for debug level logs.
 * @property {number} logLevel.debug.fg - Foreground color code for debug level logs (7).
 * @memberOf @decaf-ts/utils
 */
exports.DefaultTheme = {
    class: {
        fg: 34,
    },
    id: {
        fg: 36,
    },
    stack: {},
    timestamp: {},
    message: {
        error: {
            fg: 31,
        },
    },
    method: {},
    logLevel: {
        error: {
            fg: 31,
            style: ["bold"],
        },
        info: {},
        verbose: {},
        debug: {
            fg: 33,
        },
    },
};
/**
 * @description Default configuration for logging.
 * @summary Defines the default settings for the logging system, including verbosity, log level, styling, and timestamp format.
 * @const DefaultLoggingConfig
 * @typedef {LoggingConfig} DefaultLoggingConfig
 * @property {number} verbose - Verbosity level (0).
 * @property {LogLevel} level - Default log level (LogLevel.info).
 * @property {boolean} style - Whether to apply styling to log output (false).
 * @property {boolean} timestamp - Whether to include timestamps in log messages (true).
 * @property {string} timestampFormat - Format for timestamps ("HH:mm:ss.SSS").
 * @property {boolean} context - Whether to include context information in log messages (true).
 * @property {Theme} theme - The theme to use for styling log messages (DefaultTheme).
 * @memberOf @decaf-ts/utils
 */
exports.DefaultLoggingConfig = {
    verbose: 0,
    level: LogLevel.info,
    logLevel: true,
    style: false,
    separator: " - ",
    timestamp: true,
    timestampFormat: "HH:mm:ss.SSS",
    context: true,
    theme: exports.DefaultTheme,
};
exports.AbortCode = "Aborted";


/***/ }),

/***/ 191:
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.ReleaseScript = void 0;
const utils_1 = __webpack_require__(686);
const constants_1 = __webpack_require__(154);
const input_1 = __webpack_require__(714);
const command_1 = __webpack_require__(529);
const options = {
    ci: {
        type: "boolean",
        default: true,
    },
    message: {
        type: "string",
        short: "m",
    },
    tag: {
        type: "string",
        short: "t",
        default: undefined,
    },
};
/**
 * @class ReleaseScript
 * @extends {Command<typeof options, void>}
 * @cavegory scripts
 * @description A command-line script for managing releases and version updates.
 * @summary This script automates the process of creating and pushing new releases. It handles version updates,
 * commit messages, and optionally publishes to NPM. The script supports semantic versioning and can work in both CI and non-CI environments.
 *
 * @param {Object} options - Configuration options for the script
 * @param {boolean} options.ci - Whether the script is running in a CI environment (default: true)
 * @param {string} options.message - The release message (short: 'm')
 * @param {string} options.tag - The version tag to use (short: 't', default: undefined)
 */
class ReleaseScript extends command_1.Command {
    constructor() {
        super("ReleaseScript", options);
    }
    /**
     * @description Prepares the version for the release.
     * @summary This method validates the provided tag or prompts the user for a new one if not provided or invalid.
     * It also displays the latest git tags for reference.
     * @param {string} tag - The version tag to prepare
     * @returns {Promise<string>} The prepared version tag
     *
     * @mermaid
     * sequenceDiagram
     *   participant R as ReleaseScript
     *   participant T as TestVersion
     *   participant U as UserInput
     *   participant G as Git
     *   R->>T: testVersion(tag)
     *   alt tag is valid
     *     T-->>R: return tag
     *   else tag is invalid or not provided
     *     R->>G: List latest git tags
     *     R->>U: Prompt for new tag
     *     U-->>R: return new tag
     *   end
     */
    async prepareVersion(tag) {
        const log = this.log.for(this.prepareVersion);
        tag = this.testVersion(tag || "");
        if (!tag) {
            log.verbose("No release message provided. Prompting for one:");
            log.info(`Listing latest git tags:`);
            await (0, utils_1.runCommand)("git tag --sort=-taggerdate | head -n 5").promise;
            return await input_1.UserInput.insistForText("tag", "Enter the new tag number (accepts v*.*.*[-...])", (val) => !!val.toString().match(/^v[0-9]+\.[0-9]+.[0-9]+(-[0-9a-zA-Z-]+)?$/));
        }
        return tag;
    }
    /**
     * @description Tests if the provided version is valid.
     * @summary This method checks if the version is a valid semantic version or a predefined update type (PATCH, MINOR, MAJOR).
     * @param {string} version - The version to test
     * @returns {string | undefined} The validated version or undefined if invalid
     */
    testVersion(version) {
        const log = this.log.for(this.testVersion);
        version = version.trim().toLowerCase();
        switch (version) {
            case constants_1.SemVersion.PATCH:
            case constants_1.SemVersion.MINOR:
            case constants_1.SemVersion.MAJOR:
                log.verbose(`Using provided SemVer update: ${version}`, 1);
                return version;
            default:
                log.verbose(`Testing provided version for SemVer compatibility: ${version}`, 1);
                if (!new RegExp(constants_1.SemVersionRegex).test(version)) {
                    log.debug(`Invalid version number: ${version}`);
                    return undefined;
                }
                log.verbose(`version approved: ${version}`, 1);
                return version;
        }
    }
    /**
     * @description Prepares the release message.
     * @summary This method either returns the provided message or prompts the user for a new one if not provided.
     * @param {string} [message] - The release message
     * @returns {Promise<string>} The prepared release message
     */
    async prepareMessage(message) {
        const log = this.log.for(this.prepareMessage);
        if (!message) {
            log.verbose("No release message provided. Prompting for one");
            return await input_1.UserInput.insistForText("message", "What should be the release message/ticket?", (val) => !!val && val.toString().length > 5);
        }
        return message;
    }
    /**
     * @description Runs the release script.
     * @summary This method orchestrates the entire release process, including version preparation, message creation,
     * git operations, and npm publishing (if not in CI environment).
     * @param {ParseArgsResult} args - The parsed command-line arguments
     * @returns {Promise<void>}
     *
     * @mermaid
     * sequenceDiagram
     *   participant R as ReleaseScript
     *   participant V as PrepareVersion
     *   participant M as PrepareMessage
     *   participant N as NPM
     *   participant G as Git
     *   participant U as UserInput
     *   R->>V: prepareVersion(tag)
     *   R->>M: prepareMessage(message)
     *   R->>N: Run prepare-release script
     *   R->>G: Check git status
     *   alt changes exist
     *     R->>U: Ask for confirmation
     *     U-->>R: Confirm
     *     R->>G: Add and commit changes
     *   end
     *   R->>N: Update npm version
     *   R->>G: Push changes and tags
     *   alt not CI environment
     *     R->>N: Publish to npm
     *   end
     */
    async run(args) {
        let result;
        const { ci } = args;
        let { tag, message } = args;
        tag = await this.prepareVersion(tag);
        message = await this.prepareMessage(message);
        result = await (0, utils_1.runCommand)(`npm run prepare-release -- ${tag} ${message}`, {
            cwd: process.cwd(),
        }).promise;
        result = await (0, utils_1.runCommand)("git status --porcelain").promise;
        await result;
        if (result.logs.length &&
            (await input_1.UserInput.askConfirmation("git-changes", "Do you want to push the changes to the remote repository?", true))) {
            await (0, utils_1.runCommand)("git add .").promise;
            await (0, utils_1.runCommand)(`git commit -m "${tag} - ${message} - after release preparation${ci ? "" : constants_1.NoCIFLag}"`).promise;
        }
        await (0, utils_1.runCommand)(`npm version "${tag}" -m "${message}${ci ? "" : constants_1.NoCIFLag}"`).promise;
        await (0, utils_1.runCommand)("git push --follow-tags").promise;
        if (!ci) {
            await (0, utils_1.runCommand)("NPM_TOKEN=$(cat .npmtoken) npm publish --access public")
                .promise;
        }
    }
}
exports.ReleaseScript = ReleaseScript;


/***/ }),

/***/ 317:
/***/ ((module) => {

module.exports = require("child_process");

/***/ }),

/***/ 340:
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {


var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.patchFile = patchFile;
exports.readFile = readFile;
exports.writeFile = writeFile;
exports.getPackage = getPackage;
exports.setPackageAttribute = setPackageAttribute;
exports.getPackageVersion = getPackageVersion;
exports.getDependencies = getDependencies;
exports.updateDependencies = updateDependencies;
exports.installIfNotAvailable = installIfNotAvailable;
exports.pushToGit = pushToGit;
exports.installDependencies = installDependencies;
exports.normalizeImport = normalizeImport;
const fs_1 = __importDefault(__webpack_require__(896));
const path_1 = __importDefault(__webpack_require__(928));
const logging_1 = __webpack_require__(834);
const text_1 = __webpack_require__(547);
const utils_1 = __webpack_require__(686);
const logger = logging_1.Logging.for("fs");
/**
 * @description Patches a file with given values.
 * @summary Reads a file, applies patches using TextUtils, and writes the result back to the file.
 *
 * @param {string} path - The path to the file to be patched.
 * @param {Record<string, number | string>} values - The values to patch into the file.
 * @return {void}
 *
 * @function patchFile
 *
 * @mermaid
 * sequenceDiagram
 *   participant Caller
 *   participant patchFile
 *   participant fs
 *   participant readFile
 *   participant TextUtils
 *   participant writeFile
 *   Caller->>patchFile: Call with path and values
 *   patchFile->>fs: Check if file exists
 *   patchFile->>readFile: Read file content
 *   readFile->>fs: Read file
 *   fs-->>readFile: Return file content
 *   readFile-->>patchFile: Return file content
 *   patchFile->>TextUtils: Patch string
 *   TextUtils-->>patchFile: Return patched content
 *   patchFile->>writeFile: Write patched content
 *   writeFile->>fs: Write to file
 *   fs-->>writeFile: File written
 *   writeFile-->>patchFile: File written
 *   patchFile-->>Caller: Patching complete
 *
 * @memberOf module:fs-utils
 */
function patchFile(path, values) {
    const log = logger.for(patchFile);
    if (!fs_1.default.existsSync(path))
        throw new Error(`File not found at path "${path}".`);
    let content = readFile(path);
    try {
        log.verbose(`Patching file "${path}"...`);
        log.debug(`with value: ${JSON.stringify(values)}`);
        content = (0, text_1.patchString)(content, values);
    }
    catch (error) {
        throw new Error(`Error patching file: ${error}`);
    }
    writeFile(path, content);
}
/**
 * @description Reads a file and returns its content.
 * @summary Reads the content of a file at the specified path and returns it as a string.
 *
 * @param {string} path - The path to the file to be read.
 * @return {string} The content of the file.
 *
 * @function readFile
 *
 * @memberOf module:utils
 */
function readFile(path) {
    const log = logger.for(readFile);
    try {
        log.verbose(`Reading file "${path}"...`);
        return fs_1.default.readFileSync(path, "utf8");
    }
    catch (error) {
        log.verbose(`Error reading file "${path}": ${error}`);
        throw new Error(`Error reading file "${path}": ${error}`);
    }
}
/**
 * @description Writes data to a file.
 * @summary Writes the provided data to a file at the specified path.
 *
 * @param {string} path - The path to the file to be written.
 * @param {string | Buffer} data - The data to be written to the file.
 * @return {void}
 *
 * @function writeFile
 *
 * @memberOf module:utils
 */
function writeFile(path, data) {
    const log = logger.for(writeFile);
    try {
        log.verbose(`Writing file "${path} with ${data.length} bytes...`);
        fs_1.default.writeFileSync(path, data, "utf8");
    }
    catch (error) {
        log.verbose(`Error writing file "${path}": ${error}`);
        throw new Error(`Error writing file "${path}": ${error}`);
    }
}
/**
 * @description Retrieves package information from package.json.
 * @summary Loads and parses the package.json file from a specified directory or the current working directory. Can return the entire package object or a specific property.
 * @param {string} [p=process.cwd()] - The directory path where the package.json file is located.
 * @param {string} [property] - Optional. The specific property to retrieve from package.json.
 * @return {object | string} The parsed contents of package.json or the value of the specified property.
 * @function getPackage
 * @mermaid
 * sequenceDiagram
 *   participant Caller
 *   participant getPackage
 *   participant readFile
 *   participant JSON
 *   Caller->>getPackage: Call with path and optional property
 *   getPackage->>readFile: Read package.json
 *   readFile-->>getPackage: Return file content
 *   getPackage->>JSON: Parse file content
 *   JSON-->>getPackage: Return parsed object
 *   alt property specified
 *     getPackage->>getPackage: Check if property exists
 *     alt property exists
 *       getPackage-->>Caller: Return property value
 *     else property doesn't exist
 *       getPackage-->>Caller: Throw Error
 *     end
 *   else no property specified
 *     getPackage-->>Caller: Return entire package object
 *   end
 * @memberOf module:utils
 */
function getPackage(p = process.cwd(), property) {
    let pkg;
    try {
        pkg = JSON.parse(readFile(path_1.default.join(p, `package.json`)));
    }
    catch (error) {
        throw new Error(`Failed to retrieve package information" ${error}`);
    }
    if (property) {
        if (!(property in pkg))
            throw new Error(`Property "${property}" not found in package.json`);
        return pkg[property];
    }
    return pkg;
}
function setPackageAttribute(attr, value, p = process.cwd()) {
    const pkg = getPackage(p);
    pkg[attr] = value;
    writeFile(path_1.default.join(p, `package.json`), JSON.stringify(pkg, null, 2));
}
/**
 * @description Retrieves the version from package.json.
 * @summary A convenience function that calls getPackage to retrieve the "version" property from package.json.
 * @param {string} [p=process.cwd()] - The directory path where the package.json file is located.
 * @return {string} The version string from package.json.
 * @function getPackageVersion
 * @memberOf module:fs-utils
 */
function getPackageVersion(p = process.cwd()) {
    return getPackage(p, "version");
}
/**
 * @description Retrieves all dependencies from the project.
 * @summary Executes 'npm ls --json' command to get a detailed list of all dependencies (production, development, and peer) and their versions.
 * @param {string} [path=process.cwd()] - The directory path of the project.
 * @return {Promise<{prod: Array<{name: string, version: string}>, dev: Array<{name: string, version: string}>, peer: Array<{name: string, version: string}>}>} An object containing arrays of production, development, and peer dependencies.
 * @function getDependencies
 * @mermaid
 * sequenceDiagram
 *   participant Caller
 *   participant getDependencies
 *   participant runCommand
 *   participant JSON
 *   Caller->>getDependencies: Call with optional path
 *   getDependencies->>runCommand: Execute 'npm ls --json'
 *   runCommand-->>getDependencies: Return command output
 *   getDependencies->>JSON: Parse command output
 *   JSON-->>getDependencies: Return parsed object
 *   getDependencies->>getDependencies: Process dependencies
 *   getDependencies-->>Caller: Return processed dependencies
 * @memberOf module:fs-utils
 */
async function getDependencies(path = process.cwd()) {
    let pkg;
    try {
        pkg = JSON.parse(await (0, utils_1.runCommand)(`npm ls --json`, { cwd: path }).promise);
    }
    catch (e) {
        throw new Error(`Failed to retrieve dependencies: ${e}`);
    }
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const mapper = (entry, index) => ({
        name: entry[0],
        version: entry[1].version,
    });
    return {
        prod: Object.entries(pkg.dependencies || {}).map(mapper),
        dev: Object.entries(pkg.devDependencies || {}).map(mapper),
        peer: Object.entries(pkg.peerDependencies || {}).map(mapper),
    };
}
async function updateDependencies() {
    const log = logger.for(updateDependencies);
    log.info("checking for updates...");
    await (0, utils_1.runCommand)("npx npm-check-updates -u").promise;
    log.info("updating...");
    await (0, utils_1.runCommand)("npx npm run do-install").promise;
}
async function installIfNotAvailable(deps, dependencies) {
    if (!dependencies) {
        const d = await getDependencies();
        dependencies = {
            prod: d.prod?.map((p) => p.name) || [],
            dev: d.dev?.map((d) => d.name) || [],
            peer: d.peer?.map((p) => p.name) || [],
        };
    }
    const { prod, dev, peer } = dependencies;
    const installed = Array.from(new Set([...(prod || []), ...(dev || []), ...(peer || [])]));
    deps = typeof deps === "string" ? [deps] : deps;
    const toInstall = deps.filter((d) => !installed.includes(d));
    if (toInstall.length)
        await installDependencies({ dev: toInstall });
    dependencies.dev = dependencies.dev || [];
    dependencies.dev.push(...toInstall);
    return dependencies;
}
async function pushToGit() {
    const log = logger.for(pushToGit);
    const gitUser = await (0, utils_1.runCommand)("git config user.name").promise;
    const gitEmail = await (0, utils_1.runCommand)("git config user.email").promise;
    log.verbose(`cached git id: ${gitUser}/${gitEmail}. changing to automation`);
    await (0, utils_1.runCommand)('git config user.email "automation@decaf.ts"').promise;
    await (0, utils_1.runCommand)('git config user.name "decaf"').promise;
    log.info("Pushing changes to git...");
    await (0, utils_1.runCommand)("git add .").promise;
    await (0, utils_1.runCommand)(`git commit -m "refs #1 - after repo setup"`).promise;
    await (0, utils_1.runCommand)("git push").promise;
    await (0, utils_1.runCommand)(`git config user.email "${gitEmail}"`).promise;
    await (0, utils_1.runCommand)(`git config user.name "${gitUser}"`).promise;
    log.verbose(`reverted to git id: ${gitUser}/${gitEmail}`);
}
async function installDependencies(dependencies) {
    const log = logger.for(installDependencies);
    const prod = dependencies.prod || [];
    const dev = dependencies.dev || [];
    const peer = dependencies.peer || [];
    if (prod.length) {
        log.info(`Installing dependencies ${prod.join(", ")}...`);
        await (0, utils_1.runCommand)(`npm install ${prod.join(" ")}`, { cwd: process.cwd() })
            .promise;
    }
    if (dev.length) {
        log.info(`Installing devDependencies ${dev.join(", ")}...`);
        await (0, utils_1.runCommand)(`npm install --save-dev ${dev.join(" ")}`, {
            cwd: process.cwd(),
        }).promise;
    }
    if (peer.length) {
        log.info(`Installing peerDependencies ${peer.join(", ")}...`);
        await (0, utils_1.runCommand)(`npm install --save-peer ${peer.join(" ")}`, {
            cwd: process.cwd(),
        }).promise;
    }
}
async function normalizeImport(importPromise) {
    // CommonJS's `module.exports` is wrapped as `default` in ESModule.
    return importPromise.then((m) => (m.default || m));
}


/***/ }),

/***/ 443:
/***/ ((module) => {

module.exports = require("prompts");

/***/ }),

/***/ 483:
/***/ ((__unused_webpack_module, exports) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));


/***/ }),

/***/ 487:
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {


var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", ({ value: true }));
__exportStar(__webpack_require__(191), exports);
__exportStar(__webpack_require__(639), exports);


/***/ }),

/***/ 499:
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.StandardOutputWriter = void 0;
const constants_1 = __webpack_require__(154);
const logging_1 = __webpack_require__(834);
const styled_string_1 = __webpack_require__(508);
/**
 * @description A standard output writer for handling command execution output.
 * @summary This class implements the OutputWriter interface and provides methods for
 * handling various types of output from command execution, including standard output,
 * error output, and exit codes. It also includes utility methods for parsing commands
 * and resolving or rejecting promises based on execution results.
 *
 * @template R - The type of the resolved value, defaulting to number.
 *
 * @param lock - A PromiseExecutor to control the asynchronous flow.
 * @param args - Additional arguments (unused in the current implementation).
 *
 * @class
 */
class StandardOutputWriter {
    /**
     * @description Initializes a new instance of StandardOutputWriter.
     * @summary Constructs the StandardOutputWriter with a lock mechanism and optional arguments.
     *
     * @param cmd
     * @param lock - A PromiseExecutor to control the asynchronous flow.
     * @param args - Additional arguments (currently unused).
     */
    constructor(cmd, lock, 
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    ...args) {
        this.cmd = cmd;
        this.lock = lock;
        this.logger = logging_1.Logging.for(this.cmd);
    }
    /**
     * @description Logs output to the console.
     * @summary Formats and logs the given data with a timestamp and type indicator.
     *
     * @param type - The type of output (stdout or stderr).
     * @param data - The data to be logged.
     */
    log(type, data) {
        data = Buffer.isBuffer(data) ? data.toString(constants_1.Encoding) : data;
        const formatedType = type === "stderr" ? (0, styled_string_1.style)("ERROR").red.text : type;
        const log = `${formatedType}: ${data}`;
        this.logger.info(log);
    }
    /**
     * @description Handles standard output data.
     * @summary Logs the given chunk as standard output.
     *
     * @param chunk - The data chunk to be logged.
     */
    data(chunk) {
        this.log("stdout", String(chunk));
    }
    /**
     * @description Handles error output data.
     * @summary Logs the given chunk as error output.
     *
     * @param chunk - The error data chunk to be logged.
     */
    error(chunk) {
        this.log("stderr", String(chunk));
    }
    /**
     * @description Handles error objects.
     * @summary Logs the error message from the given Error object.
     *
     * @param err - The Error object to be logged.
     */
    errors(err) {
        this.log("stderr", `Error executing command exited : ${err}`);
    }
    /**
     * @description Handles the exit of a command.
     * @summary Logs the exit code and resolves or rejects the promise based on the code.
     *
     * @param code - The exit code of the command.
     * @param logs
     */
    exit(code, logs) {
        this.log("stdout", `command exited code : ${code === 0 ? (0, styled_string_1.style)(code.toString()).green.text : (0, styled_string_1.style)(code === null ? "null" : code.toString()).red.text}`);
        if (code === 0) {
            this.resolve(logs.map((l) => l.trim()).join("\n"));
        }
        else {
            this.reject(new Error(logs.length ? logs.join("\n") : code.toString()));
        }
    }
    /**
     * @description Parses a command string or array into components.
     * @summary Converts the command into a consistent format and stores it, then returns it split into command and arguments.
     *
     * @param command - The command as a string or array of strings.
     * @return A tuple containing the command and its arguments as separate elements.
     */
    parseCommand(command) {
        command = typeof command === "string" ? command.split(" ") : command;
        this.cmd = command.join(" ");
        return [command[0], command.slice(1)];
    }
    /**
     * @description Resolves the promise with a success message.
     * @summary Logs a success message and resolves the promise with the given reason.
     *
     * @param reason - The reason for resolving the promise.
     */
    resolve(reason) {
        this.log("stdout", `${this.cmd} executed successfully: ${(0, styled_string_1.style)(reason ? "ran to completion" : reason).green}`);
        this.lock.resolve(reason);
    }
    /**
     * @description Rejects the promise with an error message.
     * @summary Logs an error message and rejects the promise with the given reason.
     *
     * @param reason - The reason for rejecting the promise, either a number (exit code) or a string.
     */
    reject(reason) {
        if (!(reason instanceof Error)) {
            reason = new Error(typeof reason === "number" ? `Exit code ${reason}` : reason);
        }
        this.log("stderr", `${this.cmd} failed to execute: ${(0, styled_string_1.style)(reason.message).red}`);
        this.lock.reject(reason);
    }
}
exports.StandardOutputWriter = StandardOutputWriter;


/***/ }),

/***/ 508:
/***/ ((module) => {

module.exports = require("@tvenceslau/styled-string");

/***/ }),

/***/ 529:
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.Command = void 0;
const logging_1 = __webpack_require__(834);
const constants_1 = __webpack_require__(154);
const input_1 = __webpack_require__(714);
const constants_2 = __webpack_require__(837);
const fs_1 = __webpack_require__(340);
const common_1 = __webpack_require__(866);
const environment_1 = __webpack_require__(30);
/**
 * @class Command
 * @abstract
 * @template I - The type of input options for the command.
 * @template R - The return type of the command execution.
 * @memberOf utils/cli
 * @description Abstract base class for command implementation.
 * @summary Provides a structure for creating command-line interface commands with input handling, logging, and execution flow.
 *
 * @param {string} name - The name of the command.
 * @param {CommandOptions<I>} [inputs] - The input options for the command.
 * @param {string[]} [requirements] - The list of required dependencies for the command.
 */
class Command {
    constructor(name, inputs = {}, requirements = []) {
        this.name = name;
        this.inputs = inputs;
        this.requirements = requirements;
        if (!Command.log) {
            Object.defineProperty(Command, "log", {
                writable: false,
                value: logging_1.Logging.for(Command.name),
            });
            this.log = Command.log;
        }
        this.log = Command.log.for(this.name);
        this.inputs = Object.assign({}, constants_2.DefaultCommandOptions, inputs);
    }
    /**
     * @protected
     * @async
     * @description Checks if all required dependencies are present.
     * @summary Retrieves the list of dependencies and compares it against the required dependencies for the command.
     * @returns {Promise<void>} A promise that resolves when the check is complete.
     *
     * @mermaid
     * sequenceDiagram
     *   participant Command
     *   participant getDependencies
     *   participant Set
     *   Command->>getDependencies: Call
     *   getDependencies-->>Command: Return {prod, dev, peer}
     *   Command->>Set: Create Set from prod, dev, peer
     *   Set-->>Command: Return unique dependencies
     *   Command->>Command: Compare against requirements
     *   alt Missing dependencies
     *     Command->>Command: Add to missing list
     *   end
     *   Note over Command: If missing.length > 0, handle missing dependencies
     */
    async checkRequirements() {
        const { prod, dev, peer } = await (0, fs_1.getDependencies)();
        const missing = [];
        const fullList = Array.from(new Set([...prod, ...dev, ...peer]).values()).map((d) => d.name);
        for (const dep of this.requirements)
            if (!fullList.includes(dep))
                missing.push(dep);
        if (!missing.length)
            return;
    }
    /**
     * @protected
     * @description Provides help information for the command.
     * @summary This method should be overridden in derived classes to provide specific help information.
     * @param {ParseArgsResult} args - The parsed command-line arguments.
     * @returns {void}
     */
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    help(args) {
        return this.log.info(`This is help. I'm no use because I should have been overridden.`);
    }
    /**
     * @async
     * @description Executes the command.
     * @summary This method handles the overall execution flow of the command, including parsing arguments,
     * setting up logging, checking for version or help requests, and running the command.
     * @returns {Promise<R | string | void>} A promise that resolves with the command's result.
     *
     * @mermaid
     * sequenceDiagram
     *   participant Command
     *   participant UserInput
     *   participant Logging
     *   participant getPackageVersion
     *   participant printBanner
     *   Command->>UserInput: parseArgs(inputs)
     *   UserInput-->>Command: Return ParseArgsResult
     *   Command->>Command: Process options
     *   Command->>Logging: setConfig(options)
     *   alt version requested
     *     Command->>getPackageVersion: Call
     *     getPackageVersion-->>Command: Return version
     *   else help requested
     *     Command->>Command: help(args)
     *   else banner requested
     *     Command->>printBanner: Call
     *   end
     *   Command->>Command: run(args)
     *   alt error occurs
     *     Command->>Command: Log error
     *   end
     *   Command-->>Command: Return result
     */
    async execute() {
        const args = input_1.UserInput.parseArgs(this.inputs);
        const env = environment_1.Environment.accumulate(constants_1.DefaultLoggingConfig)
            .accumulate(constants_2.DefaultCommandValues)
            .accumulate(args.values);
        const { timestamp, verbose, version, help, logLevel, logStyle, banner } = env;
        this.log.setConfig({
            ...env,
            timestamp: !!timestamp,
            level: logLevel,
            style: !!logStyle,
            verbose: verbose || 0,
        });
        if (version) {
            return (0, fs_1.getPackageVersion)();
        }
        if (help) {
            return this.help(args);
        }
        if (banner)
            (0, common_1.printBanner)(this.log.for(common_1.printBanner, {
                timestamp: false,
                style: false,
                context: false,
                logLevel: false,
            }));
        let result;
        try {
            result = await this.run(env);
        }
        catch (e) {
            this.log.error(`Error while running provided cli function: ${e}`);
            throw e;
        }
        return result;
    }
}
exports.Command = Command;


/***/ }),

/***/ 547:
/***/ ((__unused_webpack_module, exports) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.padEnd = padEnd;
exports.patchPlaceholders = patchPlaceholders;
exports.patchString = patchString;
exports.toCamelCase = toCamelCase;
exports.toENVFormat = toENVFormat;
exports.toSnakeCase = toSnakeCase;
exports.toKebabCase = toKebabCase;
exports.toPascalCase = toPascalCase;
exports.escapeRegExp = escapeRegExp;
/**
 * @description Pads the end of a string with a specified character.
 * @summary Extends the input string to a specified length by adding a padding character to the end.
 * If the input string is already longer than the specified length, it is returned unchanged.
 *
 * @param {string} str - The input string to be padded.
 * @param {number} length - The desired total length of the resulting string.
 * @param {string} [char=" "] - The character to use for padding. Defaults to a space.
 * @return {string} The padded string.
 * @throws {Error} If the padding character is not exactly one character long.
 *
 * @function padEnd
 *
 * @memberOf module:TextUtils
 */
function padEnd(str, length, char = " ") {
    if (char.length !== 1)
        throw new Error("Invalid character length for padding. must be one!");
    return str.padEnd(length, char);
}
/**
 * @description Replaces placeholders in a string with provided values.
 * @summary Interpolates a string by replacing placeholders of the form ${variableName}
 * with corresponding values from the provided object. If a placeholder doesn't have
 * a corresponding value, it is left unchanged in the string.
 *
 * @param {string} input - The input string containing placeholders to be replaced.
 * @param {Record<string, number | string>} values - An object containing key-value pairs for replacement.
 * @return {string} The interpolated string with placeholders replaced by their corresponding values.
 *
 * @function patchPlaceholders
 *
 * @mermaid
 * sequenceDiagram
 *   participant Caller
 *   participant patchString
 *   participant String.replace
 *   Caller->>patchString: Call with input and values
 *   patchString->>String.replace: Call with regex and replacement function
 *   String.replace->>patchString: Return replaced string
 *   patchString-->>Caller: Return patched string
 *
 * @memberOf module:TextUtils
 */
function patchPlaceholders(input, values) {
    return input.replace(/\$\{([a-zA-Z0-9_]+)\}/g, (match, variable) => values[variable] || match);
}
function patchString(input, values, flags = "g") {
    Object.entries(values).forEach(([key, val]) => {
        const regexp = new RegExp(escapeRegExp(key), flags);
        input = input.replace(regexp, val);
    });
    return input;
}
/**
 * @description Converts a string to camelCase.
 * @summary Transforms the input string into camelCase format, where words are joined without spaces
 * and each word after the first starts with a capital letter.
 *
 * @param {string} text - The input string to be converted.
 * @return {string} The input string converted to camelCase.
 *
 * @function toCamelCase
 *
 * @memberOf module:TextUtils
 */
function toCamelCase(text) {
    return text
        .replace(/(?:^\w|[A-Z]|\b\w)/g, (word, index) => index === 0 ? word.toLowerCase() : word.toUpperCase())
        .replace(/\s+/g, "");
}
/**
 * @description Converts a string to ENVIRONMENT_VARIABLE format.
 * @summary Transforms the input string into uppercase with words separated by underscores,
 * typically used for environment variable names.
 *
 * @param {string} text - The input string to be converted.
 * @return {string} The input string converted to ENVIRONMENT_VARIABLE format.
 *
 * @function toENVFormat
 *
 * @memberOf module:TextUtils
 */
function toENVFormat(text) {
    return toSnakeCase(text).toUpperCase();
}
/**
 * @description Converts a string to snake_case.
 * @summary Transforms the input string into lowercase with words separated by underscores.
 *
 * @param {string} text - The input string to be converted.
 * @return {string} The input string converted to snake_case.
 *
 * @function toSnakeCase
 *
 * @memberOf module:TextUtils
 */
function toSnakeCase(text) {
    return text
        .replace(/([a-z])([A-Z])/g, "$1_$2")
        .replace(/[\s-]+/g, "_")
        .toLowerCase();
}
/**
 * @description Converts a string to kebab-case.
 * @summary Transforms the input string into lowercase with words separated by hyphens.
 *
 * @param {string} text - The input string to be converted.
 * @return {string} The input string converted to kebab-case.
 *
 * @function toKebabCase
 *
 * @memberOf module:TextUtils
 */
function toKebabCase(text) {
    return text
        .replace(/([a-z])([A-Z])/g, "$1-$2")
        .replace(/[\s_]+/g, "-")
        .toLowerCase();
}
/**
 * @description Converts a string to PascalCase.
 * @summary Transforms the input string into PascalCase format, where words are joined without spaces
 * and each word starts with a capital letter.
 *
 * @param {string} text - The input string to be converted.
 * @return {string} The input string converted to PascalCase.
 *
 * @function toPascalCase
 *
 * @memberOf module:TextUtils
 */
function toPascalCase(text) {
    return text
        .replace(/(?:^\w|[A-Z]|\b\w)/g, (word) => word.toUpperCase())
        .replace(/\s+/g, "");
}
function escapeRegExp(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); // $& means the whole matched string
}


/***/ }),

/***/ 639:
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {


var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.TemplateSync = void 0;
const path_1 = __importDefault(__webpack_require__(928));
const command_1 = __webpack_require__(529);
const utils_1 = __webpack_require__(935);
const input_1 = __webpack_require__(946);
const fs_1 = __importDefault(__webpack_require__(896));
const baseUrl = "https://raw.githubusercontent.com/decaf-ts/ts-workspace/master";
const options = {
    templates: [
        ".github/ISSUE_TEMPLATE/bug_report.md",
        ".github/ISSUE_TEMPLATE/feature_request.md",
        ".github/FUNDING.yml",
    ],
    workflows: [
        ".github/workflows/codeql-analysis.yml",
        ".github/workflows/jest-coverage.yaml",
        ".github/workflows/nodejs-build-prod.yaml",
        ".github/workflows/pages.yaml",
        ".github/workflows/publish-on-release.yaml",
        ".github/workflows/release-on-tag.yaml",
        ".github/workflows/snyk-analysis.yaml",
    ],
    ide: [
        ".idea/runConfigurations/All Tests.run.xml",
        ".idea/runConfigurations/build.run.xml",
        ".idea/runConfigurations/build_prod.run.xml",
        ".idea/runConfigurations/coverage.run.xml",
        ".idea/runConfigurations/docs.run.xml",
        ".idea/runConfigurations/drawings.run.xml",
        ".idea/runConfigurations/flash-forward.run.xml",
        ".idea/runConfigurations/Integration_Tests.run.xml",
        ".idea/runConfigurations/Bundling_Tests.run.xml",
        ".idea/runConfigurations/lint-fix.run.xml",
        ".idea/runConfigurations/release.run.xml",
        ".idea/runConfigurations/test_circular.run.xml",
        ".idea/runConfigurations/uml.run.xml",
        ".idea/runConfigurations/Unit Tests.run.xml",
        ".idea/runConfigurations/update-scripts.run.xml",
    ],
    docs: [
        "workdocs/tutorials/Contributing.md",
        "workdocs/tutorials/Documentation.md",
        "workdocs/tutorials/For Developers.md",
        "workdocs/2-Badges.md",
        "workdocs/jsdocs.json",
        "workdocs/readme-md.json",
    ],
    styles: [".prettierrc", "eslint.config.js"],
    scripts: ["bin/update-scripts.cjs", "bin/tag-release.cjs"],
    typescript: ["tsconfig.json"],
    docker: ["Dockerfile"],
    automation: [
        "workdocs/confluence/Continuous Integration-Deployment/GitHub.md",
        "workdocs/confluence/Continuous Integration-Deployment/Jira.md",
        "workdocs/confluence/Continuous Integration-Deployment/Teams.md",
    ],
};
const argzz = {
    // init attributes
    boot: {
        type: "boolean",
    },
    org: {
        type: "string",
        short: "o",
    },
    name: {
        type: "string",
        short: "n",
        default: undefined,
    },
    author: {
        type: "string",
        short: "a",
        default: undefined,
    },
    // update attributes
    all: {
        type: "boolean",
    },
    license: {
        type: "string",
        message: "Pick the license",
    },
    scripts: {
        type: "boolean",
    },
    styles: {
        type: "boolean",
    },
    docs: {
        type: "boolean",
    },
    ide: {
        type: "boolean",
    },
    workflows: {
        type: "boolean",
    },
    templates: {
        type: "boolean",
    },
    typescript: {
        type: "boolean",
    },
    docker: {
        type: "boolean",
    },
    pkg: {
        type: "boolean",
    },
    automation: {
        type: "boolean",
    },
};
/**
 * @class TemplateSync
 * @extends {Command<CommandOptions<typeof args>, void>}
 * @category scripts
 * @description A command-line tool for synchronizing project templates and configurations.
 * @summary This class provides functionality to download and update various project files and configurations from a remote repository.
 * It supports updating licenses, IDE configurations, scripts, styles, documentation, workflows, and templates.
 *
 * @param {CommandOptions<typeof args>} args - The command options for TemplateSync
 */
class TemplateSync extends command_1.Command {
    constructor() {
        super("TemplateSync", argzz);
        this.replacements = {};
        /**
         * @description Downloads style configuration files.
         * @returns {Promise<void>}
         */
        this.getStyles = () => this.downloadOption("styles");
        /**
         * @description Downloads template files.
         * @returns {Promise<void>}
         */
        this.getTemplates = () => this.downloadOption("templates");
        /**
         * @description Downloads workflow configuration files.
         * @returns {Promise<void>}
         */
        this.getWorkflows = () => this.downloadOption("workflows");
        /**
         * @description Downloads documentation files.
         * @returns {Promise<void>}
         */
        this.getDocs = () => this.downloadOption("docs");
        /**
         * @description Downloads typescript config files.
         * @returns {Promise<void>}
         */
        this.getTypescript = () => this.downloadOption("typescript");
        /**
         * @description Downloads automation documentation files.
         * @returns {Promise<void>}
         */
        this.getAutomation = () => this.downloadOption("automation");
        /**
         * @description Downloads docker image files.
         * @returns {Promise<void>}
         */
        this.getDocker = () => this.downloadOption("docker");
    }
    loadValuesFromPackage() {
        const p = process.cwd();
        const author = (0, utils_1.getPackage)(p, "author");
        const scopedName = (0, utils_1.getPackage)(p, "name");
        let name = scopedName;
        let org;
        if (name.startsWith("@")) {
            const split = name.split("/");
            name = split[1];
            org = split[0].replace("@", "");
        }
        ["Tiago Venceslau", "TiagoVenceslau", "${author}"].forEach((el) => (this.replacements[el] = author));
        ["TS-Workspace", "ts-workspace", "${name}"].forEach((el) => (this.replacements[el] = name));
        ["decaf-ts", "${org}"].forEach((el) => (this.replacements[el] = org || '""'));
        this.replacements["${org_or_owner}"] = org || name;
    }
    /**
     * @description Downloads files for a specific option category.
     * @summary This method downloads all files associated with a given option key from the remote repository.
     * @param {keyof typeof options} key - The key representing the option category to download
     * @returns {Promise<void>}
     * @throws {Error} If the specified option key is not found
     */
    async downloadOption(key) {
        if (!(key in options)) {
            throw new Error(`Option "${key}" not found in options`);
        }
        const files = options[key];
        for (const file of files) {
            this.log.info(`Downloading ${file}`);
            let data = await utils_1.HttpClient.downloadFile(`${baseUrl}/${file}`);
            data = (0, utils_1.patchString)(data, this.replacements);
            (0, utils_1.writeFile)(path_1.default.join(process.cwd(), file), data);
        }
    }
    /**
     * @description Downloads and sets up the specified license.
     * @summary This method downloads the chosen license file, saves it to the project, and updates the package.json license field.
     * @param {"MIT" | "GPL" | "Apache" | "LGPL" | "AGPL"} license - The license to download and set up
     * @returns {Promise<void>}
     */
    async getLicense(license) {
        this.log.info(`Downloading ${license} license`);
        const url = `${baseUrl}/workdocs/licenses/${license}.md`;
        let data = await utils_1.HttpClient.downloadFile(url);
        data = (0, utils_1.patchString)(data, this.replacements);
        (0, utils_1.writeFile)(path_1.default.join(process.cwd(), "LICENSE.md"), data);
        (0, utils_1.setPackageAttribute)("license", license);
    }
    /**
     * @description Downloads IDE configuration files.
     * @returns {Promise<void>}
     */
    async getIde() {
        fs_1.default.mkdirSync(path_1.default.join(process.cwd(), ".idea", "runConfigurations"), {
            recursive: true,
        });
        await this.downloadOption("ide");
    }
    /**
     * @description Update npm scripts
     * @returns {Promise<void>}
     */
    async getScripts() {
        await this.downloadOption("scripts");
        this.log.info("please re-run the command");
        process.exit(0);
    }
    async initPackage(pkgName, author, license) {
        try {
            const pkg = (0, utils_1.getPackage)();
            delete pkg[utils_1.SetupScriptKey];
            pkg.name = pkgName;
            pkg.version = "0.0.1";
            pkg.author = author;
            pkg.license = license;
            fs_1.default.writeFileSync("package.json", JSON.stringify(pkg, null, 2));
        }
        catch (e) {
            throw new Error(`Error fixing package.json: ${e}`);
        }
    }
    async updatePackageScrips() {
        try {
            const originalPkg = JSON.parse(await utils_1.HttpClient.downloadFile(`${baseUrl}/package.json`));
            const { scripts } = originalPkg;
            const pkg = (0, utils_1.getPackage)();
            Object.keys(pkg.scripts).forEach((key) => {
                if (key in scripts) {
                    const replaced = (0, utils_1.patchString)(scripts[key], this.replacements);
                    if (replaced !== scripts[key]) {
                        pkg.scripts[key] = replaced;
                    }
                }
            });
            fs_1.default.writeFileSync("package.json", JSON.stringify(pkg, null, 2));
        }
        catch (e) {
            throw new Error(`Error fixing package.json scripts: ${e}`);
        }
    }
    async createTokenFiles() {
        const log = this.log.for(this.createTokenFiles);
        const gitToken = await input_1.UserInput.insistForText("token", "please input your github token", (res) => {
            return !!res.match(/^ghp_[0-9a-zA-Z]{36}$/g);
        });
        Object.values(utils_1.Tokens).forEach((token) => {
            try {
                let status;
                try {
                    status = fs_1.default.existsSync(token);
                    // eslint-disable-next-line @typescript-eslint/no-unused-vars
                }
                catch (e) {
                    log.info(`Token file ${token} not found. Creating a new one...`);
                    fs_1.default.writeFileSync(token, token === ".token" ? gitToken : "");
                    return;
                }
                if (!status) {
                    fs_1.default.writeFileSync(token, token === ".token" ? gitToken : "");
                }
            }
            catch (e) {
                throw new Error(`Error creating token file ${token}: ${e}`);
            }
        });
    }
    async getOrg() {
        const org = await input_1.UserInput.askText("Organization", "Enter the organization name (will be used to scope your npm project. leave blank to create a unscoped project):");
        const confirmation = await input_1.UserInput.askConfirmation("Confirm organization", "Is this organization correct?", true);
        if (!confirmation)
            return this.getOrg();
        return org;
    }
    async auditFix() {
        return await (0, utils_1.runCommand)("npm audit fix --force").promise;
    }
    patchFiles() {
        const files = [
            ...fs_1.default
                .readdirSync(path_1.default.join(process.cwd(), "src"), {
                recursive: true,
                withFileTypes: true,
            })
                .filter((entry) => entry.isFile())
                .map((entry) => path_1.default.join(entry.parentPath, entry.name)),
            ...fs_1.default
                .readdirSync(path_1.default.join(process.cwd(), "workdocs"), {
                recursive: true,
                withFileTypes: true,
            })
                .filter((entry) => entry.isFile() && entry.name.endsWith(".md"))
                .map((entry) => path_1.default.join(entry.parentPath, entry.name)),
            path_1.default.join(process.cwd(), ".gitlab-ci.yml"),
            path_1.default.join(process.cwd(), "workdocs", "jsdocs.json"),
        ];
        for (const file of files) {
            (0, utils_1.patchFile)(file, this.replacements);
        }
    }
    /**
     * @description Runs the template synchronization process.
     * @summary This method orchestrates the downloading of various project components based on the provided arguments.
     * @param {ParseArgsResult} args - The parsed command-line arguments
     * @returns {Promise<void>}
     *
     * @mermaid
     * sequenceDiagram
     *   participant T as TemplateSync
     *   participant L as getLicense
     *   participant I as getIde
     *   participant S as getScripts
     *   participant St as getStyles
     *   participant D as getDocs
     *   participant W as getWorkflows
     *   participant Te as getTemplates
     *   T->>T: Parse arguments
     *   alt all flag is true
     *     T->>T: Set all component flags to true
     *   end
     *   alt license is specified
     *     T->>L: getLicense(license)
     *   end
     *   alt ide flag is true
     *     T->>I: getIde()
     *   end
     *   alt scripts flag is true
     *     T->>S: getScripts()
     *   end
     *   alt styles flag is true
     *     T->>St: getStyles()
     *   end
     *   alt docs flag is true
     *     T->>D: getDocs()
     *   end
     *   alt workflows flag is true
     *     T->>W: getWorkflows()
     *   end
     *   alt templates flag is true
     *     T->>Te: getTemplates()
     *   end
     */
    async run(args) {
        let { license } = args;
        const { boot } = args;
        let { all, scripts, styles, docs, ide, workflows, templates, docker, typescript, automation, pkg, } = args;
        if (scripts ||
            styles ||
            docs ||
            ide ||
            workflows ||
            templates ||
            docker ||
            typescript ||
            automation ||
            pkg)
            all = false;
        if (boot) {
            const org = await this.getOrg();
            const name = await input_1.UserInput.insistForText("Project name", "Enter the project name:", (res) => res.length > 1);
            const author = await input_1.UserInput.insistForText("Author", "Enter the author name:", (res) => res.length > 1);
            const pkgName = org ? `@${org}/${name}` : name;
            await this.initPackage(pkgName, author, license);
            await this.createTokenFiles();
            await this.auditFix();
            this.patchFiles();
        }
        if (all) {
            scripts = true;
            styles = true;
            docs = true;
            ide = true;
            workflows = true;
            templates = true;
            docker = true;
            typescript = true;
            pkg = true;
            automation = false;
        }
        if (typeof scripts === "undefined")
            scripts = await input_1.UserInput.askConfirmation("scripts", "Do you want to get scripts?", true);
        if (scripts)
            await this.getScripts();
        this.loadValuesFromPackage();
        if (!all && typeof license === "undefined") {
            const confirmation = await input_1.UserInput.askConfirmation("license", "Do you want to set a license?", true);
            if (confirmation)
                license = await input_1.UserInput.insistForText("license", "Enter the desired License (MIT|GPL|Apache|LGPL|AGPL):", (val) => !!val && !!val.match(/^(MIT|GPL|Apache|LGPL|AGPL)$/g));
        }
        await this.getLicense(license);
        if (typeof ide === "undefined")
            ide = await input_1.UserInput.askConfirmation("ide", "Do you want to get ide configs?", true);
        if (ide)
            await this.getIde();
        if (typeof typescript === "undefined")
            typescript = await input_1.UserInput.askConfirmation("typescript", "Do you want to get typescript configs?", true);
        if (typescript)
            await this.getTypescript();
        if (typeof docker === "undefined")
            docker = await input_1.UserInput.askConfirmation("docker", "Do you want to get docker configs?", true);
        if (docker)
            await this.getDocker();
        if (typeof automation === "undefined")
            automation = await input_1.UserInput.askConfirmation("automation", "Do you want to get automation configs?", true);
        if (automation)
            await this.getAutomation();
        if (typeof styles === "undefined")
            styles = await input_1.UserInput.askConfirmation("styles", "Do you want to get styles?", true);
        if (styles)
            await this.getStyles();
        if (typeof docs === "undefined")
            docs = await input_1.UserInput.askConfirmation("docs", "Do you want to get docs?", true);
        if (docs)
            await this.getDocs();
        if (typeof workflows === "undefined")
            workflows = await input_1.UserInput.askConfirmation("workflows", "Do you want to get workflows?", true);
        if (workflows)
            await this.getWorkflows();
        if (typeof templates === "undefined")
            templates = await input_1.UserInput.askConfirmation("templates", "Do you want to get templates?", true);
        if (templates)
            await this.getTemplates();
        if (typeof pkg === "undefined")
            pkg = await input_1.UserInput.askConfirmation("pkg", "Do you update your package.json scripts?", true);
        if (pkg)
            await this.updatePackageScrips();
    }
}
exports.TemplateSync = TemplateSync;


/***/ }),

/***/ 680:
/***/ ((module) => {

module.exports = /*#__PURE__*/JSON.parse('[{"Slogan":"No caffeine, no chaos. Just clean code.","Tags":"Coffee-themed, Calm, Tech"},{"Slogan":"Full flavor, no jitters. That\'s Decaf-TS.","Tags":"Coffee-themed, Cheerful"},{"Slogan":"Chill fullstack. Powered by Decaf.","Tags":"Coffee-themed, Fun, Tech"},{"Slogan":"Decaf-TS: Brewed for calm code.","Tags":"Coffee-themed, Branding"},{"Slogan":"Smooth as your morning Decaf.","Tags":"Coffee-themed, Chill"},{"Slogan":"All the kick, none of the crash.","Tags":"Coffee-themed, Energetic"},{"Slogan":"Sip back and ship faster.","Tags":"Coffee-themed, Fun"},{"Slogan":"Keep calm and code Decaf.","Tags":"Coffee-themed, Playful"},{"Slogan":"Code without the caffeine shakes.","Tags":"Coffee-themed, Humorous"},{"Slogan":"Your fullstack, decaffeinated.","Tags":"Coffee-themed, Technical"},{"Slogan":"No caffeine, no chaos. Just clean code.","Tags":"Coffee-themed, Calm, Tech"},{"Slogan":"Full flavor, no jitters. That’s Decaf-TS.","Tags":"Coffee-themed, Cheerful"},{"Slogan":"Chill fullstack. Powered by Decaf.","Tags":"Coffee-themed, Fun, Tech"},{"Slogan":"Decaf-TS: Brewed for calm code.","Tags":"Coffee-themed, Branding"},{"Slogan":"Smooth as your morning Decaf.","Tags":"Coffee-themed, Chill"},{"Slogan":"All the kick, none of the crash.","Tags":"Coffee-themed, Energetic"},{"Slogan":"Sip back and ship faster.","Tags":"Coffee-themed, Fun"},{"Slogan":"Keep calm and code Decaf.","Tags":"Coffee-themed, Playful"},{"Slogan":"Code without the caffeine shakes.","Tags":"Coffee-themed, Humorous"},{"Slogan":"Your fullstack, decaffeinated.","Tags":"Coffee-themed, Technical"},{"Slogan":"No caffeine, no chaos. Just clean code.","Tags":"Coffee-themed, Calm, Tech"},{"Slogan":"Full flavor, no jitters. That’s Decaf-TS.","Tags":"Coffee-themed, Cheerful"},{"Slogan":"Chill fullstack. Powered by Decaf.","Tags":"Coffee-themed, Fun, Tech"},{"Slogan":"Decaf-TS: Brewed for calm code.","Tags":"Coffee-themed, Branding"},{"Slogan":"Smooth as your morning Decaf.","Tags":"Coffee-themed, Chill"},{"Slogan":"All the kick, none of the crash.","Tags":"Coffee-themed, Energetic"},{"Slogan":"Sip back and ship faster.","Tags":"Coffee-themed, Fun"},{"Slogan":"Keep calm and code Decaf.","Tags":"Coffee-themed, Playful"},{"Slogan":"Code without the caffeine shakes.","Tags":"Coffee-themed, Humorous"},{"Slogan":"Your fullstack, decaffeinated.","Tags":"Coffee-themed, Technical"},{"Slogan":"No caffeine, no chaos. Just clean code.","Tags":"Coffee-themed, Calm, Tech"},{"Slogan":"Full flavor, no jitters. That’s Decaf-TS.","Tags":"Coffee-themed, Cheerful"},{"Slogan":"Chill fullstack. Powered by Decaf.","Tags":"Coffee-themed, Fun, Tech"},{"Slogan":"Decaf-TS: Brewed for calm code.","Tags":"Coffee-themed, Branding"},{"Slogan":"Smooth as your morning Decaf.","Tags":"Coffee-themed, Chill"},{"Slogan":"All the kick, none of the crash.","Tags":"Coffee-themed, Energetic"},{"Slogan":"Sip back and ship faster.","Tags":"Coffee-themed, Fun"},{"Slogan":"Keep calm and code Decaf.","Tags":"Coffee-themed, Playful"},{"Slogan":"Code without the caffeine shakes.","Tags":"Coffee-themed, Humorous"},{"Slogan":"Your fullstack, decaffeinated.","Tags":"Coffee-themed, Technical"},{"Slogan":"No caffeine, no chaos. Just clean code.","Tags":"Coffee-themed, Calm, Tech"},{"Slogan":"Full flavor, no jitters. That’s Decaf-TS.","Tags":"Coffee-themed, Cheerful"},{"Slogan":"Chill fullstack. Powered by Decaf.","Tags":"Coffee-themed, Fun, Tech"},{"Slogan":"Decaf-TS: Brewed for calm code.","Tags":"Coffee-themed, Branding"},{"Slogan":"Smooth as your morning Decaf.","Tags":"Coffee-themed, Chill"},{"Slogan":"All the kick, none of the crash.","Tags":"Coffee-themed, Energetic"},{"Slogan":"Sip back and ship faster.","Tags":"Coffee-themed, Fun"},{"Slogan":"Keep calm and code Decaf.","Tags":"Coffee-themed, Playful"},{"Slogan":"Code without the caffeine shakes.","Tags":"Coffee-themed, Humorous"},{"Slogan":"Your fullstack, decaffeinated.","Tags":"Coffee-themed, Technical"},{"Slogan":"No caffeine, no chaos. Just clean code.","Tags":"Coffee-themed, Calm, Tech"},{"Slogan":"Full flavor, no jitters. That’s Decaf-TS.","Tags":"Coffee-themed, Cheerful"},{"Slogan":"Chill fullstack. Powered by Decaf.","Tags":"Coffee-themed, Fun, Tech"},{"Slogan":"Decaf-TS: Brewed for calm code.","Tags":"Coffee-themed, Branding"},{"Slogan":"Smooth as your morning Decaf.","Tags":"Coffee-themed, Chill"},{"Slogan":"All the kick, none of the crash.","Tags":"Coffee-themed, Energetic"},{"Slogan":"Sip back and ship faster.","Tags":"Coffee-themed, Fun"},{"Slogan":"Keep calm and code Decaf.","Tags":"Coffee-themed, Playful"},{"Slogan":"Code without the caffeine shakes.","Tags":"Coffee-themed, Humorous"},{"Slogan":"Your fullstack, decaffeinated.","Tags":"Coffee-themed, Technical"},{"Slogan":"No caffeine, no chaos. Just clean code.","Tags":"Coffee-themed, Calm, Tech"},{"Slogan":"Full flavor, no jitters. That’s Decaf-TS.","Tags":"Coffee-themed, Cheerful"},{"Slogan":"Chill fullstack. Powered by Decaf.","Tags":"Coffee-themed, Fun, Tech"},{"Slogan":"Decaf-TS: Brewed for calm code.","Tags":"Coffee-themed, Branding"},{"Slogan":"Smooth as your morning Decaf.","Tags":"Coffee-themed, Chill"},{"Slogan":"All the kick, none of the crash.","Tags":"Coffee-themed, Energetic"},{"Slogan":"Sip back and ship faster.","Tags":"Coffee-themed, Fun"},{"Slogan":"Keep calm and code Decaf.","Tags":"Coffee-themed, Playful"},{"Slogan":"Code without the caffeine shakes.","Tags":"Coffee-themed, Humorous"},{"Slogan":"Your fullstack, decaffeinated.","Tags":"Coffee-themed, Technical"},{"Slogan":"No caffeine, no chaos. Just clean code.","Tags":"Coffee-themed, Calm, Tech"},{"Slogan":"Full flavor, no jitters. That’s Decaf-TS.","Tags":"Coffee-themed, Cheerful"},{"Slogan":"Chill fullstack. Powered by Decaf.","Tags":"Coffee-themed, Fun, Tech"},{"Slogan":"Decaf-TS: Brewed for calm code.","Tags":"Coffee-themed, Branding"},{"Slogan":"Smooth as your morning Decaf.","Tags":"Coffee-themed, Chill"},{"Slogan":"All the kick, none of the crash.","Tags":"Coffee-themed, Energetic"},{"Slogan":"Sip back and ship faster.","Tags":"Coffee-themed, Fun"},{"Slogan":"Keep calm and code Decaf.","Tags":"Coffee-themed, Playful"},{"Slogan":"Code without the caffeine shakes.","Tags":"Coffee-themed, Humorous"},{"Slogan":"Your fullstack, decaffeinated.","Tags":"Coffee-themed, Technical"},{"Slogan":"No caffeine, no chaos. Just clean code.","Tags":"Coffee-themed, Calm, Tech"},{"Slogan":"Full flavor, no jitters. That’s Decaf-TS.","Tags":"Coffee-themed, Cheerful"},{"Slogan":"Chill fullstack. Powered by Decaf.","Tags":"Coffee-themed, Fun, Tech"},{"Slogan":"Decaf-TS: Brewed for calm code.","Tags":"Coffee-themed, Branding"},{"Slogan":"Smooth as your morning Decaf.","Tags":"Coffee-themed, Chill"},{"Slogan":"All the kick, none of the crash.","Tags":"Coffee-themed, Energetic"},{"Slogan":"Sip back and ship faster.","Tags":"Coffee-themed, Fun"},{"Slogan":"Keep calm and code Decaf.","Tags":"Coffee-themed, Playful"},{"Slogan":"Code without the caffeine shakes.","Tags":"Coffee-themed, Humorous"},{"Slogan":"Your fullstack, decaffeinated.","Tags":"Coffee-themed, Technical"},{"Slogan":"No caffeine, no chaos. Just clean code.","Tags":"Coffee-themed, Calm, Tech"},{"Slogan":"Full flavor, no jitters. That’s Decaf-TS.","Tags":"Coffee-themed, Cheerful"},{"Slogan":"Chill fullstack. Powered by Decaf.","Tags":"Coffee-themed, Fun, Tech"},{"Slogan":"Decaf-TS: Brewed for calm code.","Tags":"Coffee-themed, Branding"},{"Slogan":"Smooth as your morning Decaf.","Tags":"Coffee-themed, Chill"},{"Slogan":"All the kick, none of the crash.","Tags":"Coffee-themed, Energetic"},{"Slogan":"Sip back and ship faster.","Tags":"Coffee-themed, Fun"},{"Slogan":"Keep calm and code Decaf.","Tags":"Coffee-themed, Playful"},{"Slogan":"Code without the caffeine shakes.","Tags":"Coffee-themed, Humorous"},{"Slogan":"Your fullstack, decaffeinated.","Tags":"Coffee-themed, Technical"},{"Slogan":"Decaf-TS: Where smart contracts meet smart interfaces.","Tags":"Blockchain, Smart Contracts, Tech"},{"Slogan":"Ship dApps without the stress.","Tags":"Blockchain, Cheerful, Developer"},{"Slogan":"No CRUD, no problem — Decaf your data.","Tags":"Data, No-CRUD, Chill"},{"Slogan":"From DID to UI, without breaking a sweat.","Tags":"DID, SSI, UI, Calm"},{"Slogan":"Decaf-TS: Your frontend already understands your smart contract.","Tags":"Smart Contracts, DX, Magic"},{"Slogan":"Self-sovereign by design. Productive by default.","Tags":"SSI, Developer, Calm"},{"Slogan":"Build once. Deploy everywhere. Decentralized and delightful.","Tags":"Blockchain, Multi-platform, Happy"},{"Slogan":"Data that defines its own destiny.","Tags":"SSI, Data-driven, Empowerment"},{"Slogan":"Goodbye CRUD, hello intent-based interfaces.","Tags":"No-CRUD, UI, Technical"},{"Slogan":"The smoothest path from DID to done.","Tags":"DID, Workflow, Chill"},{"Slogan":"Because your dApp deserves more than boilerplate.","Tags":"Blockchain, DevX, Efficiency"},{"Slogan":"Own your data. Own your flow.","Tags":"SSI, Control, Ownership"},{"Slogan":"Write logic like it belongs with the data — because it does.","Tags":"Data Logic, Developer, Smart"},{"Slogan":"From smart contracts to smarter frontends.","Tags":"Smart Contracts, UI, DX"},{"Slogan":"No caffeine. No CRUD. Just the future.","Tags":"No-CRUD, Coffee-themed, Futuristic"},{"Slogan":"The future of web3 UX is Decaf.","Tags":"Blockchain, UX, Vision"},{"Slogan":"Code with confidence. Govern with clarity.","Tags":"Blockchain, Governance, Calm"},{"Slogan":"Interfaces that obey the data, not the other way around.","Tags":"UI, Data Logic, Self-aware"},{"Slogan":"Brew business logic right into your bytes.","Tags":"Data Logic, Coffee-themed, Fun"},{"Slogan":"DIDs done differently — and delightfully.","Tags":"DID, Self-Sovereign, Playful"},{"Slogan":"Decaf-TS-TS: Where blockchain contracts meet smart interfaces.","Tags":"Blockchain, Smart Contracts, Tech"},{"Slogan":"Ship dApps without the stress.","Tags":"Blockchain, Cheerful, Developer"},{"Slogan":"No boilerplate, no problem — Decaf-TS your data.","Tags":"Data, No-CRUD, Chill"},{"Slogan":"From DID to UI, without breaking a sweat.","Tags":"DID, SSI, UI, Calm"},{"Slogan":"Decaf-TS-TS: Your frontend already understands your blockchain contract.","Tags":"Smart Contracts, DX, Magic"},{"Slogan":"Self-sovereign by design. Productive by default.","Tags":"SSI, Developer, Calm"},{"Slogan":"Build once. Deploy everywhere. Decentralized and delightful.","Tags":"Blockchain, Multi-platform, Happy"},{"Slogan":"Data that defines its own destiny.","Tags":"SSI, Data-driven, Empowerment"},{"Slogan":"Goodbye boilerplate, hello intent-based interfaces.","Tags":"No-CRUD, UI, Technical"},{"Slogan":"The smoothest path from DID to done.","Tags":"DID, Workflow, Chill"},{"Slogan":"Because your dApp deserves more than boilerplate.","Tags":"Blockchain, DevX, Efficiency"},{"Slogan":"Own your data. Own your flow.","Tags":"SSI, Control, Ownership"},{"Slogan":"Write logic like it belongs with the data — because it does.","Tags":"Data Logic, Developer, Smart"},{"Slogan":"From blockchain contracts to smarter frontends.","Tags":"Smart Contracts, UI, DX"},{"Slogan":"No caffeine. No boilerplate. Just the future.","Tags":"No-CRUD, Coffee-themed, Futuristic"},{"Slogan":"The future of web3 UX is Decaf-TS.","Tags":"Blockchain, UX, Vision"},{"Slogan":"Code with confidence. Govern with clarity.","Tags":"Blockchain, Governance, Calm"},{"Slogan":"Interfaces that obey the data, not the other way around.","Tags":"UI, Data Logic, Self-aware"},{"Slogan":"Brew business logic right into your bytes.","Tags":"Data Logic, Coffee-themed, Fun"},{"Slogan":"DIDs done differently — and delightfully.","Tags":"DID, Self-Sovereign, Playful"},{"Slogan":"Decaf-TS-TS: Where blockchain contracts meet smart interfaces.","Tags":"Blockchain, Smart Contracts, Tech"},{"Slogan":"Ship dApps without the stress.","Tags":"Blockchain, Cheerful, Developer"},{"Slogan":"No boilerplate, no problem — Decaf-TS your data.","Tags":"Data, No-CRUD, Chill"},{"Slogan":"From DID to UI, without breaking a sweat.","Tags":"DID, SSI, UI, Calm"},{"Slogan":"Decaf-TS-TS: Your frontend already understands your blockchain contract.","Tags":"Smart Contracts, DX, Magic"},{"Slogan":"Self-sovereign by design. Productive by default.","Tags":"SSI, Developer, Calm"},{"Slogan":"Build once. Deploy everywhere. Decentralized and delightful.","Tags":"Blockchain, Multi-platform, Happy"},{"Slogan":"Data that defines its own destiny.","Tags":"SSI, Data-driven, Empowerment"},{"Slogan":"Goodbye boilerplate, hello intent-based interfaces.","Tags":"No-CRUD, UI, Technical"},{"Slogan":"The smoothest path from DID to done.","Tags":"DID, Workflow, Chill"},{"Slogan":"Because your dApp deserves more than boilerplate.","Tags":"Blockchain, DevX, Efficiency"},{"Slogan":"Own your data. Own your flow.","Tags":"SSI, Control, Ownership"},{"Slogan":"Write logic like it belongs with the data — because it does.","Tags":"Data Logic, Developer, Smart"},{"Slogan":"From blockchain contracts to smarter frontends.","Tags":"Smart Contracts, UI, DX"},{"Slogan":"No caffeine. No boilerplate. Just the future.","Tags":"No-CRUD, Coffee-themed, Futuristic"},{"Slogan":"The future of web3 UX is Decaf-TS.","Tags":"Blockchain, UX, Vision"},{"Slogan":"Code with confidence. Govern with clarity.","Tags":"Blockchain, Governance, Calm"},{"Slogan":"Interfaces that obey the data, not the other way around.","Tags":"UI, Data Logic, Self-aware"},{"Slogan":"Brew business logic right into your bytes.","Tags":"Data Logic, Coffee-themed, Fun"},{"Slogan":"DIDs done differently — and delightfully.","Tags":"DID, Self-Sovereign, Playful"},{"Slogan":"Decaf-TS-TS: Where blockchain contracts meet smart interfaces.","Tags":"Blockchain, Smart Contracts, Tech"},{"Slogan":"Ship dApps without the stress.","Tags":"Blockchain, Cheerful, Developer"},{"Slogan":"No boilerplate, no problem — Decaf-TS your data.","Tags":"Data, No-CRUD, Chill"},{"Slogan":"From DID to UI, without breaking a sweat.","Tags":"DID, SSI, UI, Calm"},{"Slogan":"Decaf-TS-TS: Your frontend already understands your blockchain contract.","Tags":"Smart Contracts, DX, Magic"},{"Slogan":"Self-sovereign by design. Productive by default.","Tags":"SSI, Developer, Calm"},{"Slogan":"Build once. Deploy everywhere. Decentralized and delightful.","Tags":"Blockchain, Multi-platform, Happy"},{"Slogan":"Data that defines its own destiny.","Tags":"SSI, Data-driven, Empowerment"},{"Slogan":"Goodbye boilerplate, hello intent-based interfaces.","Tags":"No-CRUD, UI, Technical"},{"Slogan":"The smoothest path from DID to done.","Tags":"DID, Workflow, Chill"},{"Slogan":"Because your dApp deserves more than boilerplate.","Tags":"Blockchain, DevX, Efficiency"},{"Slogan":"Own your data. Own your flow.","Tags":"SSI, Control, Ownership"},{"Slogan":"Write logic like it belongs with the data — because it does.","Tags":"Data Logic, Developer, Smart"},{"Slogan":"From blockchain contracts to smarter frontends.","Tags":"Smart Contracts, UI, DX"},{"Slogan":"No caffeine. No boilerplate. Just the future.","Tags":"No-CRUD, Coffee-themed, Futuristic"},{"Slogan":"The future of web3 UX is Decaf-TS.","Tags":"Blockchain, UX, Vision"},{"Slogan":"Code with confidence. Govern with clarity.","Tags":"Blockchain, Governance, Calm"},{"Slogan":"Interfaces that obey the data, not the other way around.","Tags":"UI, Data Logic, Self-aware"},{"Slogan":"Brew business logic right into your bytes.","Tags":"Data Logic, Coffee-themed, Fun"},{"Slogan":"DIDs done differently — and delightfully.","Tags":"DID, Self-Sovereign, Playful"},{"Slogan":"Decaf-TS-TS: Where blockchain contracts meet smart interfaces.","Tags":"Blockchain, Smart Contracts, Tech"},{"Slogan":"Ship dApps without the stress.","Tags":"Blockchain, Cheerful, Developer"},{"Slogan":"No boilerplate, no problem — Decaf-TS your data.","Tags":"Data, No-CRUD, Chill"},{"Slogan":"From DID to UI, without breaking a sweat.","Tags":"DID, SSI, UI, Calm"},{"Slogan":"Decaf-TS-TS: Your frontend already understands your blockchain contract.","Tags":"Smart Contracts, DX, Magic"},{"Slogan":"Self-sovereign by design. Productive by default.","Tags":"SSI, Developer, Calm"},{"Slogan":"Build once. Deploy everywhere. Decentralized and delightful.","Tags":"Blockchain, Multi-platform, Happy"},{"Slogan":"Data that defines its own destiny.","Tags":"SSI, Data-driven, Empowerment"},{"Slogan":"Goodbye boilerplate, hello intent-based interfaces.","Tags":"No-CRUD, UI, Technical"},{"Slogan":"The smoothest path from DID to done.","Tags":"DID, Workflow, Chill"},{"Slogan":"Because your dApp deserves more than boilerplate.","Tags":"Blockchain, DevX, Efficiency"},{"Slogan":"Own your data. Own your flow.","Tags":"SSI, Control, Ownership"},{"Slogan":"Write logic like it belongs with the data — because it does.","Tags":"Data Logic, Developer, Smart"},{"Slogan":"From blockchain contracts to smarter frontends.","Tags":"Smart Contracts, UI, DX"},{"Slogan":"No caffeine. No boilerplate. Just the future.","Tags":"No-CRUD, Coffee-themed, Futuristic"},{"Slogan":"The future of web3 UX is Decaf-TS.","Tags":"Blockchain, UX, Vision"},{"Slogan":"Code with confidence. Govern with clarity.","Tags":"Blockchain, Governance, Calm"},{"Slogan":"Interfaces that obey the data, not the other way around.","Tags":"UI, Data Logic, Self-aware"},{"Slogan":"Brew business logic right into your bytes.","Tags":"Data Logic, Coffee-themed, Fun"},{"Slogan":"DIDs done differently — and delightfully.","Tags":"DID, Self-Sovereign, Playful"}]');

/***/ }),

/***/ 686:
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.lockify = lockify;
exports.chainAbortController = chainAbortController;
exports.spawnCommand = spawnCommand;
exports.runCommand = runCommand;
const child_process_1 = __webpack_require__(317);
const StandardOutputWriter_1 = __webpack_require__(499);
const logging_1 = __webpack_require__(834);
const constants_1 = __webpack_require__(154);
/**
 * @description Creates a locked version of a function.
 * @summary This higher-order function takes a function and returns a new function that ensures
 * sequential execution of the original function, even when called multiple times concurrently.
 * It uses a Promise-based locking mechanism to queue function calls.
 *
 * @template R - The return type of the input function.
 *
 * @param f - The function to be locked. It can take any number of parameters and return a value of type R.
 * @return A new function with the same signature as the input function, but with sequential execution guaranteed.
 *
 * @function lockify
 *
 * @mermaid
 * sequenceDiagram
 *   participant Caller
 *   participant LockedFunction
 *   participant OriginalFunction
 *   Caller->>LockedFunction: Call with params
 *   LockedFunction->>LockedFunction: Check current lock
 *   alt Lock is resolved
 *     LockedFunction->>OriginalFunction: Execute with params
 *     OriginalFunction-->>LockedFunction: Return result
 *     LockedFunction-->>Caller: Return result
 *   else Lock is pending
 *     LockedFunction->>LockedFunction: Queue execution
 *     LockedFunction-->>Caller: Return promise
 *     Note over LockedFunction: Wait for previous execution
 *     LockedFunction->>OriginalFunction: Execute with params
 *     OriginalFunction-->>LockedFunction: Return result
 *     LockedFunction-->>Caller: Resolve promise with result
 *   end
 *   LockedFunction->>LockedFunction: Update lock
 *
 * @memberOf @decaf-ts/utils
 */
function lockify(f) {
    let lock = Promise.resolve();
    return (...params) => {
        const result = lock.then(() => f(...params));
        lock = result.catch(() => { });
        return result;
    };
}
function chainAbortController(argument0, ...remainder) {
    let signals;
    let controller;
    // normalize args
    if (argument0 instanceof AbortSignal) {
        controller = new AbortController();
        signals = [argument0, ...remainder];
    }
    else {
        controller = argument0;
        signals = remainder;
    }
    // if the controller is already aborted, exit early
    if (controller.signal.aborted) {
        return controller;
    }
    const handler = () => controller.abort();
    for (const signal of signals) {
        // check before adding! (and assume there is no possible way that the signal could
        // abort between the `if` check and adding the event listener)
        if (signal.aborted) {
            controller.abort();
            break;
        }
        signal.addEventListener("abort", handler, {
            once: true,
            signal: controller.signal,
        });
    }
    return controller;
}
function spawnCommand(output, command, opts, abort, logger) {
    function spawnInner(command, controller) {
        const [cmd, argz] = output.parseCommand(command);
        logger.info(`Running command: ${cmd}`);
        logger.debug(`with args: ${argz.join(" ")}`);
        const childProcess = (0, child_process_1.spawn)(cmd, argz, {
            ...opts,
            cwd: opts.cwd || process.cwd(),
            env: Object.assign({}, process.env, opts.env, { PATH: process.env.PATH }),
            shell: opts.shell || false,
            signal: controller.signal,
        });
        logger.verbose(`pid : ${childProcess.pid}`);
        return childProcess;
    }
    const m = command.match(/[<>$#]/g);
    if (m)
        throw new Error(`Invalid command: ${command}. contains invalid characters: ${m}`);
    if (command.includes(" | ")) {
        const cmds = command.split(" | ");
        const spawns = [];
        const controllers = new Array(cmds.length);
        controllers[0] = abort;
        for (let i = 0; i < cmds.length; i++) {
            if (i !== 0)
                controllers[i] = chainAbortController(controllers[i - 1].signal);
            spawns.push(spawnInner(cmds[i], controllers[i]));
            if (i === 0)
                continue;
            spawns[i - 1].stdout.pipe(spawns[i].stdin);
        }
        return spawns[cmds.length - 1];
    }
    return spawnInner(command, abort);
}
/**
 * @description Executes a command asynchronously with customizable output handling.
 * @summary This function runs a shell command as a child process, providing fine-grained
 * control over its execution and output handling. It supports custom output writers,
 * allows for command abortion, and captures both stdout and stderr.
 *
 * @template R - The type of the resolved value from the command execution.
 *
 * @param command - The command to run, either as a string or an array of strings.
 * @param opts - Spawn options for the child process. Defaults to an empty object.
 * @param outputConstructor - Constructor for the output writer. Defaults to StandardOutputWriter.
 * @param args - Additional arguments to pass to the output constructor.
 * @return {CommandResult} A promise that resolves to the command result of type R.
 *
 * @function runCommand
 *
 * @mermaid
 * sequenceDiagram
 *   participant Caller
 *   participant runCommand
 *   participant OutputWriter
 *   participant ChildProcess
 *   Caller->>runCommand: Call with command and options
 *   runCommand->>OutputWriter: Create new instance
 *   runCommand->>OutputWriter: Parse command
 *   runCommand->>ChildProcess: Spawn process
 *   ChildProcess-->>runCommand: Return process object
 *   runCommand->>ChildProcess: Set up event listeners
 *   loop For each stdout data
 *     ChildProcess->>runCommand: Emit stdout data
 *     runCommand->>OutputWriter: Handle stdout data
 *   end
 *   loop For each stderr data
 *     ChildProcess->>runCommand: Emit stderr data
 *     runCommand->>OutputWriter: Handle stderr data
 *   end
 *   ChildProcess->>runCommand: Emit error (if any)
 *   runCommand->>OutputWriter: Handle error
 *   ChildProcess->>runCommand: Emit exit
 *   runCommand->>OutputWriter: Handle exit
 *   OutputWriter-->>runCommand: Resolve or reject promise
 *   runCommand-->>Caller: Return CommandResult
 *
 * @memberOf @decaf-ts/utils
 */
function runCommand(command, opts = {}, outputConstructor = (StandardOutputWriter_1.StandardOutputWriter), ...args) {
    const logger = logging_1.Logging.for(runCommand);
    const abort = new AbortController();
    const result = {
        abort: abort,
        command: command,
        logs: [],
        errs: [],
    };
    const lock = new Promise((resolve, reject) => {
        let output;
        try {
            output = new outputConstructor(command, {
                resolve,
                reject,
            }, ...args);
            result.cmd = spawnCommand(output, command, opts, abort, logger);
        }
        catch (e) {
            return reject(new Error(`Error running command ${command}: ${e}`));
        }
        result.cmd.stdout.setEncoding("utf8");
        result.cmd.stdout.on("data", (chunk) => {
            chunk = chunk.toString();
            result.logs.push(chunk);
            output.data(chunk);
        });
        result.cmd.stderr.on("data", (data) => {
            data = data.toString();
            result.errs.push(data);
            output.error(data);
        });
        result.cmd.once("error", (err) => {
            output.exit(err.message, result.errs);
        });
        result.cmd.once("exit", (code = 0) => {
            if (abort.signal.aborted && code === null)
                code = constants_1.AbortCode;
            output.exit(code, code === 0 ? result.logs : result.errs);
        });
    });
    Object.assign(result, {
        promise: lock,
        pipe: async (cb) => {
            const l = logger.for("pipe");
            try {
                l.verbose(`Executing pipe function ${command}...`);
                const result = await lock;
                l.verbose(`Piping output to ${cb.name}: ${result}`);
                return cb(result);
            }
            catch (e) {
                l.error(`Error piping command output: ${e}`);
                throw e;
            }
        },
    });
    return result;
}


/***/ }),

/***/ 692:
/***/ ((module) => {

module.exports = require("https");

/***/ }),

/***/ 714:
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {


var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.UserInput = void 0;
const prompts_1 = __importDefault(__webpack_require__(443));
const util_1 = __webpack_require__(23);
const logging_1 = __webpack_require__(834);
/**
 * @description Represents a user input prompt with various configuration options.
 * @summary This class provides a flexible interface for creating and managing user input prompts.
 * It implements the PromptObject interface from the 'prompts' library and offers methods to set
 * various properties of the prompt. The class also includes static methods for common input scenarios
 * and argument parsing.
 *
 * @template R - The type of the prompt name, extending string.
 *
 * @param name - The name of the prompt, used as the key in the returned answers object.
 *
 * @class
 */
class UserInput {
    static { this.logger = logging_1.Logging.for(UserInput); }
    /**
     * @description Creates a new UserInput instance.
     * @summary Initializes a new UserInput object with the given name.
     *
     * @param name - The name of the prompt.
     */
    constructor(name) {
        /**
         * @description The type of the prompt.
         * @summary Determines the input method (e.g., text, number, confirm).
         */
        this.type = "text";
        this.name = name;
    }
    /**
     * @description Sets the type of the prompt.
     * @summary Configures the input method for the prompt.
     *
     * @param type - The type of the prompt.
     * @returns This UserInput instance for method chaining.
     */
    setType(type) {
        UserInput.logger.verbose(`Setting type to: ${type}`);
        this.type = type;
        return this;
    }
    /**
     * @description Sets the message of the prompt.
     * @summary Configures the question or instruction presented to the user.
     *
     * @param value - The message to be displayed.
     * @returns This UserInput instance for method chaining.
     */
    setMessage(value) {
        UserInput.logger.verbose(`Setting message to: ${value}`);
        this.message = value;
        return this;
    }
    /**
     * @description Sets the initial value of the prompt.
     * @summary Configures the default value presented to the user.
     *
     * @param value - The initial value.
     * @returns This UserInput instance for method chaining.
     */
    setInitial(value) {
        UserInput.logger.verbose(`Setting initial value to: ${value}`);
        this.initial = value;
        return this;
    }
    /**
     * @description Sets the style of the prompt.
     * @summary Configures the visual style of the prompt.
     *
     * @param value - The style to be applied.
     * @returns This UserInput instance for method chaining.
     */
    setStyle(value) {
        UserInput.logger.verbose(`Setting style to: ${value}`);
        this.style = value;
        return this;
    }
    /**
     * @description Sets the format function of the prompt.
     * @summary Configures a function to format the user's input before it's returned.
     *
     * @param value - The format function.
     * @returns This UserInput instance for method chaining.
     */
    setFormat(value) {
        UserInput.logger.verbose(`Setting format function`);
        this.format = value;
        return this;
    }
    /**
     * @description Sets the validation function of the prompt.
     * @summary Configures a function to validate the user's input.
     *
     * @param value - The validation function.
     * @returns This UserInput instance for method chaining.
     */
    setValidate(value) {
        UserInput.logger.verbose(`Setting validate function`);
        this.validate = value;
        return this;
    }
    /**
     * @description Sets the onState callback of the prompt.
     * @summary Configures a function to be called when the state of the prompt changes.
     *
     * @param value - The onState callback function.
     * @returns This UserInput instance for method chaining.
     */
    setOnState(value) {
        UserInput.logger.verbose(`Setting onState callback`);
        this.onState = value;
        return this;
    }
    /**
     * @description Sets the onRender callback of the prompt.
     * @summary Configures a function to be called when the prompt is rendered.
     *
     * @param value - The onRender callback function.
     * @returns This UserInput instance for method chaining.
     */
    setOnRender(value) {
        UserInput.logger.verbose(`Setting onRender callback`);
        this.onRender = value;
        return this;
    }
    /**
     * @description Sets the minimum value for number inputs.
     * @summary Configures the lowest number the user can input.
     *
     * @param value - The minimum value.
     * @returns This UserInput instance for method chaining.
     */
    setMin(value) {
        UserInput.logger.verbose(`Setting min value to: ${value}`);
        this.min = value;
        return this;
    }
    /**
     * @description Sets the maximum value for number inputs.
     * @summary Configures the highest number the user can input.
     *
     * @param value - The maximum value.
     * @returns This UserInput instance for method chaining.
     */
    setMax(value) {
        UserInput.logger.verbose(`Setting max value to: ${value}`);
        this.max = value;
        return this;
    }
    /**
     * @description Sets whether to allow float values for number inputs.
     * @summary Configures whether decimal numbers are allowed.
     *
     * @param value - Whether to allow float values.
     * @returns This UserInput instance for method chaining.
     */
    setFloat(value) {
        UserInput.logger.verbose(`Setting float to: ${value}`);
        this.float = value;
        return this;
    }
    /**
     * @description Sets the number of decimal places to round to for float inputs.
     * @summary Configures the precision of float inputs.
     *
     * @param value - The number of decimal places.
     * @returns This UserInput instance for method chaining.
     */
    setRound(value) {
        UserInput.logger.verbose(`Setting round to: ${value}`);
        this.round = value;
        return this;
    }
    /**
     * @description Sets the instructions for the user.
     * @summary Configures additional guidance provided to the user.
     *
     * @param value - The instructions.
     * @returns This UserInput instance for method chaining.
     */
    setInstructions(value) {
        UserInput.logger.verbose(`Setting instructions to: ${value}`);
        this.instructions = value;
        return this;
    }
    /**
     * @description Sets the increment value for number inputs.
     * @summary Configures the step size when increasing or decreasing the number.
     *
     * @param value - The increment value.
     * @returns This UserInput instance for method chaining.
     */
    setIncrement(value) {
        UserInput.logger.verbose(`Setting increment to: ${value}`);
        this.increment = value;
        return this;
    }
    /**
     * @description Sets the separator for list inputs.
     * @summary Configures the character used to separate list items.
     *
     * @param value - The separator character.
     * @returns This UserInput instance for method chaining.
     */
    setSeparator(value) {
        UserInput.logger.verbose(`Setting separator to: ${value}`);
        this.separator = value;
        return this;
    }
    /**
     * @description Sets the active option style for select inputs.
     * @summary Configures the style applied to the currently selected option.
     *
     * @param value - The active option style.
     * @returns This UserInput instance for method chaining.
     */
    setActive(value) {
        UserInput.logger.verbose(`Setting active style to: ${value}`);
        this.active = value;
        return this;
    }
    /**
     * @description Sets the inactive option style for select inputs.
     * @summary Configures the style applied to non-selected options.
     *
     * @param value - The inactive option style.
     * @returns This UserInput instance for method chaining.
     */
    setInactive(value) {
        UserInput.logger.verbose(`Setting inactive style to: ${value}`);
        this.inactive = value;
        return this;
    }
    /**
     * @description Sets the choices for select inputs.
     * @summary Configures the list of options presented to the user.
     *
     * @param value - The list of choices.
     * @returns This UserInput instance for method chaining.
     */
    setChoices(value) {
        UserInput.logger.verbose(`Setting choices: ${JSON.stringify(value)}`);
        this.choices = value;
        return this;
    }
    /**
     * @description Sets the hint text for the prompt.
     * @summary Configures additional information displayed to the user.
     *
     * @param value - The hint text.
     * @returns This UserInput instance for method chaining.
     */
    setHint(value) {
        UserInput.logger.verbose(`Setting hint to: ${value}`);
        this.hint = value;
        return this;
    }
    /**
     * @description Sets the warning text for the prompt.
     * @summary Configures a warning message displayed to the user.
     *
     * @param value - The warning text.
     * @returns This UserInput instance for method chaining.
     */
    setWarn(value) {
        UserInput.logger.verbose(`Setting warn to: ${value}`);
        this.warn = value;
        return this;
    }
    /**
     * @description Sets the suggest function for autocomplete inputs.
     * @summary Configures a function to provide suggestions based on user input.
     *
     * @param value - The suggest function.
     * @returns This UserInput instance for method chaining.
     */
    setSuggest(value) {
        UserInput.logger.verbose(`Setting suggest function`);
        this.suggest = value;
        return this;
    }
    /**
     * @description Sets the limit for list inputs.
     * @summary Configures the maximum number of items that can be selected in list-type prompts.
     * @template R - The type of the prompt name, extending string.
     * @param value - The maximum number of items that can be selected, or a function to determine this value.
     * @return This UserInput instance for method chaining.
     */
    setLimit(value) {
        UserInput.logger.verbose(`Setting limit to: ${value}`);
        this.limit = value;
        return this;
    }
    /**
     * @description Sets the mask for password inputs.
     * @summary Configures the character used to hide the user's input in password-type prompts.
     * @template R - The type of the prompt name, extending string.
     * @param value - The character used to mask the input, or a function to determine this value.
     * @return This UserInput instance for method chaining.
     */
    setMask(value) {
        UserInput.logger.verbose(`Setting mask to: ${value}`);
        this.mask = value;
        return this;
    }
    /**
     * @description Sets the stdout stream for the prompt.
     * @summary Configures the output stream used by the prompt for displaying messages and results.
     * @param value - The Writable stream to be used as stdout.
     * @return This UserInput instance for method chaining.
     */
    setStdout(value) {
        UserInput.logger.verbose(`Setting stdout stream`);
        this.stdout = value;
        return this;
    }
    /**
     * @description Sets the stdin stream for the prompt.
     * @summary Configures the input stream used by the prompt for receiving user input.
     * @param value - The Readable stream to be used as stdin.
     * @return This UserInput instance for method chaining.
     */
    setStdin(value) {
        this.stdin = value;
        return this;
    }
    /**
     * @description Asks the user for input based on the current UserInput configuration.
     * @summary Prompts the user and returns their response as a single value.
     * @template R - The type of the prompt name, extending string.
     * @return A Promise that resolves to the user's answer.
     */
    async ask() {
        return (await UserInput.ask(this))[this.name];
    }
    /**
     * @description Asks the user one or more questions based on the provided UserInput configurations.
     * @summary Prompts the user with one or more questions and returns their answers as an object.
     * @template R - The type of the prompt name, extending string.
     * @param question - A single UserInput instance or an array of UserInput instances.
     * @return A Promise that resolves to an object containing the user's answers.
     * @mermaid
     * sequenceDiagram
     *   participant U as User
     *   participant A as ask method
     *   participant P as prompts library
     *   A->>P: Call prompts with question(s)
     *   P->>U: Display prompt(s)
     *   U->>P: Provide input
     *   P->>A: Return answers
     *   A->>A: Process answers
     *   A-->>Caller: Return processed answers
     */
    static async ask(question) {
        const log = UserInput.logger.for(this.ask);
        if (!Array.isArray(question)) {
            question = [question];
        }
        let answers;
        try {
            log.verbose(`Asking questions: ${question.map((q) => q.name).join(", ")}`);
            answers = await (0, prompts_1.default)(question);
            log.verbose(`Received answers: ${JSON.stringify(answers, null, 2)}`);
        }
        catch (error) {
            throw new Error(`Error while getting input: ${error}`);
        }
        return answers;
    }
    /**
     * @description Asks the user for a number input.
     * @summary Prompts the user to enter a number, with optional minimum, maximum, and initial values.
     * @param name - The name of the prompt, used as the key in the returned answers object.
     * @param question - The message displayed to the user.
     * @param min - The minimum allowed value (optional).
     * @param max - The maximum allowed value (optional).
     * @param initial - The initial value presented to the user (optional).
     * @return A Promise that resolves to the number entered by the user.
     */
    static async askNumber(name, question, min, max, initial) {
        const log = UserInput.logger.for(this.askNumber);
        log.verbose(`Asking number input: undefined, question: ${question}, min: ${min}, max: ${max}, initial: ${initial}`);
        const userInput = new UserInput(name)
            .setMessage(question)
            .setType("number");
        if (typeof min === "number")
            userInput.setMin(min);
        if (typeof max === "number")
            userInput.setMax(max);
        if (typeof initial === "number")
            userInput.setInitial(initial);
        return (await this.ask(userInput))[name];
    }
    /**
     * @description Asks the user for a text input.
     * @summary Prompts the user to enter text, with optional masking and initial value.
     * @param name - The name of the prompt, used as the key in the returned answers object.
     * @param question - The message displayed to the user.
     * @param mask - The character used to mask the input (optional, for password-like inputs).
     * @param initial - The initial value presented to the user (optional).
     * @return A Promise that resolves to the text entered by the user.
     */
    static async askText(name, question, mask = undefined, initial) {
        const log = UserInput.logger.for(this.askText);
        log.verbose(`Asking text input: undefined, question: ${question}, mask: ${mask}, initial: ${initial}`);
        const userInput = new UserInput(name).setMessage(question);
        if (mask)
            userInput.setMask(mask);
        if (typeof initial === "string")
            userInput.setInitial(initial);
        return (await this.ask(userInput))[name];
    }
    /**
     * @description Asks the user for a confirmation (yes/no).
     * @summary Prompts the user with a yes/no question and returns a boolean result.
     * @param name - The name of the prompt, used as the key in the returned answers object.
     * @param question - The message displayed to the user.
     * @param initial - The initial value presented to the user (optional).
     * @return A Promise that resolves to a boolean representing the user's answer.
     */
    static async askConfirmation(name, question, initial) {
        const log = UserInput.logger.for(this.askConfirmation);
        log.verbose(`Asking confirmation input: undefined, question: ${question}, initial: ${initial}`);
        const userInput = new UserInput(name)
            .setMessage(question)
            .setType("confirm");
        if (typeof initial !== "undefined")
            userInput.setInitial(initial);
        return (await this.ask(userInput))[name];
    }
    /**
     * @description Repeatedly asks for input until a valid response is given or the limit is reached.
     * @summary This method insists on getting a valid input from the user, allowing for a specified number of attempts.
     *
     * @template R - The type of the expected result.
     * @param input - The UserInput instance to use for prompting.
     * @param test - A function to validate the user's input.
     * @param limit - The maximum number of attempts allowed (default is 1).
     * @param defaultConfirmation
     * @return A Promise that resolves to the valid input or undefined if the limit is reached.
     *
     * @mermaid
     * sequenceDiagram
     *   participant U as User
     *   participant I as insist method
     *   participant A as ask method
     *   participant T as test function
     *   participant C as askConfirmation method
     *   loop Until valid input or limit reached
     *     I->>A: Call ask with input
     *     A->>U: Prompt user
     *     U->>A: Provide input
     *     A->>I: Return result
     *     I->>T: Test result
     *     alt Test passes
     *       I->>C: Ask for confirmation
     *       C->>U: Confirm input
     *       U->>C: Provide confirmation
     *       C->>I: Return confirmation
     *       alt Confirmed
     *         I-->>Caller: Return valid result
     *       else Not confirmed
     *         I->>I: Continue loop
     *       end
     *     else Test fails
     *       I->>I: Continue loop
     *     end
     *   end
     *   I-->>Caller: Return undefined if limit reached
     */
    static async insist(input, test, defaultConfirmation, limit = 1) {
        const log = UserInput.logger.for(this.insist);
        log.verbose(`Insisting on input: ${input.name}, test: ${test.toString()}, defaultConfirmation: ${defaultConfirmation}, limit: ${limit}`);
        let result = undefined;
        let count = 0;
        let confirmation;
        try {
            do {
                result = (await UserInput.ask(input))[input.name];
                if (!test(result)) {
                    result = undefined;
                    continue;
                }
                confirmation = await UserInput.askConfirmation(`${input.name}-confirm`, `Is the ${input.type} correct?`, defaultConfirmation);
                if (!confirmation)
                    result = undefined;
            } while (typeof result === "undefined" && limit > 1 && count++ < limit);
        }
        catch (e) {
            log.error(`Error while insisting: ${e}`);
            throw e;
        }
        if (typeof result === "undefined")
            log.info("no selection...");
        return result;
    }
    /**
     * @description Repeatedly asks for text input until a valid response is given or the limit is reached.
     * @summary This method insists on getting a valid text input from the user, allowing for a specified number of attempts.
     *
     * @param name - The name of the prompt, used as the key in the returned answers object.
     * @param question - The message displayed to the user.
     * @param test - A function to validate the user's input.
     * @param mask - The character used to mask the input (optional, for password-like inputs).
     * @param initial - The initial value presented to the user (optional).
     * @param defaultConfirmation
     * @param limit - The maximum number of attempts allowed (default is -1, meaning unlimited).
     * @return A Promise that resolves to the valid input or undefined if the limit is reached.
     */
    static async insistForText(name, question, test, mask = undefined, initial, defaultConfirmation = false, limit = -1) {
        const log = UserInput.logger.for(this.insistForText);
        log.verbose(`Insisting for text input: undefined, question: ${question}, test: ${test.toString()}, mask: ${mask}, initial: ${initial}, defaultConfirmation: ${defaultConfirmation}, limit: ${limit}`);
        const userInput = new UserInput(name).setMessage(question);
        if (mask)
            userInput.setMask(mask);
        if (typeof initial === "string")
            userInput.setInitial(initial);
        return (await this.insist(userInput, test, defaultConfirmation, limit));
    }
    /**
     * @description Repeatedly asks for number input until a valid response is given or the limit is reached.
     * @summary This method insists on getting a valid number input from the user, allowing for a specified number of attempts.
     *
     * @param name - The name of the prompt, used as the key in the returned answers object.
     * @param question - The message displayed to the user.
     * @param test - A function to validate the user's input.
     * @param min - The minimum allowed value (optional).
     * @param max - The maximum allowed value (optional).
     * @param initial - The initial value presented to the user (optional).
     * @param defaultConfirmation
     * @param limit - The maximum number of attempts allowed (default is -1, meaning unlimited).
     * @return A Promise that resolves to the valid input or undefined if the limit is reached.
     */
    static async insistForNumber(name, question, test, min, max, initial, defaultConfirmation = false, limit = -1) {
        const log = UserInput.logger.for(this.insistForNumber);
        log.verbose(`Insisting for number input: undefined, question: ${question}, test: ${test.toString()}, min: ${min}, max: ${max}, initial: ${initial}, defaultConfirmation: ${defaultConfirmation}, limit: ${limit}`);
        const userInput = new UserInput(name)
            .setMessage(question)
            .setType("number");
        if (typeof min === "number")
            userInput.setMin(min);
        if (typeof max === "number")
            userInput.setMax(max);
        if (typeof initial === "number")
            userInput.setInitial(initial);
        return (await this.insist(userInput, test, defaultConfirmation, limit));
    }
    /**
     * @description Parses command-line arguments based on the provided options.
     * @summary Uses Node.js's util.parseArgs to parse command-line arguments and return the result.
     * @param options - Configuration options for parsing arguments.
     * @return An object containing the parsed arguments.
     * @mermaid
     * sequenceDiagram
     *   participant C as Caller
     *   participant P as parseArgs method
     *   participant U as util.parseArgs
     *   C->>P: Call with options
     *   P->>P: Prepare args object
     *   P->>U: Call parseArgs with prepared args
     *   U->>P: Return parsed result
     *   P-->>C: Return ParseArgsResult
     */
    static parseArgs(options) {
        const log = UserInput.logger.for(this.parseArgs);
        const args = {
            args: process.argv.slice(2),
            options: options,
        };
        log.debug(`Parsing arguments: ${JSON.stringify(args, null, 2)}`);
        try {
            return (0, util_1.parseArgs)(args);
        }
        catch (error) {
            log.debug(`Error while parsing arguments:\n${JSON.stringify(args, null, 2)}\n | options\n${JSON.stringify(options, null, 2)}\n | ${error}`);
            throw new Error(`Error while parsing arguments: ${error}`);
        }
    }
}
exports.UserInput = UserInput;


/***/ }),

/***/ 741:
/***/ ((__unused_webpack_module, exports) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.ObjectAccumulator = void 0;
/**
 * @class ObjectAccumulator
 * @template T - The type of the accumulated object, extends object
 * @description A class that accumulates objects and provides type-safe access to their properties.
 * It allows for dynamic addition of properties while maintaining type information.
 * @summary Accumulates objects and maintains type information for accumulated properties
 * @memberOf utils
 */
class ObjectAccumulator {
    constructor() {
        Object.defineProperty(this, "__size", {
            value: 0,
            writable: true,
            configurable: false,
            enumerable: false,
        });
    }
    /**
     * @protected
     * @description Expands the accumulator with properties from a new object
     * @summary Adds new properties to the accumulator
     * @template V - The type of the object being expanded
     * @param {V} value - The object to expand with
     * @returns {void}
     */
    expand(value) {
        Object.entries(value).forEach(([k, v]) => {
            Object.defineProperty(this, k, {
                get: () => v,
                set: (val) => {
                    v = val;
                },
                configurable: true,
                enumerable: true,
            });
        });
    }
    /**
     * @description Accumulates a new object into the accumulator
     * @summary Adds properties from a new object to the accumulator, maintaining type information
     * @template V - The type of the object being accumulated
     * @param {V} value - The object to accumulate
     * @returns {T & V & ObjectAccumulator<T & V>} A new ObjectAccumulator instance with updated type information
     * @mermaid
     * sequenceDiagram
     *   participant A as Accumulator
     *   participant O as Object
     *   A->>O: Get entries
     *   loop For each entry
     *     A->>A: Define property
     *   end
     *   A->>A: Update size
     *   A->>A: Return updated accumulator
     */
    accumulate(value) {
        this.expand(value);
        this.__size = this.__size + Object.keys(value).length;
        return this;
    }
    /**
     * @description Retrieves a value from the accumulator by its key
     * @summary Gets a value from the accumulated object using a type-safe key
     * @template K - The key type, must be a key of this
     * @param {K} key - The key of the value to retrieve
     * @returns {this[K] | undefined} The value associated with the key, or undefined if not found
     */
    get(key) {
        return this[key];
    }
    /**
     * @description Checks if a key exists in the accumulator
     * @summary Determines whether the accumulator contains a specific key
     * @param {string} key - The key to check for existence
     * @returns {boolean} True if the key exists, false otherwise
     */
    has(key) {
        return !!this[key];
    }
    /**
     * @description Removes a key-value pair from the accumulator
     * @summary Deletes a property from the accumulated object
     * @param {keyof this | string} key - The key of the property to remove
     * @returns {Omit<this, typeof key> & ObjectAccumulator<Omit<this, typeof key>> | this} The accumulator instance with the specified property removed
     */
    remove(key) {
        if (!(key in this))
            return this;
        delete this[key];
        this.__size--;
        return this;
    }
    /**
     * @description Retrieves all keys from the accumulator
     * @summary Gets an array of all accumulated property keys
     * @returns {string[]} An array of keys as strings
     */
    keys() {
        return Object.keys(this);
    }
    /**
     * @description Retrieves all values from the accumulator
     * @summary Gets an array of all accumulated property values
     * @returns {T[keyof T][]} An array of values
     */
    values() {
        return Object.values(this);
    }
    /**
     * @description Gets the number of key-value pairs in the accumulator
     * @summary Returns the count of accumulated properties
     * @returns {number} The number of key-value pairs
     */
    size() {
        return this.__size;
    }
    /**
     * @description Clears all accumulated key-value pairs
     * @summary Removes all properties from the accumulator and returns a new empty instance
     * @returns {ObjectAccumulator<never>} A new empty ObjectAccumulator instance
     */
    clear() {
        return new ObjectAccumulator();
    }
    /**
     * @description Executes a callback for each key-value pair in the accumulator
     * @summary Iterates over all accumulated properties, calling a function for each
     * @param {(value: this[keyof this], key: keyof this, i: number) => void} callback - The function to execute for each entry
     * @returns {void}
     */
    forEach(callback) {
        Object.entries(this).forEach(([key, value], i) => callback(value, key, i));
    }
    /**
     * @description Creates a new array with the results of calling a provided function on every element in the accumulator
     * @summary Maps each accumulated property to a new value using a callback function
     * @template R - The type of the mapped values
     * @param {(value: this[keyof this], key: keyof this, i: number) => R} callback - Function that produces an element of the new array
     * @returns {R[]} A new array with each element being the result of the callback function
     */
    map(callback) {
        return Object.entries(this).map(([key, value], i) => callback(value, key, i));
    }
}
exports.ObjectAccumulator = ObjectAccumulator;


/***/ }),

/***/ 747:
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {


var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.HttpClient = void 0;
const https_1 = __importDefault(__webpack_require__(692));
const logging_1 = __webpack_require__(834);
/**
 * @description A simple HTTP client for downloading files.
 * @summary This class provides functionality to download files from HTTPS URLs.
 * It uses Node.js built-in https module to make requests.
 *
 * @class
 */
class HttpClient {
    static { this.log = logging_1.Logging.for(HttpClient); }
    /**
     * @description Downloads a file from a given URL.
     * @summary This method sends a GET request to the specified URL and returns the response body as a string.
     * It handles different scenarios such as non-200 status codes and network errors.
     *
     * @param url - The URL of the file to download.
     * @return A promise that resolves with the file content as a string.
     *
     * @mermaid
     * sequenceDiagram
     *   participant Client
     *   participant HttpClient
     *   participant HTTPS
     *   participant Server
     *   Client->>HttpClient: downloadFile(url)
     *   HttpClient->>HTTPS: get(url)
     *   HTTPS->>Server: GET request
     *   Server-->>HTTPS: Response
     *   HTTPS-->>HttpClient: Response object
     *   alt Status code is 200
     *     loop For each data chunk
     *       HTTPS->>HttpClient: 'data' event
     *       HttpClient->>HttpClient: Accumulate data
     *     end
     *     HTTPS->>HttpClient: 'end' event
     *     HttpClient-->>Client: Resolve with data
     *   else Status code is not 200
     *     HttpClient-->>Client: Reject with error
     *   end
     */
    static async downloadFile(url) {
        return new Promise((resolve, reject) => {
            function request(url) {
                url = encodeURI(url);
                https_1.default.get(url, (res) => {
                    if (res.statusCode === 301 || res.statusCode === 307)
                        return request(res.headers.location);
                    if (res.statusCode !== 200) {
                        HttpClient.log.error(`Failed to fetch ${url} (status: ${res.statusCode})`);
                        return reject(new Error(`Failed to fetch ${url}`));
                    }
                    let data = "";
                    res.on("data", (chunk) => {
                        data += chunk;
                    });
                    res.on("error", (error) => {
                        reject(error);
                    });
                    res.on("end", () => {
                        resolve(data);
                    });
                });
            }
            request(url);
        });
    }
}
exports.HttpClient = HttpClient;


/***/ }),

/***/ 834:
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.Logging = exports.MiniLogger = void 0;
const constants_1 = __webpack_require__(154);
const styled_string_1 = __webpack_require__(508);
/**
 * @description A minimal logger implementation.
 * @summary MiniLogger is a lightweight logging class that implements the VerbosityLogger interface.
 * It provides basic logging functionality with support for different log levels and verbosity.
 *
 * @class
 */
class MiniLogger {
    /**
     * @description Creates a new MiniLogger instance.
     * @summary Initializes a MiniLogger with the given class name, optional configuration, and method name.
     *
     * @param context - The name of the class using this logger.
     * @param [conf] - Optional logging configuration. Defaults to Info level and verbosity 0.
     * @param [id] - Optional unique identifier for the logger instance.
     */
    constructor(context, conf, id) {
        this.context = context;
        this.conf = conf;
        this.id = id;
    }
    config(key) {
        if (this.conf && key in this.conf)
            return this.conf[key];
        return Logging.getConfig()[key];
    }
    for(method, config) {
        method = method
            ? typeof method === "string"
                ? method
                : method.name
            : undefined;
        return Logging.for([this.context, method].join("."), this.id, config);
    }
    /**
     * @description Creates a formatted log string.
     * @summary Generates a log string with timestamp, colored log level, and message.
     *
     * @param level - The log level as a string.
     * @param message
     * @param stack
     * @return A formatted log string.
     */
    createLog(level, message, stack) {
        const log = [];
        const style = this.config("style");
        if (this.config("timestamp")) {
            const date = new Date().toISOString();
            const timestamp = style ? Logging.theme(date, "timestamp", level) : date;
            log.push(timestamp);
        }
        if (this.config("logLevel")) {
            const lvl = style
                ? Logging.theme(level, "logLevel", level)
                : level;
            log.push(lvl);
        }
        if (this.config("context")) {
            const context = style
                ? Logging.theme(this.context, "class", level)
                : this.context;
            log.push(context);
        }
        const msg = style
            ? Logging.theme(typeof message === "string" ? message : message.message, "message", level)
            : typeof message === "string"
                ? message
                : message.message;
        log.push(msg);
        if (stack || message instanceof Error) {
            stack = style
                ? Logging.theme((stack || message.stack), "stack", level)
                : stack;
            log.push(`\nStack trace:\n${stack}`);
        }
        return log.join(this.config("separator"));
    }
    /**
     * @description Logs a message with the specified log level.
     * @summary Checks if the message should be logged based on the current log level,
     * then uses the appropriate console method to output the log.
     *
     * @param level - The log level of the message.
     * @param msg - The message to be logged.
     * @param stack
     */
    log(level, msg, stack) {
        if (constants_1.NumericLogLevels[this.config("level")] <
            constants_1.NumericLogLevels[level])
            return;
        let method;
        switch (level) {
            case constants_1.LogLevel.info:
                method = console.log;
                break;
            case constants_1.LogLevel.verbose:
            case constants_1.LogLevel.debug:
                method = console.debug;
                break;
            case constants_1.LogLevel.error:
                method = console.error;
                break;
            default:
                throw new Error("Invalid log level");
        }
        method(this.createLog(level, msg, stack));
    }
    /**
     * @description LLogs a `way too verbose` or a silly message.
     * @summary Logs a message at the Silly level if the current verbosity allows it.
     *
     * @param msg - The message to be logged.
     * @param verbosity - The verbosity level of the message (default: 0).
     */
    silly(msg, verbosity = 0) {
        if (this.config("verbose") >= verbosity)
            this.log(constants_1.LogLevel.verbose, msg);
    }
    /**
     * @description Logs a verbose message.
     * @summary Logs a message at the Verbose level if the current verbosity allows it.
     *
     * @param msg - The message to be logged.
     * @param verbosity - The verbosity level of the message (default: 0).
     */
    verbose(msg, verbosity = 0) {
        if (this.config("verbose") >= verbosity)
            this.log(constants_1.LogLevel.verbose, msg);
    }
    /**
     * @description Logs an info message.
     * @summary Logs a message at the Info level.
     *
     * @param msg - The message to be logged.
     */
    info(msg) {
        this.log(constants_1.LogLevel.info, msg);
    }
    /**
     * @description Logs a debug message.
     * @summary Logs a message at the Debug level.
     *
     * @param msg - The message to be logged.
     */
    debug(msg) {
        this.log(constants_1.LogLevel.debug, msg);
    }
    /**
     * @description Logs an error message.
     * @summary Logs a message at the Error level.
     *
     * @param msg - The message to be logged.
     */
    error(msg) {
        this.log(constants_1.LogLevel.error, msg);
    }
    setConfig(config) {
        this.conf = { ...(this.conf || {}), ...config };
    }
}
exports.MiniLogger = MiniLogger;
/**
 * @description A static class for managing logging operations.
 * @summary The Logging class provides a centralized logging mechanism with support for
 * different log levels and verbosity. It uses a singleton pattern to maintain a global
 * logger instance and allows creating specific loggers for different classes and methods.
 *
 * @class
 */
class Logging {
    /**
     * @description Factory function for creating logger instances.
     * @summary A function that creates new VerbosityLogger instances. By default, it creates a MiniLogger.
     */
    static { this._factory = (object, config, id) => {
        return new MiniLogger(object, config, id);
    }; }
    /**
     * @description Configuration for the logging system.
     * @summary Stores the global verbosity level and log level settings.
     */
    static { this._config = constants_1.DefaultLoggingConfig; }
    /**
     * @description Private constructor to prevent instantiation.
     * @summary Ensures that the Logging class cannot be instantiated as it's designed to be used statically.
     */
    constructor() { }
    /**
     * @description Setter for the logging configuration.
     * @summary Allows updating the global logging configuration.
     *
     * @param config - An object containing verbosity and log level settings.
     */
    static setConfig(config) {
        Object.assign(this._config, config);
    }
    static getConfig() {
        return Object.assign({}, this._config);
    }
    /**
     * @description Retrieves or creates the global logger instance.
     * @summary Returns the existing global logger or creates a new one if it doesn't exist.
     *
     * @return The global VerbosityLogger instance.
     */
    static get() {
        this.global = this.global ? this.global : this._factory("Logging");
        return this.global;
    }
    /**
     * @description Logs a verbose message.
     * @summary Delegates the verbose logging to the global logger instance.
     *
     * @param msg - The message to be logged.
     * @param verbosity - The verbosity level of the message (default: 0).
     */
    static verbose(msg, verbosity = 0) {
        return this.get().verbose(msg, verbosity);
    }
    /**
     * @description Logs an info message.
     * @summary Delegates the info logging to the global logger instance.
     *
     * @param msg - The message to be logged.
     */
    static info(msg) {
        return this.get().info(msg);
    }
    /**
     * @description Logs a debug message.
     * @summary Delegates the debug logging to the global logger instance.
     *
     * @param msg - The message to be logged.
     */
    static debug(msg) {
        return this.get().debug(msg);
    }
    /**
     * @description Logs a silly message.
     * @summary Delegates the debug logging to the global logger instance.
     *
     * @param msg - The message to be logged.
     */
    static silly(msg) {
        return this.get().silly(msg);
    }
    /**
     * @description Logs an error message.
     * @summary Delegates the error logging to the global logger instance.
     *
     * @param msg - The message to be logged.
     */
    static error(msg) {
        return this.get().error(msg);
    }
    static for(object, id, config) {
        object = typeof object === "string" ? object : object.name;
        id = typeof id === "string" ? id : undefined;
        config = typeof id === "object" ? id : config;
        return this._factory(object, config, id);
    }
    /**
     * @description Creates a logger for a specific reason or context.
     *
     * @summary This static method creates a new logger instance using the factory function,
     * based on a given reason or context.
     *
     * @param reason - A string describing the reason or context for creating this logger.
     * @param id
     * @returns A new VerbosityLogger or ClassLogger instance.
     */
    static because(reason, id) {
        return this._factory(reason, this._config, id);
    }
    static theme(text, type, loggerLevel, template = constants_1.DefaultTheme) {
        if (!this._config.style)
            return text;
        const logger = Logging.get().for(this.theme);
        function apply(txt, option, value) {
            try {
                const t = txt;
                let c = (0, styled_string_1.style)(t);
                function applyColor(val, isBg = false) {
                    let f = isBg ? c.background : c.foreground;
                    if (!Array.isArray(val)) {
                        return f.call(c, value);
                    }
                    switch (val.length) {
                        case 1:
                            f = isBg ? c.bgColor256 : c.color256;
                            return f(val[0]);
                        case 3:
                            f = isBg ? c.bgRgb : c.rgb;
                            return c.rgb(val[0], val[1], val[2]);
                        default:
                            logger.error(`Not a valid color option: ${option}`);
                            return (0, styled_string_1.style)(t);
                    }
                }
                function applyStyle(v) {
                    if (typeof v === "number") {
                        c = c.style(v);
                    }
                    else {
                        c = c[v];
                    }
                }
                switch (option) {
                    case "bg":
                    case "fg":
                        return applyColor(value).text;
                    case "style":
                        if (Array.isArray(value)) {
                            value.forEach(applyStyle);
                        }
                        else {
                            applyStyle(value);
                        }
                        return c.text;
                    default:
                        logger.error(`Not a valid theme option: ${option}`);
                        return t;
                }
                // eslint-disable-next-line @typescript-eslint/no-unused-vars
            }
            catch (e) {
                logger.error(`Error applying style: ${option} with value ${value}`);
                return txt;
            }
        }
        const individualTheme = template[type];
        if (!individualTheme || !Object.keys(individualTheme).length) {
            return text;
        }
        let actualTheme = individualTheme;
        const logLevels = Object.assign({}, constants_1.LogLevel);
        if (Object.keys(individualTheme)[0] in logLevels)
            actualTheme =
                individualTheme[loggerLevel] || {};
        return Object.keys(actualTheme).reduce((acc, key) => {
            const val = actualTheme[key];
            if (val)
                return apply(acc, key, val);
            return acc;
        }, text);
    }
}
exports.Logging = Logging;


/***/ }),

/***/ 837:
/***/ ((__unused_webpack_module, exports) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.DefaultCommandValues = exports.DefaultCommandOptions = void 0;
/**
 * @description Default command options for CLI commands.
 * @summary Defines the structure and default values for common command-line options used across various CLI commands.
 * @const DefaultCommandOptions
 * @typedef {Object} DefaultCommandOptions
 * @property {Object} verbose - Verbosity level option.
 * @property {string} verbose.type - The type of the verbose option (number).
 * @property {string} verbose.short - The short flag for the verbose option (V).
 * @property {number} verbose.default - The default value for verbosity (0).
 * @property {Object} version - Version display option.
 * @property {string} version.type - The type of the version option (boolean).
 * @property {string} version.short - The short flag for the version option (v).
 * @property {undefined} version.default - The default value for version display (undefined).
 * @property {Object} help - Help display option.
 * @property {string} help.type - The type of the help option (boolean).
 * @property {string} help.short - The short flag for the help option (h).
 * @property {boolean} help.default - The default value for help display (false).
 * @property {Object} logLevel - Log level option.
 * @property {string} logLevel.type - The type of the logLevel option (string).
 * @property {string} logLevel.default - The default value for log level ("info").
 * @property {Object} logStyle - Log styling option.
 * @property {string} logStyle.type - The type of the logStyle option (boolean).
 * @property {boolean} logStyle.default - The default value for log styling (true).
 * @property {Object} timestamp - Timestamp display option.
 * @property {string} timestamp.type - The type of the timestamp option (boolean).
 * @property {boolean} timestamp.default - The default value for timestamp display (true).
 * @property {Object} banner - Banner display option.
 * @property {string} banner.type - The type of the banner option (boolean).
 * @property {boolean} banner.default - The default value for banner display (false).
 */
exports.DefaultCommandOptions = {
    verbose: {
        type: "boolean",
        short: "V",
        default: undefined,
    },
    version: {
        type: "boolean",
        short: "v",
        default: undefined,
    },
    help: {
        type: "boolean",
        short: "h",
        default: false,
    },
    logLevel: {
        type: "string",
        default: "info",
    },
    logStyle: {
        type: "boolean",
        default: true,
    },
    timestamp: {
        type: "boolean",
        default: true,
    },
    banner: {
        type: "boolean",
        default: true,
    },
};
/**
 * @description Default command values derived from DefaultCommandOptions.
 * @summary Creates an object with the default values of all options defined in DefaultCommandOptions.
 * @const DefaultCommandValues
 * @typedef {Object} DefaultCommandValues
 * @property {unknown} [key: string] - The default value for each option in DefaultCommandOptions.
 */
exports.DefaultCommandValues = Object.keys(exports.DefaultCommandOptions).reduce((acc, key) => {
    acc[key] =
        exports.DefaultCommandOptions[key].default;
    return acc;
}, {});


/***/ }),

/***/ 866:
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {


var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.printBanner = printBanner;
exports.getSlogan = getSlogan;
const slogans_json_1 = __importDefault(__webpack_require__(680));
const styled_string_1 = __webpack_require__(508);
/**
 * @description Array of ANSI color codes for banner styling.
 * @summary Defines a set of ANSI color codes used to style the banner text.
 */
const colors = [
    "\x1b[38;5;215m", // soft orange
    "\x1b[38;5;209m", // coral
    "\x1b[38;5;205m", // pink
    "\x1b[38;5;210m", // peachy
    "\x1b[38;5;217m", // salmon
    "\x1b[38;5;216m", // light coral
    "\x1b[38;5;224m", // light peach
    "\x1b[38;5;230m", // soft cream
    "\x1b[38;5;230m", // soft cream
];
/**
 * @description Prints a styled banner to the console.
 * @summary Generates and prints a colorful ASCII art banner with a random slogan.
 * @param {VerbosityLogger} [logger] - Optional logger for verbose output.
 * @function printBanner
 * @mermaid
 * sequenceDiagram
 *   participant printBanner
 *   participant getSlogan
 *   participant padEnd
 *   participant console
 *   printBanner->>getSlogan: Call getSlogan()
 *   getSlogan-->>printBanner: Return random slogan
 *   printBanner->>printBanner: Create banner ASCII art
 *   printBanner->>printBanner: Split banner into lines
 *   printBanner->>printBanner: Calculate max line length
 *   printBanner->>padEnd: Call padEnd with slogan
 *   padEnd-->>printBanner: Return padded slogan line
 *   loop For each banner line
 *     printBanner->>style: Call style(line)
 *     style-->>printBanner: Return styled line
 *     printBanner->>console: Log styled line
 *   end
 */
function printBanner(logger) {
    const message = getSlogan();
    const banner = `#                 ░▒▓███████▓▒░  ░▒▓████████▓▒░  ░▒▓██████▓▒░   ░▒▓██████▓▒░  ░▒▓████████▓▒░       ░▒▓████████▓▒░  ░▒▓███████▓▒░ 
#      ( (        ░▒▓█▓▒░░▒▓█▓▒░ ░▒▓█▓▒░        ░▒▓█▓▒░░▒▓█▓▒░ ░▒▓█▓▒░░▒▓█▓▒░ ░▒▓█▓▒░                 ░▒▓█▓▒░     ░▒▓█▓▒░        
#       ) )       ░▒▓█▓▒░░▒▓█▓▒░ ░▒▓█▓▒░        ░▒▓█▓▒░        ░▒▓█▓▒░░▒▓█▓▒░ ░▒▓█▓▒░                 ░▒▓█▓▒░     ░▒▓█▓▒░        
#    [=======]    ░▒▓█▓▒░░▒▓█▓▒░ ░▒▓██████▓▒░   ░▒▓█▓▒░        ░▒▓████████▓▒░ ░▒▓██████▓▒░            ░▒▓█▓▒░      ░▒▓██████▓▒░  
#     \`-----´     ░▒▓█▓▒░░▒▓█▓▒░ ░▒▓█▓▒░        ░▒▓█▓▒░        ░▒▓█▓▒░░▒▓█▓▒░ ░▒▓█▓▒░                 ░▒▓█▓▒░            ░▒▓█▓▒░ 
#                 ░▒▓█▓▒░░▒▓█▓▒░ ░▒▓█▓▒░        ░▒▓█▓▒░░▒▓█▓▒░ ░▒▓█▓▒░░▒▓█▓▒░ ░▒▓█▓▒░                 ░▒▓█▓▒░            ░▒▓█▓▒░ 
#                 ░▒▓███████▓▒░  ░▒▓████████▓▒░  ░▒▓██████▓▒░  ░▒▓█▓▒░░▒▓█▓▒░ ░▒▓█▓▒░                 ░▒▓█▓▒░     ░▒▓███████▓▒░  
#`.split("\n");
    const maxLength = banner.reduce((max, line) => Math.max(max, line.length), 0);
    banner.push(`#  ${message.padStart(maxLength - 3)}`);
    banner.forEach((line, index) => {
        (logger ? logger.info.bind(logger) : console.log.bind(console))((0, styled_string_1.style)(line || "").raw(colors[index]).text);
    });
}
/**
 * @description Retrieves a slogan from the predefined list.
 * @summary Fetches a random slogan or a specific one by index from the slogans list.
 * @param {number} [i] - Optional index to retrieve a specific slogan.
 * @return {string} The selected slogan.
 * @function getSlogan
 * @mermaid
 * sequenceDiagram
 *   participant getSlogan
 *   participant Math.random
 *   participant slogans
 *   alt i is undefined
 *     getSlogan->>Math.random: Generate random index
 *     Math.random-->>getSlogan: Return random index
 *   else i is defined
 *     Note over getSlogan: Use provided index
 *   end
 *   getSlogan->>slogans: Access slogan at index
 *   slogans-->>getSlogan: Return slogan
 *   alt Error occurs
 *     getSlogan->>getSlogan: Throw error
 *   end
 *   getSlogan-->>Caller: Return slogan
 */
function getSlogan(i) {
    try {
        i =
            typeof i === "undefined" ? Math.floor(Math.random() * slogans_json_1.default.length) : i;
        return slogans_json_1.default[i].Slogan;
    }
    catch (error) {
        throw new Error(`Failed to retrieve slogans: ${error}`);
    }
}


/***/ }),

/***/ 874:
/***/ ((__unused_webpack_module, exports) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));


/***/ }),

/***/ 885:
/***/ ((__unused_webpack_module, exports) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.isBrowser = isBrowser;
/**
 * @function isBrowser
 * @description Determines if the current environment is a browser by checking the prototype chain of the global object.
 * @summary Checks if the code is running in a browser environment.
 * @returns {boolean} True if the environment is a browser, false otherwise.
 */
function isBrowser() {
    return (Object.getPrototypeOf(Object.getPrototypeOf(globalThis)) !==
        Object.prototype);
}


/***/ }),

/***/ 896:
/***/ ((module) => {

module.exports = require("fs");

/***/ }),

/***/ 928:
/***/ ((module) => {

module.exports = require("path");

/***/ }),

/***/ 935:
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {


var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", ({ value: true }));
__exportStar(__webpack_require__(154), exports);
__exportStar(__webpack_require__(30), exports);
__exportStar(__webpack_require__(340), exports);
__exportStar(__webpack_require__(747), exports);
__exportStar(__webpack_require__(547), exports);
__exportStar(__webpack_require__(874), exports);
__exportStar(__webpack_require__(686), exports);


/***/ }),

/***/ 946:
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {


var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", ({ value: true }));
__exportStar(__webpack_require__(714), exports);
__exportStar(__webpack_require__(483), exports);


/***/ })

/******/ 	});
/************************************************************************/
/******/ 	// The module cache
/******/ 	var __webpack_module_cache__ = {};
/******/ 	
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/ 		// Check if module is in cache
/******/ 		var cachedModule = __webpack_module_cache__[moduleId];
/******/ 		if (cachedModule !== undefined) {
/******/ 			return cachedModule.exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = __webpack_module_cache__[moduleId] = {
/******/ 			// no module.id needed
/******/ 			// no module.loaded needed
/******/ 			exports: {}
/******/ 		};
/******/ 	
/******/ 		// Execute the module function
/******/ 		__webpack_modules__[moduleId].call(module.exports, module, module.exports, __webpack_require__);
/******/ 	
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/ 	
/************************************************************************/
var __webpack_exports__ = {};
// This entry needs to be wrapped in an IIFE because it uses a non-standard name for the exports (exports).
(() => {
var exports = __webpack_exports__;

Object.defineProperty(exports, "__esModule", ({ value: true }));
const commands_1 = __webpack_require__(487);
new commands_1.TemplateSync()
    .execute()
    .then(() => commands_1.TemplateSync.log.info("Template updated successfully. Please confirm all changes before commiting"))
    .catch((e) => {
    commands_1.TemplateSync.log.error(`Error preparing template: ${e}`);
    process.exit(1);
});

})();

/******/ 	return __webpack_exports__;
/******/ })()
;
});