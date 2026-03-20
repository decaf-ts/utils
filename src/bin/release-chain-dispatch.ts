/* istanbul ignore file */
import { ReleaseChainDispatchCommand } from "../cli/commands";

new ReleaseChainDispatchCommand()
  .execute()
  .then(() =>
    ReleaseChainDispatchCommand.log.info(
      "Release chain dispatch triggered successfully.",
    ),
  )
  .catch((error: unknown) => {
    const message = error instanceof Error ? error.message : `${error}`;
    try {
      ReleaseChainDispatchCommand.log.error(message);
    } catch {
      console.error(message);
    }
    process.exit(1);
  });
