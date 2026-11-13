"use client";

import { useEffect, useState } from "react";
import { useAccount, useConnect, useDisconnect, useSwitchChain } from "wagmi";
import { injected } from "wagmi/connectors";
import { hidekiTestnet } from "@/lib/chain/chain";
import { clearWalletDisconnected } from "@/lib/session";

type ModalState = "idle" | "opening" | "awaiting" | "connected" | "rejected" | "wrongNetwork" | "error";

/**
 * The wallet connection modal.
 *
 * The only place `connect()` is called. Every state the interface can be in is
 * named here, so no screen has to guess what happened.
 */
export function WalletConnectModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { connect, connectors, isPending } = useConnect();
  const { isConnected, chainId } = useAccount();
  const { disconnect } = useDisconnect();
  const { switchChain } = useSwitchChain();
  const [state, setState] = useState<ModalState>("idle");

  useEffect(() => {
    if (!open) {
      setState("idle");
      return;
    }
    if (isConnected) {
      if (chainId !== hidekiTestnet.id) {
        setState("wrongNetwork");
      } else {
        setState("connected");
      }
    }
  }, [open, isConnected, chainId]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape" && state !== "awaiting" && state !== "opening") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose, state]);

  if (!open) return null;

  const title: Record<ModalState, string> = {
    idle: "Connect a wallet",
    opening: "Opening your wallet",
    awaiting: "Confirm in your wallet",
    connected: "Connected",
    rejected: "Connection declined",
    wrongNetwork: "Wrong network",
    error: "The wallet could not be reached",
  };

  const body: Record<ModalState, string> = {
    idle: "Connecting reads your address and lets the console sign for the wallet you chose. Nothing moves until you ask it to.",
    opening: "Opening your wallet",
    awaiting: "Confirm in your wallet. Nothing is signed until you approve.",
    connected: "The console is connected.",
    rejected: "You declined in your wallet. Nothing was sent.",
    wrongNetwork: "Switch to Somnia Hideki (50383) to use the console.",
    error: "The wallet did not answer. Try again, or open the console in a different browser.",
  };

  const closable = state !== "awaiting" && state !== "opening" && state !== "connected";

  return (
    <div className="fixed inset-0 z-[400] flex items-center justify-center p-5">
      <div
        className="absolute inset-0 bg-plate/80"
        onClick={closable ? onClose : undefined}
        aria-hidden="true"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title[state]}
        className="relative w-full max-w-[30rem] border border-rule-strong bg-paper p-6 lg:p-8"
      >
        <h2 className="font-display text-[1.25rem] font-bold uppercase tracking-[0.01em] text-ink [font-stretch:70%]">
          {title[state]}
        </h2>
        <p className="mt-3 font-sans text-[0.9375rem] leading-[1.6] text-ink-secondary">{body[state]}</p>

        <div className="mt-7 flex flex-wrap items-center gap-3">
          {state === "idle" ? (
            connectors.map((connector) => (
              <button
                key={connector.uid}
                type="button"
                disabled={isPending}
                onClick={() => {
                  setState("opening");
                  connect(
                    { connector },
                    {
                      onSuccess: () => setState("connected"),
                      onError: () => setState("rejected"),
                    },
                  );
                  setState("awaiting");
                }}
                className="h-12 border border-rule-strong px-5 font-mono text-[0.75rem] uppercase tracking-[0.16em] text-ink transition-colors duration-[220ms] hover:bg-paper-band disabled:opacity-45"
              >
                {connector.name}
              </button>
            ))
          ) : null}

          {state === "wrongNetwork" ? (
            <button
              type="button"
              onClick={() => switchChain({ chainId: hidekiTestnet.id })}
              className="h-12 border border-rule-strong px-5 font-mono text-[0.75rem] uppercase tracking-[0.16em] text-ink transition-colors duration-[220ms] hover:bg-paper-band"
            >
              Switch network
            </button>
          ) : null}

          {(state === "rejected" || state === "error") ? (
            <button
              type="button"
              onClick={() => setState("idle")}
              className="h-12 border border-rule-strong px-5 font-mono text-[0.75rem] uppercase tracking-[0.16em] text-ink transition-colors duration-[220ms] hover:bg-paper-band"
            >
              Try again
            </button>
          ) : null}

          {state === "connected" ? (
            <button
              type="button"
              onClick={() => {
                disconnect();
                clearWalletDisconnected();
                onClose();
              }}
              className="h-12 border border-rule-strong px-5 font-mono text-[0.75rem] uppercase tracking-[0.16em] text-ink transition-colors duration-[220ms] hover:bg-paper-band"
            >
              Disconnect
            </button>
          ) : null}

          {closable ? (
            <button
              type="button"
              onClick={onClose}
              className="h-12 border border-rule-strong px-5 font-mono text-[0.75rem] uppercase tracking-[0.16em] text-ink transition-colors duration-[220ms] hover:bg-paper-band"
            >
              Close
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}

void injected;
