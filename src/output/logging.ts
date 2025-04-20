import {
  DefaultLoggingConfig,
  DefaultTheme,
  LogLevel,
  NumericLogLevels,
} from "../utils/constants";
import {
  LoggingConfig,
  LoggingContext,
  Theme,
  ThemeOption,
  ThemeOptionByLogLevel,
  VerbosityLogger,
} from "./types";
import {
  ColorizeOptions,
  style,
  StyledString,
} from "@tvenceslau/styled-string";

/**
 * @description A minimal logger implementation.
 * @summary MiniLogger is a lightweight logging class that implements the VerbosityLogger interface.
 * It provides basic logging functionality with support for different log levels and verbosity.
 *
 * @class
 */
export class MiniLogger implements VerbosityLogger {
  /**
   * @description Creates a new MiniLogger instance.
   * @summary Initializes a MiniLogger with the given class name, optional configuration, and method name.
   *
   * @param context - The name of the class using this logger.
   * @param [conf] - Optional logging configuration. Defaults to Info level and verbosity 0.
   * @param [id] - Optional unique identifier for the logger instance.
   */
  constructor(
    protected context: string,
    protected conf?: Partial<LoggingConfig>,
    protected id?: string
  ) {}

  protected config(
    key: keyof LoggingConfig
  ): LoggingConfig[keyof LoggingConfig] {
    if (this.conf && key in this.conf) return this.conf[key];
    return Logging.getConfig()[key];
  }

  for(
    method?: string | ((...args: any[]) => any),
    config?: Partial<LoggingConfig>
  ): VerbosityLogger {
    method = method
      ? typeof method === "string"
        ? method
        : method.name
      : undefined;

    return Logging.for([this.context, method].join("."), this.id, config);
  }

  /**
   * @description Creates a formatted log string.
   * @summary Generates a log string with timestamp, colored log level, and message.
   *
   * @param level - The log level as a string.
   * @param message
   * @param stack
   * @return A formatted log string.
   */
  protected createLog(
    level: LogLevel,
    message: string | Error,
    stack?: string
  ): string {
    const log: string[] = [];
    if (this.config("timestamp")) {
      const timestamp = Logging.theme(
        new Date().toISOString(),
        "timestamp",
        level
      );
      log.push(timestamp);
    }

    const lvl: string = Logging.theme(level, "logLevel", level);
    log.push(lvl);
    const msg: string = Logging.theme(
      typeof message === "string" ? message : (message as Error).message,
      "message",
      level
    );
    log.push(msg);
    if (stack || message instanceof Error) {
      stack = Logging.theme(
        (stack || (message as Error).stack) as string,
        "stack",
        level
      );
      log.push(`\nStack trace:\n${stack}`);
    }

    return log.join(" - ");
  }

  /**
   * @description Logs a message with the specified log level.
   * @summary Checks if the message should be logged based on the current log level,
   * then uses the appropriate console method to output the log.
   *
   * @param level - The log level of the message.
   * @param msg - The message to be logged.
   * @param stack
   */
  protected log(level: LogLevel, msg: string | Error, stack?: string): void {
    if (
      NumericLogLevels[this.config("level") as LogLevel] <
      NumericLogLevels[level]
    )
      return;
    let method;
    switch (level) {
      case LogLevel.info:
        method = console.log;
        break;
      case LogLevel.verbose:
      case LogLevel.debug:
        method = console.debug;
        break;
      case LogLevel.error:
        method = console.error;
        break;
      default:
        throw new Error("Invalid log level");
    }
    method(this.createLog(level, msg, stack));
  }

  /**
   * @description LLogs a `way too verbose` or a silly message.
   * @summary Logs a message at the Silly level if the current verbosity allows it.
   *
   * @param msg - The message to be logged.
   * @param verbosity - The verbosity level of the message (default: 0).
   */
  silly(msg: string, verbosity: number = 0): void {
    if ((this.config("verbose") as number) >= verbosity)
      this.log(LogLevel.verbose, msg);
  }

