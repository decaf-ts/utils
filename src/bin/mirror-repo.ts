/* istanbul ignore file */

/**
 * How to use:
 * @example github action
 * name: Mirror External Repositories
 *
 * on:
 *   schedule:
 *     - cron: "0 0 * * *"
 *   workflow_dispatch:
 *
 * jobs:
 *   prepare:
 *     runs-on: ubuntu-latest
 *     outputs:
 *       matrix: ${{ steps.compile.outputs.matrix }}
 *     steps:
 *       - name: Compile repository matrix
 *         id: compile
 *         env:
 *           TARGET_OWNER: ${{ github.repository_owner }}
 *           # REPOS: newline- or comma-separated list of repo URLs, each optionally
 *           # followed by --recursive. Store as a repository Variable (Settings →
 *           # Variables → Actions → REPOS) — URLs are not secrets. A repository
 *           # Secret named REPOS is also accepted as a fallback.
 *           REPOS: ${{ vars.REPOS || secrets.REPOS }}
 *         run: |
 *           set -euo pipefail
 *           matrix=$(npx --yes --package=@decaf-ts/utils@latest compile-matrix)
 *           echo "matrix=${matrix}" >> "${GITHUB_OUTPUT}"
 *
 *   mirror:
 *     needs: prepare
 *     if: ${{ needs.prepare.outputs.matrix != '' && needs.prepare.outputs.matrix != '[]' }}
 *     runs-on: ubuntu-latest
 *     permissions:
 *       contents: write
 *     strategy:
 *       fail-fast: false
 *       matrix:
 *         repo: ${{ fromJSON(needs.prepare.outputs.matrix) }}
 *     steps:
 *       - name: Mirror ${{ matrix.repo.display_name }}
 *         env:
 *           SOURCE_URL: ${{ matrix.repo.source_url }}
 *           SOURCE_HTTPS_URL: ${{ matrix.repo.https_url }}
 *           SOURCE_DISPLAY_NAME: ${{ matrix.repo.display_name }}
 *           SOURCE_OWNER: ${{ matrix.repo.source_owner }}
 *           SOURCE_HOST: ${{ matrix.repo.source_host }}
 *           TARGET_OWNER: ${{ matrix.repo.target_owner }}
 *           TARGET_REPO: ${{ matrix.repo.target_repo }}
 *           TARGET_HOST: ${{ matrix.repo.target_host }}
 *           SOURCE_HOST_TOKEN: ${{ secrets[matrix.repo.source_host_secret] }}
 *           SOURCE_OWNER_TOKEN: ${{ secrets[matrix.repo.source_owner_secret] }}
 *           TARGET_OWNER_TOKEN: ${{ secrets[matrix.repo.target_owner_secret] }}
 *           TARGET_OWNER_FALLBACK_TOKEN: ${{ secrets[matrix.repo.target_owner_fallback_secret] }}
 *           TARGET_HOST_TOKEN: ${{ secrets[matrix.repo.target_host_secret] }}
 *           SOURCE_HOST_SECRET_NAME: ${{ matrix.repo.source_host_secret }}
 *           SOURCE_OWNER_SECRET_NAME: ${{ matrix.repo.source_owner_secret }}
 *           TARGET_OWNER_SECRET_NAME: ${{ matrix.repo.target_owner_secret }}
 *           TARGET_OWNER_FALLBACK_SECRET_NAME: ${{ matrix.repo.target_owner_fallback_secret }}
 *           TARGET_HOST_SECRET_NAME: ${{ matrix.repo.target_host_secret }}
 *           RECURSIVE: ${{ matrix.repo.recursive }}
 *         run: npx --yes --package=@decaf-ts/utils@latest mirror-repo
 */
import { MirrorRepoCommand } from "../cli/commands";

new MirrorRepoCommand()
  .execute()
  .then(() => process.exit(0))
  .catch((error: unknown) => {
    MirrorRepoCommand.log.error(`Failed to mirror repository`, error as Error);
    process.exit(1);
  });
