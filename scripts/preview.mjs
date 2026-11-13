/**
 * Ask the deployed policy contract what it would do with an order, without
 * sending anything.
 *
 *   node scripts/preview.mjs [market] [notional]
 */

import { readFileSync } from "node:fs";
import { createPublicClient, http, parseAbi, parseUnits } from "viem";

const RPC = process.env.NEXT_PUBLIC_RPC_URL ?? "https://api.hideki2.infra.testnet.somnia.network";

function readEnv(path) {
  const values = new Map();
  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    const match = /^\s*([A-Z0-9_]+)\s*=\s*(.*)$/.exec(line);
    if (match) values.set(match[1], match[2].trim());
  }
  return values;
}

const env = readEnv(".env");
const client = createPublicClient({ transport: http(RPC, { timeout: 600_000, retryCount: 3 }) });

const venueAbi = parseAbi([
  "function getOrderBookParameters() view returns ((uint256 tickSize, uint256 minQuantity, uint256 lotSize))",
  "function tryGetMarkPrice() view returns (bool ok, uint256 price)",
]);

const mandateAbi = parseAbi([
  "function previewAdmit((address owner, address market, bool isBid, uint256 price, uint256 quantity, bool reduceOnly, bool armsStop, uint64 expireTimestampNs, uint8 orderType) request) view returns (uint8 code, uint128 compared, uint128 limit, uint8 clause)",
]);

const market = env.get("NEXT_PUBLIC_BTC_POOL_ADDRESS");
const owner = env.get("DEPLOYER_ADDRESS") ?? "0x0B55a453B3F95a43E0327439E8932ae82Bc7aF0e";
const executor = env.get("EXECUTOR_ADDRESS") ?? "0xa9526B5B70946AdA0a97781008524Cb1F9E11f3D";
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
const notional = parseUnits(process.argv[3] ?? "2000", 18);
const raw = (notional * 10n ** BigInt(baseDecimals)) / mark[1];
const quantity = (raw / grid.lotSize + 1n) * grid.lotSize;
const price = (mark[1] / grid.tickSize) * grid.tickSize;

console.log(`price ${price} quantity ${quantity}`);

const result = await client.readContract({
  address: mandate,
  abi: mandateAbi,
  functionName: "previewAdmit",
  args: [
    {
      owner,
      market,
      isBid: true,
      price,
      quantity,
      reduceOnly: false,
      armsStop: false,
      expireTimestampNs: 0n,
      orderType: 2,
    },
  ],
});
console.log(`code ${result[0]} compared ${result[1]} limit ${result[2]} clause ${result[3]}`);
void executor;
