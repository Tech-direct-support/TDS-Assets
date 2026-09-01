"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Bot, Send } from "lucide-react";
import { addTicketComment } from "@/lib/actions/helpdesk";
import { Button } from "@/components/ui/Button";

interface Comment {
  id: string;
  body: string;
  is_ai: boolean;
  created_at: string;
  author: string;
}

export function TicketComments({ ticketId, comments }: { ticketId: string; comments: Comment[] }) {
  const router = useRouter();
  const [body, setBody] = useState("");
  const [saving, setSaving] = useState(false);

  return (
    <div>
      <div className="space-y-3 mb-4">
        {comments.length === 0 ? (
          <p className="text-[12px] text-ink-soft">No comments yet.</p>
        ) : (
          comments.map((c) => (
            <div key={c.id} className={`px-3.5 py-2.5 rounded-[3px] border text-[13px] ${c.is_ai ? "bg-red-tint border-red" : "bg-surface-muted border-line"}`}>
              <div className="flex items-center gap-1.5 text-[11px] text-ink-soft mb-1">
                {c.is_ai && <Bot size={12} className="text-red" />}
                <span className="font-medium text-ink">{c.author}</span>
                <span>{new Date(c.created_at).toLocaleString("en-AU", { dateStyle: "medium", timeStyle: "short" })}</span>
              </div>
              <div className="text-ink whitespace-pre-wrap">{c.body}</div>
            </div>
          ))
        )}
      </div>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          if (!body.trim()) return;
          setSaving(true);
          await addTicketComment(ticketId, body.trim());
          setBody("");
          setSaving(false);
          router.refresh();
        }}
        className="flex gap-2"
      >
        <input
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Add a comment..."
          className="flex-1 h-9 px-3 text-[13px] border border-line-strong rounded-[3px] focus:outline-none focus:border-black"
        />
        <Button type="submit" variant="dark" disabled={saving || !body.trim()}>
          <Send size={13} />
        </Button>
      </form>
    </div>
  );
}
