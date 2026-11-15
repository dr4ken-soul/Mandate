/** Claim eligible testnet perp credit for the mandate owner.
 *
 *   node scripts/claim-voucher.mjs
 */

import { readFileSync } from "node:fs";
import {
  createPublicClient,
  createWalletClient,
  formatUnits,
  http,
  parseAbi,
} from "viem";
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
const owner = privateKeyToAccount(env.get("DEPLOYER_PRIVATE_KEY"));
const client = createPublicClient({ transport: http(rpc, { timeout: 120_000, retryCount: 2 }) });
const wallet = createWalletClient({ account: owner, transport: http(rpc, { timeout: 120_000 }) });
const bank = env.get("NEXT_PUBLIC_MARGIN_BANK_ADDRESS");
const distributor = env.get("NEXT_PUBLIC_VOUCHER_DISTRIBUTOR_ADDRESS");
const token = env.get("NEXT_PUBLIC_USDSO_ADDRESS");

const bankAbi = parseAbi([
  "function getCreditGranter() view returns (address)",
  "function getActivePerpPools(address account) view returns (address[])",
  "function getMainFundedPrincipal(address account) view returns (uint256)",
  "function getAccountEquity(address account) view returns (int256)",
]);
const voucherAbi = parseAbi([
  "function getConfig() view returns ((address marginBank, address collateralToken, uint256 grantAmount, uint64 expiryDuration, uint64 campaignStart, uint64 campaignEnd))",
  "function budgetRemaining() view returns (uint256)",
  "function isClaimed(address claimant) view returns (bool)",
  "function claim()",
]);
const tokenAbi = parseAbi(["function balanceOf(address account) view returns (uint256)"]);

const [creditGranter, config, budget, claimed, activePools, mainFunded, block] = await Promise.all([
  client.readContract({ address: bank, abi: bankAbi, functionName: "getCreditGranter" }),
  client.readContract({ address: distributor, abi: voucherAbi, functionName: "getConfig" }),
  client.readContract({ address: distributor, abi: voucherAbi, functionName: "budgetRemaining" }),
  client.readContract({ address: distributor, abi: voucherAbi, functionName: "isClaimed", args: [owner.address] }),
  client.readContract({ address: bank, abi: bankAbi, functionName: "getActivePerpPools", args: [owner.address] }),
  client.readContract({ address: bank, abi: bankAbi, functionName: "getMainFundedPrincipal", args: [owner.address] }),
  client.getBlock({ blockTag: "latest" }),
]);

const campaignStart = config.campaignStart ?? config[4];
const campaignEnd = config.campaignEnd ?? config[5];
const grantAmount = config.grantAmount ?? config[2];
let reason = null;
if (creditGranter.toLowerCase() !== distributor.toLowerCase()) reason = "bank credit granter does not match configured distributor";
else if (block.timestamp < campaignStart || block.timestamp >= campaignEnd) reason = "campaign is inactive";
else if (activePools.length > 0) reason = "owner has an active perp pool";
else if (mainFunded > 0n) reason = "owner has linked main-wallet principal";
else if (claimed) reason = "owner already claimed";
else if (budget < grantAmount) reason = "campaign budget is below one grant";
if (reason) throw new Error("voucher claim skipped: " + reason);

await client.simulateContract({
  address: distributor,
  abi: voucherAbi,
  functionName: "claim",
  account: owner,
});
const hash = await wallet.writeContract({
  address: distributor,
  abi: voucherAbi,
  functionName: "claim",
  gas: 1_000_000n,
});
const receipt = await client.waitForTransactionReceipt({ hash });
if (receipt.status !== "success") throw new Error("voucher claim reverted: " + hash);

const [afterClaimed, tokenBalance, equity] = await Promise.all([
  client.readContract({ address: distributor, abi: voucherAbi, functionName: "isClaimed", args: [owner.address] }),
  client.readContract({ address: token, abi: tokenAbi, functionName: "balanceOf", args: [owner.address] }),
  client.readContract({ address: bank, abi: bankAbi, functionName: "getAccountEquity", args: [owner.address] }),
]);
if (!afterClaimed || tokenBalance < grantAmount) {
  throw new Error("claim transaction succeeded but the credited balance did not match the grant: " + hash);
}

console.log("voucher claimed", hash);
console.log("owner", owner.address);
console.log("grant USDso", formatUnits(grantAmount, 18));
console.log("owner USDso", formatUnits(tokenBalance, 18));
console.log("account equity", formatUnits(equity, 18));
