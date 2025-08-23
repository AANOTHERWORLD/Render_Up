import "dotenv/config";
import express from "express";
import cors from "cors";
import multer from "multer";
import { logger } from "./logger.js";
import { enhance } from "./pipeline.js";

const app = express();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 } // 20 MB
});

const PORT = Number(process.env.PORT || 8787);
const ORIGIN = process.env.ALLOWED_ORIGIN || "*";

app.use(cors({ origin: ORIGIN }));

app.get("/health", (_req, res) => res.json({ ok: true }));

app.post("/enhance", upload.single("image"), async (req, res) => {
  const t0 = Date.now();
  const requestId = Math.random().toString(36).slice(2, 10);
  try {
    if (!req.file) {
      return res.status(400).json({ error: "Missing image file" });
    }
    const preset = String(req.body.preset || "neutral_overcast") as any;
    const strength = Number(req.body.strength ?? 0.35);
    const preserveComposition = String(req.body.preserveComposition || "true") === "true";
    const upscale = String(req.body.upscale || "native");

    logger.info({ requestId, preset, strength, preserveComposition, size: req.file.size }, "start enhance");

    const result = await enhance({
      image: req.file.buffer,
      preset,
      strength,
      preserveComposition,
      upscale: upscale as any
    });

    const dt = Date.now() - t0;
    logger.info({ requestId, ms: dt, images: result.images.length }, "done enhance");
    res.json({ requestId, images: result.images, depthUrl: result.depthUrl, meta: result.meta });
  } catch (err: any) {
    logger.error({ err, requestId }, "enhance failed");
    res.status(500).json({ error: err?.message || "Server error", requestId });
  }
});

app.listen(PORT, () => {
  logger.info({ PORT, ORIGIN }, "server listening");
});
