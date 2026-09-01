"use client";

import { useState } from "react";
import { Sparkles, Loader2 } from "lucide-react";
import { explainAlertAction } from "@/lib/actions/ai";
import { Button } from "@/components/ui/Button";

export function ExplainAlertButton({ alertId }: { alertId: string }) {
  const [explanation, setExplanation] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  return (
    <div>
      <Button
        variant="dark"
        disabled={loading}
        onClick={async () => {
          setLoading(true);
          const res = await explainAlertAction(alertId);
          setExplanation(res.data ?? "Unable to generate an explanation.");
          setLoading(false);
        }}
      >
        {loading ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
        {loading ? "Explaining..." : "Explain this alert"}
      </Button>
      {explanation && (
        <div className="mt-3 border border-line bg-surface-muted rounded-[3px] px-3.5 py-3 text-[13px] text-ink leading-relaxed">
          {explanation}
        </div>
      )}
    </div>
  );
}
