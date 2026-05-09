import rateLimit from "express-rate-limit";

export const globalRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: 300,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { error: "Too many requests. Please try again later." },
  skip: (req) => req.method === "OPTIONS",
});

export const otpRateLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  limit: 5, // max 5 OTP sends per IP per 10 min
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { error: "Too many OTP requests. Please wait before trying again." },
  keyGenerator: (req) => {
    // Key by phone number if available; fall back to a stable non-IP string
    const phone = (req.body as Record<string, string>)?.phone;
    return phone ? `otp_${phone}` : "anon";
  },
  validate: { trustProxy: false },
});

export const authRateLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  limit: 20,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { error: "Too many authentication attempts. Please slow down." },
});
