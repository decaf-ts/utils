import path from "path";
import { mkdir, writeFile } from "fs/promises";
import { StopWatch } from "@decaf-ts/logging";

export type ExecutionMode = "sequential" | "concurrent" | "burst";

export interface PhaseBurstConfig {
  size: number;
  intervalMs?: number;
}

export interface PhaseWarmupConfig<TContext = Record<string, unknown>> {
  iterations: number;
  handler?: PerformanceHandler<TContext>;
  delayBetweenIterationsMs?: number;
}

export interface PhaseConfig<TContext = Record<string, unknown>> {
  iterations: number;
  mode: ExecutionMode;
  concurrency?: number;
  delayBetweenIterationsMs?: number;
  burst?: PhaseBurstConfig;
  loadStart?: number;
  loadStep?: number;
  loadMultiplier?: number;
  context?: Partial<TContext>;
  metadata?: Record<string, unknown>;
  warmup?: PhaseWarmupConfig<TContext>;
  pauseAfterMs?: number;
}

export interface Phase<TContext = Record<string, unknown>> {
  name: string;
  config: PhaseConfig<TContext>;
  generator?: PhaseGenerator<TContext>;
  subPhases?: Phase<TContext>[];
}

export interface PhaseGeneratorPhase<TContext> {
  name?: string;
  config: PhaseConfig<Partial<TContext>>;
}

export type PhaseGeneratorResult<TContext> =
  | PhaseConfig<TContext>
  | PhaseGeneratorPhase<TContext>;

export type PhaseGenerator<TContext> = (
  payload: PhaseGeneratorPayload<TContext>
) =>
  | Promise<PhaseGeneratorResult<TContext> | undefined>
  | PhaseGeneratorResult<TContext>
  | undefined;

export interface PhaseResult<TContext = Record<string, unknown>> {
  phase: Phase<TContext>;
  config: PhaseConfig<TContext>;
  iterationMetrics: IterationMetric[];
  aggregated: AggregatedMetrics;
  context: TContext;
  segmentCount: number;
}

export interface PhaseGeneratorMetadata<TContext = Record<string, unknown>> {
  phaseNumber: number;
  phaseName: string;
  iterationCount: number;
  burstSegments: number;
  segmentCount: number;
  mode: ExecutionMode;
  history: PhaseResult<TContext>[];
}

export interface PhaseGeneratorPayload<TContext = Record<string, unknown>> {
  result: PhaseResult<TContext>;
  history: PhaseResult<TContext>[];
  metadata: PhaseGeneratorMetadata<TContext>;
}

export interface AggregatedMetrics {
  totalDurationMs: number;
  minMs: number;
  maxMs: number;
  averageMs: number;
  successCount: number;
  failureCount: number;
  loadStart: number;
  loadEnd: number;
}

export interface IterationMetric {
  iteration: number;
  durationMs: number;
  success: boolean;
  meta?: Record<string, unknown>;
  loadFactor: number;
}

export interface HandlerPayload<TContext = Record<string, unknown>> {
  iteration: number;
  config: PhaseConfig<TContext>;
  loadFactor: number;
  context: TContext;
}

export interface HandlerResult {
  success?: boolean;
  meta?: Record<string, unknown>;
}

export type PerformanceHandler<TContext = Record<string, unknown>> = (
  payload: HandlerPayload<TContext>
) => Promise<HandlerResult> | HandlerResult;

export interface CanvasRenderOptions {
  width?: number;
  height?: number;
  padding?: number;
  backgroundColor?: string;
  headerFont?: string;
  rowFont?: string;
  headerColor?: string;
  rowColor?: string;
}

export interface PerformanceScenario<TContext = Record<string, unknown>> {
  name: string;
  handler: PerformanceHandler<TContext>;
  phases: Phase<TContext>[];
  baseContext?: TContext;
  failOnError?: boolean;
  initialize?: () => Promise<void> | void;
  canvasOptions?: CanvasRenderOptions;
  canvasOutputPath?: string;
  enableCanvas?: boolean;
}

