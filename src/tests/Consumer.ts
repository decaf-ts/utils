import { ChildProcess, fork } from "node:child_process";
import { join } from "node:path";
import { LoggedClass } from "@decaf-ts/logging";
import { TestReporter } from "./TestReporter";

type LogStore = Record<number, string[]>;

export interface ParsedLog {
  timestamp: number;
  child: string;
  action: string;
}

export interface ComparerResult {
  consumer: ParsedLog[];
  producer: ParsedLog[];
}

type Comparer = (
  consumerData: LogStore,
  producerData: LogStore
) => Promise<ComparerResult>;

type ConsumerHandler = (
  identifier: number,
  ...args: unknown[]
) => unknown | Promise<unknown>;

interface ProducerMessage {
  identifier: number;
  result?: string[];
  args?: unknown[];
  action: string;
  timeout?: number;
  times: number;
  random?: boolean;
}

const parseData = (data: string): ParsedLog => {
  const [timestamp, , child, action] = data.split(" - ");
  return {
    timestamp: parseInt(timestamp, 10),
    child,
    action,
  };
};

export const defaultComparer: Comparer = async (consumerData, producerData) => {
  const sortedConsumerData = Object.keys(consumerData)
    .reduce<ParsedLog[]>((accum, key) => {
      const identifier = Number(key);
      const entries = consumerData[identifier] ?? [];
      accum.push(...entries.map((entry) => parseData(entry)));
      return accum;
    }, [])
    .sort((a, b) => a.timestamp - b.timestamp);

  const sortedProducerData = Object.keys(producerData)
    .reduce<ParsedLog[]>((accum, key) => {
      const identifier = Number(key);
      const entries = producerData[identifier] ?? [];
      accum.push(...entries.map((entry) => parseData(entry)));
      return accum;
    }, [])
    .sort((a, b) => a.timestamp - b.timestamp);

  if (sortedProducerData.length !== sortedConsumerData.length) {
    throw new Error("Producer data and consumer data does not match in length");
  }

  let counter = -1;
  const isMatching = sortedProducerData.every((producer, index) => {
    counter = index;
    const consumer = sortedConsumerData[index];
    return (
      producer.child === consumer.child && producer.action === consumer.action
    );
  });

  if (!isMatching) {
    const errorLines = [
      `Producer data and consumer data do not sort the same way as of record ${counter}:`,
      "    |             CONSUMER            |              PRODUCER            |",
      "    | id | action    | timestamp      | id | action    | timestamp       |",
    ];

    sortedProducerData.forEach((producer, index) => {
      if (index < counter || index > counter + 15) {
        return;
      }
      const consumer = sortedConsumerData[index];
      errorLines.push(
        `  ${index < 10 ? `0${index}` : index}|  ${consumer.child} | ${consumer.action}    | ${consumer.timestamp}  | ${producer.child}  | ${producer.action}    | ${producer.timestamp}   |`
      );
    });

    throw new Error(errorLines.join("\n"));
  }

  return {
    consumer: sortedConsumerData,
    producer: sortedProducerData,
  };
};

export interface ReportingComparerOptions {
  reporter?: TestReporter;
  testCase?: string;
  referencePrefix?: string;
}

const formatTimestamp = (value: number): string =>
  new Date(value).toISOString();

