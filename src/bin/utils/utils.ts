import { ChildProcessWithoutNullStreams, spawn, SpawnOptionsWithoutStdio } from "child_process";
import { StandardOutputWriter } from "../writers/StandardOutputWriter";
import { CommandResult } from "./types";
import { Logging } from "../output/logging";
import { OutputWriterConstructor } from "../writers/types";
import { VerbosityLogger } from "../output/types";

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
 * @memberOf module:@decaf-ts/utils
 */
export function lockify<R>(f: (...params: unknown[]) => R) {
  let lock: Promise<R | void> = Promise.resolve()
  return (...params: unknown[]) => {
    const result = lock.then(() => f(...params))
    lock = result.catch(() => {})
    return result
  }
}

export function chainAbortController(controller: AbortController, ...signals: AbortSignal[]): AbortController;
export function chainAbortController(...signals: AbortSignal[]): AbortController;
export function chainAbortController(argument0: AbortController | AbortSignal, ...remainder: AbortSignal[]): AbortController {
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

export function spawnCommand<R = string>(output: StandardOutputWriter<R>, command: string, opts: SpawnOptionsWithoutStdio, abort: AbortController, logger: VerbosityLogger): ChildProcessWithoutNullStreams {

  function spawnInner(command: string, controller: AbortController){
    const [cmd, argz] = output.parseCommand(command);
    logger.info(`Running command: ${cmd}`);
    logger.debug(`with args: ${argz.join(" ")}`);
    const childProcess = spawn(cmd, argz, {
      ...opts,
      cwd: opts.cwd || process.cwd(),
      env: Object.assign({}, process.env, opts.env, { PATH: process.env.PATH,}),
      shell: opts.shell || false,
      signal: controller.signal
    });
    logger.verbose(`pid : ${childProcess.pid}`);
    return childProcess;
  }

  const m = command.match(/[<>$#]/g);
  if(m)
    throw new Error(`Invalid command: ${command}. contains invalid characters: ${m}`);
  if (command.includes(" | ")){
    const cmds = command.split(" | ");
    const spawns = [];
    const controllers = new Array(cmds.length);
    controllers[0] = abort;
    for (let i = 0; i < cmds.length; i++) {
      if (i !== 0) controllers[i] = chainAbortController(controllers[i - 1].signal);
      spawns.push(spawnInner(cmds[i], controllers[i]));
      if (i === 0) continue;
      spawns[i - 1].stdout.pipe(spawns[i].stdin);
    }
    return spawns[0];
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
 * @memberOf module:@decaf-ts/utils
 */
export async function runCommand<R = string>(command: string, opts: SpawnOptionsWithoutStdio = {}, outputConstructor: OutputWriterConstructor<R> = StandardOutputWriter<R>, ...args: unknown[]): Promise<R> {
  const logger = Logging.for(runCommand)
  const lock = new Promise<R>((resolve, reject) => {
    const abort = new AbortController();
    const logs: string[] = [];
    const errs: string[] = [];
    let childProcess: ChildProcessWithoutNullStreams;
    let output;
    try {
      output = new outputConstructor({
        resolve,
        reject
      }, ...args);

      childProcess = spawnCommand<R>(output, command, opts, abort, logger);
    } catch (e: unknown){
      throw new Error(`Error running command ${command}: ${e}`);
    }

    childProcess.stdout.setEncoding("utf8");

    childProcess.stdout.on("data", (chunk: any) => {
      chunk = chunk.toString();
      logs.push(chunk);
      output.data(chunk);
    });

    childProcess.stderr.on("data", (data: any) => {
      data = data.toString();
      errs.push(data);
      output.error(data);
    });

    childProcess.once("error", (err: Error) => {
      output.errors(err);
    });

    childProcess.once("exit", (code: number = 0) => {
      output.exit(code);
    });

    Object.assign(lock, {
      abort: abort,
      command: command,
      cmd: childProcess,
      logs,
      errs,
      pipe: async <E>(cb: (r: R) => E) => {
        const l = logger.for("pipe");
        try {
          l.verbose(`Executing pipe function ${command}...`);
          const result: R = await lock
          l.verbose(`Piping output to ${cb.name}: ${result}`);
          return cb(result)
        } catch (e: unknown) {
          l.error(`Error piping command output: ${e}`);
          throw e;
        }
      }
    })
  });

  return lock as CommandResult<R>;
}

export function runWithRequirements<R = string>(command: string,
                                                opts: SpawnOptionsWithoutStdio = {},
                                                outputConstructor: OutputWriterConstructor<R> = StandardOutputWriter<R>,
                                                requirements: string[],
                                                ...args: unknown[]): Promise<R> {

  return runCommand<R>(command, opts, outputConstructor,...args)
}


