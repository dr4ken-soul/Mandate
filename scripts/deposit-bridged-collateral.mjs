/** Deposit already-bridged testnet USDso as BTC-PERP margin on Hideki. */

import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { createPublicClient, createWalletClient, formatUnits, http, parseAbi } from "viem";
import { privateKeyToAccount } from "viem/accounts";

const root = join(import.meta.dirname, "..");
const values = new Map();
for (const line of readFileSync(join(root, ".env"), "utf8").split(/\r?\n/)) {
  const match = /^\s*([A-Z0-9_]+)\s*=\s*(.*)$/.exec(line);
  if (match) values.set(match[1], match[2].trim());
}

const rpc = values.get("NEXT_PUBLIC_RPC_URL");
const owner = privateKeyToAccount(values.get("DEPLOYER_PRIVATE_KEY"));
const token = values.get("NEXT_PUBLIC_USDSO_ADDRESS");
const bank = values.get("NEXT_PUBLIC_MARGIN_BANK_ADDRESS");
const client = createPublicClient({ transport: http(rpc, { timeout: 120_000, retryCount: 2 }) });
const wallet = createWalletClient({ account: owner, transport: http(rpc, { timeout: 120_000 }) });
const tokenAbi = parseAbi([
  "function balanceOf(address account) view returns (uint256)",
  "function allowance(address owner, address spender) view returns (uint256)",
  "function approve(address spender, uint256 amount) returns (bool)",
]);
const bankAbi = parseAbi([
  "function deposit(uint256 amount)",
  "function getAccountEquity(address account) view returns (int256)",
]);

if (await client.getChainId() !== 50383) throw new Error("refusing to deposit outside Hideki testnet 50383");
const amount = await client.readContract({ address: token, abi: tokenAbi, functionName: "balanceOf", args: [owner.address] });
if (amount === 0n) throw new Error("owner has no USDso to deposit");

let approvalTx = null;
const allowance = await client.readContract({
  address: token,
  abi: tokenAbi,
  functionName: "allowance",
  args: [owner.address, bank],
});
if (allowance < amount) {
  const approval = await client.simulateContract({
    address: token, abi: tokenAbi, functionName: "approve", args: [bank, amount], account: owner,
  });
  const approvalGas = approval.request.gas ?? await client.estimateContractGas({
    address: token, abi: tokenAbi, functionName: "approve", args: [bank, amount], account: owner.address,
  });
  approvalTx = await wallet.writeContract({ ...approval.request, gas: approvalGas * 2n });
  const receipt = await client.waitForTransactionReceipt({ hash: approvalTx });
  if (receipt.status !== "success") throw new Error(`USDso approval reverted: ${approvalTx}`);
}

const deposit = await client.simulateContract({
  address: bank, abi: bankAbi, functionName: "deposit", args: [amount], account: owner,
});
const depositGas = deposit.request.gas ?? await client.estimateContractGas({
  address: bank, abi: bankAbi, functionName: "deposit", args: [amount], account: owner.address,
});
const depositTx = await wallet.writeContract({ ...deposit.request, gas: depositGas * 2n });
const depositReceipt = await client.waitForTransactionReceipt({ hash: depositTx });
if (depositReceipt.status !== "success") throw new Error(`margin deposit reverted: ${depositTx}`);

const [equity, remainingToken] = await Promise.all([
  client.readContract({ address: bank, abi: bankAbi, functionName: "getAccountEquity", args: [owner.address] }),
  client.readContract({ address: token, abi: tokenAbi, functionName: "balanceOf", args: [owner.address] }),
]);
const record = {
  chainId: 50383,
  owner: owner.address,
  amount: amount.toString(),
  approvalTx,
  depositTx,
  depositBlock: depositReceipt.blockNumber.toString(),
  equity: equity.toString(),
  remainingToken: remainingToken.toString(),
};
writeFileSync(join(root, "collateral.json"), `${JSON.stringify(record, null, 2)}\n`, "utf8");
console.log(JSON.stringify({
  ...record,
  amount: formatUnits(amount, 18),
  equity: formatUnits(equity, 18),
  remainingToken: formatUnits(remainingToken, 18),
  gasUsed: depositReceipt.gasUsed.toString(),
}, null, 2));
if (equity <= 0n) throw new Error("margin bank reports no funded equity after deposit");
