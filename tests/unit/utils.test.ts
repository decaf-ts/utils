import { lockify, chainAbortController } from "../../src/utils/utils";

describe("utils", () => {
  describe("lockify", () => {
    it("should execute functions sequentially", async () => {
      const results: number[] = [];
      const slowFunction = (val: number) =>
        new Promise<void>((resolve) =>
          setTimeout(() => {
            results.push(val);
            resolve();
          }, 10)
        );

      const locked = lockify(slowFunction);
      await Promise.all([locked(1), locked(2), locked(3)]);
      expect(results).toEqual([1, 2, 3]);
    });
  });

  describe("chainAbortController", () => {
    it("should abort when any signal aborts", () => {
      const controller1 = new AbortController();
      const controller2 = new AbortController();
      const chained = chainAbortController(controller1.signal, controller2.signal);

      controller1.abort();
      expect(chained.signal.aborted).toBe(true);
    });

    it("should abort if passed controller is aborted", () => {
        const main = new AbortController();
        const signal = new AbortController().signal;
        chainAbortController(main, signal);
        signal.dispatchEvent(new Event('abort'));
        expect(main.signal.aborted).toBe(true);
    });
  });
});
