import type { ReactNode } from "react";

/**
 * The double bezel.
 *
 * A machined object sitting in a tray: an outer shell of paper, an inner core
 * with a two pixel rule along its top edge. No radius, no blur, no shadow.
 */
export function Enclosure({
  children,
  className = "",
  tone = "paper",
}: {
  children: ReactNode;
  className?: string;
  tone?: "paper" | "plate";
}) {
  if (tone === "plate") {
    return (
      <div className={`border border-rule-plate p-[6px] ${className}`}>{children}</div>
    );
  }
  return (
    <div className={`border border-rule-hair p-[6px] bg-paper ${className}`}>
      <div className="border border-rule-hair border-t-2 border-t-rule-strong bg-paper p-6 lg:p-8">
        {children}
      </div>
    </div>
  );
}
