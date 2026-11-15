/** Verify the recorded BTC-PERP reduction and current flat position on Hideki. */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { createPublicClient, http, parseAbi, parseEventLogs } from "viem";
import { privateKeyToAccount } from "viem/accounts";

const root = join(import.meta.dirname, "..");
const env = new Map();
for (const line of readFileSync(join(root, ".env"), "utf8").split(/\r?\n/)) {
  const match = /^\s*([A-Z0-9_]+)\s*=\s*(.*)$/.exec(line);
  if (match) env.set(match[1], match[2].trim());
}
const deployment = JSON.parse(readFileSync(join(root, "deployment.json"), "utf8"));
const owner = privateKeyToAccount(env.get("DEPLOYER_PRIVATE_KEY")).address;
const pool = deployment.market.pool;
const bank = env.get("NEXT_PUBLIC_MARGIN_BANK_ADDRESS");
const client = createPublicClient({ transport: http(env.get("NEXT_PUBLIC_RPC_URL"), { timeout: 120_000, retryCount: 2 }) });
const bankAbi = parseAbi([
  "function getPosition(address account, address perpPool) view returns (int128 size, uint128 avgEntryPrice, int256 entryFundingIndex, uint64 lastUpdatedTimestampNs)",
]);
const poolAbi = parseAbi([
  "event OrderFilled(uint128 indexed takerOrderId, uint128 indexed makerOrderId, uint256 quantityFilled, uint256 takerRemainingQuantity, uint256 makerRemainingQuantity, uint256 fillPrice)",
]);
if (await client.getChainId() !== 50383) throw new Error("expected Hideki testnet 50383");
if (!Array.isArray(deployment.reduceOrders) || deployment.reduceOrders.length === 0) throw new Error("deployment.json has no recorded reduction");

const reductions = [];
for (const order of deployment.reduceOrders) {
  const receipt = await client.getTransactionReceipt({ hash: order.tx });
  const fills = parseEventLogs({ abi: poolAbi, logs: receipt.logs, eventName: "OrderFilled", strict: false });
  const filledQuantity = fills.reduce((total, fill) => total + fill.args.quantityFilled, 0n);
  if (receipt.status !== "success" || filledQuantity === 0n || filledQuantity.toString() !== order.filledQuantity) {
    throw new Error("reduction receipt does not match recorded fill: " + order.tx);
  }
  reductions.push({ tx: order.tx, status: receipt.status, filledQuantity: filledQuantity.toString(), fillPrices: fills.map((fill) => fill.args.fillPrice.toString()) });
}
const position = await client.readContract({ address: bank, abi: bankAbi, functionName: "getPosition", args: [owner, pool] });
if (position[0] !== 0n || deployment.remainingPosition !== "0") throw new Error("the BTC-PERP position is not flat");
console.log(JSON.stringify({ chainId: 50383, owner, pool, reductions, remainingPosition: position[0].toString() }, null, 2));
