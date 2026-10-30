#!/bin/bash -e

current_branch=$(git rev-parse --abbrev-ref HEAD 2>/dev/null || true)
if [[ "$current_branch" != "master" && "$current_branch" != "main" ]]; then
  echo "Error: release must be run from 'master' or 'main' branch. Current branch: $current_branch" >&2
  exit 1
fi

function ask_yes_or_no(){
    # Test if there are enough arguments
    if [[ $# -gt 2 ]]; then
        exit 1
    fi

    local message="${1}"
    local y="y"
    local n="N"

    # defaults to no if not otherwise specified
    [[ $2 == "yes" ]] && local default="yes" && y="Y" && n="n" || local default="no"

    read -p "$message ([$y]es or [$n]o): "
    case $(echo $REPLY | tr '[A-Z]' '[a-z]') in
        y|yes) local response="yes" ;;
        *)     local response="no" ;;
    esac
    if [[ $response == "$default" ]] || [[ -z $REPLY ]]; then
        echo $default
    else
        echo $response
    fi
}

function ask(){
    # Test if there are enough arguments
    if [[ $# -ne 1 ]]; then
        exit 1
    fi

    local answer
    local real_answer=""

    while [[ "" == "$real_answer" ]]; do
        read -p "Please type in $1: " answer
        [[ "yes" == $(ask_yes_or_no "Is $answer you final answer?") ]] \
                && real_answer="$answer"
    done

    echo "$real_answer"
}

# Skip-CI suffixes recognized on a release message: this project's own -no-ci, plus
# every keyword GitHub's own native skip-CI mechanism recognizes (push/pull_request
# triggers only, not release/workflow_dispatch -- CI workflows check these too so the
# behavior is consistent everywhere).
SKIP_CI_FLAGS=("-no-ci" "[skip ci]" "[ci skip]" "[no ci]" "[skip actions]" "[actions skip]")
# The one flag CI actually needs to check for: whichever form the user typed, this
# script normalizes the message to end with this before it's ever committed/tagged.
PREFERRED_SKIP_CI_FLAG="[skip ci]"

function strip_skip_ci_suffix(){
    local msg="$1"
    local flag
    for flag in "${SKIP_CI_FLAGS[@]}"; do
        if [[ "$msg" == *"$flag" ]]; then
            msg="${msg%"$flag"}"
            msg="${msg% }"
            break
        fi
    done
    echo "$msg"
}

function message_has_skip_ci(){
    local msg="$1"
    local flag
    for flag in "${SKIP_CI_FLAGS[@]}"; do
        [[ "$msg" == *"$flag" ]] && return 0
    done
    return 1
}

# Normalizes any recognized skip-CI flag to PREFERRED_SKIP_CI_FLAG, so every
# downstream consumer (this script's own publish check, and every reusable-actions
# workflow) only ever needs to test for the one flag this script actually sends.
function normalize_skip_ci(){
    local msg="$1"
    if message_has_skip_ci "$msg"; then
        msg=$(strip_skip_ci_suffix "$msg")
        echo "${msg} ${PREFERRED_SKIP_CI_FLAG}"
    else
        echo "$msg"
    fi
}

# Default publish preference is public
PUBLISH_ACCESS_FLAG="public"


while [[ $# -gt 0 ]]; do
  case "$1" in
    --public)
      PUBLISH_ACCESS_FLAG="public"
      shift
      ;;
    --private)
      PUBLISH_ACCESS_FLAG="private"
      shift
      ;;
    --)
      shift
      break
      ;;
    -* )
      # Unknown flag: stop flag parsing so older behavior (treat as TAG) remains
      break
      ;;
    *)
      # first non-flag — stop parsing
      break
      ;;
  esac
done

if [[ $# -ne 0 ]];then
  TAG="$1"
  if [[ -n "$TAG" ]];then
    shift
  fi

  MESSAGE="$*"
fi

echo "Preparing release prerequisites..."
npm run prepare-release

if [[ -z "$MESSAGE" ]];then
  MESSAGE=$(ask "Tag Message (end with -bug/-fix, -breaking or -prerelease to pick the version bump; no matching suffix defaults to minor)")
fi

# Normalize whatever skip-CI flag the user typed (-no-ci or a GitHub native keyword)
# to the one canonical flag before it's committed/tagged/pushed.
MESSAGE=$(normalize_skip_ci "$MESSAGE")

if [[ -z "$TAG" ]];then
  # Derive the semver bump type from the message suffix, ignoring a trailing skip-CI
  # flag (and the space before it, if the user typed "-bug -no-ci" rather than
  # "-bug-no-ci").
  DERIVE_SOURCE=$(strip_skip_ci_suffix "$MESSAGE")
  case "$DERIVE_SOURCE" in
    *-breaking) SUGGESTED_BUMP="major" ;;
    *-bug|*-fix) SUGGESTED_BUMP="patch" ;;
    *-prerelease) SUGGESTED_BUMP="prerelease" ;;
    *) SUGGESTED_BUMP="minor" ;;
  esac

  echo "Listing existing tags..."
  git tag --sort=-taggerdate | head -n 5
  echo "Derived version bump from message: $SUGGESTED_BUMP"
  if [[ "yes" == $(ask_yes_or_no "Use '$SUGGESTED_BUMP' as the version bump?" "yes") ]]; then
    TAG="$SUGGESTED_BUMP"
  else
    while [[ "$TAG" == "" || ! "${TAG}" =~ ^(patch|minor|major|prerelease|v[0-9]+\.[0-9]+\.[0-9]+(\-[0-9a-zA-Z\-]+)?)$ ]]; do
      TAG=$(ask "What should be the new tag? (patch|minor|major|prerelease or v*.*.*[-...])")
    done
  fi
