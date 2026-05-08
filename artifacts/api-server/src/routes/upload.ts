import { Router } from "express";
import fs from "fs";
import path from "path";
import crypto from "crypto";

const router = Router();

const UPLOADS_DIR = path.join(process.cwd(), "uploads");
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

const MAX_SIZE_BYTES = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

router.post("/upload", async (req, res) => {
  if (!req.isAuthenticated()) return res.status(401).json({ error: "Unauthorized" });

  try {
    const { image } = req.body as { image?: string };
    if (!image) return res.status(400).json({ error: "No image provided" });

    // Parse data URL: "data:image/jpeg;base64,<data>"
    const match = image.match(/^data:([^;]+);base64,(.+)$/);
    if (!match) return res.status(400).json({ error: "Invalid image format. Must be a base64 data URL." });

    const mimeType = match[1];
    const base64Data = match[2];

    if (!ALLOWED_TYPES.includes(mimeType)) {
      return res.status(400).json({ error: "Unsupported image type. Use JPEG, PNG, WebP, or GIF." });
    }

    const buffer = Buffer.from(base64Data, "base64");
    if (buffer.length > MAX_SIZE_BYTES) {
      return res.status(400).json({ error: "Image too large. Maximum 5MB." });
    }

    const ext = mimeType.split("/")[1].replace("jpeg", "jpg");
    const filename = `${crypto.randomBytes(16).toString("hex")}.${ext}`;
    const filepath = path.join(UPLOADS_DIR, filename);

    fs.writeFileSync(filepath, buffer);

    const url = `/api/uploads/${filename}`;
    res.json({ url });
  } catch (err) {
    req.log.error({ err }, "Upload failed");
    res.status(500).json({ error: "Upload failed" });
  }
});

export default router;
