/* istanbul ignore file */
import { CompileMatrixCommand } from "../cli/commands";

new CompileMatrixCommand()
  .execute()
  .then(() => process.exit(0))
  .catch((error: unknown) => {
    CompileMatrixCommand.log.error(`Failed to compile matrix`, error as Error);
    process.exit(1);
  });
