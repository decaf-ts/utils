import {
  BrightBackgroundColors,
  BrightForegroundColors,
  color,
  ColorizeOptions,
  StandardBackgroundColors,
  StandardForegroundColors, styles,
} from "../../src/bin/utils/colors";

describe("performance tests", () => {

  let iterations = 1000000;
  it(`Should demonstrate performance benefits of lazy loading colors: ${iterations} iterations`, () => {
    const text = 'Performance Test';

    // Measure time for lazy loading
    let lazyStartTime: bigint;
    const lazyDurationArr: bigint[] = new Array(iterations);
    for (let i = 0; i < iterations; i++) {
      lazyStartTime = process.hrtime.bigint();
      const colored = color(text);
      // Access only one color to trigger lazy loading
      const _ = colored.red;

      lazyDurationArr[i] = process.hrtime.bigint() - lazyStartTime;
    }

    // Measure time for eager loading (creating all colors at once)
    let eagerStartTime: bigint;
    const eagerDurationArr: bigint[] = new Array(iterations);
    for (let i = 0; i < iterations; i++) {
      eagerStartTime = process.hrtime.bigint();
      const colored = color(text);
      // Create all color strings
      Object.keys(StandardForegroundColors).forEach(color => {
        const _ = colored[color as keyof ColorizeOptions];
      });
      Object.keys(BrightForegroundColors).forEach(color => {
        const _ = colored[color as keyof ColorizeOptions];
      });
      Object.keys(StandardBackgroundColors).forEach(color => {
        const _ = colored[color as keyof ColorizeOptions];
      });
      Object.keys(BrightBackgroundColors).forEach(color => {
        const _ = colored[color as keyof ColorizeOptions];
      });
      Object.keys(styles).forEach(style => {
        const _ = colored[style as keyof ColorizeOptions];
      });
      eagerDurationArr[i] = process.hrtime.bigint() - eagerStartTime;
    }

    const lazyDuration = lazyDurationArr.reduce((acc, curr) => acc + curr, BigInt(0)) / BigInt(iterations);
    const eagerDuration = eagerDurationArr.reduce((acc, curr) => acc + curr, BigInt(0)) / BigInt(iterations);

    console.log(`Lazy loading time: ${lazyDuration} microseconds`);
    console.log(`Eager loading time: ${eagerDuration} microseconds`);

    expect(lazyDuration).toBeLessThan(eagerDuration);

    console.log(`The performance benefits of lazy loading are significant - tested over ${iterations}.\nLazy loading ${(parseFloat((lazyDuration / eagerDuration).toString()) * 100).toFixed(2)}% faster.`);
  });

})