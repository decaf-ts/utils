import fs from "fs";
import path from "path";
import { Logging } from "../output/logging";
import { patchString } from "./text";
import { runCommand } from "./utils";

const logger = Logging.for("fs");

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
export function patchFile(path: string, values: Record<string, number | string>) {
  const log = logger.for(patchFile);
  if (!fs.existsSync(path))
    throw new Error(`File not found at path "${path}".`);
  let content = readFile(path);
  
  try {
    log.verbose(`Patching file "${path}"...`);
    log.debug(`with value: ${JSON.stringify(values)}`);
    content = patchString(content, values);
  } catch (error: unknown) {
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
 * @memberOf module:fs-utils
 */
export function readFile(path: string): string {
  const log = logger.for(readFile);
  try {
    log.verbose(`Reading file "${path}"...`);
    return fs.readFileSync(path, 'utf8');
  } catch (error: unknown) {
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
 * @memberOf module:fs-utils
 */
export function writeFile(path: string, data: string | Buffer): void {
  const log = logger.for(writeFile);
  try {
    log.verbose(`Writing file "${path} with ${data.length} bytes...`);
    fs.writeFileSync(path, data, 'utf8');
  } catch (error: unknown) {
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
 * @memberOf module:fs-utils
 */
export function getPackage(p: string = process.cwd(), property?: string): object | string {
  let pkg: any;
  try {
    pkg = JSON.parse(readFile(path.join(p, `package.json`)));
  } catch (error: unknown) {
    throw new Error(`Failed to retrieve package information" ${error}`);
  }

  if (property) {
    if (!(property in pkg))
      throw new Error(`Property "${property}" not found in package.json`);
    return pkg[property] as string;
  }
  return pkg;
}

export function setPackageAttribute(attr: string, value: string, p: string = process.cwd()): void  {
  const pkg = getPackage(p) as Record<string, any>;
  pkg[attr] = value;
  writeFile(path.join(p, `package.json`), JSON.stringify(pkg, null, 2));
}

/**
 * @description Retrieves the version from package.json.
 * @summary A convenience function that calls getPackage to retrieve the "version" property from package.json.
 * @param {string} [p=process.cwd()] - The directory path where the package.json file is located.
 * @return {string} The version string from package.json.
 * @function getPackageVersion
 * @memberOf module:fs-utils
 */
export function getPackageVersion(p = process.cwd()): string {
  return getPackage(p, "version") as string;
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
export async function getDependencies(path: string = process.cwd()) {
  let pkg: any;

  try {
    pkg = JSON.parse(await runCommand(`npm ls --json`, { cwd: path }));
  } catch (e: unknown) {
    throw new Error(`Failed to retrieve dependencies: ${e}`);
  }

  const mapper = (entry: [string, unknown], index: number) => ({name: entry[0], version: (entry[1] as any).version})

  return {
    prod: Object.entries(pkg.dependencies || {}).map(mapper),
    dev: Object.entries(pkg.devDependencies || {}).map(mapper),
    peer: Object.entries(pkg.peerDependencies || {}).map(mapper),
  }
}

export async function updateDependencies() {
  const log = logger.for(updateDependencies);
  log.info("checking for updates...");
  await runCommand("npx npm-check-updates -u");
  log.info("updating...");
  await runCommand("npx npm run do-install");
}

export async function pushToGit(){
  const log = logger.for(pushToGit);
  const gitUser = await runCommand("git config user.name");
  const gitEmail = await runCommand("git config user.email");
  log.verbose(`cached git id: ${gitUser}/${gitEmail}. changing to automation`);
  await runCommand("git config user.email \"automation@decaf.ts\"");
  await runCommand("git config user.name \"decaf\"");
  log.info("Pushing changes to git...");
  await runCommand("git add .");
  await runCommand(`git commit -m "refs #1 - after repo setup"`);
  await runCommand("git push");
  await runCommand(`git config user.email "${gitEmail}"`);
  await runCommand(`git config user.name "${gitUser}"`);
  log.verbose(`reverted to git id: ${gitUser}/${gitEmail}`);
}

export async function installDependencies(dependencies: {prod: string[], dev: string[], peer: string[]}) {
  const {prod, dev, peer} = dependencies;
  if (prod.length) {
    logger.info(`Installing dependencies ${prod.join(', ')}...`);
    await runCommand(`npm install ${prod.join(' ')}`, { cwd: process.cwd() });
  }
  if (dev.length) {
    logger.info(`Installing devDependencies ${dev.join(', ')}...`);
    await runCommand(`npm install --save-dev ${dev.join(' ')}`, { cwd: process.cwd() });
  }
  if (peer.length) {
    logger.info(`Installing peerDependencies ${peer.join(', ')}...`);
    await runCommand(`npm install --save-peer ${peer.join(' ')}`, { cwd: process.cwd() });
  }
}