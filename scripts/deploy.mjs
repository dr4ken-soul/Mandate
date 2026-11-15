/**
 * Deploy the policy contract, register a mandate, and produce the two
 * transactions the README quotes: one order the mandate allows and one it
 * refuses.
 *
 *   node scripts/deploy.mjs
 *
 * Every value it writes comes from the chain: the market, its grid, its mark
 * price and the equity of the wallet. Nothing is typed by hand.
 */

import { existsSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import {
  createPublicClient,
  createWalletClient,
  http,
  parseAbi,
  parseUnits,
  formatUnits,
  parseEventLogs,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";

const root = join(import.meta.dirname, "..");

/**
 * Build the contracts first, so the deployed bytecode is always the bytecode
 * that is in the repository. A stale artifact is how a deployment ends up
 * running code that is not the code under review.
 */
function buildContracts() {
  const forge = process.env.FORGE_PATH ?? "forge";
  // The build cache and the artifacts are removed first. A stale cache is how a
  // deployment ends up running code that is not the code under review.
  rmSync(join(root, "contracts", "cache"), { recursive: true, force: true });
  rmSync(join(root, "contracts", "out"), { recursive: true, force: true });
  const result = spawnSync(forge, ["build"], {
    cwd: join(root, "contracts"),
    encoding: "utf8",
    env: process.env,
  });
  if (result.status !== 0) {
    console.error(result.stdout ?? "");
    console.error(result.stderr ?? "");
    throw new Error("forge build failed");
  }
}

buildContracts();

function readEnv(path) {
  const values = new Map();
  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    const match = /^\s*([A-Z0-9_]+)\s*=\s*(.*)$/.exec(line);
    if (match) values.set(match[1], match[2].trim());
  }
  return values;
}

const env = readEnv(join(root, ".env"));
const required = (name) => {
  const value = env.get(name);
  if (!value) throw new Error(`${name} is not set`);
  return value;
};

const RPC = required("NEXT_PUBLIC_RPC_URL");
const CHAIN_ID = Number(required("NEXT_PUBLIC_CHAIN_ID"));
const MARGIN_BANK = required("NEXT_PUBLIC_MARGIN_BANK_ADDRESS");
const POOL_FACTORY = required("NEXT_PUBLIC_PERP_POOL_FACTORY_ADDRESS");
const OPERATOR_REGISTRY = required("NEXT_PUBLIC_OPERATOR_REGISTRY_ADDRESS");
const BTC_POOL = required("NEXT_PUBLIC_BTC_POOL_ADDRESS");
const VOUCHER = required("NEXT_PUBLIC_VOUCHER_DISTRIBUTOR_ADDRESS");

const deployer = privateKeyToAccount(required("DEPLOYER_PRIVATE_KEY"));
const executor = privateKeyToAccount(required("EXECUTOR_PRIVATE_KEY"));

const artifact = JSON.parse(
  readFileSync(join(root, "contracts", "out", "Mandate.sol", "Mandate.json"), "utf8"),
);
const mandateAbi = artifact.abi;

const transport = http(RPC, { timeout: 600_000, retryCount: 3 });
const publicClient = createPublicClient({ transport });
const latestBlock = await publicClient.getBlock({ blockTag: "latest" });
const fees = { maxFeePerGas: (latestBlock.baseFeePerGas ?? 6_000_000_000n) + 1_000_000_000n };
const deployerClient = createWalletClient({ account: deployer, transport });
const executorClient = createWalletClient({ account: executor, transport });

const venueAbi = parseAbi([
  "function getOrderBookParameters() view returns ((uint256 tickSize, uint256 minQuantity, uint256 lotSize))",
  "function tryGetMarkPrice() view returns (bool ok, uint256 price)",
  "function getBookLevels(bool isBid, uint64 numLevels) view returns ((uint256 price, uint256 quantity)[])",
]);

const marginAbi = parseAbi([
  "function getAccountEquity(address account) view returns (int256)",
  "function isVoucherMarketAllowed(address perpPool) view returns (bool)",
]);

const voucherAbi = parseAbi([
  "function isClaimed(address claimant) view returns (bool)",
  "function claim()",
]);

const registryAbi = parseAbi([
  "function setOperatorApprovalGlobal(address operator, bytes4[] selectors, bool approved)",
  "function setOperatorApprovalForPool(address pool, address operator, bytes4[] selectors, bool approved)",
  "function isGloballyApproved(address owner, address operator, bytes4 selector) view returns (bool)",
]);

const PLACE_ORDER_FOR = "0x80054449";
const orderEventsAbi = parseAbi([
  "event OrderFilled(uint128 indexed takerOrderId, uint128 indexed makerOrderId, uint256 quantityFilled, uint256 takerRemainingQuantity, uint256 makerRemainingQuantity, uint256 fillPrice)",
]);

/** The venue wants a generous limit, so the estimate is skipped. */
const GAS = 10_000_000n;

/** The chain charges a large deposit cost for the creation code. */
const DEPLOY_GAS = 60_000_000n;

const log = (line) => console.log(line);

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

/** Send a transaction and wait for it to be mined. */
async function send(client, request, label) {
  const hash = await client.writeContract(request);
  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  if (receipt.status !== "success") {
    throw new Error(`${label} reverted: ${hash}`);
  }
  log(`${label} ${hash} (gas ${receipt.gasUsed})`);
  return { hash, receipt };
}

// ---------------------------------------------------------------------
// 1. The contract.
// ---------------------------------------------------------------------

// The contract is always deployed from the artifact that was just built,
// unless --reuse is passed. A stale deployment is how a run ends up
// exercising code that is not the code under review.
const reuseAddress = process.argv.find((argument) => argument.startsWith("--reuse="))?.slice("--reuse=".length);
const reuse = process.argv.includes("--reuse") || Boolean(reuseAddress);
let mandateAddress = reuseAddress ?? (reuse ? env.get("NEXT_PUBLIC_MANDATE_ADDRESS") : undefined);
let previousDeployment = null;
try {
  previousDeployment = JSON.parse(readFileSync(join(root, "deployment.json"), "utf8"));
} catch {
  // A first deployment has no report to preserve.
}
const reportMatchesMandate = previousDeployment?.mandate?.toLowerCase() === mandateAddress?.toLowerCase();
let deploymentHash = reportMatchesMandate ? previousDeployment.deploymentTx ?? null : null;
if (!mandateAddress) {
  deploymentHash = await deployerClient.deployContract({
    abi: mandateAbi,
    bytecode: artifact.bytecode.object.startsWith("0x") ? artifact.bytecode.object : `0x${artifact.bytecode.object}`,
    args: [MARGIN_BANK, POOL_FACTORY, OPERATOR_REGISTRY],
    chain: null,
    gas: DEPLOY_GAS,
    maxFeePerGas: fees.maxFeePerGas,
    maxPriorityFeePerGas: 0n,
  });
  const receipt = await publicClient.waitForTransactionReceipt({ hash: deploymentHash });
  if (receipt.status !== "success") throw new Error("the deployment reverted");
  mandateAddress = receipt.contractAddress;
  log(`mandate deployed ${mandateAddress} tx ${deploymentHash} (gas ${receipt.gasUsed})`);
} else {
  log(`mandate ${mandateAddress}`);
}

// ---------------------------------------------------------------------
// 2. The paper credit, which is the perps collateral on testnet.
// ---------------------------------------------------------------------

const currentEquity = await publicClient.readContract({
  address: MARGIN_BANK,
  abi: marginAbi,
  functionName: "getAccountEquity",
  args: [deployer.address],
});
const claimed = await publicClient.readContract({
  address: VOUCHER,
  abi: voucherAbi,
  functionName: "isClaimed",
  args: [deployer.address],
});
if (currentEquity > 0n) {
  log(`paper credit skipped; owner already has ${formatUnits(currentEquity, 18)} USDso margin`);
} else if (!claimed) {
  try {
    await send(
      deployerClient,
      { address: VOUCHER, abi: voucherAbi, functionName: "claim", chain: null, gas: GAS },
      "voucher claimed",
    );
  } catch (error) {
    // The venue's paper credit is a courtesy, not a requirement of the policy.
    // When the distributor refuses, the build continues without collateral and
    // says so, rather than pretending the order was placed.
    log(`the paper credit was refused: ${error.shortMessage ?? error.message}`);
  }
} else {
  log("voucher already claimed");
}

// ---------------------------------------------------------------------
// 3. The operator grant, without which the contract cannot place an order.
// ---------------------------------------------------------------------

/**
 * The selectors the policy contract may use on a pool. The venue has more
 * than one shape of `placeOrderFor`, and the grant is an allow list, so the
 * shapes are all granted. The policy contract only ever calls one of them.
 */
const PLACE_ORDER_FOR_SELECTORS = [
  "0x80054449",
  "0xcfc06bf4",
  "0x1c42d50e",
  "0xdbb4feb9",
  "0x3f9ded40",
];

// The grant has to cover the perp pool itself. The global grant covers the
// pools in the registry, and a perp pool that is not registered there refuses
// the order with the venue's own operator error.
const poolAuthorized = await publicClient.readContract({
  address: BTC_POOL,
  abi: parseAbi([
    "function isOperatorAuthorized(address owner, address operator, bytes4 selector) view returns (bool)",
  ]),
  functionName: "isOperatorAuthorized",
  args: [deployer.address, mandateAddress, PLACE_ORDER_FOR],
});
let poolGrantHash = reportMatchesMandate ? previousDeployment.operatorGrants?.perPool ?? null : null;
if (!poolAuthorized) {
  const grant = await send(
    deployerClient,
    {
      address: OPERATOR_REGISTRY,
      abi: registryAbi,
      functionName: "setOperatorApprovalForPool",
      args: [BTC_POOL, mandateAddress, PLACE_ORDER_FOR_SELECTORS, true],
      chain: null,
      gas: GAS,
    },
    "per pool operator grant",
  );
  poolGrantHash = grant.hash;
} else {
  log("per pool operator grant already in place");
}

const globallyAuthorized = await publicClient.readContract({
  address: OPERATOR_REGISTRY,
  abi: registryAbi,
  functionName: "isGloballyApproved",
  args: [deployer.address, mandateAddress, PLACE_ORDER_FOR],
});
let globalGrantHash = reportMatchesMandate ? previousDeployment.operatorGrants?.global ?? null : null;
if (!globallyAuthorized) {
  const grant = await send(
    deployerClient,
    {
      address: OPERATOR_REGISTRY,
      abi: registryAbi,
      functionName: "setOperatorApprovalGlobal",
      args: [mandateAddress, PLACE_ORDER_FOR_SELECTORS, true],
      chain: null,
      gas: GAS,
    },
    "operator grant",
  );
  globalGrantHash = grant.hash;
} else {
  log("operator grant already in place");
}

// ---------------------------------------------------------------------
// 4. The mandate itself: 200 USDso a market, 3x, no loss limit, 30 days.
// ---------------------------------------------------------------------

const capPerMarket = parseUnits("200", 18);
const capTotal = parseUnits("500", 18);
const loss = 0n;
const leverage = 300n;
const expiresAt = Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60;

const clauseTexts = [
  "Only trade BTC-PERP.",
  "Never above 3x.",
  "Never risk more than 200 USDso on one market.",
  "Never above 500 USDso in total.",
  "No loss limit.",
  "Be flat in thirty days.",
];

const clauseValues = [
  "BTC-PERP",
  "3.00x",
  "200.00 USDso",
  "500.00 USDso",
  "No loss limit",
  new Date(expiresAt * 1000).toISOString().slice(0, 10),
];

const registration = await send(
  deployerClient,
  {
    address: mandateAddress,
    abi: mandateAbi,
    functionName: "register",
    args: [
      {
        allowedMarkets: [BTC_POOL],
        maxLeverageBps: leverage,
        maxNotionalPerMarket: capPerMarket,
        maxNotionalTotal: capTotal,
        maxLossPerWindow: loss,
        expiresAt: BigInt(expiresAt),
      },
      executor.address,
      clauseTexts,
    ],
    chain: null,
    gas: GAS,
  },
  "mandate registered",
);

// The venue mines a block every ten milliseconds, so a transaction sent right
// after the registration can land in the same block and run before it. The
// pause makes the ordering certain.
await new Promise((resolve) => setTimeout(resolve, 4000));

const mandate = await publicClient.readContract({  address: mandateAddress,
  abi: mandateAbi,
  functionName: "getMandate",
  args: [deployer.address],
});
const policyHash = mandate[2];
log(`policy hash ${policyHash}`);
log(`status ${mandate[0]} expires ${mandate[3]}`);

// ---------------------------------------------------------------------
// 5. The two orders: one the mandate allows, one it refuses.
// ---------------------------------------------------------------------

const grid = await publicClient.readContract({
  address: BTC_POOL,
  abi: venueAbi,
  functionName: "getOrderBookParameters",
});
const mark = await publicClient.readContract({
  address: BTC_POOL,
  abi: venueAbi,
  functionName: "tryGetMarkPrice",
});
const asks = await publicClient.readContract({
  address: BTC_POOL,
  abi: venueAbi,
  functionName: "getBookLevels",
  args: [false, 20n],
});
const equity = await publicClient.readContract({
  address: MARGIN_BANK,
  abi: marginAbi,
  functionName: "getAccountEquity",
  args: [deployer.address],
});
const baseDecimals = 8;

log(`tick ${grid.tickSize} min ${grid.minQuantity} lot ${grid.lotSize}`);
log(`mark ${formatUnits(mark[1], 18)} priceable ${mark[0]}`);
log(`equity ${formatUnits(equity, 18)}`);

/** Round a price down onto the tick grid. */
function onTick(price) {
  return (price / grid.tickSize) * grid.tickSize;
}

/** Round a quantity up onto the lot grid. */
function onLot(quantity) {
  return (quantity / grid.lotSize + 1n) * grid.lotSize;
}

/** The size that is worth the given notional at the mark price. */
function sizeFor(notional) {
  const raw = (notional * 10n ** BigInt(baseDecimals)) / mark[1];
  return onLot(raw);
}

const orderRequest = (price, quantity, reduceOnly, expireTimestampNs = 0n) => ({
  owner: deployer.address,
  market: BTC_POOL,
  isBid: true,
  price,
  quantity,
  reduceOnly,
  armsStop: false,
  expireTimestampNs,
  orderType: 2,
});

const previewAbi = parseAbi([
  "function previewAdmit((address owner, address market, bool isBid, uint256 price, uint256 quantity, bool reduceOnly, bool armsStop, uint64 expireTimestampNs, uint8 orderType) request) returns (uint8 code, uint128 compared, uint128 limit, uint8 clause)",
]);
const allowedQuantity = grid.minQuantity;
let visibleAskDepth = 0n;
let firstFillableAsk = 0n;
for (const ask of asks) {
  visibleAskDepth += ask.quantity;
  if (visibleAskDepth >= allowedQuantity) {
    firstFillableAsk = ask.price;
    break;
  }
}
if (firstFillableAsk === 0n) throw new Error("the BTC-PERP ask book has less than one minimum order of liquidity");
if (firstFillableAsk % grid.tickSize !== 0n || allowedQuantity % grid.lotSize !== 0n) {
  throw new Error("the live BTC-PERP ask book or minimum quantity is off the venue grid");
}
// Allow half a percent above the visible ask to absorb book movement while
// keeping the minimum-size test order's worst-case spend below 9 USDso.
const rawAllowedPrice = (firstFillableAsk * 1005n) / 1000n;
const allowedPrice = ((rawAllowedPrice + grid.tickSize - 1n) / grid.tickSize) * grid.tickSize;
const refusedPrice = onTick(mark[1]);
const refusedQuantity = sizeFor(parseUnits("2000", 18));
const orderHead = await publicClient.getBlock({ blockTag: "latest" });
const allowedExpiryNs = orderHead.timestamp * 1_000_000_000n + 120_000_000_000n;
const allowedRequest = orderRequest(allowedPrice, allowedQuantity, false, allowedExpiryNs);

log(`allowed order ${formatUnits(allowedQuantity, baseDecimals)} BTC at live ask ${formatUnits(allowedPrice, 18)}`);

const allowedPreview = await publicClient.readContract({
  address: mandateAddress,
  abi: previewAbi,
  functionName: "previewAdmit",
  args: [allowedRequest],
  account: executor.address,
});
log(`preview of the allowed order: code ${allowedPreview[0]} compared ${allowedPreview[1]} limit ${allowedPreview[2]}`);
if (allowedPreview[0] !== 0) {
  throw new Error(`the minimum-size order is not allowed under this policy: code ${allowedPreview[0]}`);
}

const allowedSimulation = await publicClient.simulateContract({
  address: mandateAddress,
  abi: mandateAbi,
  functionName: "admit",
  args: [allowedRequest],
  account: executor,
});
if (!allowedSimulation.result[0]) {
  throw new Error("the venue simulation did not accept the allowed test order");
}
log(`venue simulation accepted order id ${allowedSimulation.result[1]}`);

let allowed = null;
try {
  allowed = await send(
    executorClient,
    {
      address: mandateAddress,
      abi: mandateAbi,
      functionName: "admit",
      args: [allowedRequest],
      chain: null,
      gas: GAS,
    },
    "order admitted",
  );
} catch (error) {
  log(`the allowed order did not go through: ${error.shortMessage ?? error.message}`);
}

const allowedFillLogs = allowed
  ? parseEventLogs({ abi: orderEventsAbi, logs: allowed.receipt.logs, eventName: "OrderFilled", strict: false })
  : [];
const allowedFilledQuantity = allowedFillLogs.reduce(
  (total, event) => total + (event.args.quantityFilled ?? 0n),
  0n,
);
if (allowed && allowedFilledQuantity === 0n) {
  log("the venue accepted the call but emitted no OrderFilled event");
}

log(`refused order ${formatUnits(refusedQuantity, baseDecimals)} BTC at ${formatUnits(refusedPrice, 18)}`);

// The deployment is checked before the refusal is sent. If the contract does
// not predict the stated code, no misleading transaction is produced.
const preview = await publicClient.readContract({
  address: mandateAddress,
  abi: previewAbi,
  functionName: "previewAdmit",
  args: [orderRequest(refusedPrice, refusedQuantity, false)],
  account: executor.address,
});
log(`preview of the refused order: code ${preview[0]} compared ${preview[1]} limit ${preview[2]}`);
if (preview[0] !== 0x08) {
  throw new Error(`the deployment does not refuse the order as expected: code ${preview[0]}`);
}

let refusalCode = null;
let refusalSelector = null;

const refusalHash = await executorClient.writeContract({
  address: mandateAddress,
  abi: mandateAbi,
  functionName: "admit",
  args: [orderRequest(refusedPrice, refusedQuantity, false)],
  chain: null,
  gas: GAS,
});
const refusalReceipt = await publicClient.waitForTransactionReceipt({ hash: refusalHash });

if (refusalReceipt.status === "success") {
  throw new Error("the refused order was admitted, which is a bug");
}

// A revert keeps its reason in the call data, not in the receipt, so the reason
// is read by replaying the call with the same sender.
//
// The replay runs against the head state. A call against a past block returns
// an empty result on this node, and an estimate drops the sender, so the
// contract runs as the zero address and reports a different reason.
const refusalTransaction = await publicClient.getTransaction({ hash: refusalHash });
const replay = await publicClient
  .call({
    to: mandateAddress,
    data: refusalTransaction.input,
    account: executor.address,
  })
  .catch((error) => findRevertData(error));
if (replay && replay !== "0x" && replay.length >= 74) {
  refusalSelector = `0x${replay.slice(2, 10)}`;
  refusalCode = Number.parseInt(replay.slice(-2), 16);
}
log(`the refusal reverted with ${refusalSelector} code ${refusalCode}`);
if (refusalSelector !== "0x47a56227" || refusalCode !== 0x08) {
  throw new Error("the replay did not prove the expected 0x08 refusal; no decision was recorded");
}
// The refusal is written by a second transaction, because a revert rolls back
// the log that would have recorded it.
const recordHash = await executorClient.writeContract({
  address: mandateAddress,
  abi: mandateAbi,
  functionName: "recordRefusal",
  args: [orderRequest(refusedPrice, refusedQuantity, false), refusalCode, refusalHash],
  chain: null,
});
const recordReceipt = await publicClient.waitForTransactionReceipt({ hash: recordHash });
if (recordReceipt.status !== "success") throw new Error("recording the refusal reverted");
log(`refusal recorded ${recordHash}`);

const output = {
  chainId: CHAIN_ID,
  rpc: RPC,
  mandate: mandateAddress,
  deploymentTx: deploymentHash,
  executor: executor.address,
  owner: deployer.address,
  policyHash: mandate[2],
  registration: registration.hash,
  operatorGrants: {
    perPool: poolGrantHash,
    global: globalGrantHash,
  },
  allowedOrder: allowed
    ? {
        tx: allowed.hash,
        price: allowedPrice.toString(),
        quantity: allowedQuantity.toString(),
        filledQuantity: allowedFilledQuantity.toString(),
        fillPrices: allowedFillLogs.map((event) => event.args.fillPrice.toString()),
        baseDecimals,
      }
    : null,
  refusedOrder: {
    tx: refusalHash,
    selector: refusalSelector,
    code: refusalCode,
    price: refusedPrice.toString(),
    quantity: refusedQuantity.toString(),
    baseDecimals,
    recorded: recordHash,
  },
  market: {
    pool: BTC_POOL,
    symbol: "BTC-PERP",
    tickSize: grid.tickSize.toString(),
    minQuantity: grid.minQuantity.toString(),
    lotSize: grid.lotSize.toString(),
    mark: mark[1].toString(),
  },
  equity: equity.toString(),
  runAt: new Date().toISOString(),
};

writeFileSync(join(root, "deployment.json"), `${JSON.stringify(output, null, 2)}\n`, "utf8");
log(`wrote ${join(root, "deployment.json")}`);

// The web app reads the contract address from the environment. A stale
// address in the environment is a console that shows the wrong mandate, so
// the address that was just deployed is written back.
const envPath = join(root, ".env");
if (existsSync(envPath)) {
  const lines = readFileSync(envPath, "utf8").split(/\r?\n/);
  const replacements = new Map([
    ["NEXT_PUBLIC_MANDATE_ADDRESS", mandateAddress],
    ["NEXT_PUBLIC_DEMO_DECISION_ID", recordHash],
    ["NEXT_PUBLIC_OWNER_ADDRESS", deployer.address],
  ]);
  const next = lines.map((line) => {
    const match = /^([A-Z0-9_]+)=/.exec(line);
    return match && replacements.has(match[1]) ? `${match[1]}=${replacements.get(match[1])}` : line;
  });
  writeFileSync(envPath, `${next.join("\n")}`, "utf8");
  log("updated live mandate and receipt values in .env");
}













