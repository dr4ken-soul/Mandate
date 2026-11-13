/**
 * List the selectors a deployed contract exposes and name the ones the SDK knows.
 *
 *   node scripts/list-selectors.mjs 0xAddress
 */

import { createPublicClient, http } from "viem";
import { keccak256Hex } from "../packages/policy/src/keccak.ts";

const RPC = process.env.NEXT_PUBLIC_RPC_URL ?? "https://api.hideki2.infra.testnet.somnia.network";
const address = process.argv[2];
if (!address) {
  console.error("usage: node scripts/list-selectors.mjs 0xAddress");
  process.exit(1);
}

const client = createPublicClient({
  transport: http(RPC, { timeout: 600_000, retryCount: 3 }),
});

const SLOT = "0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc";

function selectorsOf(code) {
  const bytes = code.slice(2);
  const found = new Set();
  for (let i = 0; i + 4 <= bytes.length; i += 2) {
    if (bytes.slice(i, i + 2) === "63") found.add(`0x${bytes.slice(i + 2, i + 10)}`);
  }
  return found;
}

const known = new Map();

const sdk = await import("@somnia-chain/markets-sdk");
for (const key of Object.keys(sdk)) {
  const value = sdk[key];
  if (!Array.isArray(value)) continue;
  for (const item of value) {
    if (!item || typeof item !== "object") continue;
    if (item.type !== "function" && item.type !== "error") continue;
    const inputs = (item.inputs ?? []).map((input) => input.type).join(",");
    const signature = `${item.name}(${inputs})`;
    known.set(keccak256Hex(signature).slice(0, 10), signature);
  }
}

const code = await client.getCode({ address });
if (!code || code === "0x") {
  console.log("no code at that address");
  process.exit(1);
}

const implRaw = await client.getStorageAt({ address, slot: SLOT });
const impl = `0x${implRaw.slice(-40)}`;
const implCode = implRaw === "0x" || /^0x0+$/.test(impl) ? "0x" : await client.getCode({ address: impl });

const selectors = new Set([...selectorsOf(code), ...selectorsOf(implCode)]);

console.log(`address ${address} implementation ${impl}`);
console.log(`selectors found: ${selectors.size}`);
for (const selector of [...selectors].sort()) {
  console.log(`${selector} ${known.get(selector) ?? ""}`);
}
