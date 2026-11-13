/**
 * The canonical policy encoding and its hash.
 *
 * `policyHash` is what the owner signs. It covers the version, the six clause
 * values and the user's own words for each clause, so a change to the sentence
 * changes the hash and a change to the number changes the hash.
 *
 * The encoding is canonical JSON with a fixed key order, which makes the hash
 * independent of the key order of the object it was built from. The Solidity
 * side builds the same bytes in `contracts/src/MandateCanonical.sol`, and
 * `contracts/test/Compile.t.sol` asserts the two agree byte for byte.
 */

import { keccak256Hex } from "./keccak.ts";
import type { ClauseId } from "./schema.ts";

/** The six clause identifiers, in the order the canonical encoding writes them. */
export const CANONICAL_CLAUSE_ORDER: readonly ClauseId[] = ["C1", "C2", "C3", "C4", "C5", "C6"];

export interface CanonicalClause {
  readonly id: ClauseId;
  readonly text: string;
}

export interface CanonicalDraft {
  readonly version: number;
  readonly allowedMarkets: readonly string[];
  readonly maxLeverageBps: number;
  readonly maxNotionalPerMarket: string;
  readonly maxNotionalTotal: string;
  readonly maxLossPerWindow: string;
  readonly expiresAt: number;
  readonly clauses: readonly CanonicalClause[];
}

/**
 * Quote a string as a JSON string literal.
 *
 * `JSON.stringify` escapes exactly what the Solidity encoder escapes: the
 * quote, the backslash and the control characters. Nothing else, so the two
 * encoders agree byte for byte on any valid UTF-8 input.
 */
export function jsonString(value: string): string {
  return JSON.stringify(value);
}

function lowerAddress(value: string): string {
  return value.toLowerCase();
}

/**
 * Build the canonical JSON document for a policy.
 *
 * The key order is fixed here rather than inherited from the input object, so
 * two drafts that carry the same values hash identically no matter how their
 * objects were built.
 */
export function canonicalDraftJson(draft: CanonicalDraft): string {
  const clauses = CANONICAL_CLAUSE_ORDER.map((id) => {
    const found = draft.clauses.find((clause) => clause.id === id);
    const text = found ? found.text : "";
    return `{"id":${jsonString(id)},"text":${jsonString(text)}}`;
  });

  const markets = draft.allowedMarkets.map((market) => jsonString(lowerAddress(market)));

  return (
    `{"version":${draft.version},` +
    `"allowedMarkets":[${markets.join(",")}],` +
    `"maxLeverageBps":${draft.maxLeverageBps},` +
    `"maxNotionalPerMarket":${jsonString(draft.maxNotionalPerMarket)},` +
    `"maxNotionalTotal":${jsonString(draft.maxNotionalTotal)},` +
    `"maxLossPerWindow":${jsonString(draft.maxLossPerWindow)},` +
    `"expiresAt":${draft.expiresAt},` +
    `"clauses":[${clauses.join(",")}]` +
    `}`
  );
}

/**
 * The keccak256 hash of the canonical encoding.
 * @returns 32 bytes as a 0x prefixed hex string.
 */
export function policyHash(draft: CanonicalDraft): `0x${string}` {
  return keccak256Hex(canonicalDraftJson(draft));
}

