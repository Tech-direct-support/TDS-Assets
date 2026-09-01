"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Sparkles, Loader2, FileText } from "lucide-react";
import { summarizeTicketAction, suggestTicketAction } from "@/lib/actions/ai";
import { addTicketComment } from "@/lib/actions/helpdesk";
import { updateTicketFields } from "@/lib/actions/helpdesk";
import { Button } from "@/components/ui/Button";
import type { TicketSuggestion } from "@/lib/ai/helpdesk";

export function TicketAiPanel({
  ticketId,
  subject,
  description,
}: {
  ticketId: string;
  subject: string;
  description: string;
}) {
  const router = useRouter();
  const [summary, setSummary] = useState<string | null>(null);
  const [suggestion, setSuggestion] = useState<TicketSuggestion | null>(null);
  const [loadingSummary, setLoadingSummary] = useState(false);
  const [loadingSuggest, setLoadingSuggest] = useState(false);
  const [posting, setPosting] = useState(false);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <Button
          variant="outline"
          disabled={loadingSummary}
          onClick={async () => {
            setLoadingSummary(true);
            const res = await summarizeTicketAction(ticketId);
            setSummary(res.data ?? null);
            setLoadingSummary(false);
          }}
        >
          {loadingSummary ? <Loader2 size={13} className="animate-spin" /> : <FileText size={13} />}
          Summarize
        </Button>
        <Button
          variant="outline"
          disabled={loadingSuggest}
          onClick={async () => {
            setLoadingSuggest(true);
            const res = await suggestTicketAction(subject, description);
            setSuggestion(res.data ?? null);
            setLoadingSuggest(false);
          }}
        >
          {loadingSuggest ? <Loader2 size={13} className="animate-spin" /> : <Sparkles size={13} />}
          Suggest classification &amp; response
        </Button>
      </div>

      {summary && (
        <div className="border border-line bg-surface-muted rounded-[3px] px-3.5 py-3 text-[13px] text-ink leading-relaxed">
          {summary}
        </div>
      )}

      {suggestion && (
        <div className="border border-red bg-red-tint rounded-[3px] px-3.5 py-3 text-[13px]">
          <p className="text-ink">
            Suggested category: <strong>{suggestion.category.replace(/_/g, " ")}</strong> · priority:{" "}
            <strong>{suggestion.priority}</strong>
            {suggestion.related_asset_tag && (
              <>
                {" "}
                · related asset: <strong>{suggestion.related_asset_tag}</strong>
              </>
            )}
          </p>
          <p className="text-ink mt-1.5">{suggestion.suggested_action}</p>
          <p className="text-ink-soft mt-1.5 italic">&ldquo;{suggestion.suggested_response}&rdquo;</p>
          <div className="flex gap-2 mt-2.5">
            <Button
              variant="dark"
              disabled={posting}
              onClick={async () => {
                setPosting(true);
                await updateTicketFields(ticketId, { category: suggestion.category, priority: suggestion.priority });
                setPosting(false);
                router.refresh();
              }}
            >
              Apply category &amp; priority
            </Button>
            <Button
              variant="outline"
              disabled={posting}
              onClick={async () => {
                setPosting(true);
                await addTicketComment(ticketId, suggestion.suggested_response, true);
                setPosting(false);
                router.refresh();
              }}
            >
              Post as reply
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
