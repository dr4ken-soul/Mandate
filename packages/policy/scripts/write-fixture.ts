/**
 * Write the canonical fixture the contract test checks itself against.
 *
 * The fixture is produced by the off-chain encoder and committed, so the
 * Solidity encoder and the TypeScript encoder are proved to agree on the same
 * bytes rather than each proving itself.
 *
 *   node --experimental-strip-types packages/policy/scripts/write-fixture.ts
 */

import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { canonicalDraftJson, policyHash } from "../src/canonical.ts";
import { canonicalOf } from "../src/presets.ts";
import { SCALPER } from "../src/presets.ts";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..", "..", "..");
const fixtureDir = join(root, "contracts", "test", "fixtures");

/** The fixed moment the fixture is built from, so the fixture never moves. */
const NOW = 1764547200;

const draft = SCALPER.draft(NOW);
const canonical = canonicalDraftJson(canonicalOf(draft));
const hash = policyHash(canonicalOf(draft));

mkdirSync(fixtureDir, { recursive: true });
writeFileSync(join(fixtureDir, "policy.json"), canonical, "utf8");
writeFileSync(join(fixtureDir, "policy.hash"), hash, "utf8");
writeFileSync(
  join(fixtureDir, "policy.input.json"),
  JSON.stringify(
    {
      allowedMarkets: draft.allowedMarkets,
      maxLeverageBps: draft.maxLeverageBps,
      maxNotionalPerMarket: draft.maxNotionalPerMarket,
      maxNotionalTotal: draft.maxNotionalTotal,
      maxLossPerWindow: draft.maxLossPerWindow,
      expiresAt: draft.expiresAt,
      clauseTexts: draft.clauses.map((clause) => clause.text),
    },
    null,
    2,
  ),
  "utf8",
);

console.log(`canonical ${canonical.length} bytes`);
console.log(`hash     ${hash}`);
