import {
  ChildProcessWithoutNullStreams,
  spawn,
  SpawnOptionsWithoutStdio,
} from "child_process";
import { StandardOutputWriter } from "../writers/StandardOutputWriter";
import { CommandResult } from "./types";
import { OutputWriterConstructor } from "../writers/types";
import { AbortCode } from "./constants";
import { Logger, Logging } from "@decaf-ts/logging";

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
 * @memberOf module:utils
 */
export function lockify<R>(f: (...params: unknown[]) => R) {
  let lock: Promise<R | void> = Promise.resolve();
  return (...params: unknown[]) => {
    const result = lock.then(() => f(...params));
    lock = result.catch(() => {});
    return result;
  };
}

/**
 * @description Chains multiple abort signals to a controller.
 * @summary Creates a mechanism where multiple abort signals can trigger a single abort controller.
 * This is useful for coordinating cancellation across multiple asynchronous operations.
 *
 * @param {AbortController} controller - The abort controller to be triggered by signals.
 * @param {...AbortSignal} signals - One or more abort signals that can trigger the controller.
 * @return {AbortController} The input controller, now connected to the signals.
 *
 * @function chainAbortController
 *
 * @memberOf module:utils
 */
export function chainAbortController(
  controller: AbortController,
  ...signals: AbortSignal[]
): AbortController;

/**
 * @description Creates a new controller chained to multiple abort signals.
 * @summary Creates a new abort controller that will be triggered if any of the provided signals are aborted.
 *
 * @param {...AbortSignal} signals - One or more abort signals that can trigger the new controller.
 * @return {AbortController} A new abort controller connected to the signals.
 *
 * @function chainAbortController
 *
 * @memberOf module:utils
 */
export function chainAbortController(
  ...signals: AbortSignal[]
): AbortController;

export function chainAbortController(
  argument0: AbortController | AbortSignal,
  ...remainder: AbortSignal[]
): AbortController {
  let signals: AbortSignal[];
  let controller: AbortController;

  // normalize args
  if (argument0 instanceof AbortSignal) {
    controller = new AbortController();
    signals = [argument0, ...remainder];
  } else {
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

/**
 * @description Spawns a command as a child process with output handling.
 * @summary Creates a child process to execute a command with support for piping multiple commands,
 * custom output handling, and abort control. This function handles the low-level details of
 * spawning processes and connecting their inputs/outputs when piping is used.
 *
 * @template R - The type of the processed output, defaulting to string.
 * @param {StandardOutputWriter<R>} output - The output writer to handle command output.
 * @param {string} command - The command to execute, can include pipe operators.
 * @param {SpawnOptionsWithoutStdio} opts - Options for the spawned process.
 * @param {AbortController} abort - Controller to abort the command execution.
 * @param {Logger} logger - Logger for recording command execution details.
 * @return {ChildProcessWithoutNullStreams} The spawned child process.
 *
 * @function spawnCommand
 *
 * @memberOf module:utils
 */
export function spawnCommand<R = string>(
  output: StandardOutputWriter<R>,
  command: string,
  opts: SpawnOptionsWithoutStdio,
  abort: AbortController,
  logger: Logger
): ChildProcessWithoutNullStreams {
  function spawnInner(command: string, controller: AbortController) {
    const [cmd, argz] = output.parseCommand(command);
    logger.info(`Running command: ${cmd}`);
    logger.debug(`with args: ${argz.join(" ")}`);
    const childProcess = spawn(cmd, argz, {
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
    throw new Error(
      `Invalid command: ${command}. contains invalid characters: ${m}`
    );
  if (command.includes(" | ")) {
    const cmds = command.split(" | ");
    const spawns = [];
    const controllers = new Array(cmds.length);
    controllers[0] = abort;
    for (let i = 0; i < cmds.length; i++) {
      if (i !== 0)
        controllers[i] = chainAbortController(controllers[i - 1].signal);
      spawns.push(spawnInner(cmds[i], controllers[i]));
      if (i === 0) continue;
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
 * @memberOf module:utils
 */
export function runCommand<R = string>(
  command: string,
  opts: SpawnOptionsWithoutStdio = {},
  outputConstructor: OutputWriterConstructor<
    R,
    StandardOutputWriter<R>,
    Error
  > = StandardOutputWriter<R>,
  ...args: unknown[]
): CommandResult<R> {
  const logger = Logging.for(runCommand);
  const abort = new AbortController();

  const result: Omit<CommandResult, "promise" | "pipe"> = {
    abort: abort,
    command: command,
    logs: [],
    errs: [],
  };

  const lock = new Promise<R>((resolve, reject) => {
    let output;
    try {
      output = new outputConstructor(
        command,
        {
          resolve,
          reject,
        },
        ...args
      );

      result.cmd = spawnCommand<R>(output, command, opts, abort, logger);
    } catch (e: unknown) {
      return reject(new Error(`Error running command ${command}: ${e}`));
    }

    result.cmd.stdout.setEncoding("utf8");

    result.cmd.stdout.on("data", (chunk: any) => {
      chunk = chunk.toString();
      result.logs.push(chunk);
      output.data(chunk);
    });

    result.cmd.stderr.on("data", (data: any) => {
      data = data.toString();
      result.errs.push(data);
      output.error(data);
    });

    result.cmd.once("error", (err: Error) => {
      output.exit(err.message, result.errs);
    });

    result.cmd.once("exit", (code: number = 0) => {
      if (abort.signal.aborted && code === null) code = AbortCode as any;
      output.exit(code, code === 0 ? result.logs : result.errs);
    });
  });

  Object.assign(result, {
    promise: lock,
    pipe: async <E>(cb: (r: R) => E) => {
      const l = logger.for("pipe");
      try {
        l.verbose(`Executing pipe function ${command}...`);
        const result: R = await lock;
        l.verbose(`Piping output to ${cb.name}: ${result}`);
        return cb(result);
      } catch (e: unknown) {
        l.error(`Error piping command output: ${e}`);
        throw e;
      }
    },
  });

  return result as CommandResult<R>;
}
