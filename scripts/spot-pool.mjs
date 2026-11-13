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
  "function getMarkPrice() view returns (uint256)",
  "function getBookLevels() view returns ((uint256 price, uint256 size)[] bids, (uint256 price, uint256 size)[] asks)",
]);

const pool = process.argv[2];
const params = await client.readContract({ address: pool, abi, functionName: "getOrderBookParameters" });

console.log("grid", JSON.stringify(params, (k, v) => (typeof v === "bigint" ? v.toString() : v)));

try {
  const mark = await client.readContract({ address: pool, abi, functionName: "getMarkPrice" });
  console.log("mark", mark.toString());
} catch (error) {
  console.log("mark unavailable", error.shortMessage);
}

try {
  const book = await client.readContract({ address: pool, abi, functionName: "getBookLevels" });
  console.log("best bid", book[0][0]?.price?.toString(), "size", book[0][0]?.size?.toString());
  console.log("best ask", book[1][0]?.price?.toString(), "size", book[1][0]?.size?.toString());
} catch (error) {
  console.log("book unavailable", error.shortMessage);
}


