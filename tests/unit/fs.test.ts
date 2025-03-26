import fs from 'fs';

jest.mock('fs');
jest.mock('../../../src/bin/utils/text');

describe('patchFile', () => {
  
  it('Should preserve file permissions after updating the content', async () => {
    const mockPath = '/mock/file/path';
    const mockValues = { key: 'value' };
    const mockContent = 'Original content';
    const mockUpdatedContent = 'Updated content';
    const mockStats = { mode: 0o644 };

    fs.existsSync.mockReturnValue(true);
    fs.readFileSync.mockReturnValue(mockContent);
    TextUtils.patchString.mockReturnValue(mockUpdatedContent);
    fs.statSync.mockReturnValue(mockStats);

    patchFile(mockPath, mockValues);

    expect(fs.writeFileSync).toHaveBeenCalledWith(mockPath, mockUpdatedContent, 'utf8');
    expect(fs.chmodSync).toHaveBeenCalledWith(mockPath, mockStats.mode);
  });

  it('Should log a success message after successfully updating the file', () => {
    const mockPath = '/path/to/file.json';
    const mockValues = { key: 'value' };
    const mockContent = 'original content';
    const mockPatchedContent = 'patched content';

    (fs.existsSync as jest.Mock).mockReturnValue(true);
    (fs.readFileSync as jest.Mock).mockReturnValue(mockContent);
    (TextUtils.patchString as jest.Mock).mockReturnValue(mockPatchedContent);

    const consoleSpy = jest.spyOn(console, 'log');

    patchFile(mockPath, mockValues);

    expect(fs.existsSync).toHaveBeenCalledWith(mockPath);
    expect(fs.readFileSync).toHaveBeenCalledWith(mockPath, 'utf8');
    expect(TextUtils.patchString).toHaveBeenCalledWith(mockContent, mockValues);
    expect(fs.writeFileSync).toHaveBeenCalledWith(mockPath, mockPatchedContent, 'utf8');
    expect(consoleSpy).toHaveBeenCalledWith(`Successfully updated "${mockPath}".`);

    consoleSpy.mockRestore();
  });

  it('Should throw an error when the file content is not valid UTF-8', () => {
    const path = '/path/to/file';
    const values = { key: 'value' };

    (fs.existsSync as jest.Mock).mockReturnValue(true);
    (fs.readFileSync as jest.Mock).mockImplementation(() => {
      throw new Error('Invalid UTF-8 encoding');
    });

    expect(() => patchFile(path, values)).toThrow('Error updating JSON file: Error: Invalid UTF-8 encoding');

    expect(fs.existsSync).toHaveBeenCalledWith(path);
    expect(fs.readFileSync).toHaveBeenCalledWith(path, 'utf8');
    expect(fs.writeFileSync).not.toHaveBeenCalled();
    expect(TextUtils.patchString).not.toHaveBeenCalled();
  });

  it('Should correctly handle special characters in the file content', () => {
    const mockPath = '/test/path.json';
    const mockContent = '{"key": "value with $pecial ch@racters"}';
    const mockValues = { key: 'new value with more $pecial ch@racters!' };

    (fs.existsSync as jest.Mock).mockReturnValue(true);
    (fs.readFileSync as jest.Mock).mockReturnValue(mockContent);
    (TextUtils.patchString as jest.Mock).mockReturnValue(JSON.stringify({ key: mockValues.key }));

    patchFile(mockPath, mockValues);

    expect(fs.existsSync).toHaveBeenCalledWith(mockPath);
    expect(fs.readFileSync).toHaveBeenCalledWith(mockPath, 'utf8');
    expect(TextUtils.patchString).toHaveBeenCalledWith(mockContent, mockValues);
    expect(fs.writeFileSync).toHaveBeenCalledWith(mockPath, JSON.stringify({ key: mockValues.key }), 'utf8');
  });

  it('Should handle large files without running out of memory', async () => {
    const largePath = '/path/to/large/file.txt';
    const largeContent = 'a'.repeat(1024 * 1024 * 100); // 100MB of content
    const values = { key: 'value' };

    (fs.existsSync as jest.Mock).mockReturnValue(true);
    (fs.readFileSync as jest.Mock).mockReturnValue(largeContent);
    (TextUtils.patchString as jest.Mock).mockReturnValue(largeContent);

    await expect(patchFile(largePath, values)).resolves.not.toThrow();

    expect(fs.existsSync).toHaveBeenCalledWith(largePath);
    expect(fs.readFileSync).toHaveBeenCalledWith(largePath, 'utf8');
    expect(TextUtils.patchString).toHaveBeenCalledWith(largeContent, values);
    expect(fs.writeFileSync).toHaveBeenCalledWith(largePath, largeContent, 'utf8');
    expect(console.log).toHaveBeenCalledWith(`Successfully updated "${largePath}".`);
  });

  it('Should throw an error when trying to write to a read-only file', async () => {
    const mockPath = '/path/to/readonly/file.json';
    const mockValues = { key: 'value' };

    (fs.existsSync as jest.Mock).mockReturnValue(true);
    (fs.readFileSync as jest.Mock).mockReturnValue('{"key": "oldValue"}');
    (TextUtils.patchString as jest.Mock).mockReturnValue('{"key": "value"}');
    (fs.writeFileSync as jest.Mock).mockImplementation(() => {
      throw new Error('EACCES: permission denied');
    });

    await expect(patchFile(mockPath, mockValues)).rejects.toThrow('Error updating JSON file: Error: EACCES: permission denied');

    expect(fs.existsSync).toHaveBeenCalledWith(mockPath);
    expect(fs.readFileSync).toHaveBeenCalledWith(mockPath, 'utf8');
    expect(TextUtils.patchString).toHaveBeenCalledWith('{"key": "oldValue"}', mockValues);
    expect(fs.writeFileSync).toHaveBeenCalledWith(mockPath, '{"key": "value"}', 'utf8');
  });

  it('Should correctly patch multiple values in the file content', () => {
    const mockPath = '/mock/file.txt';
    const mockContent = 'Hello {{name}}, your score is {{score}}.';
    const mockValues = { name: 'John', score: 95 };
    const expectedContent = 'Hello John, your score is 95.';

    (fs.existsSync as jest.Mock).mockReturnValue(true);
    (fs.readFileSync as jest.Mock).mockReturnValue(mockContent);
    (TextUtils.patchString as jest.Mock).mockReturnValue(expectedContent);

    patchFile(mockPath, mockValues);

    expect(fs.existsSync).toHaveBeenCalledWith(mockPath);
    expect(fs.readFileSync).toHaveBeenCalledWith(mockPath, 'utf8');
    expect(TextUtils.patchString).toHaveBeenCalledWith(mockContent, mockValues);
    expect(fs.writeFileSync).toHaveBeenCalledWith(mockPath, expectedContent, 'utf8');
    expect(console.log).toHaveBeenCalledWith(`Successfully updated "${mockPath}".`);
  });

  it('Should handle empty values object without modifying the file content', () => {
    const mockPath = '/mock/file.txt';
    const mockContent = 'Original content';

    (fs.existsSync as jest.Mock).mockReturnValue(true);
    (fs.readFileSync as jest.Mock).mockReturnValue(mockContent);
    (TextUtils.patchString as jest.Mock).mockImplementation((content) => content);

    patchFile(mockPath, {});

    expect(fs.existsSync).toHaveBeenCalledWith(mockPath);
    expect(fs.readFileSync).toHaveBeenCalledWith(mockPath, 'utf8');
    expect(TextUtils.patchString).toHaveBeenCalledWith(mockContent, {});
    expect(fs.writeFileSync).toHaveBeenCalledWith(mockPath, mockContent, 'utf8');
    expect(console.log).toHaveBeenCalledWith(`Successfully updated "${mockPath}".`);
  });

  it('Should throw an error when the file is not found at the given path', () => {
    const nonExistentPath = '/path/to/nonexistent/file.json';
    const mockValues = { key: 'value' };

    (fs.existsSync as jest.Mock).mockReturnValue(false);

    expect(() => patchFile(nonExistentPath, mockValues)).toThrow(
      `File not found at path "${nonExistentPath}".`
    );

    expect(fs.existsSync).toHaveBeenCalledWith(nonExistentPath);
    expect(fs.readFileSync).not.toHaveBeenCalled();
    expect(TextUtils.patchString).not.toHaveBeenCalled();
    expect(fs.writeFileSync).not.toHaveBeenCalled();
  });

  it('Should successfully update the file when given a valid path and values', () => {
    const mockPath = '/path/to/file.txt';
    const mockValues = { key1: 'value1', key2: 42 };
    const mockContent = 'Original content';
    const mockPatchedContent = 'Patched content';

    (fs.existsSync as jest.Mock).mockReturnValue(true);
    (fs.readFileSync as jest.Mock).mockReturnValue(mockContent);
    (TextUtils.patchString as jest.Mock).mockReturnValue(mockPatchedContent);
    const consoleSpy = jest.spyOn(console, 'log');

    patchFile(mockPath, mockValues);

    expect(fs.existsSync).toHaveBeenCalledWith(mockPath);
    expect(fs.readFileSync).toHaveBeenCalledWith(mockPath, 'utf8');
    expect(TextUtils.patchString).toHaveBeenCalledWith(mockContent, mockValues);
    expect(fs.writeFileSync).toHaveBeenCalledWith(mockPath, mockPatchedContent, 'utf8');
    expect(consoleSpy).toHaveBeenCalledWith(`Successfully updated "${mockPath}".`);
  });
  
});
