import { PerformanceScenario, PerformanceRunner } from "../utils/performanceRunner";

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

  public describeSuite(): void {
    describe(this.scenario.name, () => {
      it("executes the performance scenario", async () => {
        await this.run();
      });
    });
  }
}
