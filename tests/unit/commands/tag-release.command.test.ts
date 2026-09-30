import { execSync } from "node:child_process";
import {
  PUBLISH_STRATEGIES,
  RootPublishStrategy,
  SubdirectoryPublishStrategy,
} from "../../../src/cli/commands/tag-release.command";
import { makeScratchDir } from "./test-support";

// publish strategies shell out to npm; block the real exec in every test
jest.mock("node:child_process", () => ({
  execSync: jest.fn(),
}));

// with the mock factory in place the imported execSync is the jest mock
const execSyncMock = execSync as unknown as jest.Mock;

const ctx = (overrides: Record<string, unknown> = {}) => ({
  // placeholder only -- never a real token value
  npmToken: "placeholder-token",
  accessValue: "public" as const,
  isPrerelease: false,
  cwd: makeScratchDir("tag-release-"),
  interactivePublish: false,
  ...overrides,
});

describe("tag-release publish strategies", () => {
  beforeEach(() => {
    execSyncMock.mockClear();
  });

  it("root strategy publishes from the repository root", () => {
    new RootPublishStrategy().publish(ctx());

    const [command, options] = execSyncMock.mock.calls[0];
    expect(command).toContain("npm publish");
    expect(command).toContain('--access "public"');
    expect(command).toContain("--ignore-scripts");
    expect(command).not.toContain("--tag prerelease");
    expect(options.cwd).toBeDefined();
  });

  it("root strategy adds the prerelease tag for prerelease bumps", () => {
    new RootPublishStrategy().publish(ctx({ isPrerelease: true }));

    const [command] = execSyncMock.mock.calls[0];
    expect(command).toContain("--tag prerelease");
  });

  it("subdirectory strategy optionally builds first and publishes the subfolder", () => {
    new SubdirectoryPublishStrategy("dist/lib", "build:prod").publish(ctx());

    const calls = execSyncMock.mock.calls as unknown as [string, ...unknown[]][];
    expect(calls[0][0]).toBe("npm run build:prod");
    const publishCommand = calls[1][0];
    // "./" prefix disambiguates the local folder from a github spec
    expect(publishCommand).toContain('npm publish "./dist/lib"');
    expect(publishCommand).toContain("--ignore-scripts");
  });

  it("registry resolves strategies by name from the repo config", () => {
    expect(PUBLISH_STRATEGIES.root({})).toBeInstanceOf(RootPublishStrategy);
    const sub = PUBLISH_STRATEGIES.subdirectory({
      publishDir: "dist/lib",
      prePublishScript: "build",
    });
    expect(sub).toBeInstanceOf(SubdirectoryPublishStrategy);
  });
});
