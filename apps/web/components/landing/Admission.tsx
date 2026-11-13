"use client";

import { motion, useReducedMotion } from "motion/react";

const ROWS = [
  { step: "01", check: "Mandate active", from: "Mandate status read from storage at the current block", code: "0x01" },
  { step: "02", check: "Executor authorised", from: "The registered executor and the operator registry", code: "0x02" },
  { step: "03", check: "Not expired", from: "The current block time against C6", code: "0x03" },
  { step: "04", check: "Market allowed", from: "C1 set", code: "0x04" },
  { step: "05", check: "Price on tick", from: "Pool tick size", code: "0x05" },
  { step: "06", check: "Size on lot", from: "Pool lot size", code: "0x06" },
  { step: "07", check: "Market notional", from: "C3 cap plus the notional of the order being requested", code: "0x08" },
  { step: "08", check: "Total notional", from: "C4 cap plus the notional of the order being requested", code: "0x09" },
  { step: "09", check: "Leverage", from: "C2 against equity at this block", code: "0x0A" },
];

/**
 * Admission, check by check.
 *
 * A ruled table, not a stack of cards. One row carries the refusal state.
 */
export function Admission() {
  const reduced = useReducedMotion();

  return (
    <section id="admission" className="relative z-[0] w-full bg-paper py-16 sm:py-20 lg:py-28">
      <div className="mx-auto w-full max-w-[1600px] px-5 sm:px-8 lg:px-12">
        <span className="font-mono text-[0.6875rem] font-medium uppercase tracking-[0.2em] text-ink-tertiary">
          How admission works
        </span>
        <h2 className="mt-5 max-w-[22ch] font-display text-[clamp(2.1rem,4.2vw,3.5rem)] font-bold leading-[0.94] tracking-[-0.02em] text-ink text-balance [font-stretch:70%]">
          One order, nine checks.
        </h2>

        <div className="mt-12 hidden grid-cols-[3.5rem_15rem_1fr_6rem] gap-x-6 border-b border-rule-strong pb-2 sm:grid">
          <span className="font-mono text-[0.6875rem] uppercase tracking-[0.2em] text-ink-tertiary">Step</span>
          <span className="font-mono text-[0.6875rem] uppercase tracking-[0.2em] text-ink-tertiary">Check</span>
          <span className="font-mono text-[0.6875rem] uppercase tracking-[0.2em] text-ink-tertiary">Derived from</span>
          <span className="text-right font-mono text-[0.6875rem] uppercase tracking-[0.2em] text-ink-tertiary">
            If it fails
          </span>
        </div>

        <motion.div
          initial="initial"
          whileInView="animate"
          viewport={{ once: false, amount: 0.2 }}
          variants={{ initial: {}, animate: { transition: { staggerChildren: 0.035 } } }}
        >
          {ROWS.map((row) => {
            const refuses = row.step === "07";
            return (
              <motion.div
                key={row.step}
                variants={{
                  initial: reduced
                    ? { opacity: 0 }
                    : { opacity: 0, y: 10, filter: "blur(4px)" },
                  animate: reduced
                    ? { opacity: 1 }
                    : { opacity: 1, y: 0, filter: "blur(0px)" },
                }}
                transition={{ duration: reduced ? 0.01 : 0.42, ease: [0.16, 1, 0.3, 1] }}
                className={`grid grid-cols-[2.5rem_1fr_auto] items-baseline gap-x-4 border-b border-rule-hair py-4 sm:grid-cols-[3.5rem_15rem_1fr_6rem] sm:gap-x-6 ${
                  refuses ? "-ml-3 border-l-2 border-l-signal bg-signal-wash pl-3" : ""
                }`}
              >
                <span
                  className={`font-mono text-[0.6875rem] tabular-nums ${refuses ? "text-signal-text" : "text-ink-tertiary"}`}
                >
                  {row.step}
                </span>
                <span
                  className={`font-mono text-[0.75rem] uppercase tracking-[0.12em] ${refuses ? "text-signal-text" : "text-ink"}`}
                >
                  {row.check}
                </span>
                <span className="font-sans text-[0.9375rem] leading-[1.55] text-ink-secondary">
                  {row.from}
                </span>
                <span
                  className={`justify-self-end font-mono text-[0.6875rem] tabular-nums ${
                    refuses
                      ? "rounded-[var(--radius-tag)] bg-signal px-2 py-[3px] font-medium uppercase tracking-[0.08em] text-paper"
                      : "rounded-[var(--radius-tag)] border border-rule-strong px-[6px] py-[2px]"
                  }`}
                >
                  {refuses ? "Refused" : row.code}
                </span>
              </motion.div>
            );
          })}
        </motion.div>

        <p className="mt-6 max-w-[70ch] font-sans text-[0.875rem] leading-[1.6] text-ink-secondary">
          Two further checks run after these nine: the venue&apos;s own position cap and the
          availability of paper credit. When the venue binds first, the refusal still returns a code,
          because a silent pass is the one outcome this contract is not allowed to produce.
        </p>
      </div>
    </section>
  );
}

