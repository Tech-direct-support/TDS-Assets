"use client";

import { useRouter, usePathname } from "next/navigation";
import { useState, useTransition } from "react";

interface Option {
  id: string;
  name: string;
}

export function AssetFilters({
  categories,
  locations,
  users,
  initial,
}: {
  categories: Option[];
  locations: Option[];
  users: Option[];
  initial: { q: string; category: string; status: string; location: string; assigned: string };
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [q, setQ] = useState(initial.q);
  const [, startTransition] = useTransition();

  function update(next: Partial<typeof initial>) {
    const merged = { ...initial, q, ...next };
    const params = new URLSearchParams();
    Object.entries(merged).forEach(([k, v]) => {
      if (v) params.set(k, v);
    });
    startTransition(() => router.push(`${pathname}?${params.toString()}`));
  }

  return (
    <div className="flex flex-wrap gap-2 items-center">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          update({ q });
        }}
        className="flex-1 min-w-[200px]"
      >
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search name, tag, serial..."
          className="w-full h-8 px-3 text-[12.5px] border border-line-strong rounded-[3px] focus:outline-none focus:border-black"
        />
      </form>

      <select
        value={initial.category}
        onChange={(e) => update({ category: e.target.value })}
        className="h-8 px-2 text-[12.5px] border border-line-strong rounded-[3px] bg-white"
      >
        <option value="">All categories</option>
        {categories.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
      </select>

      <select
        value={initial.status}
        onChange={(e) => update({ status: e.target.value })}
        className="h-8 px-2 text-[12.5px] border border-line-strong rounded-[3px] bg-white"
      >
        <option value="">All statuses</option>
        {[
          "ordered", "received", "in_stock", "assigned", "in_use", "maintenance",
          "in_transit", "missing", "returned", "disposal", "written_off",
        ].map((s) => (
          <option key={s} value={s}>
            {s.replace(/_/g, " ")}
          </option>
        ))}
      </select>

      <select
        value={initial.location}
        onChange={(e) => update({ location: e.target.value })}
        className="h-8 px-2 text-[12.5px] border border-line-strong rounded-[3px] bg-white"
      >
        <option value="">All locations</option>
        {locations.map((l) => (
          <option key={l.id} value={l.id}>
            {l.name}
          </option>
        ))}
      </select>

      <select
        value={initial.assigned}
        onChange={(e) => update({ assigned: e.target.value })}
        className="h-8 px-2 text-[12.5px] border border-line-strong rounded-[3px] bg-white"
      >
        <option value="">All owners</option>
        <option value="unassigned">Unassigned</option>
        {users.map((u) => (
          <option key={u.id} value={u.id}>
            {u.name}
          </option>
        ))}
      </select>

      {(initial.q || initial.category || initial.status || initial.location || initial.assigned) && (
        <button
          onClick={() => {
            setQ("");
            router.push(pathname);
          }}
          className="text-[12px] text-ink-soft hover:text-black underline"
        >
          Clear
        </button>
      )}
    </div>
  );
}
