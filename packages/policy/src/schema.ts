/**
 * The draft schema.
 *
 * Zod is the real guard in this repository. The compiler route hands the
 * model's output to `mandateDraftSchema`, and anything that does not fit is
 * rejected rather than coerced.
 */

import { z } from "zod";

/** The six clause identifiers, in policy order. */
export const CLAUSE_IDS = ["C1", "C2", "C3", "C4", "C5", "C6"] as const;

export type ClauseId = (typeof CLAUSE_IDS)[number];

/** A 0x prefixed, 40 hex digit EVM address. */
export const addressSchema = z
  .string()
  .regex(/^0x[0-9a-fA-F]{40}$/, "not an EVM address");

/** A base ten integer, carried as a string so no value passes through a float. */
export const uint256DecimalSchema = z
  .string()
  .regex(/^\d{1,78}$/, "not a base ten integer");

/** One clause: the user's own sentence next to the value it compiled to. */
export const clauseSchema = z.object({
  id: z.enum(CLAUSE_IDS),
  text: z.string().min(1).max(600),
  value: z.string().min(1).max(120),
});

/** A sentence the policy language cannot express. */
export const rejectionSchema = z.object({
  text: z.string().min(1).max(600),
  code: z.literal("E_UNEXPRESSIBLE"),
});

/**
 * The compiled policy, as the compiler produces it and the review screen shows it.
 */
export const mandateDraftSchema = z.object({
  version: z.literal(1),
  allowedMarkets: z.array(addressSchema).max(6),
  maxLeverageBps: z.number().int().min(100).max(10_000),
  maxNotionalPerMarket: uint256DecimalSchema,
  maxNotionalTotal: uint256DecimalSchema,
  maxLossPerWindow: uint256DecimalSchema,
  expiresAt: z.number().int().min(0).max(Number.MAX_SAFE_INTEGER),
  clauses: z.array(clauseSchema).max(6),
  rejected: z.array(rejectionSchema).max(12),
});

export type MandateDraft = z.infer<typeof mandateDraftSchema>;
export type DraftClause = z.infer<typeof clauseSchema>;
export type DraftRejection = z.infer<typeof rejectionSchema>;

/**
 * The strict object the model is allowed to return.
 *
 * Every key is listed. A key the model invents is dropped by the schema and
 * logged by the route during development, never silently carried into a policy.
 */
export const modelDraftSchema = z
  .object({
    version: z.literal(1).default(1),
    allowedMarkets: z.array(addressSchema).max(6).default([]),
    maxLeverageBps: z.number().int().min(100).max(10_000).default(100),
    maxNotionalPerMarket: uint256DecimalSchema.default("0"),
    maxNotionalTotal: uint256DecimalSchema.default("0"),
    maxLossPerWindow: uint256DecimalSchema.default("0"),
    expiresAt: z.number().int().min(0).default(0),
    clauses: z
      .array(
        z.object({
          id: z.enum(CLAUSE_IDS),
          text: z.string().min(1).max(600),
          value: z.string().min(1).max(120),
        }),
      )
      .max(6)
      .default([]),
    rejected: z
      .array(
        z.object({
          text: z.string().min(1).max(600),
          code: z.literal("E_UNEXPRESSIBLE"),
        }),
      )
      .max(12)
      .default([]),
  });

export type ModelDraft = z.infer<typeof modelDraftSchema>;


