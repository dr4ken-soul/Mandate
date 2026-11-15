/**
 * Show testnet balances and voucher eligibility without printing private keys.
 *
 *   node scripts/funding-status.mjs
 */

import { readFileSync } from "node:fs";
import { createPublicClient, http, parseAbi, formatUnits } from "viem";
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
const client = createPublicClient({ transport: http(env.get("NEXT_PUBLIC_RPC_URL")) });
const owner = privateKeyToAccount(env.get("DEPLOYER_PRIVATE_KEY")).address;
const executor = privateKeyToAccount(env.get("EXECUTOR_PRIVATE_KEY")).address;
const faucetKeys = JSON.parse(readFileSync(new URL("../faucet-keys.json", import.meta.url), "utf8"));
const usdso = env.get("NEXT_PUBLIC_USDSO_ADDRESS");
const marginBank = env.get("NEXT_PUBLIC_MARGIN_BANK_ADDRESS");
const distributor = env.get("NEXT_PUBLIC_VOUCHER_DISTRIBUTOR_ADDRESS");

const tokenAbi = parseAbi(["function balanceOf(address account) view returns (uint256)"]);
const bankAbi = parseAbi([
  "function getCreditGranter() view returns (address)",
  "function getActivePerpPools(address account) view returns (address[])",
  "function getMainFundedPrincipal(address account) view returns (uint256)",
]);
const voucherAbi = parseAbi([
  "function getConfig() view returns ((address marginBank, address collateralToken, uint256 grantAmount, uint64 expiryDuration, uint64 campaignStart, uint64 campaignEnd))",
  "function budgetRemaining() view returns (uint256)",
  "function isClaimed(address claimant) view returns (bool)",
]);

const [chainId, block, creditGranter, budget, config] = await Promise.all([
  client.getChainId(),
  client.getBlock({ blockTag: "latest" }),
  client.readContract({ address: marginBank, abi: bankAbi, functionName: "getCreditGranter" }),
  client.readContract({ address: distributor, abi: voucherAbi, functionName: "budgetRemaining" }),
  client.readContract({ address: distributor, abi: voucherAbi, functionName: "getConfig" }),
]);
const configGrantAmount = config.grantAmount ?? config[2];
const configCampaignStart = config.campaignStart ?? config[4];
const configCampaignEnd = config.campaignEnd ?? config[5];

const accounts = [
  { label: "owner", address: owner },
  { label: "executor", address: executor },
  ...faucetKeys.map((entry, index) => ({
    label: "faucet-" + (index + 1),
    address: privateKeyToAccount(entry.key).address,
  })),
];

const rows = await Promise.all(accounts.map(async ({ label, address }) => {
  const [native, stable, claimed, activePools, mainFunded] = await Promise.all([
    client.getBalance({ address }),
    client.readContract({ address: usdso, abi: tokenAbi, functionName: "balanceOf", args: [address] }),
    client.readContract({ address: distributor, abi: voucherAbi, functionName: "isClaimed", args: [address] }),
    client.readContract({ address: marginBank, abi: bankAbi, functionName: "getActivePerpPools", args: [address] }),
    client.readContract({ address: marginBank, abi: bankAbi, functionName: "getMainFundedPrincipal", args: [address] }),
  ]);

  let eligibility = "eligible";
  if (creditGranter === "0x0000000000000000000000000000000000000000") eligibility = "dormant";
  else if (block.timestamp < configCampaignStart) eligibility = "notStarted";
  else if (block.timestamp >= configCampaignEnd) eligibility = "ended";
  else if (activePools.length > 0) eligibility = "notFlat";
  else if (mainFunded > 0n) eligibility = "mainFunded";
  else if (claimed) eligibility = "alreadyClaimed";
  else if (budget < configGrantAmount) eligibility = "budgetExhausted";

  return {
    label,
    address,
    nativeSTT: formatUnits(native, 18),
    usdso: formatUnits(stable, 18),
    voucher: eligibility,
    claimed,
  };
}));

console.log(JSON.stringify({
  chainId,
  block: block.number?.toString(),
  timestamp: block.timestamp.toString(),
  distributor,
  creditGranter,
  grantAmountUSDso: formatUnits(configGrantAmount, 18),
  campaignEnd: configCampaignEnd.toString(),
  budgetUSDso: formatUnits(budget, 18),
  accounts: rows,
}, null, 2));
