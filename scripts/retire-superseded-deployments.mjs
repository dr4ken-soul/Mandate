/** Revoke test deployments whose live checks exposed integration bugs. */

import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { createPublicClient, createWalletClient, http, parseAbi } from "viem";
import { privateKeyToAccount } from "viem/accounts";

const root = join(import.meta.dirname, "..");
const env = new Map();
for (const line of readFileSync(join(root, ".env"), "utf8").split(/\r?\n/)) {
  const match = /^\s*([A-Z0-9_]+)\s*=\s*(.*)$/.exec(line);
  if (match) env.set(match[1], match[2].trim());
}

const rpc = env.get("NEXT_PUBLIC_RPC_URL");
const owner = privateKeyToAccount(env.get("DEPLOYER_PRIVATE_KEY"));
const executorAddress = privateKeyToAccount(env.get("EXECUTOR_PRIVATE_KEY")).address.toLowerCase();
const current = env.get("NEXT_PUBLIC_MANDATE_ADDRESS").toLowerCase();
const registry = env.get("NEXT_PUBLIC_OPERATOR_REGISTRY_ADDRESS");
const pool = env.get("NEXT_PUBLIC_BTC_POOL_ADDRESS");
const candidates = process.argv.slice(2).map((address) => address.toLowerCase());
if (candidates.length === 0 || candidates.includes(current)) throw new Error("pass only superseded mandate addresses");

const client = createPublicClient({ transport: http(rpc, { timeout: 120_000, retryCount: 2 }) });
const wallet = createWalletClient({ account: owner, transport: http(rpc, { timeout: 120_000 }) });
if (await client.getChainId() !== 50383) throw new Error("refusing cleanup outside Hideki testnet 50383");

const selectors = ["0x80054449", "0xcfc06bf4", "0x1c42d50e", "0xdbb4feb9", "0x3f9ded40"];
const mandateAbi = parseAbi([
  "function getMandate(address owner) view returns (uint8 status, address executor, bytes32 policyHash, uint64 expiresAt, uint32 maxLeverageBps, uint128 maxNotionalPerMarket, uint128 maxNotionalTotal, uint128 maxLossPerWindow, uint128 epochStartEquity, uint128 totalNotional, int256 equity)",
  "function revoke()",
]);
const registryAbi = parseAbi([
  "function setOperatorApprovalGlobal(address operator, bytes4[] selectors, bool approved)",
  "function setOperatorApprovalForPool(address pool, address operator, bytes4[] selectors, bool approved)",
  "function isGloballyApproved(address owner, address operator, bytes4 selector) view returns (bool)",
]);
const poolAbi = parseAbi([
  "function isOperatorAuthorized(address owner, address operator, bytes4 selector) view returns (bool)",
]);

async function send(request, label) {
  const hash = await wallet.writeContract(request);
  const receipt = await client.waitForTransactionReceipt({ hash });
  if (receipt.status !== "success") throw new Error(`${label} reverted: ${hash}`);
  console.log(`${label}: ${hash}`);
  return hash;
}

const records = [];
for (const address of candidates) {
  const state = await client.readContract({
    address,
    abi: mandateAbi,
    functionName: "getMandate",
    args: [owner.address],
  });
  if (state[1].toLowerCase() !== executorAddress) throw new Error(`unexpected executor for ${address}`);
  const actions = { address, priorStatus: state[0], revokeTx: null, poolGrantTx: null, globalGrantTx: null };
  if (state[0] === 1) {
    actions.revokeTx = await send({
      address,
      abi: mandateAbi,
      functionName: "revoke",
      gas: 500_000n,
    }, "mandate revoked");
  }

  const poolAuthorized = await client.readContract({
    address: pool,
    abi: poolAbi,
    functionName: "isOperatorAuthorized",
    args: [owner.address, address, "0x80054449"],
  });
  if (poolAuthorized) {
    actions.poolGrantTx = await send({
      address: registry,
      abi: registryAbi,
      functionName: "setOperatorApprovalForPool",
      args: [pool, address, selectors, false],
      gas: 2_000_000n,
    }, "per pool grant revoked");
  }

  const globallyAuthorized = await client.readContract({
    address: registry,
    abi: registryAbi,
    functionName: "isGloballyApproved",
    args: [owner.address, address, "0x80054449"],
  });
  if (globallyAuthorized) {
    actions.globalGrantTx = await send({
      address: registry,
      abi: registryAbi,
      functionName: "setOperatorApprovalGlobal",
      args: [address, selectors, false],
      gas: 2_000_000n,
    }, "global grant revoked");
  }

  const [finalState, finalPoolGrant, finalGlobalGrant] = await Promise.all([
    client.readContract({ address, abi: mandateAbi, functionName: "getMandate", args: [owner.address] }),
    client.readContract({ address: pool, abi: poolAbi, functionName: "isOperatorAuthorized", args: [owner.address, address, "0x80054449"] }),
    client.readContract({ address: registry, abi: registryAbi, functionName: "isGloballyApproved", args: [owner.address, address, "0x80054449"] }),
  ]);
  actions.finalStatus = finalState[0];
  actions.poolAuthorized = finalPoolGrant;
  actions.globallyAuthorized = finalGlobalGrant;
  if (finalState[0] === 1 || finalPoolGrant || finalGlobalGrant) throw new Error(`failed to fully retire ${address}`);
  records.push(actions);
}

writeFileSync(join(root, "retired-deployments.json"), `${JSON.stringify({ chainId: 50383, records }, null, 2)}\n`, "utf8");
console.log(JSON.stringify(records, null, 2));
