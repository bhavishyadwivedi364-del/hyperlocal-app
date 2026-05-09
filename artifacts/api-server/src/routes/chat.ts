import { Router } from "express";
import OpenAI from "openai";
import { z } from "zod";

const router = Router();

const ChatBody = z.object({
  message: z.string().min(1).max(1000),
  history: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string(),
      }),
    )
    .max(20)
    .optional()
    .default([]),
});

function getOpenAI(): OpenAI | null {
  const baseURL = process.env.AI_INTEGRATIONS_OPENAI_BASE_URL;
  const apiKey = process.env.AI_INTEGRATIONS_OPENAI_API_KEY;
  if (!baseURL || !apiKey) return null;
  return new OpenAI({ baseURL, apiKey });
}

const SYSTEM_PROMPT = `You are NearKart Assistant, a helpful AI for India's hyperlocal marketplace app NearKart.
NearKart connects customers in Tier-2/Tier-3 Indian cities with nearby local shops for groceries, medicines, food, electronics, and more.

Your role:
- Help customers find shops and products nearby
- Assist with order questions, tracking, and issues
- Guide sellers on shop setup, KYC, and product listing
- Answer questions about payment (COD, UPI, Razorpay)
- Provide information about delivery, returns, and support
- Answer in Hindi if the user writes in Hindi

Key features of NearKart:
- Browse nearby shops by GPS location
- Order groceries, medicines, food, electronics from local shops
- Track orders in real-time
- Multiple payment options: Cash on Delivery, UPI, Razorpay
- Seller dashboard for shop management
- KYC verification for sellers

Be friendly, concise, and helpful. If you cannot answer something, guide users to contact support.
Do not make up shop names, prices, or specific inventory — those are dynamic.`;

router.post("/chat", async (req, res) => {
  if (!req.isAuthenticated()) return res.status(401).json({ error: "Unauthorized" });

  try {
    const { message, history } = ChatBody.parse(req.body);

    const openai = getOpenAI();
    if (!openai) {
      // Fallback response when AI is not configured
      return res.json({
        reply: "Hello! I'm NearKart Assistant. Our AI chatbot is being set up. For immediate help, please visit our Contact Support page or try browsing our shops and categories directly!",
      });
    }

    const messages: OpenAI.ChatCompletionMessageParam[] = [
      { role: "system", content: SYSTEM_PROMPT },
      ...history.map((h) => ({ role: h.role, content: h.content })),
      { role: "user", content: message },
    ];

    const completion = await openai.chat.completions.create({
      model: "gpt-5-mini",
      max_completion_tokens: 512,
      messages,
    });

    const reply = completion.choices[0]?.message?.content ?? "Sorry, I couldn't generate a response. Please try again.";
    res.json({ reply });
  } catch (err) {
    req.log.error({ err }, "Chat request failed");
    res.status(500).json({ error: "Chat service temporarily unavailable" });
  }
});

export default router;
