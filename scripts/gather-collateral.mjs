/**
 * Gather the collateral.
 *
 * The faucet hands out one STT per address, the spot market's smallest sell is
 * one STT, and a sell also needs gas, so the balances are pooled first and
 * then sold one STT at a time for USDso. The USDso goes to the owner wallet,
 * which is the wallet the perps account belongs to.
 *
 *   node scripts/gather-collateral.mjs
 */

import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import {
  createPublicClient,
  createWalletClient,
  http,
  parseAbi,
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
const USDSO = env.get("NEXT_PUBLIC_USDSO_ADDRESS");
const MARGIN_BANK = env.get("NEXT_PUBLIC_MARGIN_BANK_ADDRESS");

const spotAbi = parseAbi([
  "function getOrderBookParameters() view returns ((uint256 tickSize, uint256 minQuantity, uint256 lotSize))",
  "function placeOrder(bool isBid, uint64 userData, uint256 price, uint256 quantity, uint64 expireTimestampNs, uint8 orderType, uint8 selfMatchingOption, address builder, uint96 builderFeeBpsTimes1k) payable returns (bool success, uint128 orderId)",
]);

const erc20Abi = parseAbi([
  "function balanceOf(address account) view returns (uint256)",
  "function transfer(address to, uint256 amount) returns (bool)",
  "function approve(address spender, uint256 amount) returns (bool)",
]);

const marginAbi = parseAbi([
  "function deposit(uint256 amount) returns (uint256)",
  "function getAccountEquity(address account) returns (int256)",
]);

const keys = JSON.parse(readFileSync(join(root, "faucet-keys.json"), "utf8"));
const owner = privateKeyToAccount(env.get("DEPLOYER_PRIVATE_KEY"));
const ownerClient = createWalletClient({ account: owner, transport: http(RPC, { timeout: 600_000 }) });

const grid = await client.readContract({
  address: SPOT_POOL,
  abi: spotAbi,
  functionName: "getOrderBookParameters",
});
// The sell is priced at the mark, rounded onto the tick, so it crosses the
// best bid, and it is an immediate order so the quote arrives in the same
// transaction.
const price = (153065165619924461n / grid.tickSize) * grid.tickSize;
const unit = grid.minQuantity;
console.log(`selling ${formatUnits(unit, 18)} STT a time at ${formatUnits(price, 18)} USDso`);

// 1. Pool the STT into the account that holds the most.
const accounts = keys.map((entry) => ({ key: entry.key, account: privateKeyToAccount(entry.key) }));
let pool = accounts[0];
if (!pool) throw new Error("no faucet accounts");
for (const entry of accounts) {
  const balance = await client.getBalance({ address: entry.account.address });
  const poolBalance = await client.getBalance({ address: pool.account.address });
  if (balance > poolBalance) pool = entry;
}
console.log(`pooling into ${pool.account.address}`);

for (const entry of accounts) {
  if (entry.account.address === pool.account.address) continue;
  const balance = await client.getBalance({ address: entry.account.address });
  if (balance < 10n ** 17n) continue;
  const wallet = createWalletClient({ account: entry.account, transport: http(RPC, { timeout: 600_000 }) });
  try {
    const hash = await wallet.sendTransaction({
      to: pool.account.address,
      value: balance - 10n ** 16n,
      gas: 30_000n,
    });
    const receipt = await client.waitForTransactionReceipt({ hash });
    console.log(
      `${entry.account.address} pooled STT into ${pool.account.address}, ${hash} status ${receipt.status}`,
    );
    if (receipt.status !== "success") {
      console.log(`  the transfer failed: ${receipt.status}`);
    }
  } catch (error) {
    console.log(`${entry.account.address} pooling failed: ${error.shortMessage ?? error.message}`);
  }
}

// 2. Sell the STT for USDso, one unit at a time.
const poolWallet = createWalletClient({ account: pool.account, transport: http(RPC, { timeout: 600_000 }) });
let usdso = 0n;
for (let round = 0; round < 12; round += 1) {
  const balance = await client.getBalance({ address: pool.account.address });
  if (balance < unit + 10n ** 16n) break;
  try {
    const hash = await poolWallet.writeContract({
      address: SPOT_POOL,
      abi: spotAbi,
      functionName: "placeOrder",
      args: [false, 0n, price, unit, 0n, 0, 0, "0x0000000000000000000000000000000000000000", 0n],
      value: unit,
      gas: 5_000_000n,
    });
    const receipt = await client.waitForTransactionReceipt({ hash });
    console.log(`sell ${hash} status ${receipt.status}`);
    if (receipt.status !== "success") break;
  } catch (error) {
    console.log(`sell failed: ${error.shortMessage ?? error.message}`);
    break;
  }
}

usdso = await client.readContract({
  address: USDSO,
  abi: erc20Abi,
  functionName: "balanceOf",
  args: [pool.account.address],
});
console.log(`pool holds ${formatUnits(usdso, 18)} USDso`);

// 3. Send the USDso to the owner.
if (usdso > 0n) {
  const hash = await poolWallet.writeContract({
    address: USDSO,
    abi: erc20Abi,
    functionName: "transfer",
    args: [owner.address, usdso],
    gas: 200_000n,
  });
  const receipt = await client.waitForTransactionReceipt({ hash });
  console.log(`sent ${formatUnits(usdso, 18)} USDso to the owner, ${hash} status ${receipt.status}`);
}

// 4. Approve the margin bank and deposit.
const ownerUsdso = await client.readContract({
  address: USDSO,
  abi: erc20Abi,
  functionName: "balanceOf",
  args: [owner.address],
});
console.log(`owner holds ${formatUnits(ownerUsdso, 18)} USDso`);

if (ownerUsdso > 0n) {
  await ownerClient.writeContract({
    address: USDSO,
    abi: erc20Abi,
    functionName: "approve",
    args: [MARGIN_BANK, ownerUsdso],
    gas: 200_000n,
  });
  const hash = await ownerClient.writeContract({
    address: MARGIN_BANK,
    abi: marginAbi,
    functionName: "deposit",
    args: [ownerUsdso],
    gas: 500_000n,
  });
  const receipt = await client.waitForTransactionReceipt({ hash });
  console.log(`deposited ${formatUnits(ownerUsdso, 18)} USDso as margin, ${hash} status ${receipt.status}`);
}

const equity = await client.readContract({
  address: MARGIN_BANK,
  abi: marginAbi,
  functionName: "getAccountEquity",
  args: [owner.address],
});
console.log(`equity ${formatUnits(equity, 18)} USDso`);

writeFileSync(
  join(root, "collateral.json"),
  `${JSON.stringify({ usdso: ownerUsdso.toString(), equity: equity.toString() }, null, 2)}\n`,
  "utf8",
);



