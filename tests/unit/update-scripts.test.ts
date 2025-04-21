import { TemplateSync } from "../../src/cli/commands";

jest.mock("fs", () => ({
  mkdirSync: jest.fn(),
  writeFileSync: jest.fn(),
  existsSync: jest.fn(),
  readdirSync: jest.fn().mockReturnValue([]),
}));

jest.mock("../../src/utils/http", () => ({
  downloadFile: jest.fn(),
}));

jest.mock("../../src/input/input", () => ({
  insistForText: jest.fn().mockResolvedValue("mockToken"),
  askText: jest.fn().mockResolvedValue("mockOrg"),
  askConfirmation: jest.fn().mockResolvedValue(true),
}));

jest.mock("../../src/utils/fs", () => ({
  getPackage: jest.fn().mockReturnValue({}),
  writeFile: jest.fn(),
  setPackageAttribute: jest.fn(),
  patchFile: jest.fn(),
  patchString: jest.fn().mockImplementation((data) => data),
}));

describe.skip("TemplateSync class", () => {
  let templateSync: TemplateSync;

  beforeEach(() => {
    templateSync = new TemplateSync();
    jest.clearAllMocks();
  });

  it("should load values from package", () => {
    const mockReplacements = ["author", "name", "org"];
    templateSync["loadValuesFromPackage"]();
    mockReplacements.forEach((key) => {
      expect(templateSync["replacements"]).toHaveProperty(key);
    });
  });
});
