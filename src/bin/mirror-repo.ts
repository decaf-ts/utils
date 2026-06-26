/* istanbul ignore file */
import { MirrorRepoCommand } from "../cli/commands";

new MirrorRepoCommand()
  .execute()
  .then(() => process.exit(0))
  .catch((error: unknown) => {
    MirrorRepoCommand.log.error(`Failed to mirror repository`, error as Error);
    process.exit(1);
  });
