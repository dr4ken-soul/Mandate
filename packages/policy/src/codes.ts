/**
 * The reason code table.
 *
 * One source of truth for the contract, the compiler route, the console and the
 * landing page. A code is a stable `uint8`. The name, the clause it enforces,
 * the venue error it pre-empts and the sentence shown to the user all live
 * here, so the four surfaces cannot disagree about what a code means.
 *
 * Codes 0x01 to 0x10 are the sixteen wire codes. 0x11 is produced by the
 * compiler, never by the chain, so it has no on-chain selector. 0x12 is a chain
 * refusal added after the sixteen were fixed.
 */

import { keccak256Hex } from "./keccak.ts";
import type { ClauseId } from "./schema.ts";

export const CODE_ADMITTED = 0x00;
export const CODE_NO_MANDATE = 0x01;
export const CODE_OPERATOR_REVOKED = 0x02;
export const CODE_EXPIRED = 0x03;
export const CODE_MARKET_NOT_ALLOWED = 0x04;
export const CODE_TICK_MISMATCH = 0x05;
export const CODE_LOT_MISMATCH = 0x06;
export const CODE_BELOW_MIN_QTY = 0x07;
export const CODE_MARKET_NOTIONAL_CAP = 0x08;
export const CODE_TOTAL_NOTIONAL_CAP = 0x09;
export const CODE_LEVERAGE = 0x0a;
export const CODE_LOSS_WINDOW = 0x0b;
export const CODE_VENUE_POSITION_CAP = 0x0c;
export const CODE_VOUCHER_BLOCKED = 0x0d;
export const CODE_MARK_STALE = 0x0e;
export const CODE_GAS_HEADROOM = 0x0f;
export const CODE_COOLDOWN = 0x10;
export const CODE_UNEXPRESSIBLE = 0x11;
export const CODE_IN_BREACH = 0x12;

/** The clause a code belongs to. `none` means the code is a venue or lifecycle refusal. */

export interface ReasonCode {
  /** Stable numeric code. */
  readonly code: number;
  /** Zero padded hex form, for example 0x08. */
  readonly hex: string;
  /** Stable machine name. */
  readonly name: string;
  /** The clause this code enforces, or null when it enforces no clause. */
  readonly clause: ClauseId | null;
  /** The venue error this check pre-empts, when one exists. */
  readonly preempts: string | null;
  /** Solidity error signature, present only for codes the chain can emit. */
  readonly errorSignature: string | null;
  /** Four byte selector, present only for codes the chain can emit. */
  readonly selector: `0x${string}` | null;
  /** The sentence shown to the user. Placeholders are filled at render time. */
  readonly copy: string;
}

function selectorFor(signature: string): `0x${string}` {
  return keccak256Hex(signature).slice(0, 10) as `0x${string}`;
}

function entry(
  code: number,
  name: string,
  clause: ClauseId | null,
  preempts: string | null,
  errorName: string | null,
  copy: string,
): ReasonCode {
  const errorSignature = errorName ? `${errorName}(uint8)` : null;
  return {
    code,
    hex: `0x${code.toString(16).toUpperCase().padStart(2, "0")}`,
    name,
    clause,
    preempts,
    errorSignature,
    selector: errorSignature ? selectorFor(errorSignature) : null,
    copy,
  };
}

/**
 * The closed set of reason codes, in numeric order.
 */
