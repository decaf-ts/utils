import { awaitTimeout } from "../../src/utils/timeout";

describe("awaitTimeout", () => {
  it("resolves after approximately the requested time", async () => {
    const start = Date.now();
    await awaitTimeout(50);
    const delta = Date.now() - start;
    expect(delta).toBeGreaterThanOrEqual(45);
  });
});

