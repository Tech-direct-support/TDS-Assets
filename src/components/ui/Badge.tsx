const TONE_CLASSES = {
  critical: "bg-red border-red text-white",
  attention: "bg-red-tint border-red text-red-dark",
  dark: "bg-black border-black text-white",
  neutral: "bg-white border-line-strong text-ink",
  muted: "bg-surface-sunken border-line text-ink-soft",
} as const;

export type BadgeTone = keyof typeof TONE_CLASSES;

export function Badge({ tone = "neutral", children }: { tone?: BadgeTone; children: React.ReactNode }) {
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-[3px] border text-[11px] font-medium leading-[18px] whitespace-nowrap ${TONE_CLASSES[tone]}`}
    >
      {children}
    </span>
  );
}
