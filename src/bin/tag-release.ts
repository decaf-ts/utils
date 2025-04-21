import { ReleaseScript } from "../operations";

new ReleaseScript()
  .execute()
  .then(() => ReleaseScript.log.info("Release pushed successfully"))
  .catch((e: unknown) => {
    ReleaseScript.log.error(`Error preparing release: ${e}`);
    process.exit(1);
  });
