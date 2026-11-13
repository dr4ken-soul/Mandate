/**
 * The three presets.
 *
 * A preset is a real policy object with real English behind it. Selecting one
 * fills the authoring field with its text, and compiling it needs no model
 * call, so the demo works with the network down.
 */

import { formatExpiry, formatLeverage, formatQuote } from "./format.ts";
import { canonicalDraftJson, type CanonicalDraft } from "./canonical.ts";
import type { ClauseId, MandateDraft } from "./schema.ts";

/** The live perp pools the presets name. Read from the chain, not from a document. */
export const MARKETS = {
  "BTC-PERP": "0x4181dd08E73BbCdd1Ba3E615A18f6abD941b94C0",
  "ETH-PERP": "0xD6Cb1DD58580B84D76068aC21594219ce03aeddf",
  "SOL-PERP": "0xB483ec1fb34996638677c20ab087b16F1896FA53",
  "XRP-PERP": "0x7058579F3248559963f79AdB937c6De9f953E060",
  "DOGE-PERP": "0xC410012e39765Cd5f772e84BAcB19554AEC040Df",
  "ADA-PERP": "0x34fa62909f77699a7a6278D992F72Ff31c7a619D",
} as const;

export type MarketSymbol = keyof typeof MARKETS;

export interface PresetClause {
  readonly id: ClauseId;
  readonly text: string;
  readonly value: string;
}

export interface Preset {
  readonly id: string;
  readonly label: string;
  /** The compiled summary shown under the label. */
  readonly summary: string;
  /** The English that fills the authoring field. */
  readonly text: string;
  /** The policy it compiles to. */
  readonly draft: (now: number) => MandateDraft;
}

const QUOTE = 18;

function quote(amount: number): string {
  return (BigInt(amount) * 10n ** BigInt(QUOTE)).toString();
}

function expiry(now: number, days: number): number {
  return now + days * 24 * 60 * 60;
}

/** Leverage is stored in hundredths of a multiple, so 300 means 3x. */
function leverage(multiple: number): number {
  return multiple * 100;
}

function build(
  now: number,
  markets: readonly MarketSymbol[],
  maxLeverage: number,
  perMarket: number,
  total: number,
  loss: number,
  days: number,
  clauseTexts: readonly string[],
): MandateDraft {
  const clauses: PresetClause[] = [
    {
      id: "C1",
      text: clauseTexts[0] as string,
      value: markets.join(", "),
    },
    {
      id: "C2",
      text: clauseTexts[1] as string,
      value: formatLeverage(leverage(maxLeverage)),
    },
    {
      id: "C3",
      text: clauseTexts[2] as string,
      value: `${formatQuote(quote(perMarket))} USDso`,
    },
    {
      id: "C4",
      text: clauseTexts[3] as string,
      value: `${formatQuote(quote(total))} USDso`,
    },
    {
      id: "C5",
      text: clauseTexts[4] as string,
      value: loss === 0 ? "No loss limit" : `${formatQuote(quote(loss))} USDso`,
    },
    {
      id: "C6",
      text: clauseTexts[5] as string,
      value: formatExpiry(expiry(now, days)),
    },
  ];

  return {
    version: 1,
    allowedMarkets: markets.map((symbol) => MARKETS[symbol]),
    maxLeverageBps: leverage(maxLeverage),
    maxNotionalPerMarket: quote(perMarket),
    maxNotionalTotal: quote(total),
    maxLossPerWindow: quote(loss),
    expiresAt: expiry(now, days),
    clauses,
    rejected: [],
  };
}

/**
 * One market, 5x, 50 USDso a market, 20 USDso of loss a window.
 */
