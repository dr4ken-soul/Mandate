import Link from "next/link";
import { notFound } from "next/navigation";
import { formatQuote, reasonCode } from "@mandate/policy";
import { findDecision } from "@/lib/chain/reads";
import { explorerTx } from "@/lib/chain/chain";

export const dynamic = "force-dynamic";

/**
 * The refusal receipt.
 *
 * Public, server rendered, and readable with the JavaScript switched off.
 * The event is the record.
 */
export default async function ReceiptPage({ params }: { params: { id: string } }) {
  const decision = await findDecision(params.id).catch(() => undefined);
  if (!decision) notFound();

  const reason = reasonCode(decision.code);
  const title = decision.admitted ? "Admitted" : "Refused";

  return (
    <div className="mx-auto max-w-[52rem]">
      <div className="border border-rule-plate p-[6px]">
        <div className="bg-plate p-6 lg:p-8">
          <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-rule-plate pb-3">
            <span className="font-mono text-[0.6875rem] uppercase tracking-[0.2em] text-plate-ink-muted">
              Decision · Block {decision.blockNumber.toString()}
            </span>
            <span className="font-mono text-[0.6875rem] uppercase tracking-[0.2em] text-plate-ink-muted">
              Mandate {decision.policyHash.slice(0, 10)}…{decision.policyHash.slice(-4)}
            </span>
          </div>

          <p className="mt-6 text-[1.25rem] leading-[1.5] text-plate-ink">
            {reason?.copy.replace("{SYMBOL}", "BTC-PERP").replace("{after}", formatQuote(decision.compared)).replace("{cap}", formatQuote(decision.limit))}
          </p>

          <div className="mt-7 flex flex-wrap items-end justify-between gap-6">
            <div className="flex items-end gap-4">
              <span className="font-display text-[clamp(1.9rem,3.6vw,3.2rem)] font-extrabold uppercase leading-none tracking-[0.03em] text-signal-on-plate [font-stretch:62%]">
                {title}
              </span>
              <span className="pb-1 font-mono text-[0.8125rem] font-medium tabular-nums text-plate-ink-muted">
                0x{decision.code.toString(16).toUpperCase().padStart(2, "0")}
              </span>
            </div>

            <dl className="grid grid-cols-2 gap-x-8 gap-y-2">
              <div>
                <dt className="font-mono text-[0.6875rem] uppercase tracking-[0.16em] text-plate-ink-muted">
                  Compared
                </dt>
                <dd className="mt-1 font-mono text-[0.8125rem] tabular-nums text-plate-ink">
                  {formatQuote(decision.compared)} USDso
                </dd>
              </div>
              <div>
                <dt className="font-mono text-[0.6875rem] uppercase tracking-[0.16em] text-plate-ink-muted">
                  Limit
                </dt>
                <dd className="mt-1 font-mono text-[0.8125rem] tabular-nums text-plate-ink">
                  {formatQuote(decision.limit)} USDso
                </dd>
              </div>
            </dl>
          </div>

          <div className="mt-7 border-t border-rule-plate pt-5">
            <p className="font-mono text-[0.6875rem] uppercase tracking-[0.16em] text-plate-ink-muted">
              Transaction
            </p>
            <a
              href={explorerTx(decision.txHash)}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-1 inline-block font-mono text-[0.8125rem] tabular-nums text-plate-ink underline decoration-rule-plate underline-offset-4"
            >
              {decision.txHash}
            </a>
          </div>
        </div>
      </div>

      <p className="mt-6 font-mono text-[0.75rem] text-ink-tertiary">
        Read from Somnia Hideki at block {decision.blockNumber.toString()}. Not a summary.
      </p>

      <div className="mt-6 flex items-center gap-4">
        <Link
          href="/console/decisions"
          className="font-mono text-[0.75rem] uppercase tracking-[0.14em] text-ink-secondary hover:text-ink"
        >
          All decisions
        </Link>
        <Link
          href="/"
          className="font-mono text-[0.75rem] uppercase tracking-[0.14em] text-ink-secondary hover:text-ink"
        >
          Mandate
        </Link>
      </div>
    </div>
  );
}
