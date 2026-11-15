"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { WalletConnectModal } from "./WalletConnectModal";

interface ConsoleGateValue {
  readonly openModal: () => void;
}

const ConsoleGateContext = createContext<ConsoleGateValue>({ openModal: () => {} });

export function useConsoleGate(): ConsoleGateValue {
  return useContext(ConsoleGateContext);
}

export function ConsoleGate({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [destination, setDestination] = useState("/console");
  const openModal = useCallback(() => {
    setDestination("/console");
    setOpen(true);
  }, []);
  const value = useMemo(() => ({ openModal }), [openModal]);

  useEffect(() => {
    const query = new URLSearchParams(window.location.search);
    if (query.get("connect") !== "1") return;
    const next = query.get("next");
    if (next && next.startsWith("/console")) setDestination(next);
    setOpen(true);
  }, []);

  const finishConnection = useCallback(() => {
    router.push(destination);
  }, [destination, router]);

  return (
    <ConsoleGateContext.Provider value={value}>
      {children}
      <WalletConnectModal
        open={open}
        onClose={() => setOpen(false)}
        onConnected={finishConnection}
      />
    </ConsoleGateContext.Provider>
  );
}
