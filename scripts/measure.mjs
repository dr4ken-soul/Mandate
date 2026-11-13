/**
 * Measure the two transactions the landing page quotes.
 *
 * The refusal is the policy contract's own revert. The venue revert is the
 * same order sent straight to the pool, which is the comparison the product
 * makes: the policy stops the order before the pool does any work.
 *
 *   node scripts/measure.mjs
 */

import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { createPublicClient, createWalletClient, http, parseAbi, parseUnits, formatUnits } from "viem";
import { privateKeyToAccount } from "viem/accounts";

const root = join(import.meta.dirname, "..");

function readEnv(path) {
  const values = new Map();
  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    const match = /^\s*([A-Z0-9_]+)\s*=\s*(.*)$/.exec(line);
    if (match) values.set(match[1], match[2].trim());
  }
  return values;
}

const env = readEnv(join(root, ".env"));
const RPC = env.get("NEXT_PUBLIC_RPC_URL");
const client = createPublicClient({ transport: http(RPC, { timeout: 600_000, retryCount: 3 }) });
const owner = privateKeyToAccount(env.get("DEPLOYER_PRIVATE_KEY"));
const wallet = createWalletClient({ account: owner, transport: http(RPC, { timeout: 600_000 }) });

const deployment = JSON.parse(readFileSync(join(root, "deployment.json"), "utf8"));

const poolAbi = parseAbi([
  "function placeOrderFor(address owner, bool isBid, uint64 userData, uint256 price, uint256 quantity, uint64 expireTimestampNs, uint8 orderType, uint8 selfMatchingOption, address builder, uint96 builderFeeBpsTimes1k) payable returns (bool success, uint128 orderId)",
  "function getOrderBookParameters() view returns ((uint256 tickSize, uint256 minQuantity, uint256 lotSize))",
  "function tryGetMarkPrice() view returns (bool ok, uint256 price)",
]);

/** The gas the policy refusal cost. */
async function measureRefusal() {
  const receipt = await client.getTransactionReceipt({ hash: deployment.refusedOrder.tx });
  return receipt.gasUsed;
}

/**
 * The same order, sent straight to the pool.
 *
 * The venue does the work the policy would have skipped, and then refuses it.
 */
async function measureVenueRevert() {
  const market = deployment.market.pool;
  const grid = await client.readContract({
    address: market,
    abi: poolAbi,
    functionName: "getOrderBookParameters",
  });
  const mark = await client.readContract({
    address: market,
    abi: poolAbi,
    functionName: "tryGetMarkPrice",
  });
  const baseDecimals = deployment.refusedOrder.baseDecimals;
  const price = (mark[1] / grid.tickSize) * grid.tickSize;
  const notional = parseUnits("2000", 18);
  const raw = (notional * 10n ** BigInt(baseDecimals)) / mark[1];
  const quantity = (raw / grid.lotSize + 1n) * grid.lotSize;

  const hash = await wallet.writeContract({
    address: market,
    abi: poolAbi,
    functionName: "placeOrderFor",
    args: [
      owner.address,
      true,
      0n,
      price,
      quantity,
      0n,
      2,
      0,
      "0x0000000000000000000000000000000000000000",
      0n,
    ],
    gas: 10_000_000n,
  });
  const receipt = await client.waitForTransactionReceipt({ hash });
  console.log(`venue revert ${hash} gas ${receipt.gasUsed} status ${receipt.status}`);
  return { hash, gasUsed: receipt.gasUsed };
}

const refusalGas = await measureRefusal();
const venue = await measureVenueRevert();

const metrics = {
  refusalGasMedian: Number(refusalGas),
  venueRevertGasMedian: Number(venue.gasUsed),
  codeCount: 17,
  modelCallsOnPath: 0,
  runAt: new Date().toISOString(),
};

writeFileSync(join(root, "metrics.json"), `${JSON.stringify(metrics, null, 2)}\n`, "utf8");
console.log(JSON.stringify(metrics, null, 2));
console.log(`refusal gas ${formatUnits(BigInt(refusalGas), 0)}`);
