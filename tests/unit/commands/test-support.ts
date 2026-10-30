import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";

/**
 * Creates an isolated scratch workspace for mutating command tests.
 *
 * Scratch roots live under the Paperclip run scratch dir when available so
 * nothing ever mutates the real decaf-ts workspace (DECAF-52 isolation rule).
 */
export function makeScratchDir(prefix: string): string {
  const base =
    process.env.PAPERCLIP_RUN_SCRATCH_DIR || fs.mkdtempSync(path.join(os.tmpdir(), "decaf-utils-tests-"));
  const dir = fs.mkdtempSync(path.join(base, prefix));
  return dir;
}

/**
 * Writes a `.gitmodules` file listing the given module paths.
 */
export function writeGitModules(basePath: string, modules: string[]): void {
  fs.mkdirSync(basePath, { recursive: true });
  const content = modules
    .map(
      (mod) =>
        `[submodule "${mod}"]\n\tpath = ${mod}\n\turl = https://example.com/${mod}.git`
    )
    .join("\n");
  fs.writeFileSync(path.join(basePath, ".gitmodules"), `${content}\n`, "utf-8");
}

/**
 * Creates a minimal package.json in the given directory.
 */
export function writePackageJson(
  dir: string,
  pkg: Record<string, unknown>
): void {
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(
    path.join(dir, "package.json"),
    JSON.stringify(pkg, null, 2),
    "utf-8"
  );
}

/**
 * Invokes the protected `run` method of a Command instance.
 */
export async function runCommand(
  cmd: object,
  answers: Record<string, unknown>
): Promise<unknown> {
    
  const run = (cmd as any).run;
  if (typeof run !== "function") {
    throw new Error("command does not expose a run method");
  }
  return run.call(cmd, answers);
}

/**
 * Result of a tsx driver subprocess run.
 */
export interface DriverResult {
  status: number | null;
  stdout: string;
  stderr: string;
  timedOut: boolean;
}

/**
 * Resolves the tsx cli shipped as a utils dev dependency. The CJS jest
 * runtime cannot execute `import()` (the commands deliberately wrap real
 * dynamic imports in `new Function`), so tests that must cross that
 * boundary run the command source in a tsx subprocess instead.
 */
export function resolveTxCli(): string {
  const candidates = [
    path.resolve(__dirname, "../../../node_modules/tsx/dist/cli.mjs"),
    path.resolve(__dirname, "../../../../node_modules/tsx/dist/cli.mjs"),
  ];
  const found = candidates.find((c) => fs.existsSync(c));
  if (!found)
    throw new Error(
      `tsx cli not found; tried:\n${candidates.join("\n")}`
    );
  return found;
}

/**
 * Writes the given ESM driver source to a scratch dir and runs it with tsx.
 *
 * The driver receives `args` as process.argv slices and typically imports
 * the command source TS file passed as one of the args.
 */
export function runTsxDriver(
  driverSource: string,
  args: string[],
  options: {
    env?: Record<string, string>;
    timeoutMs?: number;
  } = {}
): DriverResult {
  const dir = makeScratchDir("tsx-driver-");
  const driverPath = path.join(dir, "driver.mjs");
  fs.writeFileSync(driverPath, driverSource, "utf-8");
  const result = spawnSync(
    process.execPath,
    [resolveTxCli(), driverPath, ...args],
    {
      encoding: "utf-8",
      timeout: options.timeoutMs ?? 60000,
      killSignal: "SIGKILL",
      env: { ...process.env, ...options.env },
    }
  );
  return {
    status: result.status,
    stdout: result.stdout ?? "",
    stderr: result.stderr ?? "",
    timedOut: result.signal === "SIGKILL" || result.status === null,
  };
}