interface PhaseQueueItem<TContext> {
  phase: Phase<TContext>;
  phaseNumber: number;
}

export const defaultCanvasOptions: Required<CanvasRenderOptions> = {
  width: 1200,
  height: 260,
  padding: 32,
  backgroundColor: "#0f172a",
  headerFont: "bold 18px 'Segoe UI', sans-serif",
  rowFont: "14px 'Segoe UI', sans-serif",
  headerColor: "#f8fafc",
  rowColor: "#cbd5f5",
};

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const perfDebugEnabled = process.env.PERF_VERBOSE === "true";
const debugLog = (...args: unknown[]) => {
  if (perfDebugEnabled) {
    console.debug(...args);
  }
};

const formatTable = (
  title: string,
  headers: string[],
  rows: string[][]
): string => {
  const columnWidths = headers.map((header, index) =>
    Math.max(header.length, ...rows.map((row) => row[index]?.length ?? 0))
  );
  const formatRow = (values: string[]) =>
    "| " +
    values
      .map((value, index) => value.padEnd(columnWidths[index]))
      .join(" | ") +
    " |";
  const headerLine = formatRow(headers);
  const divider =
    "| " + columnWidths.map((width) => "-".repeat(width)).join(" | ") + " |";
  const body = rows.map(formatRow).join("\n");
  return `${title}\n${headerLine}\n${divider}\n${body}`;
};

const ensureDirectory = async (targetPath: string) => {
  await mkdir(path.dirname(targetPath), { recursive: true });
};

const renderMetricsTableToCanvas = async (
  headers: string[],
  rows: string[][],
  options: CanvasRenderOptions,
  outputPath: string
) => {
  const config = { ...defaultCanvasOptions, ...options };
  // @ts-expect-error canvas import
  let createCanvas: (typeof import("canvas"))["createCanvas"];
  try {
    // @ts-expect-error because we allow optional dependency
    const canvasModule = await import("canvas");
    createCanvas = canvasModule.createCanvas;
  } catch (error) {
    console.warn(
      "[PerfRunner] Canvas module not available, skipping chart.",
      error
    );
    return;
  }
  const canvas = createCanvas(config.width, config.height);
  const ctx = canvas.getContext("2d");

  ctx.fillStyle = config.backgroundColor;
  ctx.fillRect(0, 0, config.width, config.height);

  ctx.font = config.headerFont;
  ctx.fillStyle = config.headerColor;
  const columnWidth = (config.width - config.padding * 2) / headers.length;
  const headerY = config.padding + 24;

  headers.forEach((header, index) => {
    ctx.fillText(header, config.padding + columnWidth * index, headerY);
  });

  ctx.font = config.rowFont;
  ctx.fillStyle = config.rowColor;
  const rowHeight = 24;
  rows.forEach((row, rowIndex) => {
    const y = headerY + 12 + rowHeight * (rowIndex + 1);
    row.forEach((cell, cellIndex) => {
      ctx.fillText(cell, config.padding + columnWidth * cellIndex, y);
    });
  });

  await ensureDirectory(outputPath);
  await writeFile(outputPath, canvas.toBuffer("image/png"));
  console.log(`Stored performance chart at ${outputPath}`);
};

export class PerformanceRunner<TContext = Record<string, unknown>> {
  constructor(protected readonly scenario: PerformanceScenario<TContext>) {}

