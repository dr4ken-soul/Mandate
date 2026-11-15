"use client";

import { useAccount } from "wagmi";
import { formatQuote } from "@mandate/policy";
import { useMandate } from "@/lib/chain/useMandate";
import { explorerAddress } from "@/lib/chain/chain";

/**
 * Settings.
 *
 * The operator status, the subscription status and the contract address.
 */
export default function SettingsPage() {
  const { address } = useAccount();
  const { mandate, enforcementMode } = useMandate(address);
  const contract = process.env.NEXT_PUBLIC_MANDATE_ADDRESS ?? "";

  return (
    <div className="space-y-8">
      <h1 className="font-display text-[clamp(1.6rem,3vw,2.4rem)] font-bold leading-[1.05] tracking-[-0.02em] text-ink [font-stretch:70%]">
        Settings
      </h1>

      <section>
        <h2 className="font-mono text-[0.6875rem] uppercase tracking-[0.2em] text-ink-tertiary">
          Operator
        </h2>
        <dl className="mt-4 border-t border-rule-strong">
          <div className="flex items-baseline justify-between border-b border-rule-hair py-3">
            <dt className="font-sans text-[0.9375rem] text-ink-secondary">Status</dt>
            <dd className="font-mono text-[0.8125rem] tabular-nums text-ink">
              {mandate && mandate.status === 1 ? "Active" : "Not registered"}
            </dd>
          </div>
          <div className="flex items-baseline justify-between border-b border-rule-hair py-3">
            <dt className="font-sans text-[0.9375rem] text-ink-secondary">Policy hash</dt>
            <dd className="font-mono text-[0.8125rem] tabular-nums text-ink">
              {mandate ? `${mandate.policyHash.slice(0, 12)}…` : "none"}
            </dd>
          </div>
          <div className="flex items-baseline justify-between border-b border-rule-hair py-3">
            <dt className="font-sans text-[0.9375rem] text-ink-secondary">C3 cap</dt>
            <dd className="font-mono text-[0.8125rem] tabular-nums text-ink">
              {mandate ? `${formatQuote(mandate.maxNotionalPerMarket)} USDso` : "none"}
            </dd>
          </div>
          <div className="flex items-baseline justify-between border-b border-rule-hair py-3">
            <dt className="font-sans text-[0.9375rem] text-ink-secondary">C4 cap</dt>
            <dd className="font-mono text-[0.8125rem] tabular-nums text-ink">
              {mandate ? `${formatQuote(mandate.maxNotionalTotal)} USDso` : "none"}
            </dd>
          </div>
        </dl>
      </section>

      <section>
        <h2 className="font-mono text-[0.6875rem] uppercase tracking-[0.2em] text-ink-tertiary">
          Enforcement
        </h2>
        <dl className="mt-4 border-t border-rule-strong">
          <div className="flex items-baseline justify-between border-b border-rule-hair py-3">
            <dt className="font-sans text-[0.9375rem] text-ink-secondary">Mode</dt>
            <dd className="font-mono text-[0.8125rem] tabular-nums text-ink">{enforcementMode}</dd>
          </div>
          <div className="flex items-baseline justify-between border-b border-rule-hair py-3">
            <dt className="font-sans text-[0.9375rem] text-ink-secondary">Balance floor</dt>
            <dd className="font-mono text-[0.8125rem] tabular-nums text-ink">32 STT</dd>
          </div>
        </dl>
      </section>

      <section>
        <h2 className="font-mono text-[0.6875rem] uppercase tracking-[0.2em] text-ink-tertiary">
          Contract
        </h2>
        <p className="mt-4 border-y border-rule-hair py-4 font-mono text-[0.8125rem] tabular-nums text-ink">
          <a
            href={explorerAddress(contract)}
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-signal-text"
          >
            {contract}
          </a>
        </p>
      </section>
    </div>
  );
}
