"use client";

import { Download } from "lucide-react";
import { Button } from "@/components/ui/Button";

function toCsv(rows: Record<string, unknown>[]): string {
  if (rows.length === 0) return "";
  const headers = Object.keys(rows[0]);
  const escape = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  return [headers.join(","), ...rows.map((r) => headers.map((h) => escape(r[h])).join(","))].join("\n");
}

export function ExportCsvButton({ rows, filename }: { rows: Record<string, unknown>[]; filename: string }) {
  return (
    <Button
      variant="outline"
      disabled={rows.length === 0}
      onClick={() => {
        const blob = new Blob([toCsv(rows)], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
      }}
    >
      <Download size={13} /> Export CSV
    </Button>
  );
}
