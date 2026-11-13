"use client";

import { ArrowUpRight } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import { useConsoleGate } from "@/components/wallet/ConsoleGate";

/**
 * The hero statement.
 *
 * Two lines, one subhead, two calls to action. The entrance is the spec's
 * table and nothing else.
 */
export function HeroStatement() {
  const { openModal } = useConsoleGate();
  const reduced = useReducedMotion();

  return (
    <div className="mx-auto w-full max-w-[1600px] px-5 pt-10 pb-10 sm:px-8 sm:pt-14 lg:px-12 lg:pt-20 lg:pb-16">
      <div className="grid grid-cols-1 items-end gap-y-8 lg:grid-cols-12 lg:gap-x-10">
        <h1 className="font-display text-[clamp(3.2rem,8.6vw,8.5rem)] font-extrabold uppercase leading-[0.86] tracking-[-0.025em] text-ink text-balance [font-stretch:62%] lg:col-span-8">
          <motion.span
            className="block"
            initial={reduced ? { opacity: 0 } : { opacity: 0, y: 16, filter: "blur(8px)" }}
            animate={reduced ? { opacity: 1 } : { opacity: 1, y: 0, filter: "blur(0px)" }}
            transition={{ duration: reduced ? 0.01 : 0.55, ease: [0.16, 1, 0.3, 1], delay: 0.05 }}
          >
            Rules in English.
          </motion.span>
          <motion.span
            className="block"
            initial={reduced ? { opacity: 0 } : { opacity: 0, y: 16, filter: "blur(8px)" }}
            animate={reduced ? { opacity: 1 } : { opacity: 1, y: 0, filter: "blur(0px)" }}
            transition={{ duration: reduced ? 0.01 : 0.55, ease: [0.16, 1, 0.3, 1], delay: 0.13 }}
          >
            Refusals on chain.
          </motion.span>
        </h1>

        <div className="lg:col-span-4 lg:pb-3">
          <motion.p
            className="max-w-[46ch] font-sans text-[1.0625rem] leading-[1.6] text-ink-secondary"
            initial={reduced ? { opacity: 0 } : { opacity: 0, y: 12, filter: "blur(6px)" }}
            animate={reduced ? { opacity: 1 } : { opacity: 1, y: 0, filter: "blur(0px)" }}
            transition={{ duration: reduced ? 0.01 : 0.45, ease: [0.16, 1, 0.3, 1], delay: 0.24 }}
          >
            Mandate turns the rules you would say out loud into a contract that checks every perps
            order before it reaches the venue.
          </motion.p>

          <motion.div
            className="mt-7 flex flex-wrap items-center gap-x-7 gap-y-4"
            initial={reduced ? { opacity: 0 } : { opacity: 0, y: 10, filter: "blur(4px)" }}
            animate={reduced ? { opacity: 1 } : { opacity: 1, y: 0, filter: "blur(0px)" }}
            transition={{ duration: reduced ? 0.01 : 0.4, ease: [0.16, 1, 0.3, 1], delay: 0.34 }}
          >
            <button
              type="button"
              onClick={openModal}
              className="group flex h-14 items-stretch bg-ink text-paper focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
            >
              <span className="flex items-center px-6 text-[0.9375rem] font-medium">Open the console</span>
              <span className="flex w-14 items-center justify-center border-l border-paper/25">
                <ArrowUpRight
                  size={16}
                  strokeWidth={1.75}
                  className="transition-transform duration-200 ease-[var(--ease-quint)] group-hover:translate-x-0.5 group-hover:-translate-y-px"
                />
              </span>
            </button>

            <a
              href="/console/decisions"
              className="border-b border-ink pb-1 font-mono text-[0.6875rem] uppercase tracking-[0.18em] text-ink transition-colors duration-[220ms] ease-[var(--ease-quint)] hover:border-signal-text hover:text-signal-text"
            >
              Read a refusal
            </a>
          </motion.div>
        </div>
      </div>
    </div>
  );
}

