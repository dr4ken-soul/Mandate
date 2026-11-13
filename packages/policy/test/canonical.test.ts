import { describe, expect, it } from "vitest";
import { canonicalDraftJson, policyHash } from "../src/canonical.ts";
import type { CanonicalDraft } from "../src/canonical.ts";

const base: CanonicalDraft = {
  version: 1,
  allowedMarkets: ["0x4181dd08e73bbcdd1ba3e615a18f6abd941b94c0"],
  maxLeverageBps: 300,
  maxNotionalPerMarket: "200000000000000000000",
  maxNotionalTotal: "500000000000000000000",
  maxLossPerWindow: "50000000000000000000",
  expiresAt: 1764547200,
  clauses: [
    { id: "C1", text: "Only BTC-PERP." },
    { id: "C2", text: "Never above 3x." },
    { id: "C3", text: "Never risk more than 200 USDso on one market." },
    { id: "C4", text: "Never above 500 USDso in total." },
    { id: "C5", text: "Stop at a loss of 50 USDso." },
    { id: "C6", text: "Be flat by Friday." },
  ],
};

describe("the canonical encoding", () => {
  it("writes a fixed key order", () => {
    const json = canonicalDraftJson(base);
    expect(json.startsWith('{"version":1,"allowedMarkets":[')).toBe(true);
    expect(json.endsWith(']}')).toBe(true);
  });

  it("does not depend on the key order of the input", () => {
    const scrambled: CanonicalDraft = {
      expiresAt: base.expiresAt,
      clauses: base.clauses,
      version: base.version,
      maxLossPerWindow: base.maxLossPerWindow,
      allowedMarkets: base.allowedMarkets,
      maxNotionalTotal: base.maxNotionalTotal,
      maxNotionalPerMarket: base.maxNotionalPerMarket,
      maxLeverageBps: base.maxLeverageBps,
    };
    expect(canonicalDraftJson(scrambled)).toBe(canonicalDraftJson(base));
    expect(policyHash(scrambled)).toBe(policyHash(base));
  });

  it("does not depend on the order of the clauses", () => {
    const reordered: CanonicalDraft = {
      ...base,
      clauses: [...base.clauses].reverse(),
    };
    expect(canonicalDraftJson(reordered)).toBe(canonicalDraftJson(base));
  });

  it("covers the words, not only the numbers", () => {
    const reworded: CanonicalDraft = {
      ...base,
      clauses: base.clauses.map((clause) =>
        clause.id === "C3" ? { ...clause, text: "Never risk more than 200 USDso." } : clause,
      ),
    };
    expect(policyHash(reworded)).not.toBe(policyHash(base));
  });

  it("covers every value", () => {
    const changed = [
      { ...base, maxLeverageBps: 301 },
      { ...base, maxNotionalPerMarket: "200000000000000000001" },
      { ...base, maxNotionalTotal: "500000000000000000001" },
      { ...base, maxLossPerWindow: "50000000000000000001" },
      { ...base, expiresAt: 1764547201 },
      { ...base, allowedMarkets: ["0x0000000000000000000000000000000000000001"] },
    ];
    for (const draft of changed) {
      expect(policyHash(draft)).not.toBe(policyHash(base));
    }
  });

  it("escapes the way JSON does", () => {
    const quoted: CanonicalDraft = {
      ...base,
      clauses: base.clauses.map((clause) =>
        clause.id === "C3" ? { ...clause, text: 'Say "no" to 100% \\ loss\n' } : clause,
      ),
    };
    const json = canonicalDraftJson(quoted);
    expect(json).toContain('"text":"Say \\"no\\" to 100% \\\\ loss\\n"');
    expect(JSON.parse(json)).toBeTruthy();
  });

  it("lower cases the market addresses", () => {
    const upper: CanonicalDraft = {
      ...base,
      allowedMarkets: ["0x4181DD08E73BbCdd1Ba3E615A18f6abD941b94C0"],
    };
    expect(canonicalDraftJson(upper)).toBe(canonicalDraftJson(base));
  });
});

