"use client";

import { useState, useRef, useEffect } from "react";
import { usePathname } from "next/navigation";
import { Bot, X, Send, Loader2 } from "lucide-react";
import { askAssistantAction } from "@/lib/actions/ai";

interface Message {
  role: "user" | "assistant";
  text: string;
}

const SUGGESTIONS = [
  "How many assets are missing?",
  "Which assets have warranty expiring in the next 30 days?",
  "Show me recent geofence breaches.",
  "Which site has the most alerts?",
];

export function AssistantPanel() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading]);

  async function ask(question: string) {
    if (!question.trim() || loading) return;
    setMessages((m) => [...m, { role: "user", text: question }]);
    setInput("");
    setLoading(true);
    const res = await askAssistantAction(question);
    setMessages((m) => [...m, { role: "assistant", text: res.data ?? "Something went wrong." }]);
    setLoading(false);
  }

  if (pathname === "/assistant") return null;

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-5 right-5 z-30 flex items-center gap-2 h-11 px-4 rounded-full bg-black text-white shadow-[0_4px_14px_rgba(0,0,0,0.25)] hover:bg-ink transition-colors"
      >
        <Bot size={17} />
        <span className="text-[13px] font-medium">AI Assistant</span>
      </button>
    );
  }

  return (
    <div className="fixed inset-y-0 right-0 z-40 w-full sm:w-[380px] bg-white border-l border-line flex flex-col shadow-[-4px_0_20px_rgba(0,0,0,0.08)]">
      <div className="h-14 flex items-center justify-between px-4 border-b border-line shrink-0">
        <div className="flex items-center gap-2">
          <Bot size={17} className="text-red" />
          <span className="text-[13px] font-semibold">AI Asset Assistant</span>
        </div>
        <button onClick={() => setOpen(false)} aria-label="Close" className="text-ink-soft hover:text-black">
          <X size={18} />
        </button>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {messages.length === 0 && (
          <div>
            <p className="text-[12px] text-ink-soft mb-3">
              Ask about missing assets, warranty expiry, geofence breaches, alerts by site, or a
              specific asset tag. Answers are generated only from your platform data.
            </p>
            <div className="space-y-1.5">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => ask(s)}
                  className="w-full text-left text-[12px] px-2.5 py-2 border border-line rounded-[3px] hover:border-black transition-colors"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}
        {messages.map((m, i) => (
          <div
            key={i}
            className={`text-[13px] leading-relaxed px-3 py-2 rounded-[3px] max-w-[90%] ${
              m.role === "user" ? "ml-auto bg-black text-white" : "bg-surface-muted text-ink border border-line"
            }`}
          >
            {m.text}
          </div>
        ))}
        {loading && (
          <div className="flex items-center gap-2 text-[12px] text-ink-soft">
            <Loader2 size={13} className="animate-spin" /> Thinking...
          </div>
        )}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          ask(input);
        }}
        className="p-3 border-t border-line flex gap-2 shrink-0"
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask a question..."
          className="flex-1 h-9 px-3 text-[13px] border border-line rounded-[3px] focus:outline-none focus:border-black"
        />
        <button
          type="submit"
          disabled={loading}
          className="h-9 w-9 flex items-center justify-center bg-red text-white rounded-[3px] disabled:opacity-50"
          aria-label="Send"
        >
          <Send size={14} />
        </button>
      </form>
    </div>
  );
}