  public async run(): Promise<PhaseResult<TContext>[]> {
    if (this.scenario.initialize) {
      await this.scenario.initialize();
    }

    let phaseCounter = 0;
    const queue: PhaseQueueItem<TContext>[] = this.scenario.phases.map(
      (phase) => ({ phase, phaseNumber: ++phaseCounter })
    );
    const results: PhaseResult<TContext>[] = [];

    while (queue.length) {
      const item = queue.shift()!;
      const phase = item.phase;
      const context = this.mergeContext(phase);
      console.info(
        `[PerfRunner] Starting phase #${item.phaseNumber} "${phase.name}"`,
        {
          iterations: phase.config.iterations,
          mode: phase.config.mode,
          concurrency: phase.config.concurrency,
          burst: phase.config.burst,
        }
      );
      const result = await this.runPhase(phase, context);
      console.info(
        `[PerfRunner] Completed phase #${item.phaseNumber} "${phase.name}"`,
        {
          total: result.aggregated.totalDurationMs.toFixed(2),
          avg: result.aggregated.averageMs.toFixed(2),
          failureCount: result.aggregated.failureCount,
        }
      );
      results.push(result);

      if (phase.generator) {
        const historySnapshot = [...results];
        const metadata: PhaseGeneratorMetadata<TContext> = {
          phaseNumber: item.phaseNumber,
          phaseName: phase.name,
          iterationCount: phase.config.iterations,
          burstSegments: result.segmentCount,
          segmentCount: result.segmentCount,
          mode: phase.config.mode,
          history: historySnapshot,
        };
        const generatorResult = await phase.generator({
          result,
          history: historySnapshot,
          metadata,
        });
        if (generatorResult) {
          const nextPhase: Phase<TContext> = (
            "config" in generatorResult
              ? {
                  name: generatorResult.name ?? `${phase.name} → gen`,
                  config: generatorResult.config,
                  generator: phase.generator,
                }
              : {
                  name: `${phase.name} → gen`,
                  config: generatorResult,
                  generator: phase.generator,
                }
          ) as any;
          queue.push({
            phase: nextPhase,
            phaseNumber: ++phaseCounter,
          });
        }
      }
    }

    await this.logSummary(results);

    if (this.scenario.failOnError !== false) {
      const totalFailures = results.reduce(
        (acc, r) => acc + r.aggregated.failureCount,
        0
      );
      if (totalFailures > 0) {
        throw new Error(
          `Scenario "${this.scenario.name}" recorded ${totalFailures} failures across ${results.length} phases`
        );
      }
    }

    return results;
  }

  protected async runPhase(
    phase: Phase<TContext>,
    context: TContext
  ): Promise<PhaseResult<TContext>> {
    await this.runWarmup(phase, context);
    const segments = this.buildSegmentIndices(
      phase.config.iterations,
      phase.config.burst
    );
    const collected: IterationMetric[] = [];

    for (
      let segmentIndex = 0;
      segmentIndex < segments.length;
      segmentIndex += 1
    ) {
      const indices = segments[segmentIndex];
      if (!indices.length) {
        continue;
      }

      debugLog(
        `[PerfRunner] Phase "${phase.name}" executing segment ${segmentIndex + 1}/${
          segments.length
        } (iterations ${indices[0]}-${indices[indices.length - 1]})`
      );

      const metrics = await this.executeSegment(
        this.scenario.handler,
        phase.config,
        context,
        indices
      );
      collected.push(...metrics);

      const burstInterval = phase.config.burst?.intervalMs;
      if (burstInterval && segmentIndex < segments.length - 1) {
        await delay(burstInterval);
      }
    }

    const sorted = [...collected].sort((a, b) => a.iteration - b.iteration);
    const aggregated = this.aggregateMetrics(sorted);

    if (phase.config.pauseAfterMs) {
      await delay(phase.config.pauseAfterMs);
    }

    return {
      phase,
      config: phase.config,
      iterationMetrics: sorted,
      aggregated,
      context,
      segmentCount: segments.length,
    };
  }

  protected async runWarmup(
    phase: Phase<TContext>,
    context: TContext
  ): Promise<void> {
    const warmup = phase.config.warmup;
    if (!warmup?.iterations) {
      return;
    }

    const handler = warmup.handler ?? this.scenario.handler;
    for (let index = 0; index < warmup.iterations; index += 1) {
      await handler({
        iteration: index,
        config: phase.config,
        loadFactor: this.computeLoadFactor(phase.config, index),
        context,
      });
      if (warmup.delayBetweenIterationsMs && index < warmup.iterations - 1) {
        await delay(warmup.delayBetweenIterationsMs);
      }
    }
  }