export const reportingComparer = async (
  consumerData: LogStore,
  producerData: LogStore,
  options?: ReportingComparerOptions
): Promise<ComparerResult> => {
  const reporter =
    options?.reporter ??
    new TestReporter(options?.testCase ?? "consumer-producer");
  const referencePrefix = options?.referencePrefix ?? "consumer-producer";

  try {
    const comparison = await defaultComparer(consumerData, producerData);

    const rows = comparison.consumer.map((consumerEntry, index) => {
      const producerEntry = comparison.producer[index];
      return {
        Index: `${index}`,
        "Consumer Child": consumerEntry.child,
        "Consumer Action": consumerEntry.action,
        "Consumer Timestamp": formatTimestamp(consumerEntry.timestamp),
        "Producer Child": producerEntry?.child ?? "N/A",
        "Producer Action": producerEntry?.action ?? "N/A",
        "Producer Timestamp": producerEntry
          ? formatTimestamp(producerEntry.timestamp)
          : "N/A",
      };
    });

    await Promise.allSettled([
      reporter.reportMessage(
        `${referencePrefix}-comparison`,
        `Consumer and producer logs matched (${comparison.consumer.length} entries).`
      ),
      reporter.reportTable(`${referencePrefix}-logs`, {
        headers: [
          "Index",
          "Consumer Child",
          "Consumer Action",
          "Consumer Timestamp",
          "Producer Child",
          "Producer Action",
          "Producer Timestamp",
        ],
        rows,
      }),
    ]);

    return comparison;
  } catch (error) {
    const message =
      error instanceof Error ? error.message : String(error ?? "Unknown error");

    await Promise.allSettled([
      reporter.reportMessage(`${referencePrefix}-mismatch`, message),
      reporter.reportObject(`${referencePrefix}-consumer`, consumerData),
      reporter.reportObject(`${referencePrefix}-producer`, producerData),
    ]);

    throw error;
  }
};

export class ConsumerRunner extends LoggedClass {
  private readonly action: string;
  private readonly handler: ConsumerHandler;
  private readonly comparerHandle: Comparer;
  private forkedCache: ChildProcess[] | undefined = [];
  private consumerResults: LogStore = {};
  private producerResults: LogStore = {};
  private childExitPromises: Array<Promise<void>> = [];
  private completionTriggered = false;
  private producerCompletion = 0;
  private consumerCompletion = 0;
  private expectedIterations = 0;
  private activeHandlers = 0;

  constructor(
    action: string,
    consumerHandler: ConsumerHandler,
    compareHandler?: Comparer
  ) {
    super();
    this.action = action;
    this.handler = consumerHandler;
    this.comparerHandle = compareHandler ?? defaultComparer;
    this.reset();
  }

  private reset(): void {
    this.forkedCache = [];
    this.consumerResults = {};
    this.producerResults = {};
    this.completionTriggered = false;
    this.childExitPromises = [];
    this.activeHandlers = 0;
    this.producerCompletion = 0;
    this.consumerCompletion = 0;
    this.expectedIterations = 0;
  }

  private waitForChildExit(): Promise<void> {
    if (!this.childExitPromises?.length) {
      return Promise.resolve();
    }
    const exits = [...this.childExitPromises];
    this.childExitPromises = [];
    return Promise.allSettled(exits).then(() => void 0);
  }

  private store(
    identifier: number,
    action: string,
    timeout: number | undefined,
    times: number,
    count: number,
    random?: boolean
  ): void {
    const logParts: Array<string | number | boolean> = [
      Date.now(),
      "PRODUCER",
      identifier,
      action,
    ];
    if (timeout) {
      logParts.push(timeout);
    }
    if (times && count) {
      logParts.push(`${count}/${times}`, random ?? false);
    }

    const log = logParts.join(" - ");
    if (!this.producerResults[identifier]) {
      this.producerResults[identifier] = [];
    }
    const logs = this.producerResults[identifier];
    logs.push(log);
    const totalTimes = times ?? this.expectedIterations;
    if (totalTimes > 0 && logs.length === totalTimes) {
      this.producerCompletion += 1;
    }
  }

  private recordConsumer(identifier: number, times?: number): void {
    const logParts: Array<string | number> = [
      Date.now(),
      "CONSUMER",
      identifier,
      this.action,
    ];
    const log = logParts.join(" - ");

    if (!this.consumerResults[identifier]) {
      this.consumerResults[identifier] = [];
    }
    const logs = this.consumerResults[identifier];
    logs.push(log);
    const totalTimes = times ?? this.expectedIterations;
    if (totalTimes > 0 && logs.length === totalTimes) {
      this.consumerCompletion += 1;
    }
  }

  private isProducerComplete(count: number): boolean {
    return this.producerCompletion >= count;
  }

  private isConsumerComplete(count: number): boolean {
    return this.consumerCompletion >= count;
  }

