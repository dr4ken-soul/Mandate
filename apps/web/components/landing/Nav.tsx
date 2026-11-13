"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowUpRight, Menu, X } from "lucide-react";
import { useConsoleGate } from "@/components/wallet/ConsoleGate";

const LINKS = [
  { href: "/#clauses", label: "Clauses" },
  { href: "/#decisions", label: "Decisions" },
  { href: "/#limits", label: "Limits" },
];

/**
 * The navigation.
 *
 * A4 split: the wordmark on the left, the console on the right, and the
 * section links in the middle where they are empty of content. Nothing rounds.
 */
export function Nav() {
  const { openModal } = useConsoleGate();
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <>
      <header
        data-scrolled={scrolled ? "true" : "false"}
        className={`fixed inset-x-0 top-0 z-[200] h-14 bg-paper lg:h-20 ${
          scrolled ? "border-b border-rule-strong" : "border-b border-rule-hair"
        }`}
      >
        <div className="flex h-full items-stretch justify-between">
          <Link
            href="/"
            className="group flex items-center gap-3 border-r border-rule-hair pl-5 pr-5 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-ink lg:pl-12"
          >
            <span className="font-display text-[0.9375rem] font-extrabold uppercase tracking-[0.22em] text-ink [font-stretch:68%]">
              Mandate
            </span>
          </Link>

          <div className="hidden lg:block" aria-hidden="true" />

          <div className="flex items-stretch">
            <nav aria-label="Primary" className="hidden md:flex items-stretch">
              {LINKS.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  className="flex items-center border-l border-rule-hair px-5 font-mono text-[0.6875rem] uppercase tracking-[0.18em] text-ink-secondary transition-colors duration-[220ms] ease-[var(--ease-quint)] hover:bg-paper-band hover:text-ink lg:px-6"
                >
                  {link.label}
                </a>
              ))}
            </nav>

            <button
              type="button"
              onClick={openModal}
              className="group flex items-stretch bg-ink text-paper focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-ink"
            >
              <span className="flex items-center px-5 text-[0.875rem] font-medium lg:px-7">
                Open the console
              </span>
              <span className="flex w-12 items-center justify-center border-l border-paper/25 lg:w-14">
                <ArrowUpRight
                  size={15}
                  strokeWidth={1.75}
                  className="transition-transform duration-200 ease-[var(--ease-quint)] group-hover:translate-x-0.5 group-hover:-translate-y-px"
                />
              </span>
            </button>
          </div>
        </div>
      </header>

      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-controls="mobile-nav"
        className="fixed right-0 top-14 z-[200] flex items-center gap-2 border-l border-b border-rule-hair bg-paper px-5 font-mono text-[0.6875rem] uppercase tracking-[0.18em] text-ink md:hidden"
      >
        <span>{open ? "Close" : "Menu"}</span>
        {open ? <X size={15} strokeWidth={1.75} aria-hidden="true" /> : <Menu size={15} strokeWidth={1.75} aria-hidden="true" />}
      </button>

      {open ? (
        <>
          <div
            className="fixed inset-0 z-[300] bg-plate/80"
            onClick={() => setOpen(false)}
            aria-hidden="true"
          />
          <nav
            id="mobile-nav"
            aria-label="Primary"
            className="fixed inset-y-0 right-0 z-[310] w-[min(88vw,22rem)] border-l border-rule-strong bg-paper"
          >
            {LINKS.map((link) => (
              <a
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                className="flex h-16 items-center border-b border-rule-hair px-6 text-[0.9375rem] text-ink-secondary"
              >
                {link.label}
              </a>
            ))}
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                openModal();
              }}
              className="flex h-16 w-full items-center border-b border-rule-hair px-6 text-[0.9375rem] text-ink"
            >
              Open the console
            </button>
          </nav>
        </>
      ) : null}
    </>
  );
}

