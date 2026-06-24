/* istanbul ignore file */
import { CredentialsCommand } from "../cli/commands";

new CredentialsCommand()
  .execute()
  .then(() => CredentialsCommand.log.info("credentials command completed."))
  .catch((e: unknown) => {
    try {
      if (!(e as any)?.logged) {
        CredentialsCommand.log.error(`Error running credentials command: ${e}`);
      }
    } catch {
      console.error(e);
    }
    process.exit(1);
  });
