/* istanbul ignore file */
import { RunAllCommand } from "../cli/commands";

new RunAllCommand()
  .execute()
  .then(() => RunAllCommand.log.info("Run-all command completed successfully"))
  .catch((error: unknown) => {
    RunAllCommand.log.error(`Failed to run command across modules`, error as Error);
    process.exit(1);
  });
