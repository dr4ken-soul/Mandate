"use client";

import Link from "next/link";
import { useAccount } from "wagmi";
import { formatQuote } from "@mandate/policy";
import { useMandate } from "@/lib/chain/useMandate";
import { listDecisions } from "@/lib/chain/reads";
import { useEffect, useState } from "react";

/**
 * The overview.
 *
 * Three blocks: the headroom against every clause, the enforcement strip and
 * the last decisions.
 */
export default function OverviewPage() {
  const { address } = useAccount();
  const { mandate, enforcementMode } = useMandate(address);
  const [recent, setRecent] = useState<
    { txHash: string; blockNumber: bigint; admitted: boolean; code: number }[]
  >([]);

  useEffect(() => {
    const read = async () => {
      try {
        const rows = await listDecisions();
        setRecent(
          rows.slice(0, 5).map((row) => ({
            txHash: row.txHash,
            blockNumber: row.blockNumber,
            admitted: row.admitted,
            code: row.code,
          })),
        );
      } catch {
        setRecent([]);
      }
    };
    void read();
    const timer = window.setInterval(read, 20_000);
    return () => window.clearInterval(timer);
  }, []);

  const rows = mandate
    ? [
        { clause: "C3", limit: mandate.maxNotionalPerMarket, current: mandate.totalNotional },
        { clause: "C4", limit: mandate.maxNotionalTotal, current: mandate.totalNotional },
        {
          clause: "C5",
          limit: mandate.maxLossPerWindow,
          current: mandate.epochStartEquity > mandate.equity ? mandate.epochStartEquity - mandate.equity : 0n,
        },
      ]
    : [];

  return (
    <div className="space-y-10">
      <section>
        <h1 className="font-display text-[clamp(1.6rem,3vw,2.4rem)] font-bold leading-[1.05] tracking-[-0.02em] text-ink [font-stretch:70%]">
          Exposure against the mandate
        </h1>

        <div className="mt-6 border-t border-rule-strong">
          <div className="hidden grid-cols-[5rem_9rem_1fr_9rem] gap-x-4 border-b border-rule-hair py-2 sm:grid">
            <span className="font-mono text-[0.6875rem] uppercase tracking-[0.18em] text-ink-tertiary">
              Clause
            </span>
            <span className="font-mono text-[0.6875rem] uppercase tracking-[0.18em] text-ink-tertiary">
              Limit
            </span>
            <span className="font-mono text-[0.6875rem] uppercase tracking-[0.18em] text-ink-tertiary">
              Current
            </span>
            <span className="text-right font-mono text-[0.6875rem] uppercase tracking-[0.18em] text-ink-tertiary">
              Headroom
            </span>
          </div>

          {rows.length === 0 ? (
            <p className="border-b border-rule-hair py-10 text-center font-mono text-[0.8125rem] text-ink-secondary">
              No mandate is registered for this wallet.
            </p>
          ) : (
            rows.map((row) => {
              const used = row.current > row.limit;
              const ratio = row.limit === 0n ? 0n : (row.current * 100n) / row.limit;
              return (
                <div
                  key={row.clause}
                  className="grid grid-cols-[5rem_9rem_1fr_9rem] items-baseline gap-x-4 border-b border-rule-hair py-3"
                >
                  <span className="font-mono text-[0.75rem] uppercase tracking-[0.12em] text-ink">
                    {row.clause}
                  </span>
                  <span className="font-mono text-[0.8125rem] tabular-nums text-ink-secondary">
                    {formatQuote(row.limit)}
                  </span>
                  <span className="font-mono text-[0.8125rem] tabular-nums text-ink">
                    {formatQuote(row.current)}
                  </span>
                  <span className="flex items-center justify-end gap-2">
                    <span className="h-[3px] w-16 bg-rule-hair">
                      <span
                        className={`block h-[3px] ${used ? "bg-signal" : "bg-ink"}`}
                        style={{ width: `${Math.min(100, Number(ratio))}%` }}
                      />
                    </span>
                    <span className="font-mono text-[0.75rem] tabular-nums text-ink-secondary">
                      {formatQuote(row.limit > row.current ? row.limit - row.current : 0n)}
                    </span>
                  </span>
                </div>
              );
            })
          )}
        </div>

        <Link
          href="/console/mandates/new"
          className="mt-6 inline-flex h-11 items-center border border-rule-strong px-5 font-mono text-[0.75rem] uppercase tracking-[0.14em] text-ink transition-colors duration-[220ms] hover:bg-paper-band"
        >
          Register a mandate
        </Link>
      </section>

      <section className="border border-rule-plate bg-plate p-6">
        <div className="flex flex-wrap items-baseline justify-between gap-3 border-b border-rule-plate pb-3">
          <h2 className="font-mono text-[0.6875rem] uppercase tracking-[0.2em] text-plate-ink-muted">
            Enforcement
          </h2>
          <span
            className={`font-mono text-[0.6875rem] uppercase tracking-[0.2em] ${
              enforcementMode === "CHAIN" ? "text-plate-ink" : "text-signal-on-plate"
            }`}
          >
            {enforcementMode}
          </span>
        </div>
        <dl className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div>
            <dt className="font-mono text-[0.6875rem] uppercase tracking-[0.16em] text-plate-ink-muted">
              Subscription
            </dt>
            <dd className="mt-1 font-mono text-[0.8125rem] tabular-nums text-plate-ink">
              {enforcementMode === "CHAIN" ? "Registered" : "Keeper"}
            </dd>
          </div>
          <div>
            <dt className="font-mono text-[0.6875rem] uppercase tracking-[0.16em] text-plate-ink-muted">
              Last callback
            </dt>
            <dd className="mt-1 font-mono text-[0.8125rem] tabular-nums text-plate-ink">
              {recent.length > 0 ? `Block ${recent[0]?.blockNumber.toString()}` : "None"}
            </dd>
          </div>
          <div>
            <dt className="font-mono text-[0.6875rem] uppercase tracking-[0.16em] text-plate-ink-muted">
              Balance floor
            </dt>
            <dd className="mt-1 font-mono text-[0.8125rem] tabular-nums text-plate-ink">32 STT</dd>
          </div>
        </dl>
        {enforcementMode !== "CHAIN" ? (
          <p className="mt-4 max-w-[60ch] font-sans text-[0.875rem] leading-[1.6] text-plate-ink-muted">
            Enforcement runs from a published keeper key rather than a chain subscription, so a callback
            waits for the keeper to notice it.
          </p>
        ) : null}
      </section>

      <section>
        <h2 className="font-mono text-[0.6875rem] uppercase tracking-[0.2em] text-ink-tertiary">
          Recent decisions
        </h2>
        <div className="mt-4 border-t border-rule-strong">
          {recent.length === 0 ? (
            <p className="border-b border-rule-hair py-10 text-center font-mono text-[0.8125rem] text-ink-secondary">
              No decisions recorded for this mandate yet.
            </p>
          ) : (
            recent.map((row) => (
              <Link
                key={`${row.txHash}-${row.blockNumber.toString()}`}
                href={`/console/decisions/${row.txHash}`}
                className="grid grid-cols-[7rem_1fr_6rem] items-baseline gap-x-4 border-b border-rule-hair py-3 transition-colors duration-[120ms] hover:bg-paper-band"
              >
                <span className="font-mono text-[0.75rem] tabular-nums text-ink-tertiary">
                  {row.blockNumber.toString()}
                </span>
                <span className="font-sans text-[0.9375rem] text-ink-secondary">
                  {row.admitted ? "Order admitted" : "Order refused"}
                </span>
                <span
                  className={`text-right font-mono text-[0.75rem] tabular-nums ${
                    row.admitted ? "text-ink" : "text-signal-text"
                  }`}
                >
                  0x{row.code.toString(16).toUpperCase().padStart(2, "0")}
                </span>
              </Link>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
