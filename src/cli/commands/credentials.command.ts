import { execSync } from "node:child_process";
import { existsSync, readFileSync, unlinkSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { LoggingConfig } from "@decaf-ts/logging";
import { Command } from "../command";
import { DefaultCommandValues } from "../constants";
import { UserInput } from "../../input/input";
import { printCommandHelp } from "./help.command";

/**
 * @description Default secret definitions used by the credentials command.
 * @summary Maps the well-known secret names to their env-var, keychain
 * service/account, and legacy plaintext-file defaults. Every field can be
 * overridden at runtime via flags so custom secrets are fully supported.
 * @const DEFAULT_SECRETS
 * @memberOf module:utils
 */
export const DEFAULT_SECRETS: Record<
  string,
  { env: string; service: string; account: string; legacyFile: string }
> = {
  npm: {
    env: "NPM_TOKEN",
    service: "decaf-ts:npm",
    account: "publish",
    legacyFile: ".npmtoken",
  },
  github: {
    env: "GH_TOKEN",
    service: "decaf-ts:github",
    account: "git",
    legacyFile: ".token",
  },
  confluence: {
    env: "ATLASSIAN_API_TOKEN",
    service: "decaf-ts:confluence",
    account: "api",
    legacyFile: ".confluence-token",
  },
};

type SecretSpec = {
  env: string;
  service: string;
  account: string;
  legacyFile: string;
};

type KeychainBackend = "keychain" | "libsecret" | "keyring" | null;

const options = {
  action: {
    type: "string",
    short: "a",
    default: "get",
  },
  name: {
    type: "string",
    short: "n",
    default: "npm",
  },
  value: {
    type: "string",
    short: "v",
    default: undefined,
  },
  envVar: {
    type: "string",
    default: undefined,
  },
  service: {
    type: "string",
    default: undefined,
  },
  account: {
    type: "string",
    default: undefined,
  },
  legacyFile: {
    type: "string",
    default: undefined,
  },
  rm: {
    type: "boolean",
    short: "r",
    default: false,
  },
};

function which(bin: string): boolean {
  try {
    execSync(`command -v ${bin}`, { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

function pythonKeyringAvailable(): boolean {
  try {
    execSync('python3 -c "import keyring; import keyring.backends"', {
      stdio: "ignore",
    });
    return true;
  } catch {
    return false;
  }
}

function detectBackend(): KeychainBackend {
  const platform = os.platform();
  if (platform === "darwin") return "keychain";
  if (platform === "linux") {
    if (which("secret-tool")) return "libsecret";
    if (which("python3") && pythonKeyringAvailable()) return "keyring";
  }
  if (platform === "win32") return "keychain";
  return null;
}

function storeInBackend(
  backend: KeychainBackend,
  spec: SecretSpec,
  value: string
): boolean {
  if (backend === "keychain") {
    if (os.platform() === "darwin") {
      execSync(
        `security add-generic-password -a "${spec.account}" -s "${spec.service}" -w "${value}" -U`,
        { stdio: "ignore" }
      );
      return true;
    }
    return false;
  }
  if (backend === "libsecret") {
    execSync(
      `secret-tool store --label='${spec.service}' service '${spec.service}' account '${spec.account}' <<< '${value}'`,
      { stdio: "ignore" }
    );
    return true;
  }
  if (backend === "keyring") {
    execSync(
      `python3 -c "import keyring; keyring.set_password('${spec.service}', '${spec.account}', '${value}')"`
    );
    return true;
  }
  return false;
}

function readFromBackend(
  backend: KeychainBackend,
  spec: SecretSpec
): string | null {
  try {
    if (backend === "keychain" && os.platform() === "darwin") {
      return execSync(
        `security find-generic-password -a "${spec.account}" -s "${spec.service}" -w`,
        { encoding: "utf8" }
      ).trim();
    }
    if (backend === "libsecret") {
      return execSync(
        `secret-tool lookup service '${spec.service}' account '${spec.account}'`,
        { encoding: "utf8" }
      ).trim();
    }
    if (backend === "keyring") {
      return execSync(
        `python3 -c "import keyring; print(keyring.get_password('${spec.service}', '${spec.account}'), end='')"`,
        { encoding: "utf8" }
      ).trim();
    }
  } catch {
    return null;
  }
  return null;
}

function readLegacyFile(filePath: string): string | null {
  const resolved = path.resolve(process.cwd(), filePath);
  if (!existsSync(resolved)) return null;
  return readFileSync(resolved, "utf8").trim();
}

/**
 * @description Resolves a secret using the same resolution order as CredentialsCommand.
 * @summary Tries environment variable → OS keychain → legacy plaintext file, returning
 * the first hit. Throws if no source provides a value.
 * @param {string} name - Secret name (npm, github, confluence, or custom).
 * @param {Partial<SecretSpec>} [overrides] - Optional overrides for env-var, service, account, or legacyFile.
 * @returns {string} The resolved secret value.
 * @function resolveSecret
 * @memberOf module:utils
 */
export function resolveSecret(
  name: string,
  overrides?: Partial<SecretSpec>
): string {
  const base = DEFAULT_SECRETS[name] ?? {
    env: name.toUpperCase().replace(/[^A-Z0-9]/g, "_") + "_TOKEN",
    service: `decaf-ts:${name}`,
    account: "default",
    legacyFile: `.${name}-token`,
  };
  const spec: SecretSpec = {
    env: overrides?.env ?? base.env,
    service: overrides?.service ?? base.service,
    account: overrides?.account ?? base.account,
    legacyFile: overrides?.legacyFile ?? base.legacyFile,
  };
  if (process.env[spec.env]) return process.env[spec.env] as string;
  const backend = detectBackend();
  if (backend) {
    const val = readFromBackend(backend, spec);
    if (val) return val;
  }
  const legacy = readLegacyFile(spec.legacyFile);
  if (legacy) return legacy;
  throw new Error(
    `No token found for "${name}". Set ${spec.env}, run "credentials --action setup", or (legacy) create ${spec.legacyFile}.`
  );
}

/**
 * @description Checks whether a secret can be resolved without throwing.
 * @summary Returns true if any source (env var, keychain, legacy file) provides a value.
 * @param {string} name - Secret name.
 * @param {Partial<SecretSpec>} [overrides] - Optional overrides.
 * @returns {boolean} Whether the secret is available.
 * @function hasSecret
 * @memberOf module:utils
 */
export function hasSecret(
  name: string,
  overrides?: Partial<SecretSpec>
): boolean {
  try {
    resolveSecret(name, overrides);
    return true;
  } catch {
    return false;
  }
}

/**
 * @description Command-line tool for managing secrets via the OS keychain.
 * @summary Provides a secure alternative to plaintext token files by resolving
 * secrets from environment variables, the OS keychain (macOS Keychain, Linux
 * libsecret/`keyring`), or — as a deprecated fallback — legacy plaintext files.
 * Supports `get`, `store`, `setup`, and `git-helper` actions.
 *
 * @class CredentialsCommand
 * @extends {Command}
 *
 * @example
 * ```sh
 * # Resolve the npm token (prints to stdout)
 * credentials --action get --name npm
 *
 * # Store a custom secret in the keychain
 * credentials --action store --name my-api --service "my-app:api" --account "default" --value "secret123"
 *
 * # Interactive one-time enrollment
 * credentials --action setup
 *
 * # Configure the OS-native git credential helper
 * credentials --action git-helper
 * ```
 */
export class CredentialsCommand extends Command<typeof options, void> {
  constructor() {
    super("CredentialsCommand", options);
  }

  private resolveSpec(name: string, overrides: Partial<SecretSpec>): SecretSpec {
    const base = DEFAULT_SECRETS[name] ?? {
      env: name.toUpperCase().replace(/[^A-Z0-9]/g, "_") + "_TOKEN",
      service: `decaf-ts:${name}`,
      account: "default",
      legacyFile: `.${name}-token`,
    };
    return {
      env: overrides.env ?? base.env,
      service: overrides.service ?? base.service,
      account: overrides.account ?? base.account,
      legacyFile: overrides.legacyFile ?? base.legacyFile,
    };
  }

  protected override help(): void {
    printCommandHelp(
      this.log,
      "credentials",
      "Manage secrets via the OS keychain with env-var and legacy-file fallbacks.\n" +
        "Used by release scripts (tag-release, npm publish, git push) and consumable\n" +
        "programmatically via resolveSecret() / hasSecret().",
      "credentials [options]",
      [
        {
          flag: "--action <get|store|setup|git-helper>",
          description:
            "get       - Resolve a secret and print it to stdout (no trailing newline).\n" +
            "             Resolution order: env var -> OS keychain -> legacy plaintext file.\n" +
            "             In CI, set NPM_TOKEN / GH_TOKEN / ATLASSIAN_API_TOKEN as env vars\n" +
            "             and they will be picked up immediately (keychain is never consulted).\n" +
            "store     - Save a secret value in the OS keychain. Requires --value.\n" +
            "setup     - Interactive one-time enrollment: prompts for each default secret,\n" +
            "             stores them in the keychain, and configures the git credential helper.\n" +
            "             Use --rm to auto-delete legacy plaintext token files afterwards.\n" +
            "git-helper- Configure the OS-native git credential helper only\n" +
            "             (osxkeychain on macOS, libsecret/store on Linux, manager on Windows).",
          defaultValue: "get",
        },
        {
          flag: "--name <name>",
          description:
            "Secret name. Built-in names (npm, github, confluence) use sensible defaults.\n" +
            "             Any other name is treated as custom: env var defaults to <NAME>_TOKEN,\n" +
            "             service to decaf-ts:<name>, account to 'default', legacyFile to .<name>-token.",
          defaultValue: "npm",
        },
        {
          flag: "--value <value>",
          description:
            "Secret value to store. Required for --action store. Ignored for other actions.",
        },
        {
          flag: "--envVar <name>",
          description:
            "Override the environment variable name checked first during resolution.\n" +
            "             Example: --name github --envVar GH_PAT to read GH_PAT instead of GH_TOKEN.",
        },
        {
          flag: "--service <name>",
          description:
            "Override the keychain service label (default: decaf-ts:<name>).\n" +
            "             Used as the primary key when storing/looking up secrets in the OS keychain.",
        },
        {
          flag: "--account <name>",
          description:
            "Override the keychain account label (default: 'publish' for npm, 'git' for github,\n" +
            "             'api' for confluence, 'default' for custom names).",
        },
        {
          flag: "--legacyFile <path>",
          description:
            "Override the legacy plaintext file path checked last during resolution.\n" +
            "             Example: --legacyFile ~/.npmrc to read from a different file.\n" +
            "             Emits a deprecation warning when used; will be removed in a future release.",
        },
        {
          flag: "--rm",
          description:
            "Used with --action setup. Auto-deletes legacy plaintext token files\n" +
            "             (.npmtoken, .token, .confluence-token) after successful keychain enrollment.\n" +
            "             Only deletes files that exist; logs each file removed.",
          defaultValue: "false",
        },
        {
          flag: "-h, --help",
          description: "Show this help text and exit",
        },
      ],
      [
        "Resolution order for --action get: environment variable -> OS keychain -> legacy plaintext file (with deprecation warning).",
        "Supported keychain backends: macOS Keychain (security), Linux libsecret (secret-tool), Linux Python keyring, Windows Credential Manager.",
        "Built-in secrets: npm (NPM_TOKEN, .npmtoken), github (GH_TOKEN, .token), confluence (ATLASSIAN_API_TOKEN, .confluence-token).",
        "CI usage: set the env var as a GitHub/GitLab secret. resolveSecret() picks it up without any keychain access.",
        "Local usage: run 'credentials --action setup' once to enroll secrets in the keychain, then delete plaintext token files.",
        "Programmatic API: import { resolveSecret, hasSecret } from '@decaf-ts/utils' — same resolution order, throws if not found.",
      ],
      [
        "# Resolve the npm publish token (prints to stdout, no trailing newline)",
        "credentials --action get --name npm",
        "",
        "# Resolve the github token using a non-default env var name",
        "credentials --action get --name github --envVar GH_PAT",
        "",
        "# Store the github token in the OS keychain",
        "credentials --action store --name github --value ghp_xxxxxxxxxxxx",
        "",
        "# Store a custom secret with fully overridden metadata",
        "credentials --action store --name my-api --envVar MY_API_TOKEN --service 'my-app:api' --account 'ci' --value 'sk_live_xxx'",
        "",
        "# Interactive one-time setup (prompts for npm, github, confluence; configures git helper)",
        "credentials --action setup",
        "",
        "# Setup and auto-delete legacy plaintext token files (.npmtoken, .token, .confluence-token)",
        "credentials --action setup --rm",
        "",
        "# Configure only the git credential helper (no secret enrollment)",
        "credentials --action git-helper",
        "",
        "# Resolve a custom secret that has no built-in defaults",
        "credentials --action get --name stripe --envVar STRIPE_SECRET_KEY --legacyFile .stripe-token",
        "",
        "# Use in a shell pipeline (e.g., set npm auth for publish)",
        "npm config set //registry.npmjs.org/:_authToken \"$(credentials --action get --name npm)\"",
        "",
        "# Programmatic usage in TypeScript",
        "import { resolveSecret } from '@decaf-ts/utils';",
        "const token = resolveSecret('npm'); // env var -> keychain -> legacy file",
      ]
    );
  }

  private doGet(spec: SecretSpec): void {
    const log = this.log.for(this.doGet);
    if (process.env[spec.env]) {
      log.verbose(`Resolved from env var ${spec.env}`);
      process.stdout.write(process.env[spec.env] as string);
      return;
    }
    const backend = detectBackend();
    if (backend) {
      const val = readFromBackend(backend, spec);
      if (val) {
        log.verbose(`Resolved from ${backend}`);
        process.stdout.write(val);
        return;
      }
    }
    const legacy = readLegacyFile(spec.legacyFile);
    if (legacy) {
      log.warn(
        `Using plaintext ${spec.legacyFile}. Run "credentials --action setup" to migrate to the OS keychain. This fallback will be removed in a future release.`
      );
      process.stdout.write(legacy);
      return;
    }
    throw new Error(
      `No token found for "${spec.service}". Set ${spec.env}, run "credentials --action setup", or (legacy) create ${spec.legacyFile}.`
    );
  }

  private doStore(spec: SecretSpec, value: string): void {
    const log = this.log.for(this.doStore);
    const backend = detectBackend();
    if (!backend) {
      throw new Error(
        "No supported keychain backend detected. Install libsecret (apt: libsecret-tools) on Linux."
      );
    }
    storeInBackend(backend, spec, value);
    log.info(`Stored secret in ${backend}.`);
  }

  private async doSetup(rm: boolean): Promise<void> {
    const log = this.log.for(this.doSetup);
    const backend = detectBackend();
    if (!backend) {
      throw new Error(
        "No supported keychain backend detected. Install libsecret (apt: libsecret-tools) on Linux, or use env vars in CI."
      );
    }
    const names = Object.keys(DEFAULT_SECRETS);
    for (const name of names) {
      const spec = this.resolveSpec(name, {});
      const existing = readFromBackend(backend, spec);
      const skip = existing
        ? await UserInput.askConfirmation(
            `update-${name}`,
            `Update ${name} token?`,
            false
          )
        : true;
      if (!skip) continue;
      const value = await UserInput.askText(
        name,
        `Paste ${name} token (${spec.env}):`,
        "*"
      );
      const trimmed = `${value}`.trim();
      if (!trimmed) {
        log.warn(`Empty value for ${name}, skipping.`);
        continue;
      }
      storeInBackend(backend, spec, trimmed);
      log.info(`Stored ${name} token in ${backend}.`);
    }
    this.configureGitHelper();
    if (rm) {
      const deleted = this.deleteLegacyFiles();
      if (deleted.length > 0) {
        log.info(`Deleted legacy token files: ${deleted.join(", ")}`);
      } else {
        log.info("No legacy token files found to delete.");
      }
      log.info(
        "Setup complete with --rm. All secrets are now in the OS keychain."
      );
    } else {
      log.info(
        'Setup complete. Plaintext .token/.npmtoken/.confluence-token can now be deleted (run with --rm to auto-delete).'
      );
    }
  }

  private deleteLegacyFiles(): string[] {
    const log = this.log.for(this.deleteLegacyFiles);
    const deleted: string[] = [];
    for (const name of Object.keys(DEFAULT_SECRETS)) {
      const spec = this.resolveSpec(name, {});
      const resolved = path.resolve(process.cwd(), spec.legacyFile);
      if (existsSync(resolved)) {
        try {
          unlinkSync(resolved);
          deleted.push(spec.legacyFile);
        } catch (err) {
          log.warn(`Could not delete ${spec.legacyFile}: ${(err as Error).message}`);
        }
      }
    }
    return deleted;
  }

  private configureGitHelper(): void {
    const log = this.log.for(this.configureGitHelper);
    const platform = os.platform();
    let helper: string;
    if (platform === "darwin") {
      helper = "osxkeychain";
    } else if (platform === "linux") {
      const candidates = [
        "/usr/share/doc/git/contrib/credential/libsecret/git-credential-libsecret",
        "libsecret",
        "store",
      ];
      helper = "store";
      for (const c of candidates) {
        try {
          if (which(`git-credential-${c}`)) {
            helper = c;
            break;
          }
        } catch {
          // continue
        }
      }
    } else if (platform === "win32") {
      helper = "manager";
    } else {
      helper = "store";
    }
    execSync(`git config --global credential.helper '${helper}'`, {
      stdio: "inherit",
    });
    log.info(`Git credential helper set to "${helper}".`);
    if (helper === "store") {
      log.warn(
        'Falling back to plaintext "store" helper. Install libsecret for keychain storage.'
      );
    }
  }

  protected async run(
    answers: LoggingConfig &
      typeof DefaultCommandValues & { [k in keyof typeof options]: unknown }
  ): Promise<void> {
    const action = `${answers.action || "get"}`.trim();
    const name = `${answers.name || "npm"}`.trim();
    const str = (v: unknown): string | undefined => {
      if (typeof v !== "string") return undefined;
      const s = v.trim();
      return s.length > 0 ? s : undefined;
    };
    const spec = this.resolveSpec(name, {
      env: str(answers.envVar),
      service: str(answers.service),
      account: str(answers.account),
      legacyFile: str(answers.legacyFile),
    });

    switch (action) {
      case "get":
        this.doGet(spec);
        return;
      case "store": {
        const value = str(answers.value);
        if (!value) {
          throw new Error(
            "--value is required for --action store"
          );
        }
        this.doStore(spec, value);
        return;
      }
      case "setup":
        await this.doSetup(Boolean(answers.rm));
        return;
      case "git-helper":
        this.configureGitHelper();
        return;
      default:
        throw new Error(
          `Unknown action "${action}". Valid: get, store, setup, git-helper`
        );
    }
  }
}
