import { createPublicClient, http, parseAbi, type Address } from "viem";
import { hidekiTestnet } from "./chain";
import { decisionEvent, mandateAbi, perpPoolFactoryAbi } from "./abi";

/**
 * The chain reader.
 *
 * One client, one chain, no cache that can disagree with the chain.
 */
export const publicClient = createPublicClient({
  chain: hidekiTestnet,
  transport: http(hidekiTestnet.rpcUrls.default.http[0], { timeout: 60_000, retryCount: 3 }),
});

export interface Market {
  /** The perp pool address. */
  readonly pool: Address;
  /** The pair, for example BTC-PERP. */
  readonly symbol: string;
  /** The base asset decimals, which set the size scale. */
  readonly baseDecimals: number;
  readonly tickSize: bigint;
  readonly lotSize: bigint;
  readonly minQuantity: bigint;
  readonly markPrice: bigint;
}

const factoryAbi = parseAbi([
  "function getPerpPools() view returns (address[] perpPools)",
  "function getBaseTokenForPool(address perpPool) view returns (address baseToken)",
]);

const tokenAbi = parseAbi([
  "function decimals() view returns (uint8)",
  "function symbol() view returns (string)",
]);

const poolAbi = parseAbi([
  "function getOrderBookParameters() view returns ((uint256 tickSize, uint256 minQuantity, uint256 lotSize))",
  "function tryGetMarkPrice() view returns (bool ok, uint256 price)",
]);

/**
 * The perp markets, read from the chain.
 *
 * The factory lists the pools and the pools carry their own grid and mark
 * price, so nothing here comes from a document that could be out of date.
 */
export async function listMarkets(): Promise<Market[]> {
  const pools = await publicClient.readContract({
    address: process.env.NEXT_PUBLIC_PERP_POOL_FACTORY_ADDRESS as Address,
    abi: factoryAbi,
    functionName: "getPerpPools",
  });

  const rows = await Promise.all(
    pools.map(async (pool) => {
      const [baseToken, grid, mark] = await Promise.all([
        publicClient.readContract({
          address: process.env.NEXT_PUBLIC_PERP_POOL_FACTORY_ADDRESS as Address,
          abi: factoryAbi,
          functionName: "getBaseTokenForPool",
          args: [pool],
        }),
        publicClient.readContract({
          address: pool,
          abi: poolAbi,
          functionName: "getOrderBookParameters",
        }),
        publicClient.readContract({ address: pool, abi: poolAbi, functionName: "tryGetMarkPrice" }),
      ]);

      let symbol = "?";
      let baseDecimals = 18;
      try {
        [symbol, baseDecimals] = await Promise.all([
          publicClient.readContract({ address: baseToken, abi: tokenAbi, functionName: "symbol" }),
          publicClient.readContract({ address: baseToken, abi: tokenAbi, functionName: "decimals" }),
        ]);
      } catch {
        symbol = baseToken;
      }

      return {
        pool,
        symbol: `${symbol}-PERP`,
        baseDecimals,
        tickSize: grid.tickSize,
        lotSize: grid.lotSize,
        minQuantity: grid.minQuantity,
        markPrice: mark[0] ? mark[1] : 0n,
      };
    }),
  );

  return rows.sort((a, b) => a.symbol.localeCompare(b.symbol));
}

/**
 * The mandate address the console reads.
 */
export function mandateAddress(): Address {
  return process.env.NEXT_PUBLIC_MANDATE_ADDRESS as Address;
}

/**
 * The decision log, read straight from the chain.
 *
 * The events are the record. There is no second source that could drift.
 */
export interface DecisionRow {
  readonly txHash: string;
  readonly blockNumber: bigint;
  readonly owner: Address;
  readonly admitted: boolean;
  readonly code: number;
  readonly policyHash: string;
  readonly market: Address;
  readonly compared: bigint;
  readonly limit: bigint;
  readonly clause: number;
  readonly txRef: string;
}

export async function listDecisions(fromBlock?: bigint): Promise<DecisionRow[]> {
  const toBlock = await publicClient.getBlockNumber();
  const start = fromBlock ?? (toBlock > 20_000n ? toBlock - 20_000n : 0n);

  // The node accepts a range of at most a thousand blocks per query, so the
  // window is walked in steps. A window that fails is skipped rather than
  // taking the page down with it.
  const rows: DecisionRow[] = [];
  const STEP = 1_000n;
  for (let from = start; from <= toBlock; from += STEP) {
    const to = from + STEP - 1n > toBlock ? toBlock : from + STEP - 1n;
    try {
      const logs = await publicClient.getLogs({
        address: mandateAddress(),
        event: decisionEvent,
        fromBlock: from,
        toBlock: to,
      });
      for (const log of logs) {
        const args = log.args as {
          owner: Address;
          admitted: boolean;
          code: number;
          policyHash: string;
          market: Address;
          compared: bigint;
          limit: bigint;
          clause: number;
          txRef: string;
        };
        rows.push({
          txHash: log.transactionHash ?? "",
          blockNumber: log.blockNumber,
          owner: args.owner,
          admitted: args.admitted,
          code: args.code,
          policyHash: args.policyHash,
          market: args.market,
          compared: args.compared,
          limit: args.limit,
          clause: args.clause,
          txRef: args.txRef,
        });
      }
    } catch {
      continue;
    }
  }

  return rows.reverse();
}

/**
 * One decision, by its transaction hash.
 */
export async function findDecision(txHash: string): Promise<DecisionRow | undefined> {
  const rows = await listDecisions();
  return rows.find((row) => row.txHash === txHash);
}


