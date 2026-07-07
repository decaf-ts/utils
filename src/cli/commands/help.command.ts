import { Logger } from "@decaf-ts/logging";

export type HelpOption = {
  flag: string;
  description: string;
  defaultValue?: string;
};

export function printCommandHelp(
  log: Logger,
  commandName: string,
  summary: string,
  usage: string,
  options: HelpOption[],
  notes: string[] = [],
  examples: string[] = [],
): void {
  log.info(`${commandName}`);
  log.info(summary);
  log.info(`Usage: ${usage}`);
  log.info("Options:");

  for (const option of options) {
    const suffix = option.defaultValue
      ? ` (default: ${option.defaultValue})`
      : "";
    log.info(`  ${option.flag}  ${option.description}${suffix}`);
  }

  if (notes.length > 0) {
    log.info("Notes:");
    for (const note of notes) {
      log.info(`  ${note}`);
    }
  }

  if (examples.length > 0) {
    log.info("Examples:");
    for (const example of examples) {
      log.info(`  ${example}`);
    }
  }
}
