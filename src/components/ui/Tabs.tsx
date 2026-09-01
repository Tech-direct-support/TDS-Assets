"use client";

import { useState } from "react";

export function Tabs({ tabs }: { tabs: { label: string; content: React.ReactNode }[] }) {
  const [active, setActive] = useState(0);

  return (
    <div>
      <div className="flex gap-1 border-b border-line overflow-x-auto">
        {tabs.map((t, i) => (
          <button
            key={t.label}
            onClick={() => setActive(i)}
            className={`shrink-0 px-3.5 py-2.5 text-[12.5px] font-medium border-b-2 -mb-px transition-colors ${
              active === i ? "border-red text-ink" : "border-transparent text-ink-soft hover:text-ink"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div className="pt-4">{tabs[active].content}</div>
    </div>
  );
}
