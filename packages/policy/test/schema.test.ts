import { describe, expect, it } from "vitest";
import { mandateDraftSchema, modelDraftSchema } from "../src/schema.ts";
import { HEDGE, PRESETS, SCALPER, canonicalJsonOf } from "../src/presets.ts";

describe("the draft schema", () => {
  const valid = {
    version: 1 as const,
    allowedMarkets: ["0x4181dd08E73BbCdd1Ba3E615A18f6abD941b94C0"],
    maxLeverageBps: 300,
    maxNotionalPerMarket: "200000000000000000000",
    maxNotionalTotal: "500000000000000000000",
    maxLossPerWindow: "50000000000000000000",
    expiresAt: 1764547200,
    clauses: [{ id: "C1" as const, text: "Only BTC-PERP.", value: "BTC-PERP" }],
    rejected: [],
  };

  it("accepts a well formed draft", () => {
    expect(mandateDraftSchema.safeParse(valid).success).toBe(true);
  });

  it("rejects an address that is not an address", () => {
    const result = mandateDraftSchema.safeParse({ ...valid, allowedMarkets: ["0x1234"] });
    expect(result.success).toBe(false);
  });

  it("rejects a number that is not a base ten integer", () => {
    const result = mandateDraftSchema.safeParse({ ...valid, maxNotionalTotal: "1.5" });
    expect(result.success).toBe(false);
  });

  it("rejects more than six markets", () => {
    const markets = Array.from({ length: 7 }, () => "0x4181dd08E73BbCdd1Ba3E615A18f6abD941b94C0");
    const result = mandateDraftSchema.safeParse({ ...valid, allowedMarkets: markets });
    expect(result.success).toBe(false);
  });

  it("drops the keys the model invents", () => {
    const parsed = modelDraftSchema.parse({
      version: 1,
      allowedMarkets: [],
      maxLeverageBps: 300,
      maxNotionalPerMarket: "0",
      maxNotionalTotal: "0",
      maxLossPerWindow: "0",
      expiresAt: 0,
      clauses: [],
      rejected: [],
      somethingElse: true,
    });
    expect("somethingElse" in parsed).toBe(false);
  });
});

describe("the presets", () => {
  const now = 1_700_000_000;

  it("compiles without a model call", () => {
    for (const preset of PRESETS) {
      const draft = preset.draft(now);
      expect(mandateDraftSchema.safeParse(draft).success, preset.id).toBe(true);
    }
  });

  it("gives the scalper one market, 5x and a 50 USDso cap", () => {
    const draft = SCALPER.draft(now);
    expect(draft.allowedMarkets).toHaveLength(1);
    expect(draft.maxLeverageBps).toBe(500);
    expect(draft.maxNotionalPerMarket).toBe("50000000000000000000");
    expect(draft.maxLossPerWindow).toBe("20000000000000000000");
  });

  it("gives the hedge two markets, 2x and no loss limit", () => {
    const draft = HEDGE.draft(now);
    expect(draft.allowedMarkets).toHaveLength(2);
    expect(draft.maxLeverageBps).toBe(200);
    expect(draft.maxNotionalPerMarket).toBe("500000000000000000000");
    expect(draft.maxLossPerWindow).toBe("0");
  });

  it("gives the sandbox one times leverage and a 25 USDso cap", () => {
    const draft = PRESETS[2]?.draft(now);
    expect(draft?.maxLeverageBps).toBe(100);
    expect(draft?.maxNotionalPerMarket).toBe("25000000000000000000");
    expect(draft?.allowedMarkets.length).toBeLessThanOrEqual(6);
  });

  it("quotes the rules in the author's own words", () => {
    const json = canonicalJsonOf(SCALPER.draft(now));
    expect(json).toContain("Only trade BTC-PERP.");
    expect(json).toContain("Never risk more than 50 USDso on one market.");
  });
});
