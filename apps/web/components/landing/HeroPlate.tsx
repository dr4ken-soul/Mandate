"use client";

import { ArrowUpRight } from "lucide-react";
import { motion, useReducedMotion, useScroll, useTransform } from "motion/react";
import { useRef } from "react";
import { formatCopy, formatQuote } from "@mandate/policy";
import { explorerTx } from "@/lib/chain/chain";

export type PlateState =
  | {
      kind: "decision";
      code: number;
      compared: string;
      limit: string;
      clause: number;
      txHash: string;
      blockNumber: string;
      market: string;
    }
  | { kind: "preview"; code: number; compared: string; limit: string; clause: number; blockNumber: string }
  | { kind: "unavailable"; blockNumber: string };

function clauseName(clause: number): string {
  const names = ["", "C1", "C2", "C3", "C4", "C5", "C6"];
  return names[clause] ?? "";
}

function clauseTitle(code: number): string {
  const titles: Record<number, string> = {
    0x04: "Market not allowed",
    0x05: "Tick mismatch",
    0x06: "Lot mismatch",
    0x07: "Below the minimum",
    0x08: "Market notional cap",
    0x09: "Total notional cap",
    0x0a: "Leverage",
    0x0b: "Loss window",
    0x0c: "Venue position cap",
    0x0d: "Paper credit blocked",
    0x0e: "Mark price stale",
    0x0f: "Stop deposit",
    0x10: "Cool-down",
    0x12: "In breach",
  };
  return titles[code] ?? "Refused";
}

/**
 * The hero plate.
 *
 * Three states and no others: a recorded decision, a live preview, or a
 * failed read. There is no blank plate and no cached value.
 */
