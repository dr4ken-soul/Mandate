/**
 * Find which contract behind an address can revert with a given selector.
 *
 * The venue does not publish the perps error table, so the selector of an
 * unknown revert is traced by reading the implementation of every proxy in
 * the call path and looking for the selector in its code.
 *
 *   node scripts/find-selector.mjs 0x3e31dcc2 0xAddress 0xAddress ...
 */

import { createPublicClient, http } from "viem";
import { keccak256Hex } from "../packages/policy/src/keccak.ts";

const target = process.argv[2];
const addresses = process.argv.slice(3);

if (!target || addresses.length === 0) {
  console.error("usage: node scripts/find-selector.mjs 0xselector 0xAddress ...");
  process.exit(1);
}

const client = createPublicClient({
  transport: http(process.env.NEXT_PUBLIC_RPC_URL ?? "https://api.hideki2.infra.testnet.somnia.network", {
    timeout: 600_000,
    retryCount: 3,
  }),
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

for (const address of addresses) {
  const code = await client.getCode({ address });
  if (!code || code === "0x") {
    console.log(`${address} has no code`);
    continue;
  }
  const direct = selectorsOf(code);
  const implRaw = await client.getStorageAt({ address, slot: SLOT });
  const impl = `0x${implRaw.slice(-40)}`;
  let implSelectors = new Set();
  let implCode = "0x";
  if (implRaw !== "0x" && !/^0x0+$/.test(impl)) {
    implCode = await client.getCode({ address: impl });
    implSelectors = selectorsOf(implCode);
  }
  const hit = direct.has(target) || implSelectors.has(target);
  console.log(`${address} impl ${impl} direct ${direct.size} impl ${implSelectors.size} ${hit ? "HAS THE SELECTOR" : ""}`);
}
