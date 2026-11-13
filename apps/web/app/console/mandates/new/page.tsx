"use client";

import { useState } from "react";
import { useAccount, useWalletClient } from "wagmi";
import { PRESETS, formatLeverage, formatQuote, type MandateDraft } from "@mandate/policy";
import { mandateAbi } from "@/lib/chain/abi";

const EXAMPLE =
  "Never risk more than 200 USDso on one market. Never above 3x. Be flat by Friday.";

/**
 * The authoring screen.
 *
 * The rule is written first, the compiled value sits beside it, and nothing is
 * registered until the user has read both.
 */
export default function AuthorPage() {
  const { address } = useAccount();
  const { data: wallet } = useWalletClient();
  const [text, setText] = useState("");
  const [draft, setDraft] = useState<MandateDraft | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [registered, setRegistered] = useState<string | null>(null);

  const compile = async () => {
    setBusy(true);
    setError(null);
    setDraft(null);
    try {
      const response = await fetch("/api/compile", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ text }),
      });
      const payload = (await response.json()) as { draft?: MandateDraft; error?: string };
      if (!response.ok || !payload.draft) {
        setError(payload.error ?? "The compiler did not return a policy.");
        return;
      }
      setDraft(payload.draft);
    } catch {
      setError("The request did not reach the compiler.");
    } finally {
      setBusy(false);
    }
  };

  const register = async () => {
    if (!draft || !wallet || !address) return;
    setBusy(true);
    setError(null);
    try {
      const hash = await wallet.writeContract({
        address: process.env.NEXT_PUBLIC_MANDATE_ADDRESS as `0x${string}`,
        abi: mandateAbi,
        functionName: "register",
        args: [
          {
            allowedMarkets: draft.allowedMarkets as `0x${string}`[],
            maxLeverageBps: draft.maxLeverageBps,
            maxNotionalPerMarket: BigInt(draft.maxNotionalPerMarket),
            maxNotionalTotal: BigInt(draft.maxNotionalTotal),
            maxLossPerWindow: BigInt(draft.maxLossPerWindow),
            expiresAt: BigInt(draft.expiresAt),
          },
          address,
          draft.clauses.map((clause) => clause.text) as unknown as [
            string,
            string,
            string,
            string,
            string,
            string,
          ],
        ],
        chain: null,
      });
      setRegistered(hash);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message.slice(0, 200) : "The registration failed.");
    } finally {
      setBusy(false);
    }
  };

  const rejected = draft?.rejected ?? [];

  return (
    <div className="space-y-8">
      <section>
        <h1 className="font-display text-[clamp(1.6rem,3vw,2.4rem)] font-bold leading-[1.05] tracking-[-0.02em] text-ink [font-stretch:70%]">
          Write the rule
        </h1>
        <p id="author-hint" className="mt-3 max-w-[62ch] font-sans text-[0.9375rem] leading-[1.6] text-ink-secondary">
          The compiler reads the rule once and produces a policy of six clauses. Every number it
          produces is shown next to the sentence it came from before anything is registered.
        </p>

        <textarea
          value={text}
          onChange={(event) => setText(event.target.value)}
          aria-describedby="author-hint"
          placeholder={EXAMPLE}
          className="mt-6 min-h-[9rem] w-full resize-y border border-rule-strong bg-paper p-4 font-mono text-[0.875rem] leading-[1.6] text-ink placeholder:text-ink-tertiary focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-ink"
        />

        <div className="mt-4 flex flex-wrap gap-3">
          {PRESETS.map((preset) => (
            <button
              key={preset.id}
              type="button"
              onClick={() => {
                setText(preset.text);
                setDraft(null);
                setRegistered(null);
              }}
              className="h-11 border border-rule-strong px-4 text-left transition-colors duration-[220ms] hover:bg-paper-band"
            >
              <span className="block font-mono text-[0.75rem] uppercase tracking-[0.14em] text-ink">
                {preset.label}
              </span>
              <span className="mt-0.5 block font-mono text-[0.6875rem] text-ink-tertiary">
                {preset.summary}
              </span>
            </button>
          ))}
        </div>

        <div className="mt-6 flex flex-wrap items-center gap-4">
          <button
            type="button"
            onClick={compile}
            disabled={busy || text.trim().length === 0}
            className="h-12 border border-rule-strong px-6 font-mono text-[0.75rem] uppercase tracking-[0.14em] text-ink transition-colors duration-[220ms] hover:bg-paper-band disabled:opacity-45"
          >
            {busy ? "Compiling" : "Compile rules"}
          </button>
          {error ? (
            <p className="max-w-[52ch] font-mono text-[0.8125rem] text-signal-text">{error}</p>
          ) : null}
        </div>
      </section>

      {draft ? (
        <section>
          <h2 className="font-mono text-[0.6875rem] uppercase tracking-[0.2em] text-ink-tertiary">
            Review
          </h2>
          <div className="mt-4 border-t border-rule-strong">
            {draft.clauses.map((clause) => (
              <div
                key={clause.id}
                className="grid grid-cols-1 gap-x-6 gap-y-2 border-b border-rule-hair py-5 sm:grid-cols-[7rem_1fr_10rem]"
              >
                <span className="font-mono text-[0.6875rem] uppercase tracking-[0.2em] text-ink-tertiary">
                  {clause.id}
                </span>
                <p className="font-sans text-[0.9375rem] leading-[1.6] text-ink-secondary">
                  <span className="text-ink">“{clause.text}”</span>
                </p>
                <span className="font-mono text-[0.8125rem] tabular-nums text-ink sm:text-right">
                  {clause.value}
                </span>
              </div>
            ))}
            {rejected.map((item) => (
              <div
                key={item.text}
                className="grid grid-cols-1 gap-x-6 gap-y-2 border-b border-rule-hair py-5 sm:grid-cols-[7rem_1fr_10rem]"
              >
                <span className="font-mono text-[0.6875rem] uppercase tracking-[0.2em] text-signal-text">
                  Rejected
                </span>
                <p className="font-sans text-[0.9375rem] leading-[1.6] text-ink-secondary line-through decoration-1">
                  {item.text}
                </p>
                <span className="font-mono text-[0.8125rem] text-signal-text sm:text-right">
                  {item.code}
                </span>
              </div>
            ))}
          </div>

          <div className="mt-6 flex flex-wrap items-center gap-4">
            <button
              type="button"
              onClick={register}
              disabled={busy || rejected.length > 0}
              className="h-12 border border-rule-strong px-6 font-mono text-[0.75rem] uppercase tracking-[0.14em] text-ink transition-colors duration-[220ms] hover:bg-paper-band disabled:opacity-45"
            >
              Register mandate
            </button>
            {rejected.length > 0 ? (
              <p className="font-mono text-[0.8125rem] text-signal-text">
                One clause cannot be enforced on chain, so nothing is registered.
              </p>
            ) : null}
            {registered ? (
              <p className="font-mono text-[0.8125rem] text-ink">Registered {registered}</p>
            ) : null}
          </div>

          <dl className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3">
            <div>
              <dt className="font-mono text-[0.6875rem] uppercase tracking-[0.16em] text-ink-tertiary">
                C2 leverage
              </dt>
              <dd className="mt-1 font-mono text-[0.8125rem] tabular-nums text-ink">
                {formatLeverage(draft.maxLeverageBps)}
              </dd>
            </div>
            <div>
              <dt className="font-mono text-[0.6875rem] uppercase tracking-[0.16em] text-ink-tertiary">
                C3 cap
              </dt>
              <dd className="mt-1 font-mono text-[0.8125rem] tabular-nums text-ink">
                {formatQuote(draft.maxNotionalPerMarket)} USDso
              </dd>
            </div>
            <div>
              <dt className="font-mono text-[0.6875rem] uppercase tracking-[0.16em] text-ink-tertiary">
                C4 cap
              </dt>
              <dd className="mt-1 font-mono text-[0.8125rm] tabular-nums text-ink">
                {formatQuote(draft.maxNotionalTotal)} USDso
              </dd>
            </div>
          </dl>
        </section>
      ) : null}
    </div>
  );
}
