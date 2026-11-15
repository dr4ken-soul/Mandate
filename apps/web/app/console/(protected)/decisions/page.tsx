import Link from "next/link";
import { decisionTargetHash, listDecisions } from "@/lib/chain/reads";
import { reasonCode } from "@mandate/policy";
import { explorerTx } from "@/lib/chain/chain";

/**
 * The decision ledger.
 *
 * A real table, built from chain events.
 */
export const dynamic = "force-dynamic";

export default async function DecisionsPage() {
  let rows: Awaited<ReturnType<typeof listDecisions>> = [];
  let failed = false;
  try {
    rows = await listDecisions();
  } catch {
    failed = true;
  }

  return (
    <div>
      <h1 className="font-display text-[clamp(1.6rem,3vw,2.4rem)] font-bold leading-[1.05] tracking-[-0.02em] text-ink [font-stretch:70%]">
        Decisions
      </h1>
      <p className="mt-3 max-w-[62ch] font-sans text-[0.9375rem] leading-[1.6] text-ink-secondary">
        Every row is an event read from the chain. Clearing the browser changes nothing.
      </p>

      {failed ? (
        <p className="mt-8 border-y border-rule-hair py-10 font-mono text-[0.8125rem] text-ink-secondary">
          The chain read failed, so the table is empty on purpose.
        </p>
      ) : rows.length === 0 ? (
        <p className="mt-8 border-y border-rule-hair py-10 text-center font-mono text-[0.8125rem] text-ink-secondary">
          No decisions recorded for this mandate yet.
        </p>
      ) : (
        <table className="mt-8 w-full border-collapse">
          <thead>
            <tr className="border-b border-rule-strong">
              <th className="py-2 text-left font-mono text-[0.6875rem] uppercase tracking-[0.18em] text-ink-tertiary">
                Block
              </th>
              <th className="py-2 text-left font-mono text-[0.6875rem] uppercase tracking-[0.18em] text-ink-tertiary">
                Market
              </th>
              <th className="py-2 text-left font-mono text-[0.6875rem] uppercase tracking-[0.18em] text-ink-tertiary">
                Intent
              </th>
              <th className="py-2 text-left font-mono text-[0.6875rem] uppercase tracking-[0.18em] text-ink-tertiary">
                Result
              </th>
              <th className="py-2 text-left font-mono text-[0.6875rem] uppercase tracking-[0.18em] text-ink-tertiary">
                Code
              </th>
              <th className="py-2 text-left font-mono text-[0.6875rem] uppercase tracking-[0.18em] text-ink-tertiary">
                Transaction
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const reason = reasonCode(row.code);
              return (
                <tr key={`${row.txHash}-${row.blockNumber.toString()}`} className="border-b border-rule-hair">
                  <td className="py-3 font-mono text-[0.75rem] tabular-nums text-ink-tertiary">
                    {row.blockNumber.toString()}
                  </td>
                  <td className="py-3 font-mono text-[0.75rem] uppercase tracking-[0.1em] text-ink">
                    {shortMarket(row.market)}
                  </td>
                  <td className="py-3 font-sans text-[0.9375rem] text-ink-secondary">
                    {row.admitted ? "Order admitted" : (reason?.name ?? "Refused")}
                  </td>
                  <td
                    className={`py-3 font-mono text-[0.6875rem] font-medium uppercase tracking-[0.08em] ${
                      row.admitted ? "text-ink" : "text-signal-text"
                    }`}
                  >
                    {row.admitted ? "Admitted" : "Refused"}
                  </td>
                  <td className="py-3 font-mono text-[0.75rem] tabular-nums text-ink">
                    0x{row.code.toString(16).toUpperCase().padStart(2, "0")}
                  </td>
                  <td className="py-3 font-mono text-[0.75rem] tabular-nums">
                    <Link href={`/console/decisions/${decisionTargetHash(row)}`} className="text-ink-secondary hover:text-ink">
                      {decisionTargetHash(row).slice(0, 10)}…{decisionTargetHash(row).slice(-4)}
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}

      <p className="mt-8 font-mono text-[0.6875rem] uppercase tracking-[0.16em] text-ink-tertiary">
        Explorer ·{" "}
        <a
          href={rows[0] ? explorerTx(rows[0].txHash) : "https://explorer.testnet.somnia.network/tokyo"}
          className="text-ink-secondary hover:text-ink"
        >
          latest decision
        </a>
      </p>
    </div>
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