fi

if [[ $(git status --porcelain) ]]; then
  git add .
  git commit -m "$TAG - $MESSAGE - after release preparation"
fi

npm version "$TAG" -m "$MESSAGE"

GIT_USER=$(git config user.name)

REMOTE_URL=$(git remote get-url origin)

if [[ -s .token ]]; then
  # Save current branch and upstream before pushing
  CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD)
  UPSTREAM=$(git rev-parse --abbrev-ref --symbolic-full-name '@{u}' 2>/dev/null || true)

  # Push using token; omit -u to avoid changing upstream
  git push "https://${GIT_USER}:$(cat .token)@${REMOTE_URL#https://}" --follow-tags
  # Restore upstream tracking if it existed
  if [[ -n "$UPSTREAM" ]]; then
    git branch --set-upstream-to="$UPSTREAM" "$CURRENT_BRANCH" 2>/dev/null || true
  fi
else
  git push --follow-tags
fi

# Map user-friendly flag to npm --access value. npm expects "public" or "restricted"
if [[ "$PUBLISH_ACCESS_FLAG" == "public" ]]; then
  NPM_ACCESS_VALUE="public"
else
  NPM_ACCESS_VALUE="restricted"
fi

# A prerelease bump must never publish under the default "latest" dist-tag.
NPM_PUBLISH_TAG_ARGS=()
if [[ "$TAG" == "prerelease" ]]; then
  NPM_PUBLISH_TAG_ARGS=(--tag prerelease)
fi

# Reads a package.json field with node (always present in an npm project), so the
# script has no jq dependency for the target resolution below.
function package_field(){
    node -p "require('./package.json').$1" 2>/dev/null
}

# pnpm publishes to the same registry as npm. A release can only create a version
# once, so the pnpm step runs only when the npm step above did not already publish
# it (e.g. npm was skipped), and otherwise records a clean no-op instead of failing
# the release with a duplicate-version error.
function npm_registry_has_version(){
    local name="$1"
    local version="$2"
    npm view "${name}@${version}" version >/dev/null 2>&1
}

# Sync the JSR config's version from package.json, the release's source of truth,
# so a JSR publish never drifts from the npm version.
function sync_jsr_version(){
    local config="$1"
    node -e '
      const fs = require("fs");
      const pkg = require("./package.json");
      const path = process.argv[1];
      const cfg = JSON.parse(fs.readFileSync(path, "utf8"));
      cfg.version = pkg.version;
      fs.writeFileSync(path, JSON.stringify(cfg, null, 2) + "\n");
    ' "$config"
}

if message_has_skip_ci "$MESSAGE"; then
  # The local (skip-CI) release publishes to every supported target: npm, then
  # pnpm, then deno/JSR -- mirroring the reusable-actions publish workflow.

  # npm registry, npm client. Use .npmtoken for publishing; respect chosen access
  # level and dist-tag.
  NPM_TOKEN=$(cat .npmtoken) npm publish --access "$NPM_ACCESS_VALUE" "${NPM_PUBLISH_TAG_ARGS[@]}"

  # npm registry, pnpm client. pnpm does not expand ${NPM_TOKEN} from a committed
  # project .npmrc, so pass the token as an explicit config value (never echoed);
  # without a .npmtoken it falls back to ambient credentials.
  PACKAGE_NAME=$(package_field name)
  PACKAGE_VERSION=$(package_field version)
  if npm_registry_has_version "$PACKAGE_NAME" "$PACKAGE_VERSION"; then
    echo "${PACKAGE_NAME}@${PACKAGE_VERSION} is already published to the npm registry; skipping pnpm publish (same registry as npm)."
  else
    PNPM_BIN="pnpm"
    if ! command -v pnpm >/dev/null 2>&1; then
      PNPM_BIN="npx --yes pnpm"
    fi
    PNPM_AUTH_ARGS=()
    if [[ -s .npmtoken ]]; then
      PNPM_AUTH_ARGS=(--config.//registry.npmjs.org/:_authToken="$(cat .npmtoken)")
    fi
    $PNPM_BIN publish --no-git-checks --access "$NPM_ACCESS_VALUE" "${NPM_PUBLISH_TAG_ARGS[@]}" "${PNPM_AUTH_ARGS[@]}"
  fi

  # JSR (deno) registry. Opt-in per package: repos without a JSR config skip
  # cleanly. The package version is the source of truth, so sync it into the JSR
  # config first; --token from .jsrtoken when present, otherwise ambient/OIDC auth.
  JSR_CONFIG=""
  for candidate in jsr.json jsr.jsonc deno.json deno.jsonc; do
    if [[ -f "$candidate" ]]; then
      JSR_CONFIG="$candidate"
      break
    fi
  done
  if [[ -n "$JSR_CONFIG" ]]; then
    sync_jsr_version "$JSR_CONFIG"
    JSR_AUTH_ARGS=()
    if [[ -s .jsrtoken ]]; then
      JSR_AUTH_ARGS=(--token "$(cat .jsrtoken)")
    fi
    npx --yes jsr publish "${JSR_AUTH_ARGS[@]}" --allow-dirty
  else
    echo "No JSR config (jsr.json/deno.json) found; skipping deno/JSR publish."
  fi
fi