  /**
   * @description Logs a verbose message.
   * @summary Logs a message at the Verbose level if the current verbosity allows it.
   *
   * @param msg - The message to be logged.
   * @param verbosity - The verbosity level of the message (default: 0).
   */
  verbose(msg: string, verbosity: number = 0): void {
    if ((this.config("verbose") as number) >= verbosity)
      this.log(LogLevel.verbose, msg);
  }

  /**
   * @description Logs an info message.
   * @summary Logs a message at the Info level.
   *
   * @param msg - The message to be logged.
   */
  info(msg: string): void {
    this.log(LogLevel.info, msg);
  }

  /**
   * @description Logs a debug message.
   * @summary Logs a message at the Debug level.
   *
   * @param msg - The message to be logged.
   */
  debug(msg: string): void {
    this.log(LogLevel.debug, msg);
  }

  /**
   * @description Logs an error message.
   * @summary Logs a message at the Error level.
   *
   * @param msg - The message to be logged.
   */
  error(msg: string | Error): void {
    this.log(LogLevel.error, msg);
  }

  setConfig(config: Partial<LoggingConfig>) {
    this.conf = { ...(this.conf || {}), ...config };
  }
}

/**
 * @description A static class for managing logging operations.
 * @summary The Logging class provides a centralized logging mechanism with support for
 * different log levels and verbosity. It uses a singleton pattern to maintain a global
 * logger instance and allows creating specific loggers for different classes and methods.
 *
 * @class
 */
export class Logging {
  /**
   * @description The global logger instance.
   * @summary A singleton instance of VerbosityLogger used for global logging.
   */
  private static global?: VerbosityLogger;

  /**
   * @description Factory function for creating logger instances.
   * @summary A function that creates new VerbosityLogger instances. By default, it creates a MiniLogger.
   */
  private static _factory: (
    object: string,
    config?: Partial<LoggingConfig>,
    id?: string
  ) => VerbosityLogger = (
    object: string,
    config?: Partial<LoggingConfig>,
    id?: string
  ) => {
    return new MiniLogger(object, config, id);
  };
  /**
   * @description Configuration for the logging system.
   * @summary Stores the global verbosity level and log level settings.
   */
  private static _config: LoggingConfig = DefaultLoggingConfig;

  /**
   * @description Private constructor to prevent instantiation.
   * @summary Ensures that the Logging class cannot be instantiated as it's designed to be used statically.
   */
  private constructor() {}

  /**
   * @description Setter for the logging configuration.
   * @summary Allows updating the global logging configuration.
   *
   * @param config - An object containing verbosity and log level settings.
   */
  static setConfig(config: Partial<LoggingConfig>) {
    Object.assign(this._config, config);
  }

  static getConfig(): LoggingConfig {
    return Object.assign({}, this._config);
  }

  /**
   * @description Retrieves or creates the global logger instance.
   * @summary Returns the existing global logger or creates a new one if it doesn't exist.
   *
   * @return The global VerbosityLogger instance.
   */
  static get(): VerbosityLogger {
    this.global = this.global ? this.global : this._factory("Logging");
    return this.global;
  }

  /**
   * @description Logs a verbose message.
   * @summary Delegates the verbose logging to the global logger instance.
   *
   * @param msg - The message to be logged.
   * @param verbosity - The verbosity level of the message (default: 0).
   */
  static verbose(msg: string, verbosity: number = 0): void {
    return this.get().verbose(msg, verbosity);
  }

  /**
   * @description Logs an info message.
   * @summary Delegates the info logging to the global logger instance.
   *
   * @param msg - The message to be logged.
   */
  static info(msg: string): void {
    return this.get().info(msg);
  }

  /**
   * @description Logs a debug message.
   * @summary Delegates the debug logging to the global logger instance.
   *
   * @param msg - The message to be logged.
   */
  static debug(msg: string): void {
    return this.get().debug(msg);
  }

