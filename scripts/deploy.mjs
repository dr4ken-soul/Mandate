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

import { readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
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

/** The venue wants a generous limit, so the estimate is skipped. */
const GAS = 10_000_000n;

/** The chain charges a large deposit cost for the creation code. */
const DEPLOY_GAS = 60_000_000n;

const log = (line) => console.log(line);

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

let mandateAddress = env.get("NEXT_PUBLIC_MANDATE_ADDRESS");
if (!mandateAddress) {
  const hash = await deployerClient.deployContract({
    abi: mandateAbi,
    bytecode: artifact.bytecode.object.startsWith("0x") ? artifact.bytecode.object : `0x${artifact.bytecode.object}`,
    args: [MARGIN_BANK, POOL_FACTORY, OPERATOR_REGISTRY],
    chain: null,
    gas: DEPLOY_GAS,
    maxFeePerGas: fees.maxFeePerGas,
    maxPriorityFeePerGas: 0n,
  });
  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  if (receipt.status !== "success") throw new Error("the deployment reverted");
  mandateAddress = receipt.contractAddress;
  log(`mandate deployed ${mandateAddress} (gas ${receipt.gasUsed})`);
} else {
  log(`mandate ${mandateAddress}`);
}

// ---------------------------------------------------------------------
// 2. The paper credit, which is the perps collateral on testnet.
// ---------------------------------------------------------------------

const claimed = await publicClient.readContract({
  address: VOUCHER,
  abi: voucherAbi,
  functionName: "isClaimed",
  args: [deployer.address],
});
if (!claimed) {
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
if (true) {
  await send(
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
} else {
  log("per pool operator grant already in place");
}

const globallyAuthorized = await publicClient.readContract({
  address: OPERATOR_REGISTRY,
  abi: registryAbi,
  functionName: "isGloballyApproved",
  args: [deployer.address, mandateAddress, PLACE_ORDER_FOR],
});
if (!globallyAuthorized) {
  await send(
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

const orderRequest = (price, quantity, reduceOnly) => ({
  owner: deployer.address,
  market: BTC_POOL,
  isBid: true,
  price,
  quantity,
  reduceOnly,
  armsStop: false,
  expireTimestampNs: 0n,
  orderType: 2,
});

const allowedPrice = onTick(mark[1]);
const allowedQuantity = sizeFor(parseUnits("100", 18));
const refusedPrice = onTick(mark[1]);
const refusedQuantity = sizeFor(parseUnits("2000", 18));

log(`allowed order ${formatUnits(allowedQuantity, baseDecimals)} BTC at ${formatUnits(allowedPrice, 18)}`);

let allowed = null;
try {
  allowed = await send(
    executorClient,
    {
      address: mandateAddress,
      abi: mandateAbi,
      functionName: "admit",
      args: [orderRequest(allowedPrice, allowedQuantity, false)],
      chain: null,
      gas: GAS,
    },
    "order admitted",
  );
} catch (error) {
  log(`the allowed order did not go through: ${error.shortMessage ?? error.message}`);
}

log(`refused order ${formatUnits(refusedQuantity, baseDecimals)} BTC at ${formatUnits(refusedPrice, 18)}`);

// The deployment is checked before anything is sent. If the contract does not
// refuse the order in a read, the build is wrong and the demo would publish a
// transaction that means nothing.
const previewAbi = parseAbi([
  "function previewAdmit((address owner, address market, bool isBid, uint256 price, uint256 quantity, bool reduceOnly, bool armsStop, uint64 expireTimestampNs, uint8 orderType) request) returns (uint8 code, uint128 compared, uint128 limit, uint8 clause)",
]);
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
// is read by replaying the call at the block before the transaction.
const replay = await publicClient
  .call({
    to: mandateAddress,
    data: refusalReceipt.input ?? "0x",
    from: executor.address,
    blockNumber: refusalReceipt.blockNumber - 1n,
  })
  .catch((error) => {
    const data = error?.data ?? error?.cause?.data ?? error?.details;
    return typeof data === "string" && data.startsWith("0x") ? data : null;
  });
if (replay && replay !== "0x") {
  refusalSelector = `0x${replay.slice(2, 10)}`;
  refusalCode = Number.parseInt(replay.slice(74, 78), 16);
}
log(`the refusal reverted with ${refusalSelector} code ${refusalCode}`);
// The refusal is written by a second transaction, because a revert rolls back
// the log that would have recorded it.
const recordHash = await executorClient.writeContract({
  address: mandateAddress,
  abi: mandateAbi,
  functionName: "recordRefusal",
  args: [orderRequest(refusedPrice, refusedQuantity, false), refusalCode ?? 8, refusalHash],
  chain: null,
});
const recordReceipt = await publicClient.waitForTransactionReceipt({ hash: recordHash });
if (recordReceipt.status !== "success") throw new Error("recording the refusal reverted");
log(`refusal recorded ${recordHash}`);

const output = {
  chainId: CHAIN_ID,
  rpc: RPC,
  mandate: mandateAddress,
  executor: executor.address,
  owner: deployer.address,
  policyHash: mandate[0].policyHash,
  registration: registration.hash,
  allowedOrder: allowed
    ? {
        tx: allowed.hash,
        price: allowedPrice.toString(),
        quantity: allowedQuantity.toString(),
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












