/* istanbul ignore file */
import { TemplateSync } from "../cli/commands";

new TemplateSync()
  .execute()
  .then(() =>
    TemplateSync.log.info(
      "Template updated successfully. Please confirm all changes before commiting"
    )
  )
  .catch((e: unknown) => {
    TemplateSync.log.error(`Error preparing template: ${e}`);
    process.exit(1);
  });
