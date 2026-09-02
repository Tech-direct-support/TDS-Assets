"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Paperclip, Trash2, Download } from "lucide-react";
import { uploadTicketAttachment, deleteTicketAttachment } from "@/lib/actions/helpdesk";
import { Button } from "@/components/ui/Button";

interface Attachment {
  id: string;
  file_name: string;
  url: string | null;
  uploader: string;
  created_at: string;
}

export function TicketAttachments({ ticketId, attachments }: { ticketId: string; attachments: Attachment[] }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFile(file: File | undefined) {
    if (!file) return;
    setBusy(true);
    setError(null);
    const fd = new FormData();
    fd.set("file", file);
    const res = await uploadTicketAttachment(ticketId, fd);
    setBusy(false);
    if (res.error) {
      setError(res.error);
      return;
    }
    router.refresh();
  }

  return (
    <div>
      {error && <p className="text-[12px] text-red mb-2">{error}</p>}

      {attachments.length === 0 ? (
        <p className="text-[12px] text-ink-soft mb-3">No attachments yet.</p>
      ) : (
        <div className="space-y-1.5 mb-3">
          {attachments.map((a) => (
            <div key={a.id} className="flex items-center gap-2 px-3 py-2 border border-line rounded-[3px] text-[12.5px]">
              <Paperclip size={13} className="text-ink-soft shrink-0" />
              <span className="flex-1 truncate text-ink">{a.file_name}</span>
              <span className="text-ink-soft text-[11px] shrink-0">{a.uploader}</span>
              {a.url && (
                <a href={a.url} target="_blank" rel="noopener noreferrer" className="text-ink-soft hover:text-ink shrink-0">
                  <Download size={13} />
                </a>
              )}
              <button
                type="button"
                className="text-ink-soft hover:text-red shrink-0"
                onClick={async () => {
                  if (!confirm(`Delete "${a.file_name}"?`)) return;
                  await deleteTicketAttachment(a.id, ticketId);
                  router.refresh();
                }}
              >
                <Trash2 size={13} />
              </button>
            </div>
          ))}
        </div>
      )}

      <Button variant="outline" disabled={busy} onClick={() => inputRef.current?.click()}>
        <Paperclip size={13} /> {busy ? "Uploading..." : "Attach file"}
      </Button>
      <input ref={inputRef} type="file" hidden onChange={(e) => handleFile(e.target.files?.[0])} />
    </div>
  );
}
