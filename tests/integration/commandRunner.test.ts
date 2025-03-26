import { runCommand } from '../../src/bin/utils/utils';
import { RegexpOutputWriter } from '../../src/bin/writers/RegexpOutputWriter';
import { CommandResult } from '../../src/bin/utils/types';

describe('runCommand Integration Tests', () => {
  jest.setTimeout(10000); // Increase timeout for potentially slow commands

  const testString = "Hello, World!";

  test('Standard output writer captures full log', async () => {
    const commandPromise: CommandResult = runCommand(`echo "${testString}"`) as CommandResult;
    const result = await commandPromise;
    expect(result).toEqual(testString);
    expect(commandPromise.logs.join('')).toEqual(result);
  });

  test('Regexp output writer captures matched string', async () => {
    const result = await runCommand('echo "Hello, World!"', {}, RegexpOutputWriter, 'World');
    expect(result).toBe('World');
  });

  test('Aborting the running command', async () => {
    const commandPromise = runCommand('sleep 5') as CommandResult;
    setTimeout(() => commandPromise.abort.abort(), 100);
    await expect(commandPromise).rejects.toThrow('The operation was aborted');
  });

  test('Escaping bash significant characters', async () => {
    const commandPromise = runCommand(['echo', 'Hello; echo World']) as CommandResult;
    await commandPromise;
    expect(commandPromise.logs.join('')).toContain('Hello; echo World');
    expect(commandPromise.logs.join('')).not.toContain('World');
  });

  test('Command giving errors', async () => {
    const commandPromise = runCommand('nonexistentcommand') as CommandResult;
    await expect(commandPromise).rejects.toThrow();
    expect(commandPromise.errs.join('')).toContain('command not found');
  });

  test('Logs and errors objects completeness', async () => {
    const commandPromise = runCommand('echo "stdout" && echo "stderr" >&2') as CommandResult;
    await commandPromise;
    expect(commandPromise.logs.join('')).toContain('stdout');
    expect(commandPromise.errs.join('')).toContain('stderr');
  });

  test('Multiple commands with pipes', async () => {
    const commandPromise = runCommand('echo "hello" | tr a-z A-Z') as CommandResult;
    await commandPromise;
    expect(commandPromise.logs.join('')).toContain('HELLO');
  });

  test('Command with environment variables', async () => {
    const commandPromise = runCommand('echo $TEST_VAR', { env: { TEST_VAR: 'test value' } }) as CommandResult;
    await commandPromise;
    expect(commandPromise.logs.join('')).toContain('test value');
  });

  test('Command with working directory option', async () => {
    const commandPromise = runCommand('pwd', { cwd: '/tmp' }) as CommandResult;
    await commandPromise;
    expect(commandPromise.logs.join('')).toContain('/tmp');
  });

  test('RegexpOutputWriter with complex pattern', async () => {
    const result = await runCommand(
      'echo "Error: File not found (error code: 404)"',
      {},
      RegexpOutputWriter,
      'error code: (\\d+)'
    );
    expect(result).toBe('404');
  });

  test('StandardOutputWriter resolves after command completion', async () => {
    let resolved = false;
    const commandPromise = runCommand('echo "Start" && sleep 1 && echo "End"') as CommandResult;
    commandPromise.then(() => { resolved = true; });
    
    await new Promise(resolve => setTimeout(resolve, 500));
    expect(resolved).toBe(false);
    
    await commandPromise;
    expect(resolved).toBe(true);
    expect(commandPromise.logs.join('')).toContain('Start');
    expect(commandPromise.logs.join('')).toContain('End');
  });

  test('RegexpOutputWriter resolves on match', async () => {
    let resolved = false;
    const commandPromise = runCommand('echo "Start" && sleep 1 && echo "Middle" && sleep 1 && echo "End"', {},RegexpOutputWriter, 'Middle') as CommandResult;
    commandPromise.then(() => { resolved = true; });
    
    await new Promise(resolve => setTimeout(resolve, 1500));
    expect(resolved).toBe(true);
    
    const result = await commandPromise;
    expect(result).toBe('Middle');
  });
});