export function HeroPlate({ plate }: { plate: PlateState }) {
  const heroRef = useRef<HTMLElement>(null);
  const reduced = useReducedMotion();

  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ["start start", "center start"],
  });
  const draw = useTransform(scrollYProgress, [0.04, 0.6], [0, 1]);
  const dash = useTransform(scrollYProgress, [0.42, 0.86], [0, 1]);
  const dashOpacity = useTransform(scrollYProgress, [0.4, 0.48], [0, 1]);

  const code = plate.kind === "unavailable" ? 0 : plate.code;
  const cap = plate.kind === "unavailable" ? 0n : BigInt(plate.limit);
  const after = plate.kind === "unavailable" ? 0n : BigInt(plate.compared);

  const sentence =
    plate.kind === "unavailable"
      ? ""
      : formatCopy(code, {
          SYMBOL: "BTC-PERP",
          after: `${formatQuote(after)} USDso`,
          cap: `${formatQuote(cap)} USDso`,
          x: (cap / 100n).toString(),
          min: "0.00013",
          BASE: "BTC",
          lot: "0.00001",
          tick: "0.1",
          below: "71,509.40",
          above: "71,509.50",
          qty: "0.02804",
          stt: "0.00 STT",
          n: "30",
          date: "30 Nov 2026",
        });

  return (
    <div className="relative z-[20] border-t border-rule-strong bg-plate">
      <div className="mx-auto w-full max-w-[1600px] px-5 py-8 sm:px-8 sm:py-10 lg:px-12 lg:py-14">
        <motion.div
          initial={reduced ? { opacity: 0 } : { opacity: 0, y: 18 }}
          animate={reduced ? { opacity: 1 } : { opacity: 1, y: 0 }}
          transition={{ duration: reduced ? 0.01 : 0.5, ease: [0.16, 1, 0.3, 1], delay: 0.2 }}
        >
          <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-rule-plate pb-3">
            <span className="font-mono text-[0.6875rem] uppercase tracking-[0.2em] text-plate-ink-muted">
              {plate.kind === "decision"
                ? `Decision · Block ${plate.blockNumber.toString()}`
                : plate.kind === "preview"
                  ? `Preview · Block ${plate.blockNumber.toString()}`
                  : `Unavailable · Block ${plate.blockNumber.toString()}`}
            </span>
            <span className="font-mono text-[0.6875rem] uppercase tracking-[0.2em] text-plate-ink-muted">
              {plate.kind === "decision" ? "Mandate recorded" : "Mandate contract"}
            </span>
          </div>

          {plate.kind === "unavailable" ? (
            <p className="mt-6 max-w-[52ch] font-mono text-[0.8125rem] leading-[1.6] text-plate-ink-muted">
              The chain read failed at block {plate.blockNumber.toString()}. Nothing on this page is
              estimated, so this panel is empty on purpose. Retry in a moment.
            </p>
          ) : (
            <>
              <p className="mt-6 font-mono text-[0.8125rem] tracking-[0.04em] text-plate-ink">
                {clauseName(plate.clause)} · {clauseTitle(code)} · {formatQuote(cap)} USDso
              </p>

              <svg
                viewBox="0 0 1000 120"
                preserveAspectRatio="none"
                className="mt-4 h-[88px] w-full sm:h-[104px]"
                aria-hidden="true"
              >
                <line
                  x1="0"
                  y1="96"
                  x2="1000"
                  y2="96"
                  stroke="var(--color-rule-plate)"
                  strokeWidth="1"
                  vectorEffect="non-scaling-stroke"
                />
                <motion.path
                  d="M0,96 H100"
                  stroke="var(--color-plate-ink)"
                  strokeWidth="2"
                  vectorEffect="non-scaling-stroke"
                  style={{ pathLength: reduced ? 1 : draw }}
                />
                <motion.path
                  d="M100,96 H1000"
                  stroke="var(--color-signal-on-plate)"
                  strokeWidth="1.5"
                  strokeDasharray="6 6"
                  vectorEffect="non-scaling-stroke"
                  style={{ pathLength: reduced ? 1 : dash, opacity: reduced ? 1 : dashOpacity }}
                />
                <line
                  x1="100"
                  y1="82"
                  x2="100"
                  y2="110"
                  stroke="var(--color-plate-ink)"
                  strokeWidth="1.5"
                  vectorEffect="non-scaling-stroke"
                />
              </svg>

              <div className="mt-1 flex justify-between font-mono text-[0.6875rem] uppercase tracking-[0.16em] text-plate-ink-muted">
                <span>{formatQuote(cap)} · cap</span>
                <span className="text-signal-on-plate">{formatQuote(after)} · refused</span>
              </div>

              <div className="mt-7 flex flex-col gap-6 sm:mt-8 lg:flex-row lg:items-end lg:justify-between">
                <div className="flex items-end gap-4">
                  <motion.span
                    initial={reduced ? { opacity: 0 } : { opacity: 0, scale: 1.06, rotate: 0.8 }}
                    whileInView={reduced ? { opacity: 1 } : { opacity: 1, scale: 1, rotate: 0 }}
                    viewport={{ once: false, amount: 0.6 }}
                    transition={{ duration: reduced ? 0.01 : 0.18, ease: [0.16, 1, 0.3, 1] }}
                    className="font-display text-[clamp(1.9rem,3.6vw,3.2rem)] font-extrabold uppercase leading-none tracking-[0.03em] text-signal-on-plate [font-stretch:62%]"
                  >
                    {plate.kind === "preview" ? "Preview" : "Refused"}
                  </motion.span>
                  <span className="pb-1 font-mono text-[0.8125rem] font-medium tabular-nums text-plate-ink-muted">
                    0x{code.toString(16).toUpperCase().padStart(2, "0")}
                  </span>
                </div>

                <div className="lg:max-w-[46ch]">
                  <p className="font-sans text-[0.9375rem] leading-[1.55] text-plate-ink">{sentence}</p>
                  {plate.kind === "decision" ? (
                    <a
                      href={explorerTx(plate.txHash)}
                      className="mt-3 inline-flex items-center gap-2 border-b border-rule-plate pb-0.5 font-mono text-[0.75rem] tabular-nums text-plate-ink-muted transition-colors duration-[220ms] hover:border-plate-ink hover:text-plate-ink"
                    >
                      {plate.txHash.slice(0, 10)}…{plate.txHash.slice(-6)}
                      <ArrowUpRight size={12} strokeWidth={1.75} aria-hidden="true" />
                    </a>
                  ) : (
                    <p className="mt-3 max-w-[56ch] font-mono text-[0.75rem] leading-[1.6] text-plate-ink-muted">
                      This is a live view call against deployed code. Nothing was sent, so there is no
                      hash to show, and the first order that is actually recorded will replace this
                      panel.
                    </p>
                  )}
                </div>
              </div>
            </>
          )}
        </motion.div>
      </div>
    </div>
  );
}



