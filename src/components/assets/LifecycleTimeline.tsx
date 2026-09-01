import { Check } from "lucide-react";
import { LIFECYCLE_ORDER, ASSET_STATUS_LABELS } from "@/lib/lifecycle";
import type { AssetStatus } from "@/lib/types/database";

export function LifecycleTimeline({ status }: { status: AssetStatus }) {
  const currentIndex = LIFECYCLE_ORDER.indexOf(status);
  const isOffPath = currentIndex === -1; // missing / in_transit are side-states

  return (
    <div className="flex items-center overflow-x-auto py-2">
      {LIFECYCLE_ORDER.map((s, i) => {
        const done = !isOffPath && i < currentIndex;
        const active = !isOffPath && i === currentIndex;
        return (
          <div key={s} className="flex items-center shrink-0">
            <div className="flex flex-col items-center gap-1.5 w-[92px]">
              <div
                className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-semibold border ${
                  active
                    ? "bg-red border-red text-white"
                    : done
                    ? "bg-black border-black text-white"
                    : "bg-white border-line-strong text-ink-soft"
                }`}
              >
                {done ? <Check size={12} /> : i + 1}
              </div>
              <span className={`text-[10.5px] text-center leading-tight ${active ? "text-red font-semibold" : "text-ink-soft"}`}>
                {ASSET_STATUS_LABELS[s]}
              </span>
            </div>
            {i < LIFECYCLE_ORDER.length - 1 && (
              <div className={`h-[2px] w-6 ${done ? "bg-black" : "bg-line-strong"}`} />
            )}
          </div>
        );
      })}
      {isOffPath && (
        <div className="ml-3 text-[11px] font-medium text-red">
          Current: {ASSET_STATUS_LABELS[status]} (off standard path)
        </div>
      )}
    </div>
  );
}
