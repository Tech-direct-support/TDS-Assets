"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Sparkles, Loader2 } from "lucide-react";
import { createTicket } from "@/lib/actions/helpdesk";
import { suggestTicketAction } from "@/lib/actions/ai";
import type { TicketSuggestion } from "@/lib/ai/helpdesk";
import { Button } from "@/components/ui/Button";
import type { TicketCategory, TicketPriority } from "@/lib/types/database";

interface AssetOption {
  id: string;
  asset_tag: string;
  name: string;
}

const CATEGORIES: TicketCategory[] = ["asset_issue", "tracking_issue", "missing_asset", "maintenance", "access", "general_support"];
const PRIORITIES: TicketPriority[] = ["low", "medium", "high", "critical"];

const inputClass = "w-full h-9 px-3 text-[13px] border border-line-strong rounded-[3px] focus:outline-none focus:border-black";

export function NewTicketForm({ assets }: { assets: AssetOption[] }) {
  const router = useRouter();
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<TicketCategory>("general_support");
  const [priority, setPriority] = useState<TicketPriority>("low");
  const [relatedAssetId, setRelatedAssetId] = useState("");
  const [suggestion, setSuggestion] = useState<TicketSuggestion | null>(null);
  const [suggesting, setSuggesting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSuggest() {
    if (!subject && !description) return;
    setSuggesting(true);
    const res = await suggestTicketAction(subject, description);
    setSuggesting(false);
    if (res.data) {
      setSuggestion(res.data);
    }
  }

  function applySuggestion() {
    if (!suggestion) return;
    setCategory(suggestion.category);
    setPriority(suggestion.priority);
    if (suggestion.related_asset_tag) {
      const match = assets.find((a) => a.asset_tag.toLowerCase() === suggestion.related_asset_tag?.toLowerCase());
      if (match) setRelatedAssetId(match.id);
    }
  }

  return (
    <form
      className="max-w-2xl"
      onSubmit={async (e) => {
        e.preventDefault();
        setSaving(true);
        setError(null);
        const res = await createTicket({
          subject,
          description,
          category,
          priority,
          related_asset_id: relatedAssetId || null,
        });
        setSaving(false);
        if (res.error) {
          setError(res.error);
          return;
        }
        router.push(`/helpdesk/${res.data!.id}`);
      }}
    >
      {error && <div className="mb-4 text-[12px] px-3 py-2 border border-red bg-red-tint text-red-dark rounded-[3px]">{error}</div>}

      <div className="mb-4">
        <label className="block text-[12px] font-medium text-ink mb-1.5">Subject</label>
        <input value={subject} onChange={(e) => setSubject(e.target.value)} required className={inputClass} placeholder="My laptop has been stolen" />
      </div>

      <div className="mb-3">
        <label className="block text-[12px] font-medium text-ink mb-1.5">Description</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          required
          rows={4}
          className="w-full px-3 py-2 text-[13px] border border-line-strong rounded-[3px] focus:outline-none focus:border-black"
        />
      </div>

      <Button type="button" variant="outline" disabled={suggesting} onClick={handleSuggest} className="mb-4">
        {suggesting ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
        {suggesting ? "Analysing..." : "Ask AI to classify"}
      </Button>

      {suggestion && (
        <div className="mb-4 border border-line bg-surface-muted rounded-[3px] px-3.5 py-3 text-[13px]">
          <p className="font-medium text-ink mb-1.5">AI suggestion</p>
          <p className="text-ink-soft">
            Category: <strong className="text-ink">{suggestion.category.replace(/_/g, " ")}</strong> · Priority:{" "}
            <strong className="text-ink">{suggestion.priority}</strong>
            {suggestion.related_asset_tag && (
              <>
                {" "}
                · Related asset: <strong className="text-ink">{suggestion.related_asset_tag}</strong>
              </>
            )}
          </p>
          <p className="text-ink-soft mt-1.5">{suggestion.suggested_action}</p>
          <Button type="button" variant="dark" onClick={applySuggestion} className="mt-2">
            Apply suggestion
          </Button>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div>
          <label className="block text-[12px] font-medium text-ink mb-1.5">Category</label>
          <select value={category} onChange={(e) => setCategory(e.target.value as TicketCategory)} className={inputClass}>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>{c.replace(/_/g, " ")}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-[12px] font-medium text-ink mb-1.5">Priority</label>
          <select value={priority} onChange={(e) => setPriority(e.target.value as TicketPriority)} className={inputClass}>
            {PRIORITIES.map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-[12px] font-medium text-ink mb-1.5">Related Asset</label>
          <select value={relatedAssetId} onChange={(e) => setRelatedAssetId(e.target.value)} className={inputClass}>
            <option value="">None</option>
            {assets.map((a) => (
              <option key={a.id} value={a.id}>{a.asset_tag} — {a.name}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Button type="submit" variant="primary" disabled={saving}>
          {saving ? "Creating..." : "Create Ticket"}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.back()}>Cancel</Button>
      </div>
    </form>
  );
}
