"use client";

import { useAccount } from "wagmi";
import { useEffect, useState } from "react";
import { formatQuote } from "@mandate/policy";
import { marginBankAbi } from "@/lib/chain/abi";
import { publicClient } from "@/lib/chain/reads";
import { useMandate } from "@/lib/chain/useMandate";
import type { Address } from "viem";

interface Position {
  readonly pool: Address;
  readonly size: bigint;
  readonly entryPrice: bigint;
}

/**
 * Positions.
 *
 * The exposure an account carries, next to the clause it is closest to
 * breaching.
 */
export default function PositionsPage() {
  const { address } = useAccount();
  const { mandate } = useMandate(address);
  const [positions, setPositions] = useState<Position[]>([]);

  useEffect(() => {
    const read = async () => {
      if (!address) return;
      try {
        const pools = (await publicClient.readContract({
          address: process.env.NEXT_PUBLIC_MARGIN_BANK_ADDRESS as Address,
          abi: marginBankAbi,
          functionName: "getActivePerpPools",
          args: [address],
        })) as Address[];
        const rows = await Promise.all(
          pools.map(async (pool) => {
            const position = await publicClient.readContract({
              address: process.env.NEXT_PUBLIC_MARGIN_BANK_ADDRESS as Address,
              abi: marginBankAbi,
              functionName: "getPosition",
              args: [address, pool],
            });
            return { pool, size: position[0], entryPrice: position[1] };
          }),
        );
        setPositions(rows.filter((row) => row.size !== 0n));
      } catch {
        setPositions([]);
      }
    };
    void read();
    const timer = window.setInterval(read, 20_000);
    return () => window.clearInterval(timer);
  }, [address]);

  return (
    <div>
      <h1 className="font-display text-[clamp(1.6rem,3vw,2.4rem)] font-bold leading-[1.05] tracking-[-0.02em] text-ink [font-stretch:70%]">
        Positions
      </h1>
      <p className="mt-3 max-w-[62ch] font-sans text-[0.9375rem] leading-[1.6] text-ink-secondary">
        Every position, with the clause it is closest to breaching.
      </p>

      <div className="mt-8 border-t border-rule-strong">
        {positions.length === 0 ? (
          <p className="border-b border-rule-hair py-10 text-center font-mono text-[0.8125rem] text-ink-secondary">
            No open positions for this wallet.
          </p>
        ) : (
          positions.map((position) => (
            <div
              key={position.pool}
              className="grid grid-cols-[1fr_10rem_10rem] items-baseline gap-x-4 border-b border-rule-hair py-4"
            >
              <span className="font-mono text-[0.75rem] uppercase tracking-[0.1em] text-ink">
                {position.pool.slice(0, 10)}…
              </span>
              <span className="font-mono text-[0.8125rem] tabular-nums text-ink-secondary">
                {position.size.toString()}
              </span>
              <span className="text-right font-mono text-[0.8125rem] tabular-nums text-ink-secondary">
                {formatQuote(mandate?.maxNotionalPerMarket ?? 0n)}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
