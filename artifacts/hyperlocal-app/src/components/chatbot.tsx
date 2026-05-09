import { useState, useRef, useEffect } from "react";
import { MessageCircle, X, Send, Bot, User, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface Message {
  role: "user" | "assistant";
  content: string;
}

const WELCOME_MESSAGE: Message = {
  role: "assistant",
  content: "Hi! I'm NearKart Assistant 👋 How can I help you today? I can help you find shops, answer order questions, or guide sellers on setup.",
};

export function Chatbot() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([WELCOME_MESSAGE]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, open]);

  useEffect(() => {
    if (open && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open]);

  async function send() {
    const text = input.trim();
    if (!text || loading) return;

    const userMsg: Message = { role: "user", content: text };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const history = messages.slice(-10); // Send last 10 messages as context
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text, history }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        if (res.status === 401) {
          setMessages((prev) => [
            ...prev,
            { role: "assistant", content: "Please log in to use NearKart Assistant." },
          ]);
          return;
        }
        throw new Error(data.error || "Request failed");
      }

      const data = await res.json();
      setMessages((prev) => [...prev, { role: "assistant", content: data.reply }]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Sorry, I couldn't process your request. Please try again shortly." },
      ]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => setOpen((o) => !o)}
        className="fixed bottom-20 right-4 z-30 w-12 h-12 rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/40 flex items-center justify-center hover:bg-primary/90 transition-all active:scale-95"
        aria-label="Open NearKart Assistant"
      >
        {open ? <X className="h-5 w-5" /> : <MessageCircle className="h-5 w-5" />}
      </button>

      {/* Chat panel */}
      {open && (
        <div className="fixed bottom-20 right-4 z-30 w-[calc(100vw-32px)] max-w-sm rounded-2xl shadow-2xl bg-white border border-border flex flex-col"
          style={{ height: "420px", marginRight: 0 }}
        >
          {/* Header */}
          <div className="flex items-center gap-2.5 px-4 py-3 bg-primary text-primary-foreground rounded-t-2xl shrink-0">
            <div className="w-8 h-8 rounded-full bg-primary-foreground/20 flex items-center justify-center">
              <Bot className="h-4 w-4" />
            </div>
            <div>
              <p className="font-semibold text-sm leading-tight">NearKart Assistant</p>
              <p className="text-xs text-primary-foreground/70 leading-tight">AI-powered help</p>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="ml-auto p-1 rounded-full hover:bg-primary-foreground/20 transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Messages */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 space-y-3 min-h-0">
            {messages.map((msg, i) => (
              <div
                key={i}
                className={`flex items-end gap-2 ${msg.role === "user" ? "flex-row-reverse" : "flex-row"}`}
              >
                <div className={`shrink-0 w-6 h-6 rounded-full flex items-center justify-center ${msg.role === "assistant" ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}>
                  {msg.role === "assistant" ? <Bot className="h-3.5 w-3.5" /> : <User className="h-3.5 w-3.5" />}
                </div>
                <div
                  className={`max-w-[78%] rounded-2xl px-3 py-2 text-sm leading-relaxed whitespace-pre-wrap ${
                    msg.role === "user"
                      ? "bg-primary text-primary-foreground rounded-br-sm"
                      : "bg-muted text-foreground rounded-bl-sm"
                  }`}
                >
                  {msg.content}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex items-end gap-2">
                <div className="shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center">
                  <Bot className="h-3.5 w-3.5" />
                </div>
                <div className="bg-muted rounded-2xl rounded-bl-sm px-3 py-2.5">
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                </div>
              </div>
            )}
          </div>

          {/* Input */}
          <div className="shrink-0 flex items-center gap-2 p-3 border-t border-border">
            <Input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && send()}
              placeholder="Ask anything..."
              className="flex-1 h-9 text-sm rounded-full bg-muted border-none focus-visible:ring-1"
              disabled={loading}
            />
            <Button
              size="sm"
              onClick={send}
              disabled={!input.trim() || loading}
              className="h-9 w-9 p-0 rounded-full shrink-0"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </>
  );
}