  protected computeLoadFactor(
    config: PhaseConfig<TContext>,
    iteration: number
  ): number {
    const base = config.loadStart ?? 1;
    const step = config.loadStep ?? 0;
    const multiplier = config.loadMultiplier ?? 1;
    return (base + step * iteration) * multiplier;
  }

  protected buildSegmentIndices(
    iterations: number,
    burst?: PhaseBurstConfig
  ): number[][] {
    const total = Math.max(0, iterations);
    if (total === 0) {
      return [];
    }

    const chunk =
      burst?.size && burst.size > 0 ? Math.min(burst.size, total) : total;
    const segments: number[][] = [];

    for (let cursor = 0; cursor < total; cursor += chunk) {
      const end = Math.min(total, cursor + chunk);
      segments.push(
        Array.from({ length: end - cursor }, (_, idx) => cursor + idx)
      );
    }

    return segments;
  }

  protected mergeContext(phase: Phase<TContext>): TContext {
    const baseContext = this.scenario.baseContext ?? ({} as TContext);
    const phaseContext = phase.config.context ?? ({} as TContext);
    return this.mergeContexts(baseContext, phaseContext);
  }

  protected mergeContexts(a: TContext, b: Partial<TContext>): TContext {
    return Object.assign({}, a, b);
  }

  protected async executeSegment(
    handler: PerformanceHandler<TContext>,
    config: PhaseConfig<TContext>,
    context: TContext,
    indices: number[]
  ): Promise<IterationMetric[]> {
    if (!indices.length) {
      return [];
    }

    if (config.mode === "concurrent") {
      return this.collectConcurrent(handler, config, context, indices);
    }

    return this.collectSequential(handler, config, context, indices);
  }

  protected async collectSequential(
    handler: PerformanceHandler<TContext>,
    config: PhaseConfig<TContext>,
    context: TContext,
    indices: number[]
  ): Promise<IterationMetric[]> {
    const metrics: IterationMetric[] = [];
    const delayBetween = config.delayBetweenIterationsMs;

    for (let idx = 0; idx < indices.length; idx += 1) {
      metrics.push(
        await this.runIteration(handler, config, context, indices[idx])
      );
      if (delayBetween && idx < indices.length - 1) {
        await delay(delayBetween);
      }
    }

    return metrics;
  }

  protected async collectConcurrent(
    handler: PerformanceHandler<TContext>,
    config: PhaseConfig<TContext>,
    context: TContext,
    indices: number[]
  ): Promise<IterationMetric[]> {
    const concurrency = Math.max(
      1,
      Math.min(config.concurrency ?? indices.length, indices.length)
    );
    const metrics: IterationMetric[] = [];
    let pointer = 0;

    const worker = async () => {
      while (pointer < indices.length) {
        const iteration = indices[pointer];
        pointer += 1;
        metrics.push(
          await this.runIteration(handler, config, context, iteration)
        );
      }
    };

    await Promise.all(Array.from({ length: concurrency }, () => worker()));
    return metrics;
  }

  protected async runIteration(
    handler: PerformanceHandler<TContext>,
    config: PhaseConfig<TContext>,
    context: TContext,
    iteration: number
  ): Promise<IterationMetric> {
    const loadFactor = this.computeLoadFactor(config, iteration);
    const stopwatch = new StopWatch(true);
    let success = true;
    let meta: Record<string, unknown> | undefined;

    debugLog(
      `[PerfRunner] Iteration ${iteration} (phase=${config.metadata?.phaseName ?? "n/a"}, load=${loadFactor.toFixed(
        2
      )}) starting`
    );
    try {
      const result = await handler({ iteration, config, loadFactor, context });
      if (typeof result?.success === "boolean") {
        success = result.success;
      }
      meta = result?.meta;
    } catch (error) {
      success = false;
      meta = { error: error instanceof Error ? error.message : String(error) };
    }

    const durationMs = stopwatch.stop();
    debugLog(
      `[PerfRunner] Iteration ${iteration} complete in ${durationMs.toFixed(2)}ms, success=${success}`
    );
    return { iteration, durationMs, success, meta, loadFactor };
  }

