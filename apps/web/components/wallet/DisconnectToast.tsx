"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { wasWalletDisconnected } from "@/lib/session";

/** Show the deliberate-disconnect notice after the console returns to the landing page. */
export function DisconnectToast() {
  const pathname = usePathname();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const requested =
      pathname === "/" &&
      new URLSearchParams(window.location.search).get("disconnected") === "1";
    if (!requested || !wasWalletDisconnected()) {
      setVisible(false);
      return;
    }
    setVisible(true);
    const timer = window.setTimeout(() => setVisible(false), 6000);
    return () => window.clearTimeout(timer);
  }, [pathname]);

  if (!visible) return null;

  return (
    <div
      role="status"
      className="fixed bottom-5 left-1/2 z-[500] w-[min(92vw,28rem)] -translate-x-1/2 border border-rule-strong bg-paper px-5 py-4"
    >
      <p className="font-mono text-[0.75rem] uppercase tracking-[0.12em] text-ink">
        Wallet disconnected
      </p>
      <p className="mt-2 font-sans text-[0.875rem] leading-[1.6] text-ink-secondary">
        The wallet is closed until you connect again. Nothing was signed and nothing moved.
      </p>
      <button
        type="button"
        onClick={() => setVisible(false)}
        className="mt-3 font-mono text-[0.75rem] uppercase tracking-[0.12em] text-ink-tertiary"
      >
        Close
      </button>
    </div>
  );
}
