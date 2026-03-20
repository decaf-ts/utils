/* istanbul ignore file */
import { ReleaseChainCommand } from "../cli/commands";

new ReleaseChainCommand()
  .execute()
  .then(() => ReleaseChainCommand.log.info("Release chain executed successfully."))
  .catch((error: unknown) => {
    const message = error instanceof Error ? error.message : `${error}`;
    try {
      ReleaseChainCommand.log.error(message);
    } catch {
      console.error(message);
    }
    process.exit(1);
  });
