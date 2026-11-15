/**
 * Send the refused order and read the reason it was refused.
 *
 *   node scripts/refuse.mjs [notional]
 */

import { readFileSync } from "node:fs";
import { createPublicClient, createWalletClient, http, parseAbi, parseUnits } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { keccak256Hex } from "../packages/policy/src/keccak.ts";

function readEnv(path) {
  const values = new Map();
  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    const match = /^\s*([A-Z0-9_]+)\s*=\s*(.*)$/.exec(line);
    if (match) values.set(match[1], match[2].trim());
  }
  return values;
}

const env = readEnv(".env");
const RPC = env.get("NEXT_PUBLIC_RPC_URL");
const client = createPublicClient({ transport: http(RPC, { timeout: 600_000, retryCount: 3 }) });
const executor = privateKeyToAccount(env.get("EXECUTOR_PRIVATE_KEY"));
const wallet = createWalletClient({ account: executor, transport: http(RPC, { timeout: 600_000 }) });

const venueAbi = parseAbi([
  "function getOrderBookParameters() view returns ((uint256 tickSize, uint256 minQuantity, uint256 lotSize))",
  "function tryGetMarkPrice() view returns (bool ok, uint256 price)",
]);

const mandateAbi = parseAbi([
  "function admit((address owner, address market, bool isBid, uint256 price, uint256 quantity, bool reduceOnly, bool armsStop, uint64 expireTimestampNs, uint8 orderType) request) payable returns (bool success, uint128 orderId)",
  "function recordRefusal((address owner, address market, bool isBid, uint256 price, uint256 quantity, bool reduceOnly, bool armsStop, uint64 expireTimestampNs, uint8 orderType) request, uint8 code, bytes32 txRef)",
]);

const market = env.get("NEXT_PUBLIC_BTC_POOL_ADDRESS");
const owner = "0x0B55a453B3F95a43E0327439E8932ae82Bc7aF0e";
const mandate = env.get("NEXT_PUBLIC_MANDATE_ADDRESS");

const grid = await client.readContract({
  address: market,
  abi: venueAbi,
  functionName: "getOrderBookParameters",
});
const mark = await client.readContract({
  address: market,
  abi: venueAbi,
  functionName: "tryGetMarkPrice",
});

const baseDecimals = 8;
const notional = parseUnits(process.argv[2] ?? "2000", 18);
const raw = (notional * 10n ** BigInt(baseDecimals)) / mark[1];
const quantity = (raw / grid.lotSize + 1n) * grid.lotSize;
const price = (mark[1] / grid.tickSize) * grid.tickSize;

const request = {
  owner,
  market,
  isBid: true,
  price,
  quantity,
  reduceOnly: false,
  armsStop: false,
  expireTimestampNs: 0n,
  orderType: 2,
};

console.log(`price ${price} quantity ${quantity}`);

await new Promise((resolve) => setTimeout(resolve, 2000));

const hash = await wallet.writeContract({
  address: mandate,
  abi: mandateAbi,
  functionName: "admit",
  args: [request],
  gas: BigInt(process.argv[3] ?? 1_000_000),
});
const receipt = await client.waitForTransactionReceipt({ hash });
console.log(`tx ${hash} status ${receipt.status} gas ${receipt.gasUsed}`);

if (receipt.status !== "success") {
  let data = null;
  try {
    await client.call({
      to: mandate,
      data: receipt.input,
      account: executor.address,
    });
  } catch (error) {
    const walk = (e, depth = 0) => {
      if (!e || depth > 5 || typeof e !== "object") return null;
      for (const key of ["data", "raw"]) {
        const value = e[key];
        if (typeof value === "string" && /^0x[0-9a-fA-F]{10,}$/.test(value)) return value;
      }
      for (const key of ["cause", "error", "details"]) {
        const found = walk(e[key], depth + 1);
        if (found) return found;
      }
      return null;
    };
    data = walk(error);
  }
  if (data) {
    const selector = `0x${data.slice(2, 10)}`;
    if (data.length < 74) throw new Error("the revert data does not include the reason code");
    const code = Number.parseInt(data.slice(-2), 16);
    if (selector !== "0x47a56227" || code !== 0x08) {
      throw new Error(`expected EMarketNotionalCap(0x08), got ${selector} code 0x${code.toString(16)}`);
    }
    console.log(`selector ${selector} code 0x${code.toString(16).toUpperCase().padStart(2, "0")}`);
  } else {
    throw new Error("the refusal did not include decodable revert data; no decision was recorded");
  }

  // The refusal is written by a second transaction, because a revert rolls back
  // the log that would have recorded it.
  const recordHash = await wallet.writeContract({
    address: mandate,
    abi: mandateAbi,
    functionName: "recordRefusal",
    args: [request, Number.parseInt(data.slice(-2), 16), hash],
    gas: 1_000_000n,
  });
  const recordReceipt = await client.waitForTransactionReceipt({ hash: recordHash });
  console.log(`recorded ${recordHash} status ${recordReceipt.status}`);
  console.log(`txRef ${keccak256Hex(hash).slice(0, 18)}`);
}

