/**
 * Mint public Shannon test USDso, bridge it to the mandate owner on Hideki,
 * and verify delivery before returning. The test token has no real value.
 *
 *   node scripts/bridge-shannon-usdso.mjs [amount]
 */

import { readFileSync, writeFileSync } from "node:fs";
import {
  createPublicClient,
  createWalletClient,
  formatUnits,
  getAddress,
  http,
  padHex,
  parseAbi,
  parseUnits,
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
const owner = privateKeyToAccount(env.get("DEPLOYER_PRIVATE_KEY"));
const shannonRpc = "https://api.infra.testnet.somnia.network";
const hidekiRpc = env.get("NEXT_PUBLIC_RPC_URL");
const shannonUsdso = getAddress("0x9c32F3827A1A99F0CF9B213DE8B53EC3D57BB171");
const shannonRouter = getAddress("0x94E2E7F4B2B0A8E3032C7D3FF3C86790BB5979E6");
const amount = parseUnits(process.argv[2] ?? "100", 18);
const shannon = createPublicClient({ transport: http(shannonRpc, { timeout: 120_000, retryCount: 2 }) });
const hideki = createPublicClient({ transport: http(hidekiRpc, { timeout: 120_000, retryCount: 2 }) });
if (await shannon.getChainId() !== 50312 || await hideki.getChainId() !== 50383) {
  throw new Error("RPC chain ids do not match Shannon 50312 and Hideki 50383");
}

const shannonWallet = createWalletClient({ account: owner, transport: http(shannonRpc, { timeout: 120_000 }) });
const tokenAbi = parseAbi([
  "function balanceOf(address account) view returns (uint256)",
  "function allowance(address owner, address spender) view returns (uint256)",
  "function mint(address to, uint256 amount)",
  "function approve(address spender, uint256 amount) returns (bool)",
]);
const routerAbi = parseAbi([
  "function quoteGasPayment(uint32 destination) view returns (uint256)",
  "function transferRemote(uint32 destination, bytes32 recipient, uint256 amount) payable returns (bytes32 messageId)",
]);
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const destination = 50383;
const recipient = padHex(owner.address, { size: 32 });
const [initialSourceBalance, initialDestinationBalance, initialNative, gasQuote] = await Promise.all([
  shannon.readContract({ address: shannonUsdso, abi: tokenAbi, functionName: "balanceOf", args: [owner.address] }),
  hideki.readContract({ address: env.get("NEXT_PUBLIC_USDSO_ADDRESS"), abi: tokenAbi, functionName: "balanceOf", args: [owner.address] }),
  shannon.getBalance({ address: owner.address }),
  shannon.readContract({ address: shannonRouter, abi: routerAbi, functionName: "quoteGasPayment", args: [destination] }),
]);
if (initialNative < 10n ** 16n) throw new Error("Shannon STT balance is too low to safely pay bridge gas");

const mintHash = await shannonWallet.writeContract({
  address: shannonUsdso,
  abi: tokenAbi,
  functionName: "mint",
  args: [owner.address, amount],
  // The canonical USDso mint estimates at roughly 1.4m gas on Shannon.
  gas: 2_000_000n,
});
const mintReceipt = await shannon.waitForTransactionReceipt({ hash: mintHash });
if (mintReceipt.status !== "success") throw new Error("Shannon test USDso mint reverted: " + mintHash);
const sourceBalance = await shannon.readContract({
  address: shannonUsdso,
  abi: tokenAbi,
  functionName: "balanceOf",
  args: [owner.address],
});
if (sourceBalance < initialSourceBalance + amount) throw new Error("mint transaction did not credit the requested test USDso");

const approveHash = await shannonWallet.writeContract({
  address: shannonUsdso,
  abi: tokenAbi,
  functionName: "approve",
  args: [shannonRouter, amount],
  gas: 2_000_000n,
});
const approveReceipt = await shannon.waitForTransactionReceipt({ hash: approveHash });
if (approveReceipt.status !== "success") throw new Error("bridge allowance transaction reverted: " + approveHash);
const approved = await shannon.readContract({
  address: shannonUsdso,
  abi: tokenAbi,
  functionName: "allowance",
  args: [owner.address, shannonRouter],
});
if (approved < amount) throw new Error("bridge allowance is below the transfer amount");

const transferRequest = {
  address: shannonRouter,
  abi: routerAbi,
  functionName: "transferRemote",
  args: [destination, recipient, amount],
  value: gasQuote,
  gas: 2_000_000n,
};
await shannon.simulateContract({ ...transferRequest, account: owner });
const bridgeHash = await shannonWallet.writeContract(transferRequest);
const bridgeReceipt = await shannon.waitForTransactionReceipt({ hash: bridgeHash });
if (bridgeReceipt.status !== "success") throw new Error("Shannon to Hideki bridge transfer reverted: " + bridgeHash);

let destinationBalance = initialDestinationBalance;
for (let attempt = 0; attempt < 60 && destinationBalance < initialDestinationBalance + amount; attempt += 1) {
  await wait(2_000);
  destinationBalance = await hideki.readContract({
    address: env.get("NEXT_PUBLIC_USDSO_ADDRESS"),
    abi: tokenAbi,
    functionName: "balanceOf",
    args: [owner.address],
  });
}

const record = {
  sourceChainId: 50312,
  destinationChainId: 50383,
  owner: owner.address,
  amount: amount.toString(),
  sourceInitial: initialSourceBalance.toString(),
  sourceBalanceAfterMint: sourceBalance.toString(),
  destinationInitial: initialDestinationBalance.toString(),
  destinationBalance: destinationBalance.toString(),
  delivered: destinationBalance >= initialDestinationBalance + amount,
  mintTx: mintHash,
  mintBlock: mintReceipt.blockNumber.toString(),
  approveTx: approveHash,
  bridgeTx: bridgeHash,
  bridgeBlock: bridgeReceipt.blockNumber.toString(),
  bridgeMessageId: null,
  bridgeGasQuote: gasQuote.toString(),
};
writeFileSync(new URL("../bridge-funding.json", import.meta.url), JSON.stringify(record, null, 2) + "\n", "utf8");
console.log(JSON.stringify({
  ...record,
  amount: formatUnits(amount, 18),
  sourceBalanceAfterMint: formatUnits(sourceBalance, 18),
  destinationBalance: formatUnits(destinationBalance, 18),
  nativeSTTBefore: formatUnits(initialNative, 18),
}, null, 2));
if (!record.delivered) throw new Error("bridge transfer is confirmed on Shannon but not yet delivered to Hideki");
