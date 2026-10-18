import fs from "node:fs";
import path from "node:path";
import {
  createExpect as backportCreateExpect,
  expect as backportExpect,
  getReporter,
  it as backportIt,
  itReportsOnFailure,
  reportObjects,
  ReportExpect,
  setReporter,
  type ExpectApi,
} from "@decaf-ts/utils/tests";

const testingRoot = path.resolve(__dirname, "../../../testing");
const hasTestingSource = fs.existsSync(
  path.join(testingRoot, "src", "expect.ts")
);

interface MessageCase {
  name: string;
  apply: (expect: ExpectApi, legacy: ReportExpect) => void;
}

const MESSAGE_CASES: MessageCase[] = [
  {
    name: "be",
    apply: (expect, legacy) => {
      legacy.assertToBe(2, 2, "value");
      expect(2).referredToAs("value").to.be(2);
    },
  },
  {
    name: "be failing",
    apply: (expect, legacy) => {
      legacy.assertToBe(2, 3, "value");
      expect(3).referredToAs("value").to.be(2);
    },
  },
  {
    name: "equal",
    apply: (expect, legacy) => {
      legacy.assertToEqual({ a: 1 }, { a: 1 }, "payload");
      expect({ a: 1 }).referredToAs("payload").to.equal({ a: 1 });
    },
  },
  {
    name: "contain",
    apply: (expect, legacy) => {
      legacy.assertToContain([1, 2], 2, "items");
      expect([1, 2]).referredToAs("items").to.contain(2);
    },
  },
  {
    name: "contain failing",
    apply: (expect, legacy) => {
      legacy.assertToContain([1, 2], 3, "items");
      expect([1, 2]).referredToAs("items").to.contain(3);
    },
  },
  {
    name: "beGreaterThan",
    apply: (expect, legacy) => {
      legacy.assertToBeGreaterThan(1, 2, "count");
      expect(2).referredToAs("count").to.beGreaterThan(1);
    },
  },
  {
    name: "beGreaterThanOrEqual",
    apply: (expect, legacy) => {
      legacy.assertToBeGreaterThanOrEqual(2, 2, "count");
      expect(2).referredToAs("count").to.beGreaterThanOrEqual(2);
    },
  },
  {
    name: "beLessThan",
    apply: (expect, legacy) => {
      legacy.assertToBeLessThan(3, 2, "count");
      expect(2).referredToAs("count").to.beLessThan(3);
    },
  },
  {
    name: "beLessThanOrEqual",
    apply: (expect, legacy) => {
      legacy.assertToBeLessThanOrEqual(2, 2, "count");
      expect(2).referredToAs("count").to.beLessThanOrEqual(2);
    },
  },
  {
    name: "beDefined",
    apply: (expect, legacy) => {
      legacy.assertToBeDefined(0, "value");
      expect(0).referredToAs("value").to.beDefined();
    },
  },
  {
    name: "beTruthy",
    apply: (expect, legacy) => {
      legacy.assertToBeTruthy("yes", "value");
      expect("yes").referredToAs("value").to.beTruthy();
    },
  },
  {
    name: "not.be",
    apply: (expect, legacy) => {
      void legacy.not;
      legacy.assertToBe(2, 3, "value");
      expect(3).referredToAs("value").not.to.be(2);
    },
  },
];

function readBackportMessages(): Array<{
  name: string;
  report: string;
  errors: string[];
  status: string;
}> {
  return MESSAGE_CASES.map(({ name, apply }) => {
    const legacy = new ReportExpect();
    const expect = backportCreateExpect();
    apply(expect, legacy);
    return {
      name,
      report: expect.getReport(),
      errors: expect.getErrors(),
      status: expect.getStatus(),
    };
  });
}

function readTestingMessages(): Array<{
  name: string;
  report: string;
  errors: string[];
  status: string;
}> {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const testing = require("../../../testing/src") as {
    createExpect: () => ExpectApi;
    ReportExpect: new () => ReportExpect;
  };
  return MESSAGE_CASES.map(({ name, apply }) => {
    const legacy = new testing.ReportExpect();
    const expect = testing.createExpect();
    apply(expect, legacy);
    return {
      name,
      report: expect.getReport(),
      errors: expect.getErrors(),
      status: expect.getStatus(),
    };
  });
}

describe("@decaf-ts/utils/tests backport", () => {
  const originalReporter = getReporter();

  afterEach(() => {
    setReporter(originalReporter);
  });

  it("exports the full reporter API from the package subpath", () => {
    expect(typeof backportIt).toBe("function");
    expect(typeof backportIt.report).toBe("function");
    expect(typeof backportExpect).toBe("function");
    expect(typeof backportCreateExpect).toBe("function");
    expect(typeof itReportsOnFailure).toBe("function");
    expect(typeof ReportExpect).toBe("function");
    expect(typeof getReporter).toBe("function");
    expect(typeof setReporter).toBe("function");
    expect(typeof reportObjects).toBe("function");
  });

  it("installs and returns the reporter through the backported registry", () => {
    const reporter = { marker: "backport" };
    setReporter(reporter as never);

    expect(getReporter()).toBe(reporter);
  });

  (hasTestingSource ? it : it.skip)(
    "produces the same messages as @decaf-ts/for-testing",
    () => {
      expect(readBackportMessages()).toEqual(readTestingMessages());
    }
  );

  it("persists standalone expect assertions through reportObjects", async () => {
    const reporter = {
      expect: backportCreateExpect(),
      reportObject: jest.fn().mockResolvedValue(undefined),
    };
    setReporter(reporter as never);

    backportExpect(2).referredToAs("value").to.be(2);
    await reportObjects(reporter as never, reporter.expect, {
      status: 200,
      data: { ok: true },
    });

    expect(reporter.reportObject).toHaveBeenCalledTimes(2);
    expect(reporter.expect.getReport()).toContain(
      "Expected value to be 2 and received 2"
    );
  });

  it("has no dependency edge from utils to for-testing", () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const pkg = require("../../package.json") as Record<string, unknown>;
    const dependencyFields = [
      "dependencies",
      "devDependencies",
      "peerDependencies",
      "optionalDependencies",
    ];

    for (const field of dependencyFields) {
      const dependencies = (pkg[field] ?? {}) as Record<string, unknown>;
      expect(Object.keys(dependencies)).not.toContain(
        "@decaf-ts/for-testing"
      );
    }

    const sourceRoot = path.resolve(__dirname, "../../src/tests");
    const offenders: string[] = [];
    const visit = (directory: string): void => {
      for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
        const entryPath = path.join(directory, entry.name);
        if (entry.isDirectory()) {
          visit(entryPath);
        } else if (
          entry.name.endsWith(".ts") &&
          /^\s*(?:import|export)[^;\n]*from\s+["']@decaf-ts\/for-testing|require\(\s*["']@decaf-ts\/for-testing/m.test(
            fs.readFileSync(entryPath, "utf8")
          )
        ) {
          offenders.push(entryPath);
        }
      }
    };
    visit(sourceRoot);

    expect(offenders).toEqual([]);
  });
});
