import Link from "next/link";
import { copyFor, formatQuote, reasonCode } from "@mandate/policy";
import { listDecisions, type DecisionRow } from "@/lib/chain/reads";

/**
 * The decision ledger.
 *
 * Every row is an event read from the chain. There is no cache and no local
 * copy of the record.
 */
export async function Ledger() {
  let rows: DecisionRow[] = [];
  let failed = false;
  try {
    rows = await listDecisions();
  } catch {
    failed = true;
  }

  return (
    <section
      id="decisions"
      className="relative z-[0] w-full border-y border-rule-hair bg-paper-band py-16 sm:py-20 lg:py-28"
    >
      <div className="mx-auto w-full max-w-[1600px] px-5 sm:px-8 lg:px-12">
        <span className="font-mono text-[0.6875rem] font-medium uppercase tracking-[0.2em] text-ink-tertiary">
          The record
        </span>
        <h2 className="mt-5 font-display text-[clamp(2.1rem,4.2vw,3.5rem)] font-bold leading-[0.94] tracking-[-0.02em] text-ink [font-stretch:70%]">
          Every decision, from events
        </h2>
        <p className="mt-6 max-w-[60ch] font-sans text-[1.0625rem] leading-[1.65] text-ink-secondary">
          Nothing in this table is cached. Clear the browser and it rebuilds from logs, because the
          chain is the only source that cannot drift from itself.
        </p>

        <div className="mt-8 border-t border-rule-strong">
          <div className="hidden grid-cols-[6.5rem_7rem_1fr_7.5rem_5rem_8rem] gap-x-4 border-b border-rule-hair py-2 md:grid">
            <span className="font-mono text-[0.6875rem] uppercase tracking-[0.18em] text-ink-tertiary">
              Time
            </span>
            <span className="font-mono text-[0.6875rem] uppercase tracking-[0.18em] text-ink-tertiary">
              Market
            </span>
            <span className="font-mono text-[0.6875rem] uppercase tracking-[0.18em] text-ink-tertiary">
              Intent
            </span>
            <span className="font-mono text-[0.6875rem] uppercase tracking-[0.18em] text-ink-tertiary">
              Result
            </span>
            <span className="font-mono text-[0.6875rem] uppercase tracking-[0.18em] text-ink-tertiary">
              Code
            </span>
            <span className="text-right font-mono text-[0.6875rem] uppercase tracking-[0.18em] text-ink-tertiary">
              Tx
            </span>
          </div>

          {failed ? (
            <div className="border-b border-rule-hair py-14 text-center">
              <p className="font-mono text-[0.8125rem] text-ink-secondary">
                The chain read failed. Nothing here is estimated, so the table is empty on purpose.
              </p>
            </div>
          ) : rows.length === 0 ? (
            <div className="border-b border-rule-hair py-14 text-center">
              <p className="font-mono text-[0.8125rem] text-ink-secondary">
                No decisions recorded for this mandate yet.
              </p>
              <Link
                href="/console/mandates/new"
                className="mt-4 inline-block border-b border-ink pb-1 font-mono text-[0.6875rem] uppercase tracking-[0.18em] text-ink"
              >
                Register a mandate
              </Link>
            </div>
          ) : (
            rows.slice(0, 6).map((row) => {
              const reason = reasonCode(row.code);
              return (
                <Link
                  key={`${row.txHash}-${row.blockNumber}`}
                  href={`/console/decisions/${row.txHash}`}
                  className="group grid grid-cols-1 gap-x-4 gap-y-1 border-b border-rule-hair py-4 transition-colors duration-[120ms] hover:bg-paper md:grid-cols-[6.5rem_7rem_1fr_7.5rem_5rem_8rem]"
                >
                  <span className="font-mono text-[0.75rem] tabular-nums text-ink-tertiary">
                    {row.blockNumber.toString()}
                  </span>
                  <span className="font-mono text-[0.75rem] uppercase tracking-[0.1em] text-ink">
                    {shortMarket(row.market)}
                  </span>
                  <span className="font-sans text-[0.9375rem] text-ink-secondary">
                    {row.admitted ? "Order admitted" : (reason?.name ?? "Refused")}
                  </span>
                  <span
                    className={`font-mono text-[0.6875rem] font-medium uppercase tracking-[0.08em] ${
                      row.admitted ? "text-ink" : "text-signal-text"
                    }`}
                  >
                    {row.admitted ? "Admitted" : "Refused"}
                  </span>
                  <span className="font-mono text-[0.75rem] tabular-nums text-ink">
                    0x{row.code.toString(16).toUpperCase().padStart(2, "0")}
                  </span>
                  <span className="font-mono text-[0.75rem] tabular-nums text-ink-secondary group-hover:text-ink md:justify-self-end">
                    {row.txHash.slice(0, 10)}…{row.txHash.slice(-4)}
                  </span>
                </Link>
              );
            })
          )}
        </div>

        {rows.length > 0 ? (
          <p className="mt-4 max-w-[70ch] font-sans text-[0.8125rem] leading-[1.6] text-ink-secondary">
            The refusal below the cap is the one the contract produced:{" "}
            {copyFor(0x08).replace("{SYMBOL}", "BTC-PERP").replace("{after}", formatQuote(rows[0]?.compared ?? 0n)).replace("{cap}", formatQuote(rows[0]?.limit ?? 0n))}
          </p>
        ) : null}
      </div>
    </section>
  );
}

function shortMarket(market: string): string {
  if (market.toLowerCase() === (process.env.NEXT_PUBLIC_BTC_POOL_ADDRESS ?? "").toLowerCase()) {
    return "BTC-PERP";
  }
  if (market.toLowerCase() === (process.env.NEXT_PUBLIC_ETH_POOL_ADDRESS ?? "").toLowerCase()) {
    return "ETH-PERP";
  }
  return `${market.slice(0, 6)}…`;
}
