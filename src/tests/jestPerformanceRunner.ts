import {
  PerformanceScenario,
  PerformanceRunner,
  Phase,
  PhaseResult,
} from "../utils/performanceRunner";

export type JestPerformanceScenario<TContext = Record<string, unknown>> =
  PerformanceScenario<TContext>;

export class JestPerformanceRunner<
  TContext = Record<string, unknown>,
> extends PerformanceRunner<TContext> {
  protected override scenario: JestPerformanceScenario<TContext>;

  constructor(scenario: JestPerformanceScenario<TContext>) {
    super(scenario);
    this.scenario = scenario;
  }

  /**
   * Registers Jest describe/it blocks for the scenario.
   * Creates one `it` per phase — its never fail, errors are only recorded
   * in aggregated results. Logs a per-phase table after each `it` and a
   * combined summary (with optional canvas) in `afterAll`.
   *
   * @param hooks Optional lifecycle hooks:
   *   - `beforeAll`: runs after `scenario.initialize` but before any `it`.
   *     Use this to populate shared mutable state (e.g. metadata objects)
   *     that phase configs reference.
   */
  public describeSuite(hooks?: {
    beforeAll?: () => Promise<void> | void;
  }): void {
    describe(this.scenario.name, () => {
      const results: PhaseResult<TContext>[] = [];

      beforeAll(async () => {
        if (this.scenario.initialize) {
          await this.scenario.initialize();
        }
        if (hooks?.beforeAll) {
          await hooks.beforeAll();
        }
      });

      this.scenario.phases.forEach((phase: Phase<TContext>) => {
        it(phase.name, async () => {
          try {
            const context = this.mergeContext(phase);
            const result = await this.runPhase(phase, context);
            results.push(result);
            this.logPhaseTable(result);
          } catch (e) {
            console.error(
              `[JestPerformanceRunner] Phase "${phase.name}" encountered an error:`,
              e
            );
            // Never fail the it — errors are surfaced in the summary table
          }
        });
      });

      afterAll(async () => {
        await this.logSummary(results);
      });
    });
  }
}