  private terminateChildren(forceKill = false): Promise<void> {
    if (!this.forkedCache) {
      return this.waitForChildExit();
    }
    const cached = this.forkedCache;
    this.forkedCache = undefined;
    cached.forEach((forked, index) => {
      if (!forked.connected && !forceKill) {
        return;
      }
      try {
        forked.send({
          identifier: index,
          terminate: true,
        });
      } catch {
        // IPC channel already closed; nothing else to do.
      }
      if (forceKill && !forked.killed) {
        forked.kill();
      }
    });
    return this.waitForChildExit();
  }

  async run(
    count: number,
    timeout: number | undefined,
    times: number,
    random: boolean | undefined
  ): Promise<ComparerResult> {
    this.reset();
    this.expectedIterations = times;
    const childPath = join(__dirname, "ProducerChildProcess.cjs");

    return new Promise<ComparerResult>((resolve, reject) => {
      const snapshotState = () => {
        const summarize = (records: LogStore) =>
          Object.keys(records).reduce<Record<string, number>>((acc, key) => {
            acc[key] = records[Number(key)]?.length ?? 0;
            return acc;
          }, {});
        return {
          producers: summarize(this.producerResults),
          consumers: summarize(this.consumerResults),
          activeHandlers: this.activeHandlers,
        };
      };

      const handleError = (error: unknown) => {
        if (this.completionTriggered) {
          return;
        }
        this.completionTriggered = true;
        Promise.resolve(this.terminateChildren(true)).finally(() =>
          reject(error)
        );
      };

      const finalizeIfComplete = () => {
        if (this.completionTriggered) {
          return;
        }
        if (
          !this.isProducerComplete(count) ||
          !this.isConsumerComplete(count) ||
          this.activeHandlers > 0
        ) {
          return;
        }

        this.completionTriggered = true;
        if (process.env.DEBUG_CONSUMER_RUNNER === "1") {
          console.debug("ConsumerRunner finalize state", snapshotState());
        }

        try {
          const comparisonPromise = Promise.resolve(
            this.comparerHandle(this.consumerResults, this.producerResults)
          );
          Promise.all([comparisonPromise, this.waitForChildExit()])
            .then(async ([comparison]) => {
              await new Promise((resolveDelay) => setImmediate(resolveDelay));
              resolve(comparison);
            })
            .catch(reject);
        } catch (error) {
          reject(error);
        }
      };

      for (let identifier = 1; identifier < count + 1; identifier += 1) {
        const forked = fork(childPath);
        this.forkedCache?.push(forked);
        this.childExitPromises?.push(
          new Promise<void>((resolveChild) => {
            forked.once("exit", () => resolveChild());
          })
        );

        forked.on("error", handleError);

        forked.on("message", async (message: ProducerMessage) => {
          if (this.completionTriggered) {
            return;
          }
          const {
            identifier: childId,
            args,
            action,
            timeout: childTimeout,
            times: childTimes,
            random: childRandom,
          } = message;

          this.activeHandlers += 1;
          let handlerFailed = false;
          if (process.env.DEBUG_CONSUMER_RUNNER === "1") {
            console.debug("ConsumerRunner message:start", {
              childId,
              producerCount: this.producerResults[childId]?.length ?? 0,
              consumerCount: this.consumerResults[childId]?.length ?? 0,
              activeHandlers: this.activeHandlers,
            });
          }
          try {
            this.store(
              childId,
              action,
              childTimeout,
              childTimes,
              count,
              childRandom
            );
            const handlerArgs = Array.isArray(args) ? args : [];
            await Promise.resolve(this.handler(childId, ...handlerArgs));

            this.recordConsumer(childId, childTimes ?? times);
            if (process.env.DEBUG_CONSUMER_RUNNER === "1") {
              console.debug("ConsumerRunner message:complete", {
                childId,
                producerCount: this.producerResults[childId]?.length ?? 0,
                consumerCount: this.consumerResults[childId]?.length ?? 0,
                activeHandlers: this.activeHandlers,
              });
            }
          } catch (error) {
            handlerFailed = true;
            handleError(error);
          } finally {
            this.activeHandlers = Math.max(0, this.activeHandlers - 1);
            if (!handlerFailed) {
              finalizeIfComplete();
            }
          }
        });
      }

      this.forkedCache?.forEach((forked, index) => {
        forked.send({
          identifier: index,
          action: this.action,
          timeout,
          times,
          random,
        });
      });
    });
  }
}
