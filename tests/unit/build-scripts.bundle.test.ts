import { jest } from "@jest/globals";

// We'll mock rollup to capture the input options used by the bundle method and the outputs
let capturedInput: any = null;
const capturedOutputs: any[] = [];

import { BuildScripts, getPackage } from "../../src";

function knownDeps() {
  const pkg: any = getPackage();

  return Array.from(
    new Set([
      ...Object.keys(pkg.dependencies || {}),
      ...Object.keys(pkg.peerDependencies || {}),
    ])
  );
}

jest.mock("rollup", () => ({
  rollup: async (input: any) => {
    capturedInput = input;
    return {
      watchFiles: [],
      write: async (output: any) => {
        capturedOutputs.push(output);
        return { output: [] };
      },
      close: async () => undefined,
    };
  },
}));

describe("BuildScripts.bundle externals/includes handling", () => {
  let bs: BuildScripts;

  beforeEach(() => {
    bs = new BuildScripts();
    capturedInput = null;
    capturedOutputs.length = 0;
  });

  test("parses includes and externals string and populates external and globals", async () => {
    // call bundle with comma separated strings
    await bs.bundle(
      // mode
      "commonjs" as any,
      // isDev
      true,
      // isLib
      false,
      // entryFile
      "src/index.ts",
      // nameOverride
      undefined as any,
      // externalsArg
      "lodash,tslib",
      // includeArg
      "prompts,styled-string-builder"
    );

    expect(capturedInput).not.toBeNull();
    expect(Array.isArray(capturedInput.external)).toBeTruthy();
    expect(capturedInput.external).toContain("lodash");
    // outputs captured
    expect(capturedOutputs.length).toBeGreaterThan(0);
    const out = capturedOutputs[0] as any;
    expect(out.globals).toBeDefined();
    // globals created by bundle method map package names to camel cased globals
    expect(out.globals.lodash || out.globals["lodash"]).toBeDefined();
  });

  test("when no externalsArg provided, package.json deps are used as externals", async () => {
    const bs = new BuildScripts();
    capturedInput = null;
    capturedOutputs.length = 0;

    await bs.bundle("commonjs" as any, true, false);
    expect(capturedInput).not.toBeNull();
    const deps = knownDeps();
    // ensure at least one known dep is present in external list
    const found = deps.some((d) => capturedInput.external.includes(d));
    expect(found).toBeTruthy();
  });

  test.skip("production mode adds terser plugin when available (lazy require)", async () => {
    const bs = new BuildScripts();
    capturedInput = null;
    capturedOutputs.length = 0;

    // call production bundle (isDev = false)
    await bs.bundle("commonjs" as any, false, false);
    expect(capturedInput).not.toBeNull();
    // look for a plugin whose toString contains 'terser' or name includes terser
    const plugins = capturedInput.plugins || [];
    const hasTerser = plugins.some((p: any) => {
      try {
        if (p && p.name && p.name.toLowerCase().includes("terser")) return true;
        const s = String(p);
        if (s && s.toLowerCase().includes("terser")) return true;
      } catch (e) {
        console.error(e);
      }
      return false;
    });
    expect(hasTerser).toBeTruthy();
  });
});
