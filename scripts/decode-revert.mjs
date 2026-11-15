/**
 * Read the reason a transaction reverted.
 *
 * A revert keeps its reason in the call data, not in the receipt, so the
 * reason is read by replaying the call.
 *
 *   node scripts/decode-revert.mjs 0xTransactionHash
 */

import { readFileSync } from "node:fs";
import { createPublicClient, http, decodeErrorResult } from "viem";
import { keccak256Hex } from "../packages/policy/src/keccak.ts";

const RPC = process.env.NEXT_PUBLIC_RPC_URL ?? "https://api.hideki2.infra.testnet.somnia.network";
const client = createPublicClient({ transport: http(RPC, { timeout: 600_000, retryCount: 3 }) });

const txHash = process.argv[2];
if (!txHash) {
  console.error("usage: node scripts/decode-revert.mjs 0xTransactionHash");
  process.exit(1);
}

const receipt = await client.getTransactionReceipt({ hash: txHash });
const transaction = await client.getTransaction({ hash: txHash });

/**
 * Find the raw revert data anywhere in a thrown error.
 */
function findData(error, depth = 0) {
  if (depth > 5 || !error || typeof error !== "object") return null;
  for (const key of ["data", "raw", "revertData"]) {
    const value = error[key];
    if (typeof value === "string" && /^0x[0-9a-fA-F]{10,}$/.test(value)) return value;
    if (Array.isArray(value)) {
      for (const item of value) {
        if (typeof item === "string" && /^0x[0-9a-fA-F]{10,}$/.test(item)) return item;
      }
    }
  }
  for (const key of ["cause", "error", "details", "shortMessage"]) {
    const nested = findData(error[key], depth + 1);
    if (nested) return nested;
  }
  return null;
}

// The reason is replayed, because a reverted transaction keeps its reason in
// the call data and not in the receipt.
//
// The replay is a call against the head state with the real sender. Two other
// options do not work on this node: a call against a past block returns an
// empty result, and an estimate drops the sender, so the contract runs as the
// zero address and reports a different reason.
let data = null;
try {
  await client.call({
    to: transaction.to,
    data: transaction.input,
    account: transaction.from,
  });
  data = "0x";
} catch (error) {
  data = findData(error) ?? "0x";
}

if (typeof data !== "string" || data === "0x") {
  console.log("no revert data");
  process.exit(0);
}


const selector = `0x${data.slice(2, 10)}`;
const code = Number.parseInt(data.slice(72, 74), 16);
console.log(`selector ${selector}`);
console.log(`code     0x${code.toString(16).toUpperCase().padStart(2, "0")}`);
console.log(`gas used ${receipt.gasUsed}`);

// The error names the contract uses, so the reason reads in words.
const NAMES = {
  "0x13d914bb": "ENoMandate",
  "0x5e23eb82": "EOperatorRevoked",
  "0x5dffa6ef": "EExpired",
  "0x5a2d716e": "EMarketNotAllowed",
  "0x04edcb32": "ETickMismatch",
  "0x2e95a233": "ELotMismatch",
  "0xd5c73ade": "EBelowMinQty",
  "0x47a56227": "EMarketNotionalCap",
  "0x3334936d": "ETotalNotionalCap",
  "0x2b808b49": "ELeverage",
  "0xab41e695": "ELossWindow",
  "0x035bb5c8": "EVenuePositionCap",
  "0x93abd6ec": "EVoucherBlocked",
  "0x7fc665b6": "EMarkStale",
  "0xfe627acc": "EGasHeadroom",
  "0x4029495f": "ECooldown",
  "0x1fbd6281": "EInBreach",
};
console.log(`name     ${NAMES[selector] ?? "not a Mandate refusal"}`);

// The selector of the error the venue uses when it refuses the order itself.
if (selector === "0x7b5084b7") {
  console.log("the venue refused the order, not the policy");
}
void decodeErrorResult;
void keccak256Hex;
void readFileSync;

