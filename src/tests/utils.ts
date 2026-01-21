import { SpawnOptionsWithoutStdio } from "child_process";
import { OutputWriterConstructor, StandardOutputWriter } from "../writers";
import { CommandResult } from "../utils/types";
import { TestReporter } from "./TestReporter";
import { runCommand } from "../utils/utils";
import { sf } from "@decaf-ts/logging";
import { style } from "styled-string-builder";

export function runAndReport<R = string>(
  command: string,
  opts: SpawnOptionsWithoutStdio = {},
  outputConstructor: OutputWriterConstructor<
    R,
    StandardOutputWriter<R>,
    Error
  > = StandardOutputWriter<R>,
  reporter: TestReporter,
  commandPrefix: string = "{cwd} $ ",
  ...args: unknown[]
): CommandResult<R> {
  try {
    const cmd = runCommand(command, opts, outputConstructor, ...args);
    const p = cmd.promise;

    const resolution = async (resolve: any, result: any) => {
      await reporter.reportData(
        `${expect.getState().currentTestName || "no test name"} - ${command}`,
        `${sf(commandPrefix, { cwd: opts.cwd || process.cwd() })}${command}\n${style("SUCCESS").green.bold}\n${result}`,
        "text",
        true
      );
      resolve(result);
    };

    const rejection = async (reject: any, error: any) => {
      try {
        await reporter.reportData(
          `${expect.getState().currentTestName || "no test name"} - ${command}`,
          `${sf(commandPrefix, { cwd: opts.cwd || process.cwd() })}${command}\n${style("FAIL").red.bold}\n${error}`,
          "text",
          true
        );
      } catch (e: unknown) {
        console.log(e);
      }

      reject(error);
    };

    cmd.promise = new Promise((resolve, reject) => {
      return p
        .then(async (r) => await resolution(resolve, r))
        .catch(async (e) => await rejection(reject, e));
    });
    return cmd;
  } catch (e: unknown) {
    throw new Error(
      `Unable to create reportable command runner for ${commandPrefix}: ${e}`
    );
  }
}
