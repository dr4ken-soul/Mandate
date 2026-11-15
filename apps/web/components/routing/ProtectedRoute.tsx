"use client";

import { useEffect, useState } from "react";
import { useAccount } from "wagmi";
import { usePathname, useRouter } from "next/navigation";
import { wasWalletDisconnected } from "@/lib/session";

/**
 * The route gate.
 *
 * Three states, never two: hydrating, connected, or not connected. A provider
 * error is not evidence that the wallet is gone, so it gets its own screen.
 */
export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isConnected, isConnecting, isReconnecting } = useAccount();
  const router = useRouter();
  const pathname = usePathname();
  const [hydrating, setHydrating] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => setHydrating(false), 600);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (hydrating) return;
    if (!isConnected && !isConnecting && !isReconnecting) {
      if (wasWalletDisconnected()) {
        router.replace("/?disconnected=1");
        return;
      }
      router.replace(`/?connect=1&next=${encodeURIComponent(pathname)}`);
    }
  }, [hydrating, isConnected, isConnecting, isReconnecting, router, pathname]);

  if (error) {
    return (
      <RecoveryPlate
        message="The wallet provider failed to answer."
        onRetry={() => {
          setError(null);
          window.location.reload();
        }}
      />
    );
  }

  if (hydrating || isConnecting || isReconnecting) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-paper">
        <div className="w-[min(90vw,26rem)] border border-rule-hair bg-paper p-6">
          <p className="font-display text-[0.9375rem] font-extrabold uppercase tracking-[0.22em] text-ink [font-stretch:68%]">
            Mandate
          </p>
          <div className="mt-5 h-px w-full overflow-hidden bg-rule-hair">
            <div className="h-px w-1/3 bg-ink" />
          </div>
          <p className="mt-4 font-mono text-[0.6875rem] uppercase tracking-[0.16em] text-ink-tertiary">
            Reconnecting
          </p>
        </div>
      </div>
    );
  }

  if (!isConnected) {
    return (
      <RecoveryPlate
        message="This view needs a connected wallet."
        onRetry={() => {
          router.replace("/?connect=1&next=" + encodeURIComponent(pathname));
        }}
      />
    );
  }

  return <>{children}</>;
}

/**
 * The recovery plate. It never claims a failure it cannot prove.
 */
function RecoveryPlate({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-paper px-5">
      <div className="w-full max-w-[32rem] border border-rule-hair bg-paper p-6 lg:p-8">
        <p className="font-mono text-[0.6875rem] uppercase tracking-[0.16em] text-ink-tertiary">
          Something failed in this view
        </p>
        <p className="mt-3 font-sans text-[0.9375rem] leading-[1.6] text-ink-secondary">{message}</p>
        <div className="mt-6 flex items-center gap-3">
          <button
            type="button"
            onClick={onRetry}
            className="h-11 border border-rule-strong px-4 font-mono text-[0.75rem] uppercase tracking-[0.14em] text-ink transition-colors duration-[220ms] hover:bg-paper-band"
          >
            Retry
          </button>
          <a
            href="/"
            className="font-mono text-[0.75rem] uppercase tracking-[0.14em] text-ink-tertiary transition-colors duration-[220ms] hover:text-ink"
          >
            Return to landing
          </a>
        </div>
      </div>
    </div>
  );
}
