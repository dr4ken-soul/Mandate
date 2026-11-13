"use client";

import { useEffect, useState } from "react";
import { publicClient } from "./reads";
import { mandateAbi } from "./abi";
import type { Address } from "viem";

export interface MandateState {
  readonly status: number;
  readonly executor: Address;
  readonly policyHash: string;
  readonly expiresAt: bigint;
  readonly maxLeverageBps: number;
  readonly maxNotionalPerMarket: bigint;
  readonly maxNotionalTotal: bigint;
  readonly maxLossPerWindow: bigint;
  readonly epochStartEquity: bigint;
  readonly totalNotional: bigint;
  readonly equity: bigint;
}

/**
 * The mandate of one wallet.
 *
 * Read from the chain on every change of the address. There is no cache that
 * can disagree with the contract.
 */
export function useMandate(owner?: Address) {
  const [mandate, setMandate] = useState<MandateState | null>(null);

  useEffect(() => {
    let cancelled = false;

    const read = async () => {
      if (!owner) {
        setMandate(null);
        return;
      }
      try {
        const result = await publicClient.readContract({
          address: process.env.NEXT_PUBLIC_MANDATE_ADDRESS as Address,
          abi: mandateAbi,
          functionName: "getMandate",
          args: [owner],
        });
        if (cancelled) return;
        setMandate({
          status: result[0],
          executor: result[1],
          policyHash: result[2],
          expiresAt: result[3],
          maxLeverageBps: result[4],
          maxNotionalPerMarket: result[5],
          maxNotionalTotal: result[6],
          maxLossPerWindow: result[7],
          epochStartEquity: result[8],
          totalNotional: result[9],
          equity: result[10],
        });
      } catch {
        if (!cancelled) setMandate(null);
      }
    };

    void read();
    const timer = window.setInterval(read, 15_000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [owner]);

  return {
    mandate,
    enforcementMode: enforcementLabel(),
  };
}

/**
 * The enforcement label.
 *
 * The badge says CHAIN only when a reactive handler is deployed and subscribed.
 * A keeper is named KEEPER, and a build with neither says so rather than
 * claiming a subscription that does not exist.
 */
export function enforcementLabel(): string {
  const configured = (process.env.NEXT_PUBLIC_ENFORCEMENT_MODE ?? "chain").toUpperCase();
  const watch = process.env.NEXT_PUBLIC_WATCH_ADDRESS;
  if (!watch) return "NOT DEPLOYED";
  return configured === "KEEPER" ? "KEEPER" : "CHAIN";
}
