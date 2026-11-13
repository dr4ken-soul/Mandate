"use client";

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { WalletConnectModal } from "./WalletConnectModal";

/**
 * The console entry point.
 *
 * Every entry on the landing page calls the same handler, so the wallet
 * connection behaves the same wherever it is started from. The server renders
 * the page and the client owns the handler, so no function crosses the
 * boundary.
 */
interface ConsoleGateValue {
  readonly openModal: () => void;
}

const ConsoleGateContext = createContext<ConsoleGateValue>({ openModal: () => {} });

export function useConsoleGate(): ConsoleGateValue {
  return useContext(ConsoleGateContext);
}

export function ConsoleGate({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const openModal = useCallback(() => setOpen(true), []);
  const value = useMemo(() => ({ openModal }), [openModal]);

  return (
    <ConsoleGateContext.Provider value={value}>
      {children}
      <WalletConnectModal open={open} onClose={() => setOpen(false)} />
    </ConsoleGateContext.Provider>
  );
}
