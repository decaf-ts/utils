import type { ModuleRouter } from "../module-router";
import { loadWorkspaceModule } from "../module-router";
// eslint-disable-next-line @typescript-eslint/no-unused-vars
let workspaceModule: ModuleRouter;

import { awaitTimeout } from "../../src/utils/timeout";

describe("awaitTimeout", () => {
  beforeAll(async () => {
    workspaceModule = await loadWorkspaceModule();
  });

  it("resolves after approximately the requested time", async () => {
    const start = Date.now();
    await awaitTimeout(50);
    const delta = Date.now() - start;
    expect(delta).toBeGreaterThanOrEqual(45);
  });
});
