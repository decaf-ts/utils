/* istanbul ignore file */
/**
 * @description Standalone executable entrypoint for the build-docs command.
 * @summary Compiled to `lib/cjs/bin/build-docs.cjs` (wired as the `build-docs`
 * bin in package.json) and executes {@link BuildDocsCommand}, logging
 * completion or failing with exit code 1.
 * @memberOf module:utils
 */
import { BuildDocsCommand } from "../cli/commands";

new BuildDocsCommand()
  .execute()
  .then(() => BuildDocsCommand.log.info("build-docs command completed successfully"))
  .catch((error: unknown) => {
    BuildDocsCommand.log.error(`Failed to run build-docs command`, error as Error);
    process.exit(1);
  });