export const SCALPER: Preset = {
  id: "scalper",
  label: "Scalper",
  summary: "BTC-PERP · 5.00x · 50.00 USDso",
  text: [
    "Only trade BTC-PERP.",
    "Never above 5x.",
    "Never risk more than 50 USDso on one market.",
    "Never above 100 USDso in total.",
    "Stop at a loss of 20 USDso.",
    "Be flat in seven days.",
  ].join(" "),
  draft: (now) =>
    build(
      now,
      ["BTC-PERP"],
      5,
      50,
      100,
      20,
      7,
      [
        "Only trade BTC-PERP.",
        "Never above 5x.",
        "Never risk more than 50 USDso on one market.",
        "Never above 100 USDso in total.",
        "Stop at a loss of 20 USDso.",
        "Be flat in seven days.",
      ],
    ),
};

/**
 * Two markets, 2x, 500 USDso a market, no loss limit, 30 days.
 */
export const HEDGE: Preset = {
  id: "hedge",
  label: "Hedge",
  summary: "BTC-PERP, ETH-PERP · 2.00x · 500.00 USDso",
  text: [
    "Only trade BTC-PERP and ETH-PERP.",
    "Never above 2x.",
    "Never risk more than 500 USDso on one market.",
    "Never above 1000 USDso in total.",
    "No loss limit.",
    "Be flat in thirty days.",
  ].join(" "),
  draft: (now) =>
    build(
      now,
      ["BTC-PERP", "ETH-PERP"],
      2,
      500,
      1000,
      0,
      30,
      [
        "Only trade BTC-PERP and ETH-PERP.",
        "Never above 2x.",
        "Never risk more than 500 USDso on one market.",
        "Never above 1000 USDso in total.",
        "No loss limit.",
        "Be flat in thirty days.",
      ],
    ),
};

/**
 * The paper credit markets, 1x, 25 USDso a market, 7 days.
 *
 * Clause C1 is closed at six addresses, so the sandbox opens the six paper
 * credit markets with the deepest books rather than all twenty one.
 */
export const SANDBOX: Preset = {
  id: "sandbox",
  label: "Sandbox",
  summary: "6 paper markets · 1.00x · 25.00 USDso",
  text: [
    "Only trade BTC-PERP, ETH-PERP, SOL-PERP, XRP-PERP, DOGE-PERP and ADA-PERP.",
    "Never above 1x.",
    "Never risk more than 25 USDso on one market.",
    "Never above 50 USDso in total.",
    "No loss limit.",
    "Be flat in seven days.",
  ].join(" "),
  draft: (now) =>
    build(
      now,
      ["BTC-PERP", "ETH-PERP", "SOL-PERP", "XRP-PERP", "DOGE-PERP", "ADA-PERP"],
      1,
      25,
      50,
      0,
      7,
      [
        "Only trade BTC-PERP, ETH-PERP, SOL-PERP, XRP-PERP, DOGE-PERP and ADA-PERP.",
        "Never above 1x.",
        "Never risk more than 25 USDso on one market.",
        "Never above 50 USDso in total.",
        "No loss limit.",
        "Be flat in seven days.",
      ],
    ),
};

/**
 * Every preset, in the order the authoring screen shows them.
 */
export const PRESETS: readonly Preset[] = [SCALPER, HEDGE, SANDBOX];

/**
 * The canonical encoding of a draft, which is what the hash covers.
 */
export function canonicalOf(draft: MandateDraft): CanonicalDraft {
  return {
    version: draft.version,
    allowedMarkets: draft.allowedMarkets,
    maxLeverageBps: draft.maxLeverageBps,
    maxNotionalPerMarket: draft.maxNotionalPerMarket,
    maxNotionalTotal: draft.maxNotionalTotal,
    maxLossPerWindow: draft.maxLossPerWindow,
    expiresAt: draft.expiresAt,
    clauses: draft.clauses.map((clause) => ({ id: clause.id, text: clause.text })),
  };
}

/**
 * The canonical JSON of a draft, for display and for the hash.
 */
export function canonicalJsonOf(draft: MandateDraft): string {
  return canonicalDraftJson(canonicalOf(draft));
}
