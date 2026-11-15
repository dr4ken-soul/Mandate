"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ProtectedRoute } from "@/components/routing/ProtectedRoute";
import { AppErrorBoundary } from "@/components/routing/AppErrorBoundary";
import { WalletMenu } from "@/components/wallet/WalletMenu";
import { enforcementLabel } from "@/lib/chain/useMandate";


const NAV = [
  { href: "/console", label: "Overview" },
  { href: "/console/mandates/new", label: "Mandates" },
  { href: "/console/decisions", label: "Decisions" },
  { href: "/console/positions", label: "Positions" },
  { href: "/console/settings", label: "Settings" },
];

function Shell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="min-h-[100dvh] bg-paper lg:grid lg:grid-cols-[15rem_1fr]">
      <aside className="hidden border-r border-rule-hair bg-paper lg:flex lg:flex-col">
        <div className="flex h-14 items-center border-b border-rule-hair px-5">
          <span className="font-display text-[0.8125rem] font-extrabold uppercase tracking-[0.22em] text-ink [font-stretch:68%]">
            Mandate
          </span>
        </div>
        <nav className="flex-1 py-4">
          {NAV.map((item) => {
            const active =
              item.href === "/console" ? pathname === "/console" : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`flex h-11 items-center border-l-2 px-5 font-mono text-[0.6875rem] uppercase tracking-[0.16em] transition-colors duration-[220ms] ${
                  active
                    ? "border-l-ink bg-paper-band text-ink"
                    : "border-l-transparent text-ink-secondary hover:text-ink"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-rule-hair p-5">
          <p className="font-mono text-[0.6875rem] uppercase tracking-[0.16em] text-ink-tertiary">
            Enforcement
          </p>
          <p className="mt-1 font-mono text-[0.8125rem] tabular-nums text-ink">
            {enforcementLabel()}
          </p>
        </div>
      </aside>

      <div className="min-w-0">
        <header className="sticky top-0 z-[200] flex h-14 items-center justify-between border-b border-rule-hair bg-paper px-4 sm:px-6">
          <span className="font-mono text-[0.6875rem] uppercase tracking-[0.2em] text-ink-tertiary">
            {NAV.find((item) =>
              item.href === "/console" ? pathname === "/console" : pathname.startsWith(item.href),
            )?.label ?? "Console"}
          </span>
          <WalletMenu />
        </header>
        <main className="max-w-[92rem] px-4 py-8 sm:px-6 lg:px-10 lg:py-10">{children}</main>
      </div>


    </div>
  );
}

export default function ConsoleLayout({ children }: { children: React.ReactNode }) {
  return (
    <AppErrorBoundary>
      <ProtectedRoute>
        <Shell>{children}</Shell>
      </ProtectedRoute>
    </AppErrorBoundary>
  );
}
