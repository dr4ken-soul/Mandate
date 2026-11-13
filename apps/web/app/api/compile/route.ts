import { NextResponse } from "next/server";
import { mandateDraftSchema, modelDraftSchema, REASON_CODES } from "@mandate/policy";

export const runtime = "nodejs";

/**
 * The compiler.
 *
 * One model call, a strict schema, and a refusal for anything the policy
 * language cannot express. Nothing else in the product calls a model.
 */
export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "The request was not JSON." }, { status: 400 });
  }

  const text = (body as { text?: unknown } | null)?.text;
  if (typeof text !== "string" || text.trim().length === 0) {
    return NextResponse.json({ error: "There was no rule to compile." }, { status: 400 });
  }

  const apiKey = process.env.COMPILER_API_KEY;
  const model = process.env.COMPILER_MODEL ?? "gpt-4o-mini";
  const base = process.env.COMPILER_API_BASE ?? "https://api.openai.com/v1";

  if (!apiKey) {
    return NextResponse.json(
      {
        error:
          "The compiler is not configured. Set COMPILER_API_KEY, or use a preset, which compiles without a model call.",
      },
      { status: 503 },
    );
  }

  const instructions = [
    "You translate trading rules into a fixed policy object.",
    "The policy language has six clauses and nothing else:",
    "C1 allowed markets, an array of perp pool addresses.",
    "C2 maximum leverage, in hundredths of a multiple, so 3x is 300.",
    "C3 maximum notional per market, in quote units with 18 decimals.",
    "C4 maximum total notional, in quote units with 18 decimals.",
    "C5 maximum loss per window, in quote units with 18 decimals, 0 for no limit.",
    "C6 expiry, in unix seconds.",
    "Keep the user's sentence for every clause in the clause text, word for word.",
    "A sentence that cannot be expressed is put in rejected with code E_UNEXPRESSIBLE.",
    "Never invent a value the user did not state. If a number is missing, use 0.",
    "Return JSON only.",
  ].join(" ");

  const schema = {
    name: "mandate_policy",
    strict: true,
    schema: {
      type: "object",
      additionalProperties: false,
      required: [
        "version",
        "allowedMarkets",
        "maxLeverageBps",
        "maxNotionalPerMarket",
        "maxNotionalTotal",
        "maxLossPerWindow",
        "expiresAt",
        "clauses",
        "rejected",
      ],
      properties: {
        version: { type: "integer", enum: [1] },
        allowedMarkets: { type: "array", items: { type: "string" } },
        maxLeverageBps: { type: "integer" },
        maxNotionalPerMarket: { type: "string" },
        maxNotionalTotal: { type: "string" },
        maxLossPerWindow: { type: "string" },
        expiresAt: { type: "integer" },
        clauses: {
          type: "array",
          items: {
            type: "object",
            additionalProperties: false,
            required: ["id", "text", "value"],
            properties: {
              id: { type: "string", enum: ["C1", "C2", "C3", "C4", "C5", "C6"] },
              text: { type: "string" },
              value: { type: "string" },
            },
          },
        },
        rejected: {
          type: "array",
          items: {
            type: "object",
            additionalProperties: false,
            required: ["text", "code"],
            properties: {
              text: { type: "string" },
              code: { type: "string", enum: ["E_UNEXPRESSIBLE"] },
            },
          },
        },
      },
    },
  };

  try {
    const response = await fetch(`${base}/chat/completions`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        temperature: 0,
        messages: [
          { role: "system", content: instructions },
          { role: "user", content: text },
        ],
        response_format: { type: "json_schema", json_schema: schema },
      }),
    });

    if (!response.ok) {
      const detail = await response.text();
      return NextResponse.json(
        { error: `The model refused the request: ${detail.slice(0, 200)}` },
        { status: 502 },
      );
    }

    const payload = (await response.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const content = payload.choices?.[0]?.message?.content;
    if (!content) {
      return NextResponse.json({ error: "The model returned nothing." }, { status: 502 });
    }

    const parsed = JSON.parse(content) as unknown;
    const model_ = modelDraftSchema.parse(parsed);
    const draft = mandateDraftSchema.parse(model_);

    return NextResponse.json({ draft });
  } catch (error) {
    const message = error instanceof Error ? error.message : "The compiler failed.";
    return NextResponse.json({ error: message.slice(0, 300) }, { status: 502 });
  }
}

void REASON_CODES;
