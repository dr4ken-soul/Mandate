"use client";

import { motion, useReducedMotion } from "motion/react";
import { copyFor } from "@mandate/policy";

interface ClauseCell {
  readonly id: string;
  readonly title: string;
  readonly value: string;
  readonly code: string;
  readonly refusal: string;
  readonly plate?: boolean;
}

const CELLS: ClauseCell[] = [
  {
    id: "C1",
    title: "Allowed markets",
    value: "address[]",
    code: "0x04",
    refusal: copyFor(0x04),
  },
  {
    id: "C2",
    title: "Maximum leverage",
    value: "uint32",
    code: "0x0A",
    refusal: copyFor(0x0a),
  },
  {
    id: "C3",
    title: "Market notional cap",
    value: "uint128",
    code: "0x08",
    refusal: copyFor(0x08),
    plate: true,
  },
  {
    id: "C4",
    title: "Total notional cap",
    value: "uint128",
    code: "0x09",
    refusal: copyFor(0x09),
  },
  {
    id: "C5",
    title: "Loss per window",
    value: "uint128",
    code: "0x0B",
    refusal: copyFor(0x0b),
  },
  {
    id: "C6",
    title: "Expiry",
    value: "uint64",
    code: "0x03",
    refusal: copyFor(0x03),
  },
];

const SPANS = ["md:col-span-4", "md:col-span-2", "md:col-span-2", "md:col-span-4", "md:col-span-3", "md:col-span-3"];

/**
 * The six clauses.
 *
 * Six cells on a six column grid with three rows of unequal span. One cell is
 * the dark plate, which is the same argument the hero makes at full scale.
 */
export function Clauses() {
  const reduced = useReducedMotion();

  return (
    <section
      id="clauses"
      className="relative z-[0] w-full border-y border-rule-hair bg-paper-band py-16 sm:py-20 lg:py-28"
    >
      <div className="mx-auto w-full max-w-[1600px] px-5 sm:px-8 lg:px-12">
        <h2 className="max-w-[20ch] font-display text-[clamp(2.1rem,4.2vw,3.5rem)] font-bold leading-[0.94] tracking-[-0.02em] text-ink text-balance [font-stretch:70%]">
          Six clauses. Seventeen ways to be refused.
        </h2>
        <p className="mt-6 max-w-[62ch] font-sans text-[1.0625rem] leading-[1.65] text-ink-secondary">
          The policy language is closed on purpose. A clause that cannot be reduced to a number, a set
          of addresses or a timestamp is rejected at authoring time with its own reason code.
        </p>

        <div className="mt-12 grid grid-cols-1 border-l border-t border-rule-hair md:grid-cols-6">
          {CELLS.map((cell, index) => (
            <motion.div
              key={cell.id}
              initial={
                reduced
                  ? { opacity: 0 }
                  : { opacity: 0, scale: cell.plate ? 1.015 : 1, filter: "blur(4px)" }
              }
              whileInView={
                reduced
                  ? { opacity: 1 }
                  : { opacity: 1, scale: 1, filter: "blur(0px)" }
              }
              viewport={{ once: false, amount: 0.2 }}
              transition={{
                duration: reduced ? 0.01 : cell.plate ? 0.6 : 0.45,
                ease: [0.16, 1, 0.3, 1],
                delay: index * 0.05,
              }}
              className={`flex min-h-[13rem] flex-col justify-between border-b border-r border-rule-hair p-6 sm:p-7 lg:p-8 ${SPANS[index]} ${
                cell.plate ? "bg-plate" : "bg-paper"
              }`}
            >
              <div className="flex items-baseline justify-between">
                <span
                  className={`font-mono text-[0.6875rem] font-medium uppercase tracking-[0.2em] ${
                    cell.plate ? "text-plate-ink-muted" : "text-ink-tertiary"
                  }`}
                >
                  {cell.id}
                </span>
                <span
                  className={`font-mono text-[0.6875rem] tabular-nums ${
                    cell.plate ? "text-plate-ink-muted" : "text-ink-tertiary"
                  }`}
                >
                  {cell.value}
                </span>
              </div>
              <h3
                className={`mt-8 font-display text-[1.125rem] font-bold uppercase tracking-[0.01em] [font-stretch:70%] ${
                  cell.plate ? "text-plate-ink" : "text-ink"
                }`}
              >
                {cell.title}
              </h3>
              <p
                className={`mt-2 font-mono text-[0.8125rem] tabular-nums ${cell.plate ? "text-plate-ink" : "text-ink"}`}
              >
                {cell.code}
              </p>
              <p
                className={`mt-4 font-sans text-[0.875rem] leading-[1.55] ${
                  cell.plate ? "text-plate-ink-muted" : "text-ink-secondary"
                }`}
              >
                {cell.refusal}
              </p>
              <span
                className={`mt-4 self-start rounded-[var(--radius-tag)] border px-[6px] py-[2px] font-mono text-[0.6875rem] tabular-nums ${
                  cell.plate ? "border-rule-plate text-signal-on-plate" : "border-rule-strong text-ink-secondary"
                }`}
              >
                {cell.code}
              </span>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