export const REASON_CODES: readonly ReasonCode[] = [
  entry(
    CODE_ADMITTED,
    "ADMITTED",
    null,
    null,
    null,
    "Admitted",
  ),
  entry(
    CODE_NO_MANDATE,
    "E_NO_MANDATE",
    null,
    null,
    "ENoMandate",
    "This wallet has no active mandate, so nothing can be placed for it.",
  ),
  entry(
    CODE_OPERATOR_REVOKED,
    "E_OPERATOR_REVOKED",
    null,
    "OnlyApprovedContracts",
    "EOperatorRevoked",
    "This trading key is no longer approved for the wallet.",
  ),
  entry(
    CODE_EXPIRED,
    "E_EXPIRED",
    "C6",
    null,
    "EExpired",
    "This mandate expired on {date}. Orders that reduce a position are still accepted.",
  ),
  entry(
    CODE_MARKET_NOT_ALLOWED,
    "E_MARKET_NOT_ALLOWED",
    "C1",
    "IsolatedMarketBlocked",
    "EMarketNotAllowed",
    "{SYMBOL} is not one of the markets this mandate allows.",
  ),
  entry(
    CODE_TICK_MISMATCH,
    "E_TICK_MISMATCH",
    null,
    "InvalidPrice",
    "ETickMismatch",
    "The price is off this market's tick of {tick}. The nearest valid prices are {below} and {above}.",
  ),
  entry(
    CODE_LOT_MISMATCH,
    "E_LOT_MISMATCH",
    null,
    "QuantityBelowMinimum",
    "ELotMismatch",
    "The size is not a whole multiple of {lot}.",
  ),
  entry(
    CODE_BELOW_MIN_QTY,
    "E_BELOW_MIN_QTY",
    null,
    "QuantityBelowMinimum",
    "EBelowMinQty",
    "The smallest order this market accepts is {min} {BASE}.",
  ),
  entry(
    CODE_MARKET_NOTIONAL_CAP,
    "E_MARKET_NOTIONAL_CAP",
    "C3",
    null,
    "EMarketNotionalCap",
    "This would take {SYMBOL} to {after}, above the {cap} this mandate allows.",
  ),
  entry(
    CODE_TOTAL_NOTIONAL_CAP,
    "E_TOTAL_NOTIONAL_CAP",
    "C4",
    null,
    "ETotalNotionalCap",
    "This would take the mandate to {after} across all markets, above {cap}.",
  ),
  entry(
    CODE_LEVERAGE,
    "E_LEVERAGE",
    "C2",
    "InsufficientCollateral",
    "ELeverage",
    "At {x}x this order is above the {cap}x this mandate allows.",
  ),
  entry(
    CODE_LOSS_WINDOW,
    "E_LOSS_WINDOW",
    "C5",
    null,
    "ELossWindow",
    "This mandate stops at a loss of {cap}. It has reached {loss}.",
  ),
  entry(
    CODE_VENUE_POSITION_CAP,
    "E_VENUE_POSITION_CAP",
    null,
    "MaxPositionSizeExceeded",
    "EVenuePositionCap",
    "The venue caps this account at {cap} {BASE}. The order asks for {qty}.",
  ),
  entry(
    CODE_VOUCHER_BLOCKED,
    "E_VOUCHER_BLOCKED",
    null,
    "VoucherMarketNotAllowed",
    "EVoucherBlocked",
    "Paper credit cannot open {SYMBOL}. Pick a market the credit covers, or fund the account.",
  ),
  entry(
    CODE_MARK_STALE,
    "E_MARK_STALE",
    null,
    null,
    "EMarkStale",
    "The mark price is stale, so no size can be quoted safely.",
  ),
  entry(
    CODE_GAS_HEADROOM,
    "E_GAS_HEADROOM",
    null,
    "InsufficientCollateral",
    "EGasHeadroom",
    "Each stop holds 0.15 STT. The wallet holds {stt}.",
  ),
  entry(
    CODE_COOLDOWN,
    "E_COOLDOWN",
    null,
    null,
    "ECooldown",
    "After a breach, only reduce-only orders are accepted for {n} more minutes.",
  ),
  entry(
    CODE_UNEXPRESSIBLE,
    "E_UNEXPRESSIBLE",
    null,
    null,
    null,
    "This rule cannot be enforced on chain, so it was not accepted.",
  ),
  entry(
    CODE_IN_BREACH,
    "E_IN_BREACH",
    null,
    null,
    "EInBreach",
    "The position is outside the mandate. Reduce it before adding.",
  ),
] as const;

const BY_CODE = new Map<number, ReasonCode>(REASON_CODES.map((item) => [item.code, item]));
const BY_NAME = new Map<string, ReasonCode>(REASON_CODES.map((item) => [item.name, item]));

/** Every code the chain can emit, which is every code with a selector. */
export const CHAIN_REASON_CODES: readonly ReasonCode[] = REASON_CODES.filter(
  (item) => item.selector !== null,
);

/**
 * Look up a code by its numeric value.
 * @returns The reason code, or undefined when the number is not in the closed set.
 */
export function reasonCode(code: number): ReasonCode | undefined {
  return BY_CODE.get(code);
}

/**
 * Look up a code by its machine name.
 * @returns The reason code, or undefined when the name is not in the closed set.
 */
export function reasonCodeByName(name: string): ReasonCode | undefined {
  return BY_NAME.get(name);
}

/**
 * Look up a code by its hex form, case insensitive.
 * @returns The reason code, or undefined when the hex is not in the closed set.
 */
export function reasonCodeByHex(hex: string): ReasonCode | undefined {
  const normalised = hex.toLowerCase();
  return REASON_CODES.find((item) => item.hex.toLowerCase() === normalised);
}

/**
 * The human sentence for a code, with its placeholders left in place.
 * @returns The copy, or a fail closed sentence when the code is unknown.
 */
export function copyFor(code: number): string {
  const found = reasonCode(code);
  if (!found) {
    return "This decision is not one Mandate recognises, so it was treated as a refusal.";
  }
  return found.copy;
}

/**
 * Fill the placeholders in a code's sentence.
 * @param code The reason code.
 * @param values Placeholder values, keyed without braces.
 */
export function formatCopy(code: number, values: Record<string, string | number>): string {
  return copyFor(code).replace(/\{([A-Za-z_]+)\}/g, (_match, key: string) => {
    const value = values[key];
    return value === undefined ? "" : String(value);
  });
}


