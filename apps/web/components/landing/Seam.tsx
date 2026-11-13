"use client";

import { motion, useReducedMotion } from "motion/react";

/**
 * The seam.
 *
 * Two ledgers side by side. The counters at the bottom are the whole argument,
 * so they sit on the same baseline at the same size and nothing decorates the
 * zero.
 */
export function Seam() {
  const reduced = useReducedMotion();

  const authoring = [
    "You write the rule in plain English.",
    "One model call returns a policy object.",
    "Every value is validated against a closed schema.",
    "You sign the policy hash.",
  ];

  const execution = [
    "The executor calls admit().",
    "The contract re-derives equity and notional from state at this block.",
    "Nine checks run, six of them yours.",
    "The order is placed, or it reverts with one code.",
  ];

  const reveal = (delay: number) => ({
    initial: reduced ? { opacity: 0 } : { opacity: 0, y: 10, filter: "blur(4px)" },
    whileInView: reduced ? { opacity: 1 } : { opacity: 1, y: 0, filter: "blur(0px)" },
    viewport: { once: false, amount: 0.4 },
    transition: { duration: reduced ? 0.01 : 0.42, ease: [0.16, 1, 0.3, 1] as const, delay },
  });

  return (
    <section id="seam" className="relative z-[0] w-full border-y border-rule-hair bg-paper-band py-16 sm:py-20 lg:py-28">
      <div className="mx-auto w-full max-w-[1600px] px-5 sm:px-8 lg:px-12">
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-12 lg:gap-x-12">
          <motion.h2
            {...reveal(0)}
            className="font-display text-[clamp(1.5rem,2.8vw,2.4rem)] font-medium leading-[1.12] tracking-[-0.01em] text-ink text-balance [font-stretch:78%] lg:col-span-7"
          >
            The model writes the policy once, at authoring time. Every order after that is checked by a
            contract with no model in it.
          </motion.h2>

          <motion.div {...reveal(0.04)} className="lg:col-span-5 lg:border-l lg:border-rule-strong lg:pl-10">
            <p className="max-w-[52ch] font-sans text-[1.0625rem] leading-[1.65] text-ink-secondary">
              A prompt is a sentence that can be argued with. Admission is a function that returns a
              code. Mandate keeps the model on the writing side of that line and never lets it cross.
            </p>
          </motion.div>
        </div>

        <div className="mt-14 grid grid-cols-1 lg:mt-20 lg:grid-cols-2">
          <div className="lg:pr-10 xl:pr-14">
            <div className="flex items-baseline justify-between border-b-2 border-ink pb-3">
              <h3 className="font-mono text-[0.6875rem] font-medium uppercase tracking-[0.2em] text-ink">
                Authoring time
              </h3>
              <span className="font-mono text-[0.6875rem] tabular-nums text-ink-tertiary">01</span>
            </div>
            <ol className="mt-0">
              {authoring.map((line, index) => (
                <motion.li
                  key={line}
                  {...reveal(index * 0.04)}
                  className="flex gap-5 border-b border-rule-hair py-4"
                >
                  <span className="pt-1 font-mono text-[0.6875rem] tabular-nums text-ink-tertiary">
                    1.{index + 1}
                  </span>
                  <span className="font-sans text-[0.9375rem] leading-[1.6] text-ink-secondary">{line}</span>
                </motion.li>
              ))}
            </ol>
            <div className="flex items-baseline justify-between pt-4">
              <span className="font-mono text-[0.6875rem] uppercase tracking-[0.2em] text-ink-tertiary">
                Model calls
              </span>
              <span className="font-mono text-[0.8125rem] font-medium tabular-nums text-ink">1</span>
            </div>
          </div>

          <div className="mt-12 lg:mt-0 lg:border-l lg:border-rule-strong lg:pl-10 xl:pl-14">
            <div className="flex items-baseline justify-between border-b-2 border-ink pb-3">
              <h3 className="font-mono text-[0.6875rem] font-medium uppercase tracking-[0.2em] text-ink">
                Execution time
              </h3>
              <span className="font-mono text-[0.6875rem] tabular-nums text-ink-tertiary">02</span>
            </div>
            <ol className="mt-0">
              {execution.map((line, index) => (
                <motion.li
                  key={line}
                  {...reveal(index * 0.04)}
                  className="flex gap-5 border-b border-rule-hair py-4"
                >
                  <span className="pt-1 font-mono text-[0.6875rem] tabular-nums text-ink-tertiary">
                    2.{index + 1}
                  </span>
                  <span className="font-sans text-[0.9375rem] leading-[1.6] text-ink-secondary">{line}</span>
                </motion.li>
              ))}
            </ol>
            <div className="flex items-baseline justify-between pt-4">
              <span className="font-mono text-[0.6875rem] uppercase tracking-[0.2em] text-ink-tertiary">
                Model calls
              </span>
              <span className="font-mono text-[0.8125rem] font-medium tabular-nums text-ink">0</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

