/**
 * Read a spot pool's grid and its mark price.
 *
 *   node scripts/spot-pool.mjs 0xPool
 */

import { createPublicClient, http, parseAbi } from "viem";

const RPC = process.env.NEXT_PUBLIC_RPC_URL ?? "https://api.hideki2.infra.testnet.somnia.network";
const client = createPublicClient({ transport: http(RPC, { timeout: 600_000, retryCount: 3 }) });

const abi = parseAbi([
  "function getOrderBookParameters() view returns ((uint256 tickSize, uint256 minQuantity, uint256 lotSize))",
  "function tryGetMarkPrice() view returns (bool ok, uint256 price)",
  "function getBookLevels(bool isBid, uint64 numLevels) view returns ((uint256 price, uint256 quantity)[])",
]);

const pool = process.argv[2];
const params = await client.readContract({ address: pool, abi, functionName: "getOrderBookParameters" });

console.log("grid", JSON.stringify(params, (k, v) => (typeof v === "bigint" ? v.toString() : v)));

try {
  const [ok, price] = await client.readContract({ address: pool, abi, functionName: "tryGetMarkPrice" });
  console.log("mark", price.toString(), "priceable", ok);
} catch (error) {
  console.log("mark unavailable", error.shortMessage);
}

try {
  const [bids, asks] = await Promise.all([
    client.readContract({ address: pool, abi, functionName: "getBookLevels", args: [true, 5n] }),
    client.readContract({ address: pool, abi, functionName: "getBookLevels", args: [false, 5n] }),
  ]);
  console.log("bids", JSON.stringify(bids, (_, value) => typeof value === "bigint" ? value.toString() : value));
  console.log("asks", JSON.stringify(asks, (_, value) => typeof value === "bigint" ? value.toString() : value));
} catch (error) {
  console.log("book unavailable", error.shortMessage);
}


