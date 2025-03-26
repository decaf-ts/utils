import { style } from "../../src/bin/utils/strings";
import { StyledString } from "../../src/bin/utils/strings";
import { styles } from "../../src/bin";
import { StandardForegroundColors, BrightBackgroundColors, BrightForegroundColors, StandardBackgroundColors } from "../../src/bin/utils/constants";
function escapeRegExp(string: string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); // $& means the whole matched string
}

describe('color function', () => {

  let styledString: StyledString;
  beforeEach(() => {
    styledString = new StyledString('Test');
  });

  it('should create a StyledString instance', () => {
    expect(styledString).toBeInstanceOf(StyledString);
    expect(styledString.text).toBe('Test');
  });

  it('should apply standard foreground colors', () => {
    Object.keys(StandardForegroundColors).forEach(color => {
      expect(styledString[color as keyof typeof StandardForegroundColors].text).toMatch(/\x1b\[\d+mTest\x1b\[0m/);
    });
  });

  it('should apply bright foreground colors', () => {
    Object.keys(BrightForegroundColors).forEach(color => {
      expect(styledString[color as keyof typeof BrightForegroundColors].text).toMatch(/\x1b\[\d+mTest\x1b\[0m/);
    });
  });

  it('should apply standard background colors', () => {
    Object.keys(StandardBackgroundColors).forEach(color => {
      expect(styledString[color as keyof typeof StandardBackgroundColors].text).toMatch(/\x1b\[\d+mTest\x1b\[0m/);
    });
  });

  it('should apply bright background colors', () => {
    Object.keys(BrightBackgroundColors).forEach(color => {
      expect(styledString[color as keyof typeof BrightBackgroundColors].text).toMatch(/\x1b\[\d+mTest\x1b\[0m/);
    });
  });

  it('should apply styles', () => {
    Object.keys(styles).forEach(styleName => {
      expect(styledString[styleName as keyof typeof styles].text).toMatch(/\x1b\[\d+mTest\x1b\[0m/);
    });
  });

  it('should clear styling', () => {
    const coloredString = styledString.red;
    expect(coloredString.clear().text).toBe('Test');
  });

  it.skip('should apply raw ANSI codes', () => {
    const rawAnsiCode = '\x1b[31m';
    const styledText = styledString.raw(rawAnsiCode).text;

    // Check if the raw ANSI code is present in the string
    expect(styledText).toContain(rawAnsiCode);

    // Check if the original text is present in the string
    expect(styledText).toContain('Test');

    // Check that the string starts with either the ANSI code or the original text
    expect(styledText.startsWith(rawAnsiCode) || styledText.startsWith('Test')).toBe(true);

    // Check that the string ends with either the ANSI code or the original text
    expect(styledText.endsWith(rawAnsiCode) || styledText.endsWith('Test')).toBe(true);

    // Log the actual result for debugging
    console.log('Raw ANSI code result:', styledText);
  });

  it('should apply foreground color', () => {
    expect(styledString.foreground(31).text).toMatch(/\x1b\[31mTest\x1b\[0m/);
  });

  it('should apply background color', () => {
    expect(styledString.background(41).text).toMatch(/\x1b\[41mTest\x1b\[0m/);
  });

  it('should apply style', () => {
    expect(styledString.style('bold').text).toMatch(/\x1b\[1mTest\x1b\[0m/);
  });

  it('should apply 256-color foreground', () => {
    expect(styledString.color256(100).text).toMatch(/\x1b\[38;5;100mTest\x1b\[0m/);
  });

  it('should apply 256-color background', () => {
    expect(styledString.bgColor256(100).text).toMatch(/\x1b\[48;5;100mTest\x1b\[0m/);
  });

  it('should apply RGB foreground color', () => {
    expect(styledString.rgb(100, 150, 200).text).toMatch(/\x1b\[38;2;100;150;200mTest\x1b\[0m/);
  });

  it('should apply RGB background color', () => {
    expect(styledString.bgRgb(100, 150, 200).text).toMatch(/\x1b\[48;2;100;150;200mTest\x1b\[0m/);
  });

  // Keeping the existing last two tests
  it('Should check if the foreground method works correctly with custom color codes', () => {
    const colored = style('Test');
    const customColorCode = 94; // Bright blue

    expect(colored.foreground(customColorCode).text).toBe(`\x1b[${customColorCode}mTest\x1b[0m`);
  });

  it('Should test the background method with custom color codes', () => {
    const colored = style('Test');
    const customColorCode = 45; // Magenta background

    expect(colored.background(customColorCode).text).toBe(`\x1b[45mTest\x1b[0m`);
  });


  const testText = 'Hello World!';

  // Helper function to log colored text
  const logColored = (description: string, coloredText: string) => {
    console.log(`\n${description}: ${coloredText}`);
  };


  it('Should check if the foreground method works correctly with custom color codes', () => {
    const colored = style('Test');
    const customColorCode = 94; // Bright blue

    expect(colored.foreground(customColorCode).text).toBe(`\x1b[${customColorCode}mTest\x1b[0m`);
  });

  it('Should test the background method with custom color codes', () => {
    const colored = style('Test');
    const customColorCode = 45; // Magenta background

    expect(colored.background(customColorCode).text).toBe(`\x1b[45mTest\x1b[0m`);
  });

  it('Should verify that the style method works with custom style codes', () => {
    const colored = style('Test');
    const customStyleCode = 'bold';

    // Test with a custom style code
    expect(colored.style(customStyleCode).text).toMatch(new RegExp(`\\x1b\\[${styles[customStyleCode]}m.*Test.*\\x1b\\[0m`));

    // Test with a direct style property
    expect(colored.bold.text).toMatch(new RegExp(`\\x1b\\[${styles.bold}m.*Test.*\\x1b\\[0m`));
    //
    // // Test with multiple styles
    // expect(colored.bold.italic.text).toMatch(new RegExp(`\\x1b\\[${styles.bold}m.*\\x1b\\[${styles.italic}m.*Test.*\\x1b\\[0m`));

    // Test with an invalid style code
    expect(colored.style('invalidStyle' as any).text).toMatch(new RegExp(`\\x1b\\[${styles.bold}m.*Test.*\\x1b\\[0m`));

    // Test with a numeric style code
    const numericStyleCode = 1; // Usually corresponds to 'bold'
    expect(colored.style(numericStyleCode).text).toMatch(new RegExp(`\\x1b\\[${numericStyleCode}m.*Test.*\\x1b\\[0m`));

    // Test clearing styles
    expect(colored.bold.clear().text).toBe('Test');
  });

  it('Should handle invalid color codes gracefully in color256 and bgColor256 methods', () => {
    const colored = style('Test');

    // Test color256 with invalid values
    expect(colored.color256(-1).text).toBe('Test');
    expect(colored.color256(256).text).toBe('Test');
    expect(colored.color256(NaN).text).toBe('Test');

    // Test bgColor256 with invalid values
    expect(colored.bgColor256(-1).text).toBe('Test');
    expect(colored.bgColor256(256).text).toBe('Test');
    expect(colored.bgColor256(NaN).text).toBe('Test');

    // Test with valid values to ensure normal functionality
    expect(colored.color256(100).text).toMatch(/\x1b\[38;5;100m.*\x1b\[0m/);
    expect(colored.bgColor256(200).text).toMatch(/\x1b\[48;5;200m.*\x1b\[0m/);
  });

  it.skip('Should test RGB color methods with boundary values (0 and 255)', () => {
    const colored = style('Test');

    // Test rgb method with boundary values
    expect(colored.rgb(0, 0, 0).text).toMatch(new RegExp(`\\x1b\\[38;2;0;0;0m.*Test.*\\x1b\\[0m`));
    expect(colored.rgb(255, 255, 255).text).toMatch(new RegExp(`\\x1b\\[38;2;255;255;255m.*Test.*\\x1b\\[0m`));
    expect(colored.rgb(0, 255, 0).text).toMatch(new RegExp(`\\x1b\\[38;2;0;255;0m.*Test.*\\x1b\\[0m`));

    // Test bgRgb method with boundary values
    expect(colored.bgRgb(0, 0, 0).text).toMatch(new RegExp(`\\x1b\\[48;2;0;0;0m.*Test.*\\x1b\\[0m`));
    expect(colored.bgRgb(255, 255, 255).text).toMatch(new RegExp(`\\x1b\\[48;2;255;255;255m.*Test.*\\x1b\\[0m`));
    expect(colored.bgRgb(255, 0, 255).text).toMatch(new RegExp(`\\x1b\\[48;2;255;0;255m.*Test.*\\x1b\\[0m`));

    // Test rgb and bgRgb methods with invalid values
    // Test rgb and bgRgb methods with invalid values
    expect(colored.rgb(-1, 0, 0).text).not.toMatch(/\x1b\[/);
    expect(colored.rgb(0, 256, 0).text).not.toMatch(/\x1b\[/);
    expect(colored.rgb(0, 0, NaN).text).not.toMatch(/\x1b\[/);
    expect(colored.bgRgb(-1, 0, 0).text).not.toMatch(/\x1b\[/);
    expect(colored.bgRgb(0, 256, 0).text).not.toMatch(/\x1b\[/);
    expect(colored.bgRgb(0, 0, NaN).text).not.toMatch(/\x1b\[/);

    // Test that the original text is preserved for invalid values
    expect(colored.rgb(-1, 0, 0).text).toEqual('Test');
    expect(colored.bgRgb(0, 256, 0).text).toEqual('Test');

    // Test rgb and bgRgb methods with mixed valid and invalid values
    expect(colored.rgb(100, -1, 200).text).not.toMatch(/\x1b\[/);
    expect(colored.bgRgb(300, 100, 50).text).not.toMatch(/\x1b\[/);

    // Ensure the original text is preserved for mixed valid/invalid values
    expect(colored.rgb(100, -1, 200).text).toEqual('Test');
    expect(colored.bgRgb(300, 100, 50).text).toEqual('Test');
  });

  const lineBreak = 32;

  it.skip(`Should create a string with 256 ANSI color backgrounds and foregrounds, with line breaks every ${lineBreak} characters`, () => {
    const col = style('$');

    let result = '';

    for (let i = 0; i < 256; i++) {
      const bgColor = i;
      const fgColor = 255 - i;
      result += col.color256(fgColor).bgColor256(bgColor).text;

      if ((i + 1) % lineBreak === 0) {
        result += '\n';
      }
    }

    console.log('256 ANSI color spectrum:');
    console.log(result);

    // Test the first color combination
    expect(result).toMatch(new RegExp(`^\\x1b\\[48;5;0m\\x1b\\[38;5;255m\\$`));

    // Test that there are the correct number of line breaks
    expect(result.split('\n').length).toBe(Math.ceil(256 / lineBreak));

    // Test that the result string contains the correct number of color codes
    const escapeCodeCount = (result.match(new RegExp('\x1b\\[', 'g')) || []).length;
    expect(escapeCodeCount).toBe(256 * 3); // 256 bg colors, 256 fg colors, 256 resets
  });

  it.skip(`Should create a string with RGB color combinations, with line breaks every ${lineBreak} characters`, () => {
    const step = lineBreak;
    const cellWidth = 2;
    const cellsPerLine = lineBreak;
    let result = '';
    let count = 0;

    for (let r = 0; r <= 255; r += step) {
      for (let g = 0; g <= 255; g += step) {
        for (let b = 0; b <= 255; b += step) {
          const colored = style(new Array(cellWidth).fill(' ').join(''));
          result += colored.bgRgb(r, g, b).text;
          count++;

          if (count % cellsPerLine === 0) {
            result += '\n';
          }
        }
      }
    }

    console.log('RGB color spectrum:');
    console.log(result);

    const expectedCombinations = Math.pow(Math.floor(256 / step) + 1, 3);

    // Test the first color combination (black)
    expect(result).toMatch(new RegExp(`^\\x1b\\[48;2;0;0;0m`));

    // Test that there are the correct number of line breaks
    const expectedLines = Math.ceil(expectedCombinations / cellsPerLine);
    expect(result.split('\n').length).toBe(expectedLines);

    // Test that the result string contains the correct number of color codes
    const escapeCodeCount = (result.match(new RegExp('\x1b\\[', 'g')) || []).length;
    expect(escapeCodeCount).toBe(expectedCombinations * 2); // Each combination has a color code and a reset

    console.log(`Total RGB combinations: ${expectedCombinations}`);
    console.log(`Total lines: ${expectedLines}`);
  });
});