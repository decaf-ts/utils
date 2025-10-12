import fs from "fs";
import path from "path";
import { runCommand } from "./utils";
import { DependencyMap, SimpleDependencyMap } from "./types";
import { Logging, patchString } from "@decaf-ts/logging";

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
 * @memberOf module:utils
 */
export function patchFile(
  path: string,
  values: Record<string, number | string>
) {
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
 * @memberOf module:utils
 */
export function readFile(path: string): string {
  const log = logger.for(readFile);
  try {
    log.verbose(`Reading file "${path}"...`);
    return fs.readFileSync(path, "utf8");
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
 * @memberOf module:utils
 */
export function writeFile(path: string, data: string | Buffer): void {
  const log = logger.for(writeFile);
  try {
    log.verbose(`Writing file "${path} with ${data.length} bytes...`);
    fs.writeFileSync(path, data, "utf8");
  } catch (error: unknown) {
    log.verbose(`Error writing file "${path}": ${error}`);
    throw new Error(`Error writing file "${path}": ${error}`);
  }
}

/**
 * @description Retrieves all files recursively from a directory.
 * @summary Traverses through directories and subdirectories to collect all file paths.
 *
 * @param {string} p - The path to start searching from.
 * @param {function} [filter] - Optional function to filter files by name or index.
 * @return {string[]} Array of file paths.
 *
 * @function getAllFiles
 *
 * @memberOf module:utils
 */
export function getAllFiles(
  p: string,
  filter?: (f: string, i?: number) => boolean
): string[] {
  const log = logger.for(getAllFiles);
  const files: string[] = [];

  try {
    log.verbose(`Retrieving all files from "${p}"...`);
    const entries = fs.readdirSync(p);

    entries.forEach((entry) => {
      const fullPath = path.join(p, entry);
      const stat = fs.statSync(fullPath);

      if (stat.isFile()) {
        files.push(fullPath);
      } else if (stat.isDirectory()) {
        files.push(...getAllFiles(fullPath));
      }
    });
    if (!filter) return files;
    return files.filter(filter);
  } catch (error: unknown) {
    log.verbose(`Error retrieving files from "${p}": ${error}`);
    throw new Error(`Error retrieving files from "${p}": ${error}`);
  }
}

/**
 * @description Renames a file or directory.
 * @summary Moves a file or directory from the source path to the destination path.
 *
 * @param {string} source - The source path of the file or directory.
 * @param {string} dest - The destination path for the file or directory.
 * @return {Promise<void>} A promise that resolves when the rename operation is complete.
 *
 * @function renameFile
 *
 * @memberOf module:utils
 */
export async function renameFile(source: string, dest: string) {
  const log = logger.for(renameFile);
  let descriptorSource, descriptorDest;

  try {
    descriptorSource = fs.statSync(source);
  } catch (error: unknown) {
    log.verbose(`Source path "${source}" does not exist: ${error}`);
    throw new Error(`Source path "${source}" does not exist: ${error}`);
  }

  try {
    descriptorDest = fs.statSync(dest);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
  } catch (e: unknown) {
    // do nothing. its ok
  }
  if (descriptorDest) {
    log.verbose(`Destination path "${dest}" already exists`);
    throw new Error(`Destination path "${dest}" already exists`);
  }

  try {
    log.verbose(
      `Renaming ${descriptorSource.isFile() ? "file" : "directory"} "${source}" to "${dest}...`
    );
    fs.renameSync(source, dest);
    log.verbose(`Successfully renamed to "${dest}"`);
  } catch (error: unknown) {
    log.verbose(
      `Error renaming ${descriptorSource.isFile() ? "file" : "directory"} "${source}" to "${dest}": ${error}`
    );
    throw new Error(
      `Error renaming ${descriptorSource.isFile() ? "file" : "directory"} "${source}" to "${dest}": ${error}`
    );
  }
}

/**
 * @description Copies a file or directory.
 * @summary Creates a copy of a file or directory from the source path to the destination path.
 *
 * @param {string} source - The source path of the file or directory.
 * @param {string} dest - The destination path for the file or directory.
 * @return {void}
 *
 * @function copyFile
 *
 * @memberOf module:utils
 */
export function copyFile(source: string, dest: string) {
  const log = logger.for(copyFile);
  let descriptorSource, descriptorDest;
  try {
    descriptorSource = fs.statSync(source);
  } catch (error: unknown) {
    log.verbose(`Source path "${source}" does not exist: ${error}`);
    throw new Error(`Source path "${source}" does not exist: ${error}`);
  }
  try {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    descriptorDest = fs.statSync(dest);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
  } catch (error: unknown) {
    if (descriptorSource.isDirectory()) {
      log.verbose(`Dest path "${dest}" does not exist. creating`);
      fs.mkdirSync(dest, { recursive: true });
    }
  }

  try {
    log.verbose(
      `Copying ${descriptorSource.isFile() ? "file" : "directory"} "${source}" to "${dest}...`
    );
    fs.cpSync(source, dest, { recursive: true });
  } catch (error: unknown) {
    log.verbose(
      `Error copying ${descriptorSource.isFile() ? "file" : "directory"} "${source}" to "${dest}: ${error}`
    );
    throw new Error(
      `Error copying ${descriptorSource.isFile() ? "file" : "directory"} "${source}" to "${dest}: ${error}`
    );
  }
}

/**
 * @description Deletes a file or directory.
 * @summary Removes a file or directory at the specified path, with recursive and force options enabled.
 *
 * @param {string} p - The path to the file or directory to delete.
 * @return {void}
 *
 * @function deletePath
 *
 * @memberOf module:utils
 */
export function deletePath(p: string) {
  const log = logger.for(deletePath);
  try {
    const descriptor = fs.statSync(p);
    if (descriptor.isFile()) {
      log.verbose(`Deleting file "${p}...`);
      fs.rmSync(p, { recursive: true, force: true });
    } else if (descriptor.isDirectory())
      fs.rmSync(p, { recursive: true, force: true });
  } catch (error: unknown) {
    log.verbose(`Error Deleting "${p}": ${error}`);
    throw new Error(`Error Deleting "${p}": ${error}`);
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
export function getPackage(
  p: string = process.cwd(),
  property?: string
): object | string {
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

/**
 * @description Sets an attribute in the package.json file.
 * @summary Updates a specific attribute in the package.json file with the provided value.
 *
 * @param {string} attr - The attribute name to set in package.json.
 * @param {string | number | object} value - The value to set for the attribute.
 * @param {string} [p=process.cwd()] - The directory path where the package.json file is located.
 * @return {void}
 *
 * @function setPackageAttribute
 *
 * @memberOf module:utils
 */
export function setPackageAttribute(
  attr: string,
  value: string,
  p: string = process.cwd()
): void {
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
 * @memberOf module:utils
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
 * @memberOf module:utils
 */
export async function getDependencies(
  path: string = process.cwd()
): Promise<DependencyMap> {
  let pkg: any;

  try {
    pkg = JSON.parse(await runCommand(`npm ls --json`, { cwd: path }).promise);
  } catch (e: unknown) {
    throw new Error(`Failed to retrieve dependencies: ${e}`);
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const mapper = (entry: [string, unknown], index: number) => ({
    name: entry[0],
    version: (entry[1] as any).version,
  });

  return {
    prod: Object.entries(pkg.dependencies || {}).map(mapper),
    dev: Object.entries(pkg.devDependencies || {}).map(mapper),
    peer: Object.entries(pkg.peerDependencies || {}).map(mapper),
  };
}

/**
 * @description Updates project dependencies to their latest versions.
 * @summary Runs npm-check-updates to update package.json and then installs the updated dependencies.
 *
 * @return {Promise<void>} A promise that resolves when dependencies are updated.
 *
 * @function updateDependencies
 *
 * @memberOf module:utils
 */
export async function updateDependencies() {
  const log = logger.for(updateDependencies);
  log.info("checking for updates...");
  await runCommand("npx npm-check-updates -u").promise;
  log.info("updating...");
  await runCommand("npx npm run do-install").promise;
}

/**
 * @description Installs dependencies if they are not already available.
 * @summary Checks if specified dependencies are installed and installs any that are missing.
 *
 * @param {string[] | string} deps - The dependencies to check and potentially install.
 * @param {SimpleDependencyMap} [dependencies] - Optional map of existing dependencies.
 * @return {Promise<SimpleDependencyMap>} Updated map of dependencies.
 *
 * @function installIfNotAvailable
 *
 * @memberOf module:utils
 */
export async function installIfNotAvailable(
  deps: string[] | string,
  dependencies?: SimpleDependencyMap
) {
  if (!dependencies) {
    const d: DependencyMap = await getDependencies();
    dependencies = {
      prod: d.prod?.map((p) => p.name) || [],
      dev: d.dev?.map((d) => d.name) || [],
      peer: d.peer?.map((p) => p.name) || [],
    };
  }
  const { prod, dev, peer } = dependencies;
  const installed = Array.from(
    new Set([...(prod || []), ...(dev || []), ...(peer || [])])
  );
  deps = typeof deps === "string" ? [deps] : deps;
  const toInstall = deps.filter((d) => !installed.includes(d));

  if (toInstall.length) await installDependencies({ dev: toInstall });
  dependencies.dev = dependencies.dev || [];
  dependencies.dev.push(...toInstall);
  return dependencies;
}

/**
 * @description Pushes changes to Git repository.
 * @summary Temporarily changes Git user configuration, commits all changes, pushes to remote, and restores original user configuration.
 *
 * @return {Promise<void>} A promise that resolves when changes are pushed.
 *
 * @function pushToGit
 *
 * @memberOf module:utils
 */
export async function pushToGit() {
  const log = logger.for(pushToGit);
  const gitUser = await runCommand("git config user.name").promise;
  const gitEmail = await runCommand("git config user.email").promise;
  log.verbose(`cached git id: ${gitUser}/${gitEmail}. changing to automation`);
  await runCommand('git config user.email "automation@decaf.ts"').promise;
  await runCommand('git config user.name "decaf"').promise;
  log.info("Pushing changes to git...");
  await runCommand("git add .").promise;
  await runCommand(`git commit -m "refs #1 - after repo setup"`).promise;
  await runCommand("git push").promise;
  await runCommand(`git config user.email "${gitEmail}"`).promise;
  await runCommand(`git config user.name "${gitUser}"`).promise;
  log.verbose(`reverted to git id: ${gitUser}/${gitEmail}`);
}

/**
 * @description Installs project dependencies.
 * @summary Installs production, development, and peer dependencies as specified.
 *
 * @param {object} dependencies - Object containing arrays of dependencies to install.
 * @param {string[]} [dependencies.prod] - Production dependencies to install.
 * @param {string[]} [dependencies.dev] - Development dependencies to install.
 * @param {string[]} [dependencies.peer] - Peer dependencies to install.
 * @return {Promise<void>} A promise that resolves when all dependencies are installed.
 *
 * @function installDependencies
 *
 * @memberOf module:utils
 */
export async function installDependencies(dependencies: {
  prod?: string[];
  dev?: string[];
  peer?: string[];
}) {
  const log = logger.for(installDependencies);
  const prod = dependencies.prod || [];
  const dev = dependencies.dev || [];
  const peer = dependencies.peer || [];
  if (prod.length) {
    log.info(`Installing dependencies ${prod.join(", ")}...`);
    await runCommand(`npm install ${prod.join(" ")}`, { cwd: process.cwd() })
      .promise;
  }
  if (dev.length) {
    log.info(`Installing devDependencies ${dev.join(", ")}...`);
    await runCommand(`npm install --save-dev ${dev.join(" ")}`, {
      cwd: process.cwd(),
    }).promise;
  }
  if (peer.length) {
    log.info(`Installing peerDependencies ${peer.join(", ")}...`);
    await runCommand(`npm install --save-peer ${peer.join(" ")}`, {
      cwd: process.cwd(),
    }).promise;
  }
}

/**
 * @description Normalizes imports to handle both CommonJS and ESModule formats.
 * @summary Utility function to handle module import differences between formats.
 *
 * @template T - Type of the imported module.
 * @param {Promise<T>} importPromise - Promise returned by dynamic import.
 * @return {Promise<T>} Normalized module.
 *
 * @function normalizeImport
 *
 * @memberOf module:utils
 */
export async function normalizeImport<T>(
  importPromise: Promise<T>
): Promise<T> {
  // CommonJS's `module.exports` is wrapped as `default` in ESModule.
  return importPromise.then((m: any) => (m.default || m) as T);
}
