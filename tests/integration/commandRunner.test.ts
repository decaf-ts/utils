import { runCommand } from "../../src/utils/utils";
import { RegexpOutputWriter } from "../../src/writers/RegexpOutputWriter";
import { CommandResult } from "../../src/utils/types";

describe("runCommand Integration Tests", () => {
  jest.setTimeout(10000); // Increase timeout for potentially slow commands

  const testString = "Hello, World!";

  afterEach(async () => {
    await new Promise((resolve) => setTimeout(resolve, 100)); // Wait for a short time to ensure cleanup is done
  });

  test("Standard output writer captures full log", async () => {
    const commandPromise = runCommand<string>(
      `echo ${testString}`
    ) as CommandResult<string>;
    const result = await commandPromise.promise;
    expect(result).toEqual(testString);
    expect(commandPromise.logs.join("")).toContain(testString);
  });

  test("Regexp output writer captures matched string", async () => {
    const result = await runCommand(
      `echo ${testString}`,
      {},
      RegexpOutputWriter,
      "World"
    ).promise;
    expect(result).toBe("World");
  });

  test("Escaping bash significant characters", async () => {
    const commandPromise = runCommand(
      'echo "Hello; echo World"'
    ) as CommandResult;
    await commandPromise.promise;
    expect(commandPromise.logs.join("")).toContain("Hello; echo World");
  });

  test("Command giving errors", async () => {
    const commandPromise = runCommand("nonexistentcommand") as CommandResult;
    await expect(commandPromise.promise).rejects.toThrow("ENOENT");
  });

  test("Multiple commands with pipes", async () => {
    const commandPromise = runCommand(
      'echo "hello" | tr a-z A-Z'
    ) as CommandResult;
    await commandPromise.promise;
    expect(commandPromise.logs.join("")).toContain("HELLO");
  });

  test("Command with working directory option", async () => {
    const commandPromise = runCommand("pwd", { cwd: "/tmp" }) as CommandResult;
    await commandPromise.promise;
    const logs = commandPromise.logs.join("");
    expect(logs.includes("/tmp")).toEqual(true);
  });

  test("RegexpOutputWriter with complex pattern", async () => {
    const result = await runCommand(
      'echo "Error: File not found (error code: 404)"',
      {},
      RegexpOutputWriter,
      "error code: (\\d+)"
    ).promise;
    expect(result).toBe("error code: 404");
  });

  test("RegexpOutputWriter resolves on match", async () => {
    let resolved = false;
    const commandPromise = runCommand(
      'echo "Start" && sleep 1 && echo "Middle" && sleep 1 && echo "End"',
      {},
      RegexpOutputWriter,
      "Middle"
    );
    commandPromise.promise.then(() => {
      resolved = true;
    });

    await new Promise((resolve) => setTimeout(resolve, 1500));
    expect(resolved).toBe(true);

    const result = await commandPromise.promise;
    expect(result).toBe("Middle");
  });

  test("Aborting the running command", async () => {
    const commandPromise = runCommand("sleep 10s") as CommandResult;
    setTimeout(() => {
      console.log("Aborting command");
      commandPromise.abort.abort();
    }, 100);

    await expect(commandPromise.promise).rejects.toThrow(
      "The operation was aborted"
    );
  });
});
