/**
 * Put collateral behind the mandate.
 *
 * The faucet gives STT, the spot market trades STT for USDso, and the margin
 * bank holds the USDso that a perps order draws against. This script walks that
 * path with the addresses the faucet handed out.
 *
 *   node scripts/collateral.mjs
 */

import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import {
  createPublicClient,
  createWalletClient,
  http,
  parseAbi,
  parseUnits,
  formatUnits,
} from "viem";
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

const SPOT_POOL = "0xbe6c45bf96e1b4e5ec4655bdae0f23c0410db35d";
const MARGIN_BANK = env.get("NEXT_PUBLIC_MARGIN_BANK_ADDRESS");
const USDSO = env.get("NEXT_PUBLIC_USDSO_ADDRESS");
const BTC_POOL = env.get("NEXT_PUBLIC_BTC_POOL_ADDRESS");

const spotAbi = parseAbi([
  "function getOrderBookParameters() view returns ((uint256 tickSize, uint256 minQuantity, uint256 lotSize))",
  "function tryGetMarkPrice() view returns ((bool ok, uint256 price))",
  "function placeOrder(bool isBid, uint64 userData, uint256 price, uint256 quantity, uint64 expireTimestampNs, uint8 orderType, uint8 selfMatchingOption, address builder, uint96 builderFeeBpsTimes1k) payable returns (bool success, uint128 orderId)",
]);

const erc20Abi = parseAbi([
  "function balanceOf(address account) view returns (uint256)",
  "function transfer(address to, uint256 amount) returns (bool)",
  "function approve(address spender, uint256 amount) returns (bool)",
  "function decimals() view returns (uint8)",
]);

const marginAbi = parseAbi([
  "function deposit(uint256 amount) returns (uint256)",
  "function getAccountEquity(address account) returns (int256)",
]);

const poolAbi = parseAbi([
  "function getOrderBookParameters() view returns ((uint256 tickSize, uint256 minQuantity, uint256 lotSize))",
  "function tryGetMarkPrice() view returns ((bool ok, uint256 price))",
  "function placeOrderFor(address owner, bool isBid, uint64 userData, uint256 price, uint256 quantity, uint64 expireTimestampNs, uint8 orderType, uint8 selfMatchingOption, address builder, uint96 builderFeeBpsTimes1k) payable returns (bool success, uint128 orderId)",
]);

const keys = JSON.parse(readFileSync(join(root, "faucet-keys.json"), "utf8"));
const deployer = privateKeyToAccount(env.get("DEPLOYER_PRIVATE_KEY"));
const deployerClient = createWalletClient({ account: deployer, transport: http(RPC, { timeout: 600_000 }) });

const grid = await client.readContract({ address: SPOT_POOL, abi: spotAbi, functionName: "getOrderBookParameters" });
const mark = await client
  .readContract({ address: SPOT_POOL, abi: spotAbi, functionName: "tryGetMarkPrice" })
  .catch(() => null);
const markPrice = mark ? mark[1] : 153065165619924461n;
console.log(`spot tick ${grid.tickSize} min ${grid.minQuantity} lot ${grid.lotSize} mark ${markPrice}`);

// The sell price sits below the mark so the order crosses the bid.
const price = ((markPrice * 90n) / 100n / grid.tickSize) * grid.tickSize;
const quantity = 1n * 10n ** 18n; // one STT, the smallest the pool accepts
console.log(`selling ${formatUnits(quantity, 18)} STT at ${formatUnits(price, 18)} USDso`);

let total = 0n;
for (const entry of keys) {
  const account = privateKeyToAccount(entry.key);
  const balance = await client.readContract({
    address: env.get("NEXT_PUBLIC_USDSO_ADDRESS"),
    abi: erc20Abi,
    functionName: "balanceOf",
    args: [account.address],
  });
  const stt = await client.getBalance({ address: account.address });
  if (stt < 10n ** 17n) {
    console.log(`${account.address} no STT to swap`);
    continue;
  }

  const wallet = createWalletClient({ account, transport: http(RPC, { timeout: 600_000 }) });
  try {
    const hash = await wallet.writeContract({
      address: SPOT_POOL,
      abi: spotAbi,
      functionName: "placeOrder",
      args: [false, 0n, price, quantity, 0n, 2, 0, "0x0000000000000000000000000000000000000000", 0n],
      value: quantity,
      gas: 5_000_000n,
    });
    const receipt = await client.waitForTransactionReceipt({ hash });
    console.log(`${account.address} swap ${hash} status ${receipt.status}`);
    if (receipt.status !== "success") continue;
  } catch (error) {
    console.log(`${account.address} swap failed: ${error.shortMessage ?? error.message} :: ${error.cause?.message ?? ""} :: ${error.cause?.details ?? ""}`);
    continue;
  }

  const usdso = await client.readContract({
    address: USDSO,
    abi: erc20Abi,
    functionName: "balanceOf",
    args: [account.address],
  });
  if (usdso === 0n) continue;

  const sendHash = await wallet.writeContract({
    address: USDSO,
    abi: erc20Abi,
    functionName: "transfer",
    args: [deployer.address, usdso],
    gas: 200_000n,
  });
  await client.waitForTransactionReceipt({ hash: sendHash });
  total += usdso;
  console.log(`${account.address} sent ${formatUnits(usdso, 18)} USDso to the owner`);
}

console.log(`total ${formatUnits(total, 18)} USDso`);

if (total > 0n) {
  await deployerClient.writeContract({
    address: USDSO,
    abi: erc20Abi,
    functionName: "approve",
    args: [MARGIN_BANK, total],
    gas: 200_000n,
  });
  const hash = await deployerClient.writeContract({
    address: MARGIN_BANK,
    abi: marginAbi,
    functionName: "deposit",
    args: [total],
    gas: 500_000n,
  });
  const receipt = await client.waitForTransactionReceipt({ hash });
  console.log(`deposited ${formatUnits(total, 18)} USDso as margin, ${hash} status ${receipt.status}`);
}

const equity = await client.readContract({
  address: MARGIN_BANK,
  abi: marginAbi,
  functionName: "getAccountEquity",
  args: [deployer.address],
});
console.log(`equity ${formatUnits(equity, 18)} USDso`);

writeFileSync(
  join(root, "collateral.json"),
  `${JSON.stringify({ usdso: total.toString(), equity: equity.toString() }, null, 2)}\n`,
  "utf8",
);