  /**
   * @description Logs a silly message.
   * @summary Delegates the debug logging to the global logger instance.
   *
   * @param msg - The message to be logged.
   */
  static silly(msg: string): void {
    return this.get().silly(msg);
  }

  /**
   * @description Logs an error message.
   * @summary Delegates the error logging to the global logger instance.
   *
   * @param msg - The message to be logged.
   */
  static error(msg: string): void {
    return this.get().error(msg);
  }

  static for(
    object: LoggingContext,
    id?: string | Partial<LoggingConfig>,
    config?: Partial<LoggingConfig>
  ): VerbosityLogger {
    object = typeof object === "string" ? object : object.name;
    id = typeof id === "string" ? id : undefined;
    config = typeof id === "object" ? (id as Partial<LoggingConfig>) : config;
    return this._factory(object, config, id);
  }

  /**
   * @description Creates a logger for a specific reason or context.
   *
   * @summary This static method creates a new logger instance using the factory function,
   * based on a given reason or context.
   *
   * @param reason - A string describing the reason or context for creating this logger.
   * @param id
   * @returns A new VerbosityLogger or ClassLogger instance.
   */
  static because(reason: string, id?: string): VerbosityLogger {
    return this._factory(reason, this._config, id);
  }

  static theme(
    text: string,
    type: keyof Theme | keyof LogLevel,
    loggerLevel: LogLevel,
    template: Theme = DefaultTheme
  ) {
    if (!this._config.style) return text;
    const logger = Logging.get().for(this.theme);

    function apply(
      txt: string,
      option: keyof ThemeOption,
      value: number | [number] | [number, number, number] | number[] | string[]
    ): string {
      try {
        const t: string | StyledString = txt;
        let c = style(t);

        function applyColor(
          val: number | [number] | [number, number, number],
          isBg = false
        ): StyledString {
          let f:
            | typeof c.background
            | typeof c.foreground
            | typeof c.rgb
            | typeof c.color256 = isBg ? c.background : c.foreground;
          if (!Array.isArray(val)) {
            return (f as typeof c.background | typeof c.foreground).call(
              c,
              value as number
            );
          }
          switch (val.length) {
            case 1:
              f = isBg ? c.bgColor256 : c.color256;
              return (f as typeof c.bgColor256 | typeof c.color256)(val[0]);
            case 3:
              f = isBg ? c.bgRgb : c.rgb;
              return c.rgb(val[0], val[1], val[2]);
            default:
              logger.error(`Not a valid color option: ${option}`);
              return style(t as string);
          }
        }

        function applyStyle(v: number | string): void {
          if (typeof v === "number") {
            c = c.style(v);
          } else {
            c = c[v as keyof ColorizeOptions] as StyledString;
          }
        }

        switch (option) {
          case "bg":
          case "fg":
            return applyColor(value as number).text;
          case "style":
            if (Array.isArray(value)) {
              value.forEach(applyStyle);
            } else {
              applyStyle(value as number | string);
            }
            return c.text;
          default:
            logger.error(`Not a valid theme option: ${option}`);
            return t;
        }
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
      } catch (e: unknown) {
        logger.error(`Error applying style: ${option} with value ${value}`);
        return txt;
      }
    }

    const individualTheme = template[type as keyof Theme];
    if (!individualTheme || !Object.keys(individualTheme).length) {
      return text;
    }

    let actualTheme: ThemeOption = individualTheme as ThemeOption;

    const logLevels = Object.assign({}, LogLevel);
    if (Object.keys(individualTheme)[0] in logLevels)
      actualTheme =
        (individualTheme as ThemeOptionByLogLevel)[loggerLevel] || {};

    return Object.keys(actualTheme).reduce((acc: string, key: string) => {
      const val = (actualTheme as ThemeOption)[key as keyof ThemeOption];
      if (val)
        return apply(
          acc,
          key as keyof ThemeOption,
          val as
            | number
            | [number]
            | [number, number, number]
            | number[]
            | string[]
        );
      return acc;
    }, text);
  }
}
