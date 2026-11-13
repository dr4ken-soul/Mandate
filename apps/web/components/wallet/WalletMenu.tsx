"use client";

import { useEffect, useRef, useState } from "react";
import { useAccount, useDisconnect } from "wagmi";
import { ChevronDown, Copy, ExternalLink } from "lucide-react";
import { explorerAddress } from "@/lib/chain/chain";
import { markWalletDisconnected } from "@/lib/session";
import { useMandate } from "@/lib/chain/useMandate";

/**
 * The console wallet menu.
 *
 * The panel carries the product status, the mandate limits and the operator
 * actions. A revoke is asked for before it happens.
 */
export function WalletMenu() {
  const { address } = useAccount();
  const { disconnect } = useDisconnect();
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [confirmRevoke, setConfirmRevoke] = useState(false);
  const container = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const { mandate, enforcementMode } = useMandate(address);

  useEffect(() => {
    if (!open) return;
    const onDown = (event: MouseEvent) => {
      if (container.current && !container.current.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        trigger.current?.focus();
      }
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  if (!address) return null;

  const copy = async () => {
    await navigator.clipboard.writeText(address);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  };

  return (
    <div className="relative" ref={container}>
      <button
        ref={trigger}
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-haspopup="menu"
        className="flex h-11 items-center gap-3 border border-rule-strong bg-paper pl-3 pr-2"
      >
        <span className="h-[6px] w-[6px] bg-ink" aria-hidden="true" />
        <span className="font-mono text-[0.75rem] tabular-nums text-ink">
          {address.slice(0, 6)}…{address.slice(-4)}
        </span>
        <ChevronDown
          size={14}
          strokeWidth={1.75}
          className={`transition-transform duration-200 ease-[var(--ease-quint)] ${open ? "rotate-180" : ""}`}
          aria-hidden="true"
        />
      </button>

      {open ? (
        <div
          role="menu"
          className="absolute right-0 top-[calc(100%+8px)] w-[19rem] border border-rule-strong bg-paper"
        >
          <div className="border-b border-rule-plate bg-plate px-4 py-3">
            <p className="font-mono text-[0.6875rem] uppercase tracking-[0.16em] text-plate-ink-muted">
              Operator · {mandate ? "Active" : "None"}
            </p>
            <p className="mt-1 font-mono text-[0.6875rem] uppercase tracking-[0.16em] text-plate-ink-muted">
              Enforcement · {enforcementMode}
            </p>
          </div>

          <div className="border-b border-rule-hair px-4 py-3">
            <p className="font-mono text-[0.6875rem] uppercase tracking-[0.16em] text-ink-tertiary">
              C3 cap
            </p>
            <p className="mt-1 font-mono text-[0.8125rem] tabular-nums text-ink">
              {mandate ? `${mandate.maxNotionalPerMarket} USDso` : "not registered"}
            </p>
            <p className="mt-3 font-mono text-[0.6875rem] uppercase tracking-[0.16em] text-ink-tertiary">
              C2 leverage
            </p>
            <p className="mt-1 font-mono text-[0.8125rem] tabular-nums text-ink">
              {mandate ? `${(mandate.maxLeverageBps / 100).toFixed(2)}x` : "not registered"}
            </p>
          </div>

          <div className="flex items-center justify-between gap-3 border-b border-rule-hair px-4 py-3">
            <span className="font-mono text-[0.75rem] tabular-nums text-ink-secondary">{address}</span>
            <button
              type="button"
              onClick={copy}
              className="text-ink-secondary transition-colors duration-[220ms] hover:text-ink"
              aria-label="Copy address"
            >
              <Copy size={14} strokeWidth={1.75} aria-hidden="true" />
            </button>
          </div>

          <a
            href={explorerAddress(address)}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 border-b border-rule-hair px-4 py-3 font-mono text-[0.75rem] uppercase tracking-[0.12em] text-ink-secondary transition-colors duration-[220ms] hover:text-ink"
          >
            View on explorer
            <ExternalLink size={12} strokeWidth={1.75} aria-hidden="true" />
          </a>

          {copied ? (
            <p className="px-4 py-3 font-mono text-[0.75rem] uppercase tracking-[0.12em] text-ink-tertiary">
              Copied
            </p>
          ) : null}

          <div className="border-t border-rule-hair px-4 py-3">
            {confirmRevoke ? (
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => {
                    disconnect();
                    markWalletDisconnected();
                    setConfirmRevoke(false);
                    setOpen(false);
                  }}
                  className="font-mono text-[0.75rem] uppercase tracking-[0.12em] text-signal-text"
                >
                  Confirm revoke
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmRevoke(false)}
                  className="font-mono text-[0.75rem] uppercase tracking-[0.12em] text-ink-tertiary"
                >
                  Keep it
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setConfirmRevoke(true)}
                className="font-mono text-[0.75rem] uppercase tracking-[0.12em] text-signal-text transition-colors duration-[220ms] hover:text-signal"
              >
                Revoke operator
              </button>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
