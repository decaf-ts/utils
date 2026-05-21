/* istanbul ignore file */
import { NpmLinkCommand } from "../cli/commands";

new NpmLinkCommand()
  .execute()
  .then(() =>
    NpmLinkCommand.log.info("NPM link operation completed successfully")
  )
  .catch((error: unknown) => {
    NpmLinkCommand.log.error(`Failed to link npm modules`, error as Error);
    process.exit(1);
  });
