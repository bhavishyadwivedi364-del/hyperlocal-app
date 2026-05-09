import express, { type Express } from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import pinoHttp from "pino-http";
import helmet from "helmet";
import path from "path";
import router from "./routes";
import { logger } from "./lib/logger";
import { authMiddleware } from "./middlewares/authMiddleware";
import { globalRateLimiter } from "./middlewares/rateLimiter";

const app: Express = express();

// Trust Replit's reverse proxy so express-rate-limit and IP detection work correctly
app.set("trust proxy", 1);

// Security headers
app.use(
  helmet({
    contentSecurityPolicy: false, // disabled — Replit proxy handles this
    crossOriginEmbedderPolicy: false,
  }),
);

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return { id: req.id, method: req.method, url: req.url?.split("?")[0] };
      },
      res(res) {
        return { statusCode: res.statusCode };
      },
    },
  }),
);

app.use(cors({ credentials: true, origin: true }));
app.use(cookieParser());
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Global rate limit (generous — OTP endpoints have their own tighter limits)
app.use(globalRateLimiter);

app.use(authMiddleware);

// Serve uploaded images
app.use("/api/uploads", express.static(path.join(process.cwd(), "uploads")));

app.use("/api", router);

export default app;
