import { execFileSync, spawnSync } from "node:child_process";
import { resolveSecret } from "../../../src/cli/commands/credentials.command";

// Stub the child_process primitives so no real keychain backend is ever
// contacted. This is the F1 (CWE-78) regression gate: it proves the backend
// name/value never reaches a shell string.
jest.mock("node:child_process", () => ({
  execFileSync: jest.fn(),
  spawnSync: jest.fn(),
}));

const execFileSyncMock = execFileSync as unknown as jest.Mock;
const spawnSyncMock = spawnSync as unknown as jest.Mock;

describe("CredentialsCommand command injection (F1 / CWE-78)", () => {
  // Quote-bearing custom secret name: the exact value that used to break out of
  // `secret-tool lookup service '<name>' account '<account>'`.
  const INJECTION_NAME = "x';touch /tmp/decaf-injection-marker;'";
  const expectedService = `decaf-ts:${INJECTION_NAME}`;

  beforeEach(() => {
    execFileSyncMock.mockReset();
    spawnSyncMock.mockReset();
    // Force linux libsecret backend detection (no real binaries present).
    spawnSyncMock.mockImplementation(() => ({ status: 0 }));
    // readFromBackend returns a placeholder so resolveSecret can complete.
    execFileSyncMock.mockImplementation(() => "stub-secret");
  });

  it("passes a quote-bearing secret name as a single argv element to every spawned backend command", () => {
    const value = resolveSecret(INJECTION_NAME);

    expect(value).toBe("stub-secret");

    // The secret-tool lookup must be invoked in ARRAY form (never a shell
    // string), with the hostile name as one literal element.
    const lookupCall = execFileSyncMock.mock.calls.find(
      (c) =>
        typeof c[0] === "string" &&
        c[0] === "secret-tool" &&
        Array.isArray(c[1]) &&
        (c[1] as string[])[0] === "lookup"
    );
    expect(lookupCall).toBeDefined();

    const argv = lookupCall![1] as string[];
    expect(lookupCall![0]).toBe("secret-tool");
    expect(argv).toEqual([
      "lookup",
      "service",
      expectedService,
      "account",
      "default",
    ]);
  });

  it("never passes a shell-interpolated string command to any spawn primitive", () => {
    resolveSecret(INJECTION_NAME);

    // Every execFileSync call must be array-form (cmd + argv), never a single
    // shell string. A stray string command target is exactly the CWE-78 shape.
    for (const call of execFileSyncMock.mock.calls) {
      expect(Array.isArray(call[1])).toBe(true);
    }
    for (const call of spawnSyncMock.mock.calls) {
      expect(Array.isArray(call[1])).toBe(true);
    }
    // The hostile value must survive verbatim as a whole element — no shell
    // metacharacter is ever fragmented across argv boundaries.
    expect(execFileSyncMock.mock.calls.some((c) =>
      (c[1] as string[]).some((a) => a === expectedService)
    )).toBe(true);
  });
});
