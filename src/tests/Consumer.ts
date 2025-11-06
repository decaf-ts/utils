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
  private completionTriggered = false;

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
    this.producerResults[identifier].push(log);
  }

  private recordConsumer(identifier: number): void {
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
    this.consumerResults[identifier].push(log);
  }

  private isProducerComplete(count: number, times: number): boolean {
    const producerKeys = Object.keys(this.producerResults);
    if (producerKeys.length !== count) {
      return false;
    }
    return producerKeys.every(
      (key) => this.producerResults[Number(key)]?.length === times
    );
  }

  private isConsumerComplete(count: number, times: number): boolean {
    const consumerKeys = Object.keys(this.consumerResults);
    if (consumerKeys.length !== count) {
      return false;
    }
    return consumerKeys.every(
      (key) => this.consumerResults[Number(key)]?.length === times
    );
  }

  private terminateChildren(): void {
    if (!this.forkedCache) {
      return;
    }
    this.forkedCache.forEach((forked, index) => {
      forked.send({
        identifier: index,
        terminate: true,
      });
    });
    this.forkedCache = undefined;
  }

  async run(
    count: number,
    timeout: number | undefined,
    times: number,
    random: boolean | undefined
  ): Promise<ComparerResult> {
    this.reset();
    const childPath = join(__dirname, "ProducerChildProcess.cjs");

    return new Promise<ComparerResult>((resolve, reject) => {
      const handleError = (error: unknown) => {
        if (this.completionTriggered) {
          return;
        }
        this.completionTriggered = true;
        this.terminateChildren();
        reject(error);
      };

      const finalizeIfComplete = () => {
        if (this.completionTriggered) {
          return;
        }
        if (
          !this.isProducerComplete(count, times) ||
          !this.isConsumerComplete(count, times)
        ) {
          return;
        }

        this.terminateChildren();
        this.completionTriggered = true;

        try {
          Promise.resolve(
            this.comparerHandle(this.consumerResults, this.producerResults)
          )
            .then(resolve)
            .catch(reject);
        } catch (error) {
          reject(error);
        }
      };

      const checkProducerCompletion = () => {
        if (this.isProducerComplete(count, times)) {
          this.terminateChildren();
        }
      };

      for (let identifier = 1; identifier < count + 1; identifier += 1) {
        const forked = fork(childPath);
        this.forkedCache?.push(forked);

        forked.on("error", handleError);

        forked.on("message", async (message: ProducerMessage) => {
          const {
            identifier: childId,
            args,
            action,
            timeout: childTimeout,
            times: childTimes,
            random: childRandom,
          } = message;

          try {
            this.store(
              childId,
              action,
              childTimeout,
              childTimes,
              count,
              childRandom
            );
            checkProducerCompletion();

            const handlerArgs = Array.isArray(args) ? args : [];
            await Promise.resolve(this.handler(childId, ...handlerArgs));

            this.recordConsumer(childId);
            finalizeIfComplete();
          } catch (error) {
            handleError(error);
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
