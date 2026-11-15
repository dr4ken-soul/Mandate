"use client";

import { useEffect, useRef, useState } from "react";
import { useAccount, useDisconnect, useWriteContract } from "wagmi";
import { ChevronDown, Copy, ExternalLink } from "lucide-react";
import { explorerAddress, explorerTx, hidekiTestnet } from "@/lib/chain/chain";
import { publicClient } from "@/lib/chain/reads";
import { markWalletDisconnected } from "@/lib/session";
import { mandateAbi } from "@/lib/chain/abi";
import type { Address } from "viem";
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
  const { writeContractAsync } = useWriteContract();
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [confirmRevoke, setConfirmRevoke] = useState(false);
  const [revokePending, setRevokePending] = useState(false);
  const [revokeError, setRevokeError] = useState<string | null>(null);
  const [revokeHash, setRevokeHash] = useState<string | null>(null);
  const container = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const { mandate, enforcementMode } = useMandate(address);

  const revokeOperator = async () => {
    if (!address) return;
    setRevokePending(true);
    setRevokeError(null);
    try {
      const hash = await writeContractAsync({
        address: process.env.NEXT_PUBLIC_MANDATE_ADDRESS as Address,
        abi: mandateAbi,
        functionName: "revoke",
        chainId: hidekiTestnet.id,
      });
      const receipt = await publicClient.waitForTransactionReceipt({ hash });
      if (receipt.status !== "success") throw new Error("The revoke transaction reverted.");
      setRevokeHash(hash);
      setConfirmRevoke(false);
    } catch (error) {
      setRevokeError(error instanceof Error ? error.message.slice(0, 160) : "The revoke transaction failed.");
    } finally {
      setRevokePending(false);
    }
  };

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
            {revokeHash ? (
              <a
                href={explorerTx(revokeHash)}
                target="_blank"
                rel="noopener noreferrer"
                className="font-mono text-[0.75rem] uppercase tracking-[0.12em] text-ink"
              >
                Mandate revoked on chain
              </a>
            ) : mandate?.status === 1 ? (
              confirmRevoke ? (
                <div className="space-y-3">
                  <p className="font-sans text-[0.8125rem] leading-[1.5] text-ink-secondary">
                    This owner-signed transaction revokes the mandate and stops new orders through it.
                  </p>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      disabled={revokePending}
                      onClick={() => void revokeOperator()}
                      className="font-mono text-[0.75rem] uppercase tracking-[0.12em] text-signal-text disabled:opacity-45"
                    >
                      {revokePending ? "Confirm in wallet" : "Confirm revoke"}
                    </button>
                    <button
                      type="button"
                      disabled={revokePending}
                      onClick={() => setConfirmRevoke(false)}
                      className="font-mono text-[0.75rem] uppercase tracking-[0.12em] text-ink-tertiary disabled:opacity-45"
                    >
                      Keep it
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setRevokeError(null);
                    setConfirmRevoke(true);
                  }}
                  className="font-mono text-[0.75rem] uppercase tracking-[0.12em] text-signal-text transition-colors duration-[220ms] hover:text-signal"
                >
                  Revoke operator
                </button>
              )
            ) : (
              <p className="font-mono text-[0.75rem] uppercase tracking-[0.12em] text-ink-tertiary">
                Mandate not active
              </p>
            )}
            {revokeError ? (
              <p role="alert" className="mt-3 break-words font-mono text-[0.6875rem] text-signal-text">
                {revokeError}
              </p>
            ) : null}
          </div>

          <div className="border-t border-rule-hair px-4 py-3">
            <button
              type="button"
              onClick={() => {
                disconnect();
                markWalletDisconnected();
                setOpen(false);
              }}
              className="font-mono text-[0.75rem] uppercase tracking-[0.12em] text-ink-tertiary transition-colors duration-[220ms] hover:text-ink"
            >
              Disconnect wallet
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
