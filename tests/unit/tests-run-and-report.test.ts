import { StandardOutputWriter } from "../../src";
import { runAndReport } from "../../src/tests";

const mockAdapterState: { current: any } = { current: undefined };

jest.mock("../../src/tests/frameworks/resolver", () => ({
  resolveAdapterSync: () => {
    if (mockAdapterState.current instanceof Error) {
      throw mockAdapterState.current;
    }
    return mockAdapterState.current;
  },
  getAdapter: () => mockAdapterState.current,
  resolveAdapter: async () => mockAdapterState.current,
  resetAdapter: () => undefined,
}));

function makeReporter(): { reportData: jest.Mock } {
  return { reportData: jest.fn().mockResolvedValue(undefined) };
}

describe("runAndReport label resolution", () => {
  afterEach(() => {
    mockAdapterState.current = undefined;
    jest.restoreAllMocks();
  });

  it("labels reports with the adapter currentTestName", async () => {
    mockAdapterState.current = {
      currentTestName: () => "backport suite › reports a command",
    };
    const reporter = makeReporter();

    const cmd = runAndReport(
      'echo "reported"',
      {},
      StandardOutputWriter,
      reporter as never
    );
    await cmd.promise;

    expect(reporter.reportData).toHaveBeenCalledTimes(1);
    const [reference, body] = reporter.reportData.mock.calls[0];
    expect(reference).toBe(
      'backport suite › reports a command - echo "reported"'
    );
    expect(body).toContain("SUCCESS");
  });

  it("never consults the global expect.getState", async () => {
    mockAdapterState.current = {
      currentTestName: () => "adapter-only label",
    };
    const reporter = makeReporter();
    const globalScope = globalThis as unknown as { expect?: unknown };
    const originalExpect = globalScope.expect;
    globalScope.expect = {
      getState: () => {
        throw new Error("global expect.getState must not be consulted");
      },
    };

    try {
      const cmd = runAndReport(
        'echo "state-free"',
        {},
        StandardOutputWriter,
        reporter as never
      );
      await cmd.promise;
    } finally {
      globalScope.expect = originalExpect;
    }

    expect(reporter.reportData.mock.calls[0][0]).toBe(
      'adapter-only label - echo "state-free"'
    );
  });

  it("falls back to 'no test name' when no adapter can be resolved", async () => {
    mockAdapterState.current = new Error("no framework available");
    const reporter = makeReporter();

    const cmd = runAndReport(
      'echo "no-adapter"',
      {},
      StandardOutputWriter,
      reporter as never
    );
    await expect(cmd.promise).resolves.toBeDefined();

    expect(reporter.reportData.mock.calls[0][0]).toBe(
      'no test name - echo "no-adapter"'
    );
  });
});