  protected aggregateMetrics(metrics: IterationMetric[]): AggregatedMetrics {
    if (metrics.length === 0) {
      return {
        totalDurationMs: 0,
        minMs: 0,
        maxMs: 0,
        averageMs: 0,
        successCount: 0,
        failureCount: 0,
        loadStart: 0,
        loadEnd: 0,
      };
    }

    const totalDurationMs = metrics.reduce(
      (acc, metric) => acc + metric.durationMs,
      0
    );
    const minMs = Math.min(...metrics.map((metric) => metric.durationMs));
    const maxMs = Math.max(...metrics.map((metric) => metric.durationMs));
    const averageMs = totalDurationMs / metrics.length;
    const successCount = metrics.filter((metric) => metric.success).length;
    const failureCount = metrics.length - successCount;
    const loadStart = metrics[0]?.loadFactor ?? 0;
    const loadEnd = metrics[metrics.length - 1]?.loadFactor ?? loadStart;

    return {
      totalDurationMs,
      minMs,
      maxMs,
      averageMs,
      successCount,
      failureCount,
      loadStart,
      loadEnd,
    };
  }

  protected logPhaseTable(result: PhaseResult<TContext>): void {
    const headers = [
      "Phase",
      "Mode",
      "Iterations",
      "Total ms",
      "Avg ms",
      "Min ms",
      "Max ms",
      "Success",
      "Failures",
      "Load range",
    ];
    const row = [
      result.phase.name,
      result.config.mode,
      result.config.iterations.toString(),
      result.aggregated.totalDurationMs.toFixed(2),
      result.aggregated.averageMs.toFixed(2),
      result.aggregated.minMs.toFixed(2),
      result.aggregated.maxMs.toFixed(2),
      result.aggregated.successCount.toString(),
      result.aggregated.failureCount.toString(),
      `${result.aggregated.loadStart.toFixed(2)} → ${result.aggregated.loadEnd.toFixed(2)}`,
    ];
    console.log(
      formatTable(`Phase result: ${result.phase.name}`, headers, [row])
    );
  }

  protected async logSummary(results: PhaseResult<TContext>[]): Promise<void> {
    if (!results.length) {
      return;
    }

    const headers = [
      "Phase",
      "Mode",
      "Iterations",
      "Total ms",
      "Avg ms",
      "Min ms",
      "Max ms",
      "Success",
      "Failures",
      "Load range",
    ];

    const rows = results.map((result) => [
      result.phase.name,
      result.config.mode,
      result.config.iterations.toString(),
      result.aggregated.totalDurationMs.toFixed(2),
      result.aggregated.averageMs.toFixed(2),
      result.aggregated.minMs.toFixed(2),
      result.aggregated.maxMs.toFixed(2),
      result.aggregated.successCount.toString(),
      result.aggregated.failureCount.toString(),
      `${result.aggregated.loadStart.toFixed(2)} → ${result.aggregated.loadEnd.toFixed(2)}`,
    ]);

    console.log(
      formatTable(
        `Performance summary for ${this.scenario.name}`,
        headers,
        rows
      )
    );

    if (this.shouldRenderCanvas()) {
      const chartPath =
        this.scenario.canvasOutputPath ??
        path.join(
          process.cwd(),
          "workdocs",
          "reports",
          "performance-runner.png"
        );
      await renderMetricsTableToCanvas(
        headers,
        rows,
        this.scenario.canvasOptions ?? defaultCanvasOptions,
        chartPath
      );
    }
  }

  protected shouldRenderCanvas(): boolean {
    return this.scenario.enableCanvas ?? Boolean(this.scenario.canvasOptions);
  }
}
