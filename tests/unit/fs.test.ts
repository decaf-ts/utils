import * as fs from "fs";
import * as fsUtils from "../../src/utils/fs";
jest.mock("fs");
jest.mock("path");

describe("fs utils - mocked", () => {
  afterAll(() => {
    jest.restoreAllMocks();
    jest.clearAllMocks();
    jest.resetAllMocks();
  });

  it("should correctly read and return the content of an existing file", () => {
    const testPath = "/test/file.txt";
    const testContent = "This is test content";

    (fs.existsSync as jest.Mock).mockReturnValue(true);
    (fs.readFileSync as jest.Mock).mockReturnValue(testContent);

    const result = fsUtils.readFile(testPath);

    expect(fs.readFileSync).toHaveBeenCalledWith(testPath, "utf8");
    expect(result).toBe(testContent);
  });

  it("should throw an error when trying to read a non-existent file", () => {
    jest.mock("fs");
    const nonExistentPath = "/path/to/non-existent/file.txt";
    const mockReadFileSync = jest.spyOn(fs, "readFileSync");
    mockReadFileSync.mockImplementation(() => {
      throw new Error("ENOENT: no such file or directory");
    });

    expect(() => fsUtils.readFile(nonExistentPath)).toThrow(
      `Error reading file "${nonExistentPath}": Error: ENOENT: no such file or directory`
    );
  });

  it("should throw an error when attempting to patch a non-existent file", () => {
    const nonExistentPath = "/path/to/non-existent/file.txt";
    const mockValues = { key: "value" };

    jest.mock("fs");

    (fs.existsSync as jest.Mock).mockReturnValue(false);

    expect(() => {
      fsUtils.patchFile(nonExistentPath, mockValues);
    }).toThrow(`File not found at path "${nonExistentPath}".`);

    expect(fs.existsSync).toHaveBeenCalledWith(nonExistentPath);
  });

  it.skip("should correctly set a new attribute in package.json", () => {
    jest.mock("fs");
    const mockPackage = { name: "test-package", version: "1.0.0" };
    const mockPath = "/mock/path";
    const mockAttribute = "newAttr";
    const mockValue = "newValue";

    jest.spyOn(fsUtils, "getPackage").mockReturnValue(mockPackage);
    const writeFileSpy = jest.spyOn(fsUtils, "writeFile").mockImplementation();

    fsUtils.setPackageAttribute(mockAttribute, mockValue, mockPath);

    expect(fsUtils.getPackage).toHaveBeenCalledWith(mockPath);
    expect(writeFileSpy).toHaveBeenCalledWith(
      "/mock/path/package.json",
      JSON.stringify({ ...mockPackage, [mockAttribute]: mockValue }, null, 2)
    );
  });
});

describe.skip("fs utils - non-mocked", () => {
  beforeAll(() => {
    jest.restoreAllMocks();
    jest.clearAllMocks();
    jest.resetAllMocks();
  });

  it("should retrieve the entire package object when no property is specified", () => {
    const result = fsUtils.getPackage();

    expect(fs.readFileSync).toHaveBeenCalledWith(
      expect.stringContaining("package.json"),
      "utf8"
    );
    expect(result).toEqual(
      expect.objectContaining({
        name: "@decaf-ts/utils",
      })
    );
  });

  it("should throw an error when trying to access a non-existent property in package.json", () => {
    expect(() => {
      fsUtils.getPackage(process.cwd(), "non_existent_property");
    }).toThrow('Property "non_existent_property" not found in package.json');
  });
});
