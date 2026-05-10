import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useI18n } from "@/lib/i18n";
import { useSubmitFeedback } from "@workspace/api-client-react";
import { MessageSquare, Phone, Mail, MapPin, ChevronLeft, CheckCircle2, Bot } from "lucide-react";
import { Link } from "wouter";

type FeedbackType = "general" | "complaint" | "product_review" | "shop_review";

export function ContactPage() {
  const { t } = useI18n();
  const { toast } = useToast();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [type, setType] = useState<FeedbackType>("general");
  const [message, setMessage] = useState("");
  const [rating, setRating] = useState(5);
  const [submitted, setSubmitted] = useState(false);
  const [aiMsg, setAiMsg] = useState("");
  const [aiInput, setAiInput] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiChat, setAiChat] = useState<{ role: "user" | "ai"; text: string }[]>([]);

  const { mutate: createFeedback, isPending } = useSubmitFeedback({
    mutation: {
      onSuccess: () => {
        setSubmitted(true);
        setMessage("");
      },
      onError: () => toast({ title: "Failed to submit. Please try again.", variant: "destructive" }),
    },
  });

  const handleAiSend = async () => {
    if (!aiInput.trim()) return;
    const userMsg = aiInput.trim();
    setAiChat((c) => [...c, { role: "user", text: userMsg }]);
    setAiInput("");
    setAiLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: userMsg }),
      });
      const data = await res.json();
      const reply = data.reply ?? data.message ?? "I'm here to help! For specific issues, please fill out the contact form below or call our support number.";
      setAiChat((c) => [...c, { role: "ai", text: reply }]);
    } catch {
      setAiChat((c) => [...c, { role: "ai", text: "Sorry, I'm having trouble connecting. Please try again or use the contact form below." }]);
    } finally {
      setAiLoading(false);
    }
  };

  const faqItems = [
    { q: "How do I track my order?", a: "Go to Orders in the bottom menu to track all your orders in real-time." },
    { q: "Can I cancel my order?", a: "Orders can be cancelled before they are dispatched by the seller." },
    { q: "How do I become a seller?", a: "Go to Profile, switch to Seller role, and register your shop." },
    { q: "What payment methods are accepted?", a: "Cash on Delivery, UPI, and online payments via Razorpay." },
  ];

  return (
    <div className="bg-gray-50 min-h-full">
      <div className="bg-white px-4 py-3 border-b flex items-center gap-3">
        <Link href="/profile" className="text-muted-foreground hover:text-foreground">
          <ChevronLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-lg font-bold">{t("contactUs")}</h1>
      </div>

      <div className="p-4 space-y-4">
        {/* Contact Info */}
        <div className="bg-primary/5 rounded-2xl p-4 space-y-3">
          <h2 className="font-semibold text-sm">Reach Us Directly</h2>
          <ContactInfoRow icon={Phone} text="+91 98765 43210" sub="Mon-Sat, 9am - 7pm" />
          <ContactInfoRow icon={Mail} text="support@hyperlocal.in" sub="We reply within 24 hours" />
          <ContactInfoRow icon={MapPin} text="Tier-2 India" sub="Local support in your city" />
        </div>

        {/* AI Assistant */}
        <div className="bg-white rounded-2xl border shadow-sm overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-3 border-b bg-gradient-to-r from-primary/10 to-primary/5">
            <Bot className="h-4 w-4 text-primary" />
            <h2 className="font-semibold text-sm">AI Assistant (Beta)</h2>
            <span className="text-xs text-muted-foreground ml-auto">Ask anything</span>
          </div>
          <div className="p-3 space-y-2 min-h-[100px] max-h-48 overflow-y-auto">
            {aiChat.length === 0 ? (
              <div className="text-center py-4">
                <Bot className="h-8 w-8 mx-auto text-muted-foreground/30 mb-2" />
                <p className="text-xs text-muted-foreground">Ask about orders, delivery, payments, or becoming a seller</p>
              </div>
            ) : (
              aiChat.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[80%] px-3 py-2 rounded-xl text-xs ${msg.role === "user" ? "bg-primary text-primary-foreground" : "bg-gray-100 text-foreground"}`}>
                    {msg.text}
                  </div>
                </div>
              ))
            )}
            {aiLoading && (
              <div className="flex justify-start">
                <div className="bg-gray-100 px-3 py-2 rounded-xl text-xs animate-pulse">Thinking...</div>
              </div>
            )}
          </div>
          <div className="flex gap-2 p-3 border-t">
            <Input
              value={aiInput}
              onChange={(e) => setAiInput(e.target.value)}
              placeholder="Ask a question..."
              className="h-9 text-sm"
              onKeyDown={(e) => e.key === "Enter" && handleAiSend()}
            />
            <Button size="sm" onClick={handleAiSend} disabled={aiLoading || !aiInput.trim()} className="h-9 px-3">
              Send
            </Button>
          </div>
        </div>

        {/* FAQ */}
        <div className="bg-white rounded-2xl border shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b">
            <h2 className="font-semibold text-sm">Frequently Asked Questions</h2>
          </div>
          <div className="divide-y">
            {faqItems.map((faq, i) => (
              <FaqItem key={i} q={faq.q} a={faq.a} />
            ))}
          </div>
        </div>

        {/* Feedback Form */}
        <div className="bg-white rounded-2xl border shadow-sm overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-3 border-b">
            <MessageSquare className="h-4 w-4 text-primary" />
            <h2 className="font-semibold text-sm">Send Feedback / Complaint</h2>
          </div>

          {submitted ? (
            <div className="flex flex-col items-center py-8 px-4">
              <CheckCircle2 className="h-12 w-12 text-green-500 mb-3" />
              <h3 className="font-semibold">Thank you for your feedback!</h3>
              <p className="text-sm text-muted-foreground mt-1 text-center">We'll get back to you within 24 hours.</p>
              <Button size="sm" className="mt-4" onClick={() => setSubmitted(false)}>Submit Another</Button>
            </div>
          ) : (
            <div className="p-4 space-y-3">
              <div className="grid grid-cols-2 gap-2">
                {(["general", "complaint", "product_review", "shop_review"] as const).map((t_) => (
                  <button
                    key={t_}
                    onClick={() => setType(t_)}
                    className={`py-2 text-xs rounded-lg border-2 font-medium capitalize transition-colors ${type === t_ ? "border-primary bg-primary/5 text-primary" : "border-border text-muted-foreground"}`}
                  >
                    {t_.replace("_", " ")}
                  </button>
                ))}
              </div>

              {/* Rating */}
              <div>
                <Label className="text-xs text-muted-foreground">Rating</Label>
                <div className="flex gap-1 mt-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button key={star} onClick={() => setRating(star)} className="text-xl">
                      <span className={star <= rating ? "text-amber-400" : "text-gray-300"}>★</span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <Label className="text-xs text-muted-foreground">Message</Label>
                <Textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Describe your issue or feedback..."
                  className="mt-1 resize-none"
                  rows={3}
                />
              </div>

              <Button
                className="w-full"
                disabled={!message.trim() || isPending}
                onClick={() => createFeedback({ data: { rating, comment: message.trim(), type } })}
              >
                {isPending ? "Submitting..." : t("submit")}
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ContactInfoRow({ icon: Icon, text, sub }: { icon: any; text: string; sub: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
        <Icon className="h-4 w-4 text-primary" />
      </div>
      <div>
        <p className="text-sm font-medium">{text}</p>
        <p className="text-xs text-muted-foreground">{sub}</p>
      </div>
    </div>
  );
}

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <button className="w-full text-left px-4 py-3" onClick={() => setOpen(!open)}>
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium">{q}</p>
        <span className="text-muted-foreground text-lg leading-none">{open ? "−" : "+"}</span>
      </div>
      {open && <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">{a}</p>}
    </button>
  );
}
