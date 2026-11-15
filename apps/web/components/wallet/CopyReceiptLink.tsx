"use client";

import { useState } from "react";

export function CopyReceiptLink() {
  const [copied, setCopied] = useState(false);
  const [failed, setFailed] = useState(false);

  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(window.location.href);
          setCopied(true);
          setFailed(false);
          window.setTimeout(() => setCopied(false), 1800);
        } catch {
          setFailed(true);
        }
      }}
      className="border-b border-plate-ink-muted pb-0.5 font-mono text-[0.75rem] uppercase tracking-[0.12em] text-plate-ink"
      aria-live="polite"
    >
      {copied ? "Link copied" : failed ? "Copy unavailable" : "Copy link"}
    </button>
  );
}
