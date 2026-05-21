/* istanbul ignore file */
import { ModulesCommand } from "../cli/commands";

new ModulesCommand()
  .execute()
  .then(() => ModulesCommand.log.info("Module list collected successfully"))
  .catch((error: unknown) => {
    ModulesCommand.log.error(`Failed to retrieve modules`, error as Error);
    process.exit(1);
  });
