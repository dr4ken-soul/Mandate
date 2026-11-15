/** Verify every live receipt referenced by the deployment and funding reports. */

import { readFileSync } from "node:fs";
import {
  createPublicClient,
  decodeFunctionData,
  http,
  parseAbi,
  parseEventLogs,
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

function findRevertData(error, depth = 0) {
  if (!error || depth > 6 || typeof error !== "object") return null;
  for (const key of ["data", "raw", "revertData"]) {
    const value = error[key];
    if (typeof value === "string" && /^0x[0-9a-fA-F]{8,}$/.test(value)) return value;
  }
  for (const key of ["cause", "error", "details"]) {
    const found = findRevertData(error[key], depth + 1);
    if (found) return found;
  }
  return null;
}

const root = new URL("../", import.meta.url);
const env = readEnv(new URL(".env", root));
const deployment = JSON.parse(readFileSync(new URL("deployment.json", root), "utf8"));
const spotEvidence = JSON.parse(readFileSync(new URL("spot-fill.json", root), "utf8"));
const bridgeEvidence = JSON.parse(readFileSync(new URL("bridge-funding.json", root), "utf8"));
const collateralEvidence = JSON.parse(readFileSync(new URL("collateral.json", root), "utf8"));
const retiredEvidence = JSON.parse(readFileSync(new URL("retired-deployments.json", root), "utf8"));
const client = createPublicClient({ transport: http(env.get("NEXT_PUBLIC_RPC_URL"), { timeout: 120_000, retryCount: 2 }) });
const shannon = createPublicClient({ transport: http("https://api.infra.testnet.somnia.network", { timeout: 120_000, retryCount: 2 }) });
const executor = privateKeyToAccount(env.get("EXECUTOR_PRIVATE_KEY"));
const owner = privateKeyToAccount(env.get("DEPLOYER_PRIVATE_KEY"));
const mandate = deployment.mandate;
const marginBank = env.get("NEXT_PUBLIC_MARGIN_BANK_ADDRESS");
const usdso = env.get("NEXT_PUBLIC_USDSO_ADDRESS");

const mandateAbi = parseAbi([
  "function admit((address owner, address market, bool isBid, uint256 price, uint256 quantity, bool reduceOnly, bool armsStop, uint64 expireTimestampNs, uint8 orderType) request) payable returns (bool success, uint128 orderId)",
  "function previewAdmit((address owner, address market, bool isBid, uint256 price, uint256 quantity, bool reduceOnly, bool armsStop, uint64 expireTimestampNs, uint8 orderType) request) view returns (uint8 code, uint128 compared, uint128 limit, uint8 clause)",
  "function getMandate(address owner) view returns (uint8 status, address executor, bytes32 policyHash, uint64 expiresAt, uint32 maxLeverageBps, uint128 maxNotionalPerMarket, uint128 maxNotionalTotal, uint128 maxLossPerWindow, uint128 epochStartEquity, uint128 totalNotional, int256 equity)",
  "event Decision(address indexed owner, bool admitted, uint8 code, bytes32 indexed policyHash, address indexed market, uint128 compared, uint128 limit, uint8 clause, bytes32 txRef)",
]);
const poolAbi = parseAbi([
  "function isOperatorAuthorized(address owner, address operator, bytes4 selector) view returns (bool)",
  "event OrderFilled(uint128 indexed takerOrderId, uint128 indexed makerOrderId, uint256 quantityFilled, uint256 takerRemainingQuantity, uint256 makerRemainingQuantity, uint256 fillPrice)",
]);
const tokenAbi = parseAbi(["function balanceOf(address account) view returns (uint256)"]);
const marginAbi = parseAbi([
  "function getAccountEquity(address account) view returns (int256)",
  "function getCreditFloor(address account) view returns (uint256)",
]);

const [deploymentReceipt, registrationReceipt, allowedTx, allowedReceipt, refusalTx, refusalReceipt, recordReceipt] = await Promise.all([
  client.getTransactionReceipt({ hash: deployment.deploymentTx }),
  client.getTransactionReceipt({ hash: deployment.registration }),
  client.getTransaction({ hash: deployment.allowedOrder.tx }),
  client.getTransactionReceipt({ hash: deployment.allowedOrder.tx }),
  client.getTransaction({ hash: deployment.refusedOrder.tx }),
  client.getTransactionReceipt({ hash: deployment.refusedOrder.tx }),
  client.getTransactionReceipt({ hash: deployment.refusedOrder.recorded }),
]);
const allowedRequest = decodeFunctionData({ abi: mandateAbi, data: allowedTx.input }).args[0];
const refusedRequest = decodeFunctionData({ abi: mandateAbi, data: refusalTx.input }).args[0];
const allowedDecisionLogs = parseEventLogs({ abi: mandateAbi, logs: allowedReceipt.logs, eventName: "Decision", strict: false });
const refusedDecisionLogs = parseEventLogs({ abi: mandateAbi, logs: recordReceipt.logs, eventName: "Decision", strict: false });
const perpFills = parseEventLogs({ abi: poolAbi, logs: allowedReceipt.logs, eventName: "OrderFilled", strict: false });
const filledQuantity = perpFills.reduce((total, event) => total + event.args.quantityFilled, 0n);
const preview = await client.readContract({
  address: mandate,
  abi: mandateAbi,
  functionName: "previewAdmit",
  args: [refusedRequest],
  account: executor.address,
});
let rawRevert = null;
try {
  await client.call({ to: mandate, data: refusalTx.input, account: refusalTx.from });
} catch (error) {
  rawRevert = findRevertData(error);
}

const mandateState = await client.readContract({ address: mandate, abi: mandateAbi, functionName: "getMandate", args: [owner.address] });
const poolAuthorized = await client.readContract({
  address: deployment.market.pool,
  abi: poolAbi,
  functionName: "isOperatorAuthorized",
  args: [owner.address, mandate, "0x80054449"],
});
const [ownerEquity, ownerCreditFloor, ownerWalletUSDso] = await Promise.all([
  client.readContract({ address: marginBank, abi: marginAbi, functionName: "getAccountEquity", args: [owner.address] }),
  client.readContract({ address: marginBank, abi: marginAbi, functionName: "getCreditFloor", args: [owner.address] }),
  client.readContract({ address: usdso, abi: tokenAbi, functionName: "balanceOf", args: [owner.address] }),
]);

const [spotReceipt, mintReceipt, bridgeApprovalReceipt, bridgeReceipt, depositReceipt] = await Promise.all([
  client.getTransactionReceipt({ hash: spotEvidence.tx }),
  shannon.getTransactionReceipt({ hash: bridgeEvidence.mintTx }),
  shannon.getTransactionReceipt({ hash: bridgeEvidence.approveTx }),
  shannon.getTransactionReceipt({ hash: bridgeEvidence.bridgeTx }),
  client.getTransactionReceipt({ hash: collateralEvidence.depositTx }),
]);
const spotFills = parseEventLogs({ abi: poolAbi, logs: spotReceipt.logs, eventName: "OrderFilled", strict: false });

const retired = await Promise.all(retiredEvidence.records.map(async (entry) => {
  const authorized = await client.readContract({
    address: deployment.market.pool,
    abi: poolAbi,
    functionName: "isOperatorAuthorized",
    args: [owner.address, entry.address, "0x80054449"],
  });
  return { address: entry.address, status: entry.finalStatus, poolAuthorized: authorized };
}));

if (await client.getChainId() !== 50383 || await shannon.getChainId() !== 50312) throw new Error("chain IDs do not match the recorded funding route");
if (deploymentReceipt.status !== "success" || registrationReceipt.status !== "success") throw new Error("deployment or registration receipt failed");
if (!await client.getCode({ address: mandate })) throw new Error("the mandate contract has no deployed code");
if (!poolAuthorized || mandateState[2] !== deployment.policyHash) throw new Error("the current mandate or operator grant does not match deployment.json");
if (allowedReceipt.status !== "success" || filledQuantity === 0n || filledQuantity.toString() !== deployment.allowedOrder.filledQuantity) throw new Error("the policy-allowed perp order did not fill as recorded");
if (!allowedDecisionLogs.some((event) => event.args.admitted === true)) throw new Error("the allowed order has no admitted Decision log");
if (refusalReceipt.status !== "reverted" || preview[0] !== 0x08 || rawRevert?.slice(0, 10) !== "0x47a56227") throw new Error("the refused order does not reproduce EMarketNotionalCap(0x08)");
if (recordReceipt.status !== "success" || !refusedDecisionLogs.some((event) => event.args.admitted === false && event.args.code === 0x08 && event.args.clause === 3 && event.args.txRef === deployment.refusedOrder.tx)) throw new Error("the on-chain refusal record does not match the refused transaction");
if (spotReceipt.status !== "success" || spotFills.length === 0) throw new Error("the recorded STT/USDso order did not fill");
if (!bridgeEvidence.delivered || [mintReceipt, bridgeApprovalReceipt, bridgeReceipt, depositReceipt].some((receipt) => receipt.status !== "success")) throw new Error("the test USDso bridge/deposit receipts are incomplete");
if (ownerEquity <= 0n || ownerCreditFloor !== 0n || ownerWalletUSDso !== 0n) throw new Error("the owner collateral state is not the expected ordinary funded account");
if (retired.some((entry) => entry.status === 1 || entry.poolAuthorized)) throw new Error("a superseded contract still has active authority");

console.log(JSON.stringify({
  chainIds: { shannon: await shannon.getChainId(), hideki: await client.getChainId() },
  mandate: {
    deploymentTx: deployment.deploymentTx,
    registrationTx: deployment.registration,
    address: mandate,
    codePresent: true,
    operatorAuthorized: poolAuthorized,
    policyHash: mandateState[2],
    currentOwnerEquity: ownerEquity.toString(),
    ownerCreditFloor: ownerCreditFloor.toString(),
  },
  allowedPerpOrder: {
    tx: deployment.allowedOrder.tx,
    status: allowedReceipt.status,
    requestedQuantity: allowedRequest.quantity.toString(),
    filledQuantity: filledQuantity.toString(),
    fillPrices: perpFills.map((event) => event.args.fillPrice.toString()),
    admittedDecisionCount: allowedDecisionLogs.filter((event) => event.args.admitted).length,
  },
  refusedOrder: {
    tx: deployment.refusedOrder.tx,
    status: refusalReceipt.status,
    selector: rawRevert.slice(0, 10),
    previewCode: preview[0],
    recordTx: deployment.refusedOrder.recorded,
    recordStatus: recordReceipt.status,
  },
  shannonUSDsoFunding: {
    mintTx: bridgeEvidence.mintTx,
    mintStatus: mintReceipt.status,
    bridgeTx: bridgeEvidence.bridgeTx,
    bridgeStatus: bridgeReceipt.status,
    delivered100USDso: bridgeEvidence.delivered,
    depositTx: collateralEvidence.depositTx,
    depositStatus: depositReceipt.status,
    marginEquityNow: ownerEquity.toString(),
  },
  spotFill: {
    tx: spotEvidence.tx,
    status: spotReceipt.status,
    fills: spotFills.map((event) => ({ quantity: event.args.quantityFilled.toString(), price: event.args.fillPrice.toString() })),
  },
  retiredDeployments: retired,
}, null, 2));
