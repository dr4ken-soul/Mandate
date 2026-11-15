/** Execute one minimum-size, fill-or-kill STT/USDso spot sell on Hideki.
 *
 * This checks the currently live bid with a simulation before signing and
 * verifies an OrderFilled log and USDso receipt afterwards. Testnet only.
 */

import { readFileSync, writeFileSync } from "node:fs";
import { createPublicClient, createWalletClient, formatUnits, http, parseAbi, parseEventLogs } from "viem";
import { privateKeyToAccount } from "viem/accounts";

function readEnv(path) {
  const values = new Map();
  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    const match = /^\s*([A-Z0-9_]+)\s*=\s*(.*)$/.exec(line);
    if (match) values.set(match[1], match[2].trim());
  }
  return values;
}

const env = readEnv(new URL("../.env", import.meta.url));
const rpc = env.get("NEXT_PUBLIC_RPC_URL");
const spotPool = "0xbe6c45bf96e1b4e5ec4655bdae0f23c0410db35d";
const usdso = env.get("NEXT_PUBLIC_USDSO_ADDRESS");
const faucetKeys = JSON.parse(readFileSync(new URL("../faucet-keys.json", import.meta.url), "utf8"));
const client = createPublicClient({ transport: http(rpc, { timeout: 120_000, retryCount: 2 }) });
if (await client.getChainId() !== Number(env.get("NEXT_PUBLIC_CHAIN_ID"))) {
  throw new Error("RPC chain id does not match the configured testnet");
}

const accounts = faucetKeys.map((entry) => privateKeyToAccount(entry.key));
const balances = await Promise.all(accounts.map(async (account) => ({
  account,
  balance: await client.getBalance({ address: account.address }),
})));
balances.sort((a, b) => a.balance > b.balance ? -1 : a.balance < b.balance ? 1 : 0);
const selected = balances.find(({ balance }) => balance > 0n);
if (!selected) throw new Error("no faucet account has native STT");

const account = selected.account;
const wallet = createWalletClient({ account, transport: http(rpc, { timeout: 120_000 }) });
const poolAbi = parseAbi([
  "function getOrderBookParameters() view returns ((uint256 tickSize, uint256 minQuantity, uint256 lotSize))",
  "function getBookLevels(bool isBid, uint64 numLevels) view returns ((uint256 price, uint256 quantity)[])",
  "function placeOrder(bool isBid, uint64 userData, uint256 price, uint256 quantity, uint64 expireTimestampNs, uint8 orderType, uint8 selfMatchingOption, address builder, uint96 builderFeeBpsTimes1k) payable",
  "event OrderFilled(uint128 indexed takerOrderId, uint128 indexed makerOrderId, uint256 quantityFilled, uint256 takerRemainingQuantity, uint256 makerRemainingQuantity, uint256 fillPrice)",
]);
const tokenAbi = parseAbi(["function balanceOf(address account) view returns (uint256)"]);

const [grid, bids, nativeBalance, usdsoBefore, block] = await Promise.all([
  client.readContract({ address: spotPool, abi: poolAbi, functionName: "getOrderBookParameters" }),
  client.readContract({ address: spotPool, abi: poolAbi, functionName: "getBookLevels", args: [true, 5n] }),
  client.getBalance({ address: account.address }),
  client.readContract({ address: usdso, abi: tokenAbi, functionName: "balanceOf", args: [account.address] }),
  client.getBlock({ blockTag: "latest" }),
]);
const quantity = grid.minQuantity;
const bestBid = bids[0];
if (!bestBid || bestBid.quantity < quantity) throw new Error("current best bid cannot fill one minimum unit");
if (nativeBalance < quantity + 20_000_000_000_000_000n) {
  throw new Error("selected faucet account lacks one minimum unit plus gas reserve");
}

const request = {
  address: spotPool,
  abi: poolAbi,
  functionName: "placeOrder",
  args: [
    false,
    0n,
    bestBid.price,
    quantity,
    block.timestamp * 1_000_000_000n + 60_000_000_000n,
    1,
    0,
    "0x0000000000000000000000000000000000000000",
    0n,
  ],
  value: quantity,
  gas: 5_000_000n,
};
await client.simulateContract({ ...request, account });
const hash = await wallet.writeContract(request);
const receipt = await client.waitForTransactionReceipt({ hash });
if (receipt.status !== "success") throw new Error("spot fill transaction reverted: " + hash);

const fills = parseEventLogs({ abi: poolAbi, logs: receipt.logs, eventName: "OrderFilled", strict: false });
const filled = fills.reduce((sum, log) => sum + (log.args.quantityFilled ?? 0n), 0n);
const usdsoAfter = await client.readContract({
  address: usdso,
  abi: tokenAbi,
  functionName: "balanceOf",
  args: [account.address],
});
if (filled !== quantity || usdsoAfter <= usdsoBefore) {
  throw new Error("the spot order mined without the expected full fill and USDso credit: " + hash);
}

const result = {
  chainId: await client.getChainId(),
  pool: spotPool,
  pair: "STT/USDso",
  trader: account.address,
  tx: hash,
  block: receipt.blockNumber.toString(),
  baseQuantity: quantity.toString(),
  fillPrice: fills[0].args.fillPrice.toString(),
  usdsoBefore: usdsoBefore.toString(),
  usdsoAfter: usdsoAfter.toString(),
  usdsoReceived: (usdsoAfter - usdsoBefore).toString(),
  gasUsed: receipt.gasUsed.toString(),
};
writeFileSync(new URL("../spot-fill.json", import.meta.url), JSON.stringify(result, null, 2) + "\n", "utf8");
console.log(JSON.stringify({ ...result, baseQuantity: formatUnits(quantity, 18) }, null, 2));
