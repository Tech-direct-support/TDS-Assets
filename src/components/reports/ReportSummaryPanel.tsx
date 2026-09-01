"use client";

import { useState } from "react";
import { Sparkles, Loader2 } from "lucide-react";
import { generateReportSummaryAction } from "@/lib/actions/ai";
import { Button } from "@/components/ui/Button";

export function ReportSummaryPanel() {
  const [summary, setSummary] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  return (
    <div>
      <Button
        variant="primary"
        disabled={loading}
        onClick={async () => {
          setLoading(true);
          const res = await generateReportSummaryAction();
          setSummary(res.data ?? "Unable to generate a summary.");
          setLoading(false);
        }}
      >
        {loading ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
        {loading ? "Generating..." : "Generate AI Summary"}
      </Button>
      {summary && (
        <div className="mt-3 border border-line bg-surface-muted rounded-[3px] px-3.5 py-3 text-[13px] text-ink leading-relaxed max-w-2xl">
          {summary}
        </div>
      )}
    </div>
  );
}
