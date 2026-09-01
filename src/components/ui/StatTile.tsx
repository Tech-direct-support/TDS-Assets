export function StatTile({
  label,
  value,
  emphasis = false,
}: {
  label: string;
  value: number | string;
  emphasis?: boolean;
}) {
  return (
    <div className="bg-white border border-line rounded-[3px] px-4 py-3.5">
      <div className="text-[11px] font-medium text-ink-soft uppercase tracking-wide">{label}</div>
      <div className={`mt-1.5 text-[24px] font-semibold leading-none ${emphasis ? "text-red" : "text-ink"}`}>
        {value}
      </div>
    </div>
  );
}
