"use client";

import { useState, useRef, useCallback, useEffect } from "react";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  categories?: string[];
}

interface AskPanelProps {
  onSelectCategories: (categories: string[]) => void;
}

export function AskPanel({ onSelectCategories }: AskPanelProps) {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const submitQuestion = useCallback(async (question: string) => {
    const q = question.trim();
    if (!q || loading) return;

    setMessages((prev) => [...prev, { role: "user", content: q }]);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: q }),
      });
      const data = await res.json();
      if (data.error) {
        setMessages((prev) => [...prev, { role: "assistant", content: `Error: ${data.error}` }]);
      } else {
        setMessages((prev) => [...prev, {
          role: "assistant",
          content: data.answer,
          categories: data.categories,
        }]);
        if (data.categories?.length > 0) {
          onSelectCategories(data.categories);
        }
      }
    } catch {
      setMessages((prev) => [...prev, { role: "assistant", content: "Failed to connect. Is your API key set?" }]);
    } finally {
      setLoading(false);
    }
  }, [loading, onSelectCategories]);

  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    submitQuestion(input);
  }, [input, submitQuestion]);

  return (
    <div className="h-full flex flex-col bg-white overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-black/[0.04] flex-shrink-0">
        <div className="flex items-center gap-2">
          <svg className="w-3 h-3 text-[var(--color-ocean)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
          <h3 className="text-[10px] font-mono font-semibold tracking-widest text-muted-foreground uppercase">AI Analyst</h3>
        </div>
        {messages.length > 0 && (
          <button
            onClick={() => { setMessages([]); onSelectCategories([]); }}
            className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-mono font-medium text-muted-foreground/70 hover:text-[var(--color-coral)] hover:bg-[var(--color-coral)]/5 transition-all"
          >
            <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
            Clear
          </button>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 min-h-0 overflow-y-auto px-2.5 py-2 space-y-2.5">
        {messages.length === 0 && !loading && (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-center px-4">
            <svg className="w-6 h-6 text-muted-foreground/20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            <p className="text-[10px] text-muted-foreground/70 leading-relaxed">
              Ask about SD business trends, categories, neighborhoods, or policy impacts
            </p>
            <div className="flex flex-wrap gap-1 justify-center">
              {[
                "What's growing near Mission Beach?",
                "Compare taxi vs rideshare",
                "Top 3 fastest growing industries?",
              ].map((suggestion) => (
                <button
                  key={suggestion}
                  onClick={() => submitQuestion(suggestion)}
                  className="text-[9px] font-mono px-2 py-1 rounded-full border border-black/[0.1] text-muted-foreground/80 hover:text-[var(--color-ocean)] hover:border-[var(--color-ocean)]/30 hover:bg-[var(--color-ocean)]/5 transition-all"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
            <div className={`max-w-[90%] ${msg.role === "user"
              ? "bg-[var(--color-ocean)] text-white rounded-xl rounded-br-sm px-3 py-1.5"
              : "bg-black/[0.04] text-foreground rounded-xl rounded-bl-sm px-3 py-2"
            }`}>
              {msg.role === "user" ? (
                <p className="text-[11px]">{msg.content}</p>
              ) : (
                <div>
                  <p className="text-[11px] leading-relaxed whitespace-pre-wrap text-foreground/90">{msg.content}</p>
                  {msg.categories && msg.categories.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1.5 pt-1.5 border-t border-black/[0.06]">
                      <span className="text-[8px] font-mono text-muted-foreground/60 mr-0.5 self-center">Showing:</span>
                      {msg.categories.map((cat) => (
                        <span key={cat} className="text-[8px] font-mono font-medium px-1.5 py-0.5 rounded bg-[var(--color-ocean)]/15 text-[var(--color-ocean)]">
                          {cat}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-start">
            <div className="bg-black/[0.03] rounded-xl rounded-bl-sm px-3 py-2.5">
              <div className="flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-[var(--color-ocean)] animate-pulse" />
                <div className="w-1.5 h-1.5 rounded-full bg-[var(--color-ocean)] animate-pulse" style={{ animationDelay: "0.2s" }} />
                <div className="w-1.5 h-1.5 rounded-full bg-[var(--color-ocean)] animate-pulse" style={{ animationDelay: "0.4s" }} />
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} className="px-2 py-1.5 border-t border-black/[0.04] flex-shrink-0">
        <div className="flex items-center gap-1.5">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about SD businesses..."
            disabled={loading}
            className="flex-1 h-7 px-2.5 rounded-full bg-black/[0.03] border border-black/[0.06] text-[11px] font-mono text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:border-[var(--color-ocean)]/30 focus:bg-white disabled:opacity-50 transition-all"
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="flex-shrink-0 w-7 h-7 rounded-full bg-[var(--color-ocean)] text-white flex items-center justify-center disabled:opacity-30 hover:bg-[var(--color-ocean)]/90 transition-all"
          >
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          </button>
        </div>
        <p className="text-[8px] font-mono text-muted-foreground/40 text-center mt-1">Powered by Claude &middot; querying ~60k SD business records</p>
      </form>
    </div>
  );
}
