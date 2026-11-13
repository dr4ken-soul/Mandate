"use client";

import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { explorerAddress } from "@/lib/chain/chain";
import { useConsoleGate } from "@/components/wallet/ConsoleGate";

/**
 * The footer.
 *
 * The page opens and closes on the same dark surface, so the document reads as
 * one sheet rather than a stack of pages.
 */
export function Footer() {
  const { openModal } = useConsoleGate();
  const mandate = process.env.NEXT_PUBLIC_MANDATE_ADDRESS ?? "";
  const repository = "https://github.com/dr4ken-soul/Mandate";

  return (
    <footer className="relative z-[0] w-full bg-plate text-plate-ink">
      <div className="mx-auto w-full max-w-[1600px] px-5 pt-14 pb-10 sm:px-8 lg:px-12 lg:pt-20">
        <div className="grid grid-cols-1 gap-12 lg:grid-cols-12">
          <div className="lg:col-span-5">
            <span className="font-display text-[0.9375rem] font-extrabold uppercase tracking-[0.22em] text-plate-ink [font-stretch:68%]">
              Mandate
            </span>
            <p className="mt-5 max-w-[38ch] font-sans text-[0.9375rem] leading-[1.6] text-plate-ink-muted">
              A policy layer for perps orders on Somnia. Written rules, enforced by contract, refused
              with a reason.
            </p>
            <button
              type="button"
              onClick={openModal}
              className="group mt-8 flex h-12 items-stretch bg-plate-ink text-plate"
            >
              <span className="flex items-center px-5 text-[0.875rem] font-medium">Open the console</span>
              <span className="flex w-12 items-center justify-center border-l border-plate/25">
                <ArrowUpRight
                  size={15}
                  strokeWidth={1.75}
                  className="transition-transform duration-200 ease-[var(--ease-quint)] group-hover:translate-x-0.5 group-hover:-translate-y-px"
                />
              </span>
            </button>
          </div>

          <nav aria-label="Repository and posts" className="lg:col-span-3 lg:col-start-7">
            <h2 className="font-mono text-[0.6875rem] uppercase tracking-[0.2em] text-plate-ink-muted">
              Project
            </h2>
            <ul className="mt-4 space-y-2.5">
              <li>
                <Link
                  href="/console/decisions"
                  className="font-sans text-[0.9375rem] text-plate-ink transition-colors duration-[220ms] hover:text-signal-on-plate"
                >
                  A refusal receipt
                </Link>
              </li>
              <li>
                <a
                  href={repository}
                  className="font-sans text-[0.9375rem] text-plate-ink transition-colors duration-[220ms] hover:text-signal-on-plate"
                >
                  Repository
                </a>
              </li>
              <li>
                <a
                  href="https://x.com"
                  className="font-sans text-[0.9375rem] text-plate-ink transition-colors duration-[220ms] hover:text-signal-on-plate"
                >
                  Post 1, what I am building
                </a>
              </li>
              <li>
                <a
                  href="https://x.com"
                  className="font-sans text-[0.9375rem] text-plate-ink transition-colors duration-[220ms] hover:text-signal-on-plate"
                >
                  Post 2, the submission
                </a>
              </li>
            </ul>
          </nav>

          <div className="lg:col-span-3">
            <h2 className="font-mono text-[0.6875rem] uppercase tracking-[0.2em] text-plate-ink-muted">
              Deployment
            </h2>
            <dl className="mt-4 space-y-3">
              <div>
                <dt className="font-mono text-[0.6875rem] uppercase tracking-[0.16em] text-plate-ink-muted">
                  Chain
                </dt>
                <dd className="font-mono text-[0.8125rem] tabular-nums text-plate-ink">50383 · Hideki</dd>
              </div>
              <div>
                <dt className="font-mono text-[0.6875rem] uppercase tracking-[0.16em] text-plate-ink-muted">
                  Mandate
                </dt>
                <dd className="font-mono text-[0.8125rem] tabular-nums text-plate-ink">
                  {mandate ? `${mandate.slice(0, 10)}·${mandate.slice(-4)}` : "not deployed"}
                </dd>
              </div>
            </dl>
          </div>
        </div>

        <div className="mt-14 flex flex-wrap items-baseline justify-between gap-3 border-t border-rule-plate pt-5">
          <p className="font-mono text-[0.6875rem] uppercase tracking-[0.16em] text-plate-ink-muted">
            Testnet only · no real funds
          </p>
          <a
            href={mandate ? explorerAddress(mandate) : "#"}
            className="font-mono text-[0.6875rem] tabular-nums text-plate-ink-muted transition-colors duration-[220ms] hover:text-plate-ink"
          >
            Block reads live
          </a>
        </div>
      </div>
    </footer>
  );
}


