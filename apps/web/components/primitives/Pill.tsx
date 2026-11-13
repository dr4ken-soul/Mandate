/**
 * A status word in a ruled box.
 *
 * The state is carried by the word, never by the colour alone.
 */
export function Pill({
  children,
  tone = "ink",
}: {
  children: React.ReactNode;
  tone?: "ink" | "signal" | "plate";
}) {
  const tones = {
    ink: "border-rule-strong text-ink",
    signal: "border-signal text-signal-text",
    plate: "border-rule-plate text-plate-ink-muted",
  } as const;
  return (
    <span
      className={`inline-flex items-center border px-[6px] py-[2px] font-mono text-[0.6875rem] uppercase tracking-[0.16em] ${tones[tone]}`}
    >
      {children}
    </span>
  );
}
