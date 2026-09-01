"use client";

import { useEffect, useRef, useState } from "react";
import { Bot, Send, Loader2 } from "lucide-react";
import { askAssistantAction } from "@/lib/actions/ai";
import { PageHeader } from "@/components/ui/PageHeader";

interface Message {
  role: "user" | "assistant";
  text: string;
}

const SUGGESTIONS = [
  "How many assets are missing?",
  "Which assets have warranty expiring in the next 30 days?",
  "Show me recent geofence breaches.",
  "Which site has the most alerts?",
  "How many laptops are currently in maintenance?",
];

export default function AssistantPage() {
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

  return (
    <div className="h-full flex flex-col">
      <PageHeader
        title="AI Asset Assistant"
        description="Ask operational questions about your estate. Answers are generated only from your platform data — never invented."
      />

      <div className="flex-1 px-4 md:px-6 pb-6 flex flex-col min-h-0">
        <div className="flex-1 border border-line rounded-[3px] bg-white flex flex-col min-h-0">
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-5 space-y-3">
            {messages.length === 0 && (
              <div>
                <p className="text-[13px] text-ink-soft mb-3">Try one of these, or ask your own question:</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-w-xl">
                  {SUGGESTIONS.map((s) => (
                    <button
                      key={s}
                      onClick={() => ask(s)}
                      className="text-left text-[12.5px] px-3 py-2.5 border border-line rounded-[3px] hover:border-black transition-colors"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {messages.map((m, i) => (
              <div key={i} className={`flex items-start gap-2 ${m.role === "user" ? "flex-row-reverse" : ""}`}>
                {m.role === "assistant" && <Bot size={16} className="text-red mt-1.5 shrink-0" />}
                <div
                  className={`text-[13.5px] leading-relaxed px-3.5 py-2.5 rounded-[3px] max-w-[80%] ${
                    m.role === "user" ? "bg-black text-white" : "bg-surface-muted text-ink border border-line"
                  }`}
                >
                  {m.text}
                </div>
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
              placeholder="Ask about assets, alerts, warranty, or locations..."
              className="flex-1 h-10 px-3 text-[13.5px] border border-line rounded-[3px] focus:outline-none focus:border-black"
            />
            <button
              type="submit"
              disabled={loading}
              className="h-10 w-10 flex items-center justify-center bg-red text-white rounded-[3px] disabled:opacity-50"
              aria-label="Send"
            >
              <Send size={15} />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
