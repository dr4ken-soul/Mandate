/**
 * List every perp pool on the chain with the numbers a policy needs.
 *
 * Run it against the testnet before anything else is written down, because
 * every market address in the presets, the demo scripts and the environment
 * file comes from this read rather than from a document.
 *
 *   node scripts/list-markets.mjs
 */

import { createPublicClient, http, parseAbi } from "viem";

const RPC = process.env.NEXT_PUBLIC_RPC_URL ?? "https://api.hideki.infra.testnet.somnia.network/";
const CHAIN_ID = Number(process.env.NEXT_PUBLIC_CHAIN_ID ?? 50383);

const PERP_POOL_FACTORY = "0xE631fAEE547baeE07353E290f0562ea67d856560";
const MARGIN_BANK = "0x478769E1177C0773c43A593DCCc4Ad15F15F1394";

const factoryAbi = parseAbi([
  "function getPerpPools() view returns (address[])",
  "function getBaseTokenForPool(address perpPool) view returns (address)",
]);

const poolAbi = parseAbi([
  "function getOrderBookParameters() view returns ((uint256 tickSize, uint256 minQuantity, uint256 lotSize))",
  "function tryGetMarkPrice() view returns (bool ok, uint256 price)",
  "function getPerpPoolParameters() view returns ((uint256 initialMarginBps, uint256 maintenanceMarginBps, uint256 closeOutMarginBps, uint256 maxOpenInterest, uint256 maxPositionSize, uint256 takerFeeBpsTimes1k, int256 makerFeeBpsTimes1k, uint256 insuranceFundShareBps))",
  "function isRestricted() view returns (bool)",
]);

const erc20Abi = parseAbi([
  "function decimals() view returns (uint8)",
  "function symbol() view returns (string)",
]);

const marginBankAbi = parseAbi([
  "function isVoucherMarketAllowed(address perpPool) view returns (bool)",
]);

const client = createPublicClient({ transport: http(RPC) });

const pools = await client.readContract({
  address: PERP_POOL_FACTORY,
  abi: factoryAbi,
  functionName: "getPerpPools",
});

const rows = [];

for (const pool of pools) {
  const [grid, mark, params, baseToken, restricted] = await Promise.all([
    client.readContract({ address: pool, abi: poolAbi, functionName: "getOrderBookParameters" }),
    client.readContract({ address: pool, abi: poolAbi, functionName: "tryGetMarkPrice" }),
    client.readContract({ address: pool, abi: poolAbi, functionName: "getPerpPoolParameters" }),
    client.readContract({
      address: PERP_POOL_FACTORY,
      abi: factoryAbi,
      functionName: "getBaseTokenForPool",
      args: [pool],
    }),
    client.readContract({ address: pool, abi: poolAbi, functionName: "isRestricted" }),
  ]);

  let symbol = "?";
  let decimals = 18;
  try {
    symbol = await client.readContract({ address: baseToken, abi: erc20Abi, functionName: "symbol" });
    decimals = await client.readContract({ address: baseToken, abi: erc20Abi, functionName: "decimals" });
  } catch {
    symbol = baseToken;
  }

  let voucherAllowed = false;
  try {
    voucherAllowed = await client.readContract({
      address: MARGIN_BANK,
      abi: marginBankAbi,
      functionName: "isVoucherMarketAllowed",
      args: [pool],
    });
  } catch {
    voucherAllowed = false;
  }

  rows.push({
    pool,
    symbol,
    decimals,
    tickSize: grid.tickSize.toString(),
    minQuantity: grid.minQuantity.toString(),
    lotSize: grid.lotSize.toString(),
    priceable: mark[0],
    mark: mark[1].toString(),
    maxPositionSize: params.maxPositionSize.toString(),
    maxLeverage: Math.floor(10_000 / Number(params.initialMarginBps)) || 0,
    restricted,
    voucherAllowed,
  });
}

console.log(JSON.stringify({ chainId: CHAIN_ID, rpc: RPC, count: rows.length, rows }, null, 2));


