/* istanbul ignore file */
import { BuildScripts } from "../cli/commands";

new BuildScripts()
  .execute()
  .then(() => BuildScripts.log.info("Scripts built successfully."))
  .catch((e: unknown) => {
    try {
      if (!(e as any)?.logged) {
        BuildScripts.log.error(`Error building scripts: ${e}`);
      }
    } catch {
      // fallback

      console.error(e);
    }
    process.exit(1);
  });
