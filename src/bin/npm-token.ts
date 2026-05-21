/* istanbul ignore file */
import { NpmTokenCommand } from "../cli/commands";

new NpmTokenCommand()
  .execute()
  .then(() => NpmTokenCommand.log.info("token links updated successfully"))
  .catch((error: unknown) => {
    NpmTokenCommand.log.error(`Failed to link tokens`, error as Error);
    process.exit(1);
  });
