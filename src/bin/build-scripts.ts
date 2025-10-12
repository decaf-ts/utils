/* istanbul ignore file */
import { BuildScripts } from "../cli/commands";

new BuildScripts()
  .execute()
  .then(() => BuildScripts.log.info("Scripts built successfully."))
  .catch((e: unknown) => {
    BuildScripts.log.error(`Error building scripts: ${e}`);
    process.exit(1);
  });
