"use client";

import { motion, useReducedMotion } from "motion/react";

export interface Metrics {
  readonly refusalGasMedian: number;
  readonly venueRevertGasMedian: number;
  readonly codeCount: number;
  readonly modelCallsOnPath: number;
  readonly runAt: string;
}

/**
 * The measured figures.
 *
 * Every number comes from a file a script wrote against the chain. There is no
 * fallback and no guess: without the file the section says so.
 */
export function MeasuredGrid({ metrics }: { metrics: Metrics | null }) {
  const reduced = useReducedMotion();

  const cells = metrics
    ? [
        {
          label: "Refusal gas, median",
          value: metrics.refusalGasMedian.toLocaleString("en-US"),
          note: "admit() revert on 50383, against the same order sent to the pool",
        },
        {
          label: "Venue revert gas, median",
          value: metrics.venueRevertGasMedian.toLocaleString("en-US"),
          note: "the pool's own revert for the identical order",
        },
        {
          label: "Reason codes wired",
          value: String(metrics.codeCount),
          note: "each with a Foundry test asserting the selector",
        },
        {
          label: "Model calls on the order path",
          value: String(metrics.modelCallsOnPath),
          note: "counted by static import analysis",
        },
      ]
    : [];

  return (
    <section id="measured" className="relative z-[0] w-full bg-paper py-16 sm:py-20 lg:py-28">
      <div className="mx-auto w-full max-w-[1600px] px-5 sm:px-8 lg:px-12">
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <h2 className="font-display text-[clamp(2.1rem,4.2vw,3.5rem)] font-bold leading-[0.94] tracking-[-0.02em] text-ink [font-stretch:70%]">
            Measured
          </h2>
          <p className="font-mono text-[0.6875rem] uppercase tracking-[0.18em] text-ink-tertiary">
            {metrics
              ? `Written by scripts/measure.ts · run ${metrics.runAt}`
              : "Written by scripts/measure.ts"}
          </p>
        </div>

        {metrics ? (
          <div className="mt-10 grid grid-cols-2 divide-x divide-rule-hair border-y border-rule-strong lg:grid-cols-4">
            {cells.map((cell, index) => (
              <motion.div
                key={cell.label}
                initial={reduced ? { opacity: 0 } : { opacity: 0, y: 8 }}
                whileInView={reduced ? { opacity: 1 } : { opacity: 1, y: 0 }}
                viewport={{ once: false, amount: 0.3 }}
                transition={{
                  duration: reduced ? 0.01 : 0.42,
                  ease: [0.16, 1, 0.3, 1],
                  delay: index * 0.05,
                }}
                className="px-5 py-7 sm:px-6 sm:py-9"
              >
                <div className="font-display text-[clamp(2rem,4vw,3.25rem)] font-extrabold leading-none tabular-nums text-ink [font-stretch:62%]">
                  {cell.value}
                </div>
                <div className="mt-3 font-mono text-[0.6875rem] uppercase tracking-[0.18em] text-ink">
                  {cell.label}
                </div>
                <p className="mt-2 font-sans text-[0.8125rem] leading-[1.5] text-ink-secondary">
                  {cell.note}
                </p>
              </motion.div>
            ))}
          </div>
        ) : (
          <p className="mt-10 border-y border-rule-hair py-10 font-mono text-[0.8125rem] text-ink-secondary">
            No measurement run recorded. Run <span className="text-ink">npm run measure</span> against
            50383 and rebuild.
          </p>
        )}

        <p className="mt-5 max-w-[74ch] font-sans text-[0.875rem] leading-[1.6] text-ink-secondary">
          These are testnet figures from one deployment, not a benchmark. Gas on mainnet will differ,
          and both figures move with the venue, because the refusal costs what the checks cost.
        </p>
      </div>
    </section>
  );
}
