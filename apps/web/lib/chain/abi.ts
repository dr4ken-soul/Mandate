import { parseAbi } from "viem";

/**
 * The decision event, on its own.
 *
 * The ledger reads it directly, so it is declared once and used both in the
 * contract ABI and in the log query.
 */
export const decisionEvent = {
  type: "event",
  name: "Decision",
  inputs: [
    { name: "owner", type: "address", indexed: true },
    { name: "admitted", type: "bool", indexed: false },
    { name: "code", type: "uint8", indexed: false },
    { name: "policyHash", type: "bytes32", indexed: true },
    { name: "market", type: "address", indexed: true },
    { name: "compared", type: "uint128", indexed: false },
    { name: "limit", type: "uint128", indexed: false },
    { name: "clause", type: "uint8", indexed: false },
    { name: "txRef", type: "bytes32", indexed: false },
  ],
} as const;

/**
 * The parts of the venue and of the policy contract the interface reads.
 *
 * Every entry is a view or a log. Nothing here can move funds.
 */
export const mandateAbi = parseAbi([
  "function getMandate(address owner) returns (uint8 status, address executor, bytes32 policyHash, uint64 expiresAt, uint32 maxLeverageBps, uint128 maxNotionalPerMarket, uint128 maxNotionalTotal, uint128 maxLossPerWindow, uint128 epochStartEquity, uint128 totalNotional, int256 equity)",
  "function getEnforcementState(address owner) returns (uint8 status, uint128 maxNotionalPerMarket, bytes32 policyHash)",
  "function getAllowedMarkets(address owner) returns (address[] markets)",
  "function getMarketNotional(address owner, address pool) returns (uint128)",
  "function previewAdmit((address owner, address market, bool isBid, uint256 price, uint256 quantity, bool reduceOnly, bool armsStop, uint64 expireTimestampNs, uint8 orderType) request) returns (uint8 code, uint128 compared, uint128 limit, uint8 clause)",
  "function register((address[] allowedMarkets, uint32 maxLeverageBps, uint128 maxNotionalPerMarket, uint128 maxNotionalTotal, uint128 maxLossPerWindow, uint64 expiresAt) input, address executor, string[6] clauseTexts) returns (bytes32 policyHash)",
  "function revoke()",
]);

export const marginBankAbi = parseAbi([
  "function getAccountEquity(address account) returns (int256 equity)",
  "function getPosition(address account, address perpPool) returns (int128 size, uint128 avgEntryPrice, int256 entryFundingIndex, uint64 lastUpdatedTimestampNs)",
  "function getActivePerpPools(address account) returns (address[] pools)",
]);

export const poolAbi = parseAbi([
  "function getOrderBookParameters() view returns ((uint256 tickSize, uint256 minQuantity, uint256 lotSize))",
  "function tryGetMarkPrice() view returns (bool ok, uint256 price)",
  "function getPerpPoolParameters() view returns ((uint256 initialMarginBps, uint256 maintenanceMarginBps, uint256 closeOutMarginBps, uint256 maxOpenInterest, uint256 maxPositionSize, uint256 takerFeeBpsTimes1k, int256 makerFeeBpsTimes1k, uint256 insuranceFundShareBps))",
]);

export const perpPoolFactoryAbi = parseAbi([
  "function getPerpPools() view returns (address[] perpPools)",
  "function getBaseTokenForPool(address perpPool) view returns (address baseToken)",
]);

export const erc20Abi = parseAbi([
  "function decimals() view returns (uint8)",
  "function symbol() view returns (string)",
  "function balanceOf(address account) view returns (uint256)",
]);
