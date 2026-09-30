/* istanbul ignore file */
/**
 * @description Standalone executable entrypoint for the bundle command.
 * @summary Compiled to `lib/cjs/bin/bundle.cjs` (wired as the `bundle` bin in
 * package.json) and executes {@link BundleCommand}, logging completion or
 * failing with exit code 1.
 * @memberOf module:utils
 */
import { BundleCommand } from "../cli/commands";

new BundleCommand()
  .execute()
  .then(() => BundleCommand.log.info("bundle command completed successfully"))
  .catch((error: unknown) => {
    BundleCommand.log.error(`Failed to run bundle command`, error as Error);
    process.exit(1);
  });
