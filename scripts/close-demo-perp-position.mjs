/** Close the small BTC-PERP position created by the deployment proof. */

import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { createPublicClient, createWalletClient, formatUnits, http, parseAbi, parseEventLogs } from "viem";
import { privateKeyToAccount } from "viem/accounts";

const root = join(import.meta.dirname, "..");
const env = new Map();
for (const line of readFileSync(join(root, ".env"), "utf8").split(/\r?\n/)) {
  const match = /^\s*([A-Z0-9_]+)\s*=\s*(.*)$/.exec(line);
  if (match) env.set(match[1], match[2].trim());
}

const rpc = env.get("NEXT_PUBLIC_RPC_URL");
const owner = privateKeyToAccount(env.get("DEPLOYER_PRIVATE_KEY"));
const executor = privateKeyToAccount(env.get("EXECUTOR_PRIVATE_KEY"));
const deploymentPath = join(root, "deployment.json");
const deployment = JSON.parse(readFileSync(deploymentPath, "utf8"));
const mandate = deployment.mandate;
const pool = deployment.market.pool;
const bank = env.get("NEXT_PUBLIC_MARGIN_BANK_ADDRESS");
const client = createPublicClient({ transport: http(rpc, { timeout: 120_000, retryCount: 2 }) });
const wallet = createWalletClient({ account: executor, transport: http(rpc, { timeout: 120_000 }) });

const mandateAbi = parseAbi([
  "function admit((address owner, address market, bool isBid, uint256 price, uint256 quantity, bool reduceOnly, bool armsStop, uint64 expireTimestampNs, uint8 orderType) request) payable returns (bool success, uint128 orderId)",
  "function previewAdmit((address owner, address market, bool isBid, uint256 price, uint256 quantity, bool reduceOnly, bool armsStop, uint64 expireTimestampNs, uint8 orderType) request) view returns (uint8 code, uint128 compared, uint128 limit, uint8 clause)",
]);
const poolAbi = parseAbi([
  "function getOrderBookParameters() view returns ((uint256 tickSize, uint256 minQuantity, uint256 lotSize))",
  "function getBookLevels(bool isBid, uint64 numLevels) view returns ((uint256 price, uint256 quantity)[])",
  "event OrderFilled(uint128 indexed takerOrderId, uint128 indexed makerOrderId, uint256 quantityFilled, uint256 takerRemainingQuantity, uint256 makerRemainingQuantity, uint256 fillPrice)",
]);
const bankAbi = parseAbi([
  "function getPosition(address account, address perpPool) view returns (int128 size, uint128 avgEntryPrice, int256 entryFundingIndex, uint64 lastUpdatedTimestampNs)",
]);
if (await client.getChainId() !== 50383) throw new Error("refusing to trade outside Hideki testnet 50383");

const reductions = [];
for (let attempt = 0; attempt < 3; attempt += 1) {
  const position = await client.readContract({ address: bank, abi: bankAbi, functionName: "getPosition", args: [owner.address, pool] });
  const signedSize = position[0];
  if (signedSize === 0n) break;
  const isLong = signedSize > 0n;
  const isBid = !isLong;
  const quantity = signedSize > 0n ? signedSize : -signedSize;
  const [grid, levels, head] = await Promise.all([
    client.readContract({ address: pool, abi: poolAbi, functionName: "getOrderBookParameters" }),
    client.readContract({ address: pool, abi: poolAbi, functionName: "getBookLevels", args: [isLong, 20n] }),
    client.getBlock({ blockTag: "latest" }),
  ]);
  let depth = 0n;
  let crossingPrice = 0n;
  for (const level of levels) {
    depth += level.quantity;
    if (depth >= quantity) {
      crossingPrice = level.price;
      break;
    }
  }
  if (crossingPrice === 0n) throw new Error("the live book has insufficient depth to close the full position");
  const rawPrice = isBid ? (crossingPrice * 1005n) / 1000n : (crossingPrice * 995n) / 1000n;
  const price = isBid
    ? ((rawPrice + grid.tickSize - 1n) / grid.tickSize) * grid.tickSize
    : (rawPrice / grid.tickSize) * grid.tickSize;
  if (quantity % grid.lotSize !== 0n || price === 0n) throw new Error("the position or crossing price is off the venue grid");

  const request = {
    owner: owner.address,
    market: pool,
    isBid,
    price,
    quantity,
    reduceOnly: true,
    armsStop: false,
    expireTimestampNs: head.timestamp * 1_000_000_000n + 120_000_000_000n,
    orderType: 2,
  };
  const preview = await client.readContract({
    address: mandate,
    abi: mandateAbi,
    functionName: "previewAdmit",
    args: [request],
    account: executor.address,
  });
  if (preview[0] !== 0) throw new Error(`the position reduction was refused: code ${preview[0]}`);

  const simulation = await client.simulateContract({
    address: mandate,
    abi: mandateAbi,
    functionName: "admit",
    args: [request],
    account: executor,
  });
  if (!simulation.result[0]) throw new Error("the venue simulation did not accept the reduction");

  const hash = await wallet.writeContract({ ...simulation.request, gas: 10_000_000n });
  const receipt = await client.waitForTransactionReceipt({ hash });
  if (receipt.status !== "success") throw new Error(`the position reduction reverted: ${hash}`);
  const fills = parseEventLogs({ abi: poolAbi, logs: receipt.logs, eventName: "OrderFilled", strict: false });
  const filledQuantity = fills.reduce((total, event) => total + event.args.quantityFilled, 0n);
  if (filledQuantity === 0n) throw new Error(`the reduction transaction emitted no fill: ${hash}`);
  reductions.push({
    tx: hash,
    side: isBid ? "buy to reduce short" : "sell to reduce long",
    price: price.toString(),
    requestedQuantity: quantity.toString(),
    filledQuantity: filledQuantity.toString(),
    fillPrices: fills.map((event) => event.args.fillPrice.toString()),
  });
  console.log(`reduction ${hash}: filled ${formatUnits(filledQuantity, 8)} BTC`);
}

const finalPosition = await client.readContract({ address: bank, abi: bankAbi, functionName: "getPosition", args: [owner.address, pool] });
deployment.reduceOrders = reductions;
deployment.remainingPosition = finalPosition[0].toString();
writeFileSync(deploymentPath, `${JSON.stringify(deployment, null, 2)}\n`, "utf8");
console.log(JSON.stringify({ reductions, remainingPosition: finalPosition[0].toString() }, null, 2));
if (finalPosition[0] !== 0n) throw new Error("the demonstration position remains open after three reduction attempts");
