/**
 * Create the environment file with real values.
 *
 * The chain values come from the Somnia docs and from a live read of the testnet.
 * The two keys are generated once and stay in `.env`, which is never committed.
 * `.env.example` carries the same keys with the secrets blank.
 *
 *   node scripts/setup-env.mjs
 */

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";

const root = join(import.meta.dirname, "..");
const envPath = join(root, ".env");
const examplePath = join(root, ".env.example");

const publicValues = {
  NEXT_PUBLIC_CHAIN_ID: "50383",
  NEXT_PUBLIC_RPC_URL: "https://api.hideki.infra.testnet.somnia.network/",
  NEXT_PUBLIC_WS_URL: "wss://api.hideki.infra.testnet.somnia.network/ws",
  NEXT_PUBLIC_EXPLORER_URL: "https://explorer.testnet.somnia.network/tokyo",
  NEXT_PUBLIC_INDEXER_URL: "https://hideki-dev.smk.somnia.host/v1/graphql",
  NEXT_PUBLIC_MARGIN_BANK_ADDRESS: "0x478769E1177C0773c43A593DCCc4Ad15F15F1394",
  NEXT_PUBLIC_PERP_POOL_FACTORY_ADDRESS: "0xE631fAEE547baeE07353E290f0562ea67d856560",
  NEXT_PUBLIC_OPERATOR_REGISTRY_ADDRESS: "0x6B2FbfeD328FF5F20C0BE7D3C3437613aFFE8D3a",
  NEXT_PUBLIC_USDSO_ADDRESS: "0xed7993A74dAe1e6656B704A424DcD8711aAf4F72",
  NEXT_PUBLIC_VOUCHER_DISTRIBUTOR_ADDRESS: "0x2ACD9EFdA721450906bfE1bef3edE269636E42C4",
  NEXT_PUBLIC_BTC_POOL_ADDRESS: "0x4181dd08E73BbCdd1Ba3E615A18f6abD941b94C0",
  NEXT_PUBLIC_ETH_POOL_ADDRESS: "0xD6Cb1DD58580B84D76068aC21594219ce03aeddf",
  NEXT_PUBLIC_MANDATE_ADDRESS: "0x7b0076508b4545175f2a70511ab559bae9638ed3",
  NEXT_PUBLIC_WATCH_ADDRESS: "",
  NEXT_PUBLIC_DEMO_DECISION_ID: "0xa1ec4135762287ad83b582702c77cffc980f2556c8efb79607bb0ffdbaa8deb6",
  NEXT_PUBLIC_OWNER_ADDRESS: "",
  NEXT_PUBLIC_ENFORCEMENT_MODE: "chain",
};

const secretDefaults = {
  WALLETCONNECT_PROJECT_ID: "",
  COMPILER_MODEL: "gpt-4o-mini",
  COMPILER_API_BASE: "https://api.openai.com/v1",
  COMPILER_API_KEY: "",
  DEPLOYER_PRIVATE_KEY: "",
  EXECUTOR_PRIVATE_KEY: "",
  ENFORCEMENT_MODE: "chain",
};

function readEnv(path) {
  const values = new Map();
  if (!existsSync(path)) return values;
  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    const match = /^\s*([A-Z0-9_]+)\s*=\s*(.*)$/.exec(line);
    if (match) values.set(match[1], match[2].trim());
  }
  return values;
}

const existing = readEnv(envPath);

function keyFor(name) {
  const current = existing.get(name);
  if (current && /^0x[0-9a-fA-F]{64}$/.test(current)) return current;
  const generated = generatePrivateKey();
  existing.set(name, generated);
  return generated;
}

const deployerKey = keyFor("DEPLOYER_PRIVATE_KEY");
const executorKey = keyFor("EXECUTOR_PRIVATE_KEY");
const deployer = privateKeyToAccount(deployerKey);
const executor = privateKeyToAccount(executorKey);

const configuredPublicValues = { ...publicValues };
for (const key of [
  "NEXT_PUBLIC_MANDATE_ADDRESS",
  "NEXT_PUBLIC_WATCH_ADDRESS",
  "NEXT_PUBLIC_DEMO_DECISION_ID",
]) {
  if (existing.get(key)) configuredPublicValues[key] = existing.get(key);
}
configuredPublicValues.NEXT_PUBLIC_OWNER_ADDRESS = deployer.address;

const lines = [
  "# Mandate environment.",
  "# Chain 50383, the Somnia Tokyo testnet. Written by scripts/setup-env.mjs.",
  "",
  "# Public values. These reach the browser.",
  ...Object.entries(configuredPublicValues).map(([key, value]) => `${key}=${value}`),
  "",
  "# Secrets. These stay on the server.",
  ...Object.entries(secretDefaults)
    .filter(([key]) => key !== "DEPLOYER_PRIVATE_KEY" && key !== "EXECUTOR_PRIVATE_KEY")
    .map(([key, value]) => `${key}=${existing.get(key) ?? value}`),
  "",
  "# The deploy wallet. It holds the collateral, registers the mandate and grants",
  "# the policy contract its operator rights. It is a testnet key with no value.",
  `DEPLOYER_PRIVATE_KEY=${deployerKey}`,
  "",
  "# The executor key. It asks for admission and never holds funds.",
  `EXECUTOR_PRIVATE_KEY=${executorKey}`,
  "",
];

writeFileSync(envPath, lines.join("\n"), "utf8");

const example = [
  "# Mandate environment.",
  "# Copy to .env and fill in the secrets. The public values are correct for the",
  "# Somnia Tokyo testnet, chain 50383.",
  "",
  ...Object.entries(configuredPublicValues).map(([key, value]) => `${key}=${value}`),
  "",
  ...Object.entries(secretDefaults).map(([key, value]) => `${key}=${value}`),
  "",
];

writeFileSync(examplePath, example.join("\n"), "utf8");

console.log(`deployer ${deployer.address}`);
console.log(`executor ${executor.address}`);
console.log(`wrote ${envPath}`);
console.log(`wrote ${examplePath}`);
