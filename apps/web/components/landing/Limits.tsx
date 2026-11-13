"use client";

import { motion, useReducedMotion } from "motion/react";

const LIMITS = [
  {
    title: "It cannot outrun a liquidation",
    body: "A callback is not instant and the venue does not wait for one. Mandate narrows the range of outcomes. It does not remove the floor.",
  },
  {
    title: "The compiler can misread a sentence",
    body: "That is why the compiled value appears beside your own words and why the hash covers both.",
  },
  {
    title: "An operator can be revoked",
    body: "Revoking the key stops trading immediately. The console says so before you click.",
  },
  {
    title: "Callbacks cost the owner",
    body: "A subscription is not free, and the precompile requires a balance held at the vault.",
  },
  {
    title: "Testnet only",
    body: "Paper credit, no real funds, and no mainnet perps to connect to yet.",
  },
];

/**
 * What Mandate does not do.
 *
 * Five limits, said plainly. A judge who trusts this section trusts the rest.
 */
export function Limits() {
  const reduced = useReducedMotion();

  return (
    <section id="limits" className="relative z-[0] w-full bg-paper py-16 sm:py-20 lg:py-28">
      <div className="mx-auto w-full max-w-[1600px] px-5 sm:px-8 lg:px-12">
        <div className="grid grid-cols-1 lg:grid-cols-12 lg:gap-x-12">
          <div className="lg:col-span-4">
            <div className="lg:sticky lg:top-28">
              <h2 className="font-display text-[clamp(2.1rem,4.2vw,3.5rem)] font-bold leading-[0.94] tracking-[-0.02em] text-ink text-balance [font-stretch:70%]">
                What Mandate does not do.
              </h2>
              <div className="mt-6 flex items-baseline gap-3">
                <span className="font-mono text-[0.6875rem] uppercase tracking-[0.2em] text-ink-tertiary">
                  Count
                </span>
                <span className="font-mono text-[0.8125rem] tabular-nums text-ink">05</span>
              </div>
            </div>
          </div>

          <div className="mt-12 lg:mt-0 lg:col-span-8 lg:border-l lg:border-rule-strong lg:pl-10">
            {LIMITS.map((limit, index) => (
              <motion.div
                key={limit.title}
                initial={reduced ? { opacity: 0 } : { opacity: 0, y: 10, filter: "blur(4px)" }}
                whileInView={reduced ? { opacity: 1 } : { opacity: 1, y: 0, filter: "blur(0px)" }}
                viewport={{ once: false, amount: 0.3 }}
                transition={{
                  duration: reduced ? 0.01 : 0.42,
                  ease: [0.16, 1, 0.3, 1],
                  delay: index * 0.045,
                }}
                className="border-t border-rule-strong py-7 first:border-t-0 first:pt-0"
              >
                <div className="grid grid-cols-[2rem_1fr] gap-x-4 sm:grid-cols-[3rem_1fr] sm:gap-x-6">
                  <span className="pt-1 font-mono text-[0.75rem] tabular-nums text-ink-tertiary">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <div>
                    <h3 className="font-display text-[1rem] font-bold uppercase tracking-[0.01em] text-ink [font-stretch:70%]">
                      {limit.title}
                    </h3>
                    <p className="mt-2 max-w-[58ch] font-sans text-[0.9375rem] leading-[1.6] text-ink-secondary">
                      {limit.body}
                    </p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

