import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { formatQuote, reasonCode } from "@mandate/policy";
import { findDecision } from "@/lib/chain/reads";
import { explorerTx } from "@/lib/chain/chain";
import { CopyReceiptLink } from "@/components/wallet/CopyReceiptLink";

type ReceiptProps = { params: { id: string } };

export const metadata: Metadata = {
  title: "Public decision receipt | Mandate",
  description: "A public Mandate decision read from Somnia Hideki testnet.",
  openGraph: {
    title: "Public decision receipt | Mandate",
    description: "A public Mandate decision read from Somnia Hideki testnet.",
    type: "article",
  },
}

/** Public receipt rendered from the Decision event, including reverted order references. */
export const dynamic = "force-dynamic";

export default async function ReceiptPage({ params }: ReceiptProps) {
  const decision = await findDecision(params.id).catch(() => undefined);
  if (!decision) notFound();

  const reason = reasonCode(decision.code);
  const title = decision.admitted ? "Admitted" : "Refused";
  const hasRefusedTransaction = !/^0x0{64}$/i.test(decision.txRef);
  const attemptHash = hasRefusedTransaction ? decision.txRef : decision.txHash;
  const demoClause =
    decision.policyHash.toLowerCase() === "0x3af1eb5dcbc80c5d66fcc7c9386e6593a761f6b2948b45bf2ea9ba90b503a681" &&
    decision.clause === 3
      ? "Never risk more than 200 USDso on one market."
      : null;
  const sentence =
    demoClause
      ? "“" + demoClause + "”"
      : (reason?.copy ?? "The policy refused this order.")
          .replace("{SYMBOL}", "BTC-PERP")
          .replace("{after}", formatQuote(decision.compared))
          .replace("{cap}", formatQuote(decision.limit));

  return (
    <main className="mx-auto min-h-[100dvh] max-w-[52rem] px-5 py-12 sm:px-8 lg:py-20">
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

          <h1 className="mt-6 font-display text-[clamp(1.9rem,3.6vw,3.2rem)] font-extrabold uppercase leading-none tracking-[0.03em] text-signal-on-plate [font-stretch:62%]">
            {title}
          </h1>
          <p className="mt-5 text-[1.125rem] leading-[1.5] text-plate-ink">{sentence}</p>

          <div className="mt-7 flex flex-wrap items-end justify-between gap-6">
            <span className="font-mono text-[0.8125rem] font-medium tabular-nums text-plate-ink-muted">
              Code 0x{decision.code.toString(16).toUpperCase().padStart(2, "0")} · Clause C{decision.clause}
            </span>
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
              {hasRefusedTransaction ? "Refused order" : "Order transaction"}
            </p>
            <a
              href={explorerTx(attemptHash)}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-1 inline-block break-all font-mono text-[0.8125rem] tabular-nums text-plate-ink underline decoration-rule-plate underline-offset-4"
            >
              {attemptHash}
            </a>
            {hasRefusedTransaction ? (
              <div className="mt-5">
                <p className="font-mono text-[0.6875rem] uppercase tracking-[0.16em] text-plate-ink-muted">
                  Decision record
                </p>
                <a
                  href={explorerTx(decision.txHash)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-1 inline-block break-all font-mono text-[0.8125rem] tabular-nums text-plate-ink underline decoration-rule-plate underline-offset-4"
                >
                  {decision.txHash}
                </a>
              </div>
            ) : null}
            <div className="mt-5">
              <CopyReceiptLink />
            </div>
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
    </main>
  );
}
