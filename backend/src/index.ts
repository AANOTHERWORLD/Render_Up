import express from "express";
import cors from "cors";
import multer from "multer";
import pino from "pino";
import pinoHttp from "pino-http";
import { randomUUID } from "node:crypto";
import sizeOf from "image-size";
import { promises as fs } from "fs";
import { tmpdir } from "os";
import path from "path";
import { runDepthAnythingV2, runSDXLControlNetDepth } from "./providers/replicate";

// Lighting presets supported by the enhance endpoint
export type LightingPreset = "neutral_overcast" | "golden_hour" | "dramatic_contrast";

const PRESET_PROMPTS: Record<LightingPreset, string> = {
  neutral_overcast: "neutral overcast lighting, photoreal architecture",
  golden_hour: "warm golden hour lighting, photoreal architecture",
  dramatic_contrast: "dramatic high contrast lighting, photoreal architecture",
};

const app = express();

// structured logging
const logger = pino();
app.use(
  pinoHttp({
    logger,
    genReqId: () => randomUUID(),
    customProps: req => ({
      requestId: req.id,
      params: { ...req.params, ...req.query, ...(req.body || {}) },
    }),
  })
);

// configure CORS via environment; allow all origins when unset
app.use(
  process.env.ALLOWED_ORIGIN
    ? cors({ origin: process.env.ALLOWED_ORIGIN })
    : cors()
);
app.use(express.json());

// In‑memory upload storage with a 20MB limit
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 },
});

// health check endpoint
app.get("/health", (_req, res) => {
  res.json({ ok: true });
});

app.post("/depth", async (req, res) => {
  try {
    const output = await runDepthAnythingV2(req.body.image, req.body.modelSize);
    res.json({ output });
  } catch (err) {
    req.log.error(err as Error);
    res.status(500).json({ error: (err as Error).message });
  }
});

app.post("/controlnet", async (req, res) => {
  try {
    const output = await runSDXLControlNetDepth(req.body);
    res.json({ output });
  } catch (err) {
    req.log.error(err as Error);
    res.status(500).json({ error: (err as Error).message });
  }
});

app.post("/enhance", upload.single("image"), async (req, res) => {
  let tmpPath: string | undefined;
  try {
    const file = req.file?.buffer;
    if (!file) {
      res.status(400).json({ error: "Missing image" });
      return;
    }

    tmpPath = path.join(tmpdir(), `${randomUUID()}.png`);
    await fs.writeFile(tmpPath, file);

    const preset = req.body.preset as LightingPreset;
    let strength = req.body.strength ? Number(req.body.strength) : undefined;
    const preserveComposition = req.body.preserveComposition === "true";
    const upscale = req.body.upscale as string | undefined;

    // When preserving composition, tone down the effect by reducing the
    // provided strength value before passing it to the model.
    if (preserveComposition && typeof strength === "number") {
      strength *= 0.5;
    }

    let width: number | undefined;
    let height: number | undefined;
    try {
      const size = sizeOf(file);
      width = size.width;
      height = size.height;
      if (upscale && upscale !== "native" && width && height) {
        const factor = parseFloat(upscale);
        if (!isNaN(factor)) {
          width = Math.round(width * factor);
          height = Math.round(height * factor);
        }
      }
      if (width && height) {
        width = Math.round(width / 8) * 8;
        height = Math.round(height / 8) * 8;
      }
    } catch {
      // ignore dimension errors
    }

    const depthUrl = await runDepthAnythingV2(tmpPath);
    if (!depthUrl) {
      throw new Error("Depth map generation failed");
    }
    const prompt = PRESET_PROMPTS[preset] || "";
    const images = await runSDXLControlNetDepth({
      image: tmpPath,
      control_image: depthUrl,
      prompt,
      strength,
      controlnet_conditioning_scale: preserveComposition ? 1 : 0.5,
      width,
      height,
    });

    const requestId = (req as any).id as string;
    res.json({
      requestId,
      images,
      meta: { preset, strength, preserveComposition, upscale, width, height },
      depthUrl,
    });
  } catch (err) {
    req.log.error(err as Error);
    res.status(500).json({ error: (err as Error).message });
  } finally {
    if (tmpPath) {
      await fs.unlink(tmpPath).catch(() => {});
    }
  }
});

// generic 404 handler
app.use((req, res) => {
  res.status(404).send("Not Found");
});

// Multer error handler for oversized files
app.use(
  (err: any, _req: express.Request, res: express.Response, next: express.NextFunction) => {
    if (err instanceof multer.MulterError && err.code === "LIMIT_FILE_SIZE") {
      res.status(413).json({ error: "File too large" });
      return;
    }
    next(err);
  }
);

const PORT = Number(process.env.PORT) || 8787;
app.listen(PORT, () => {
  logger.info(`Server listening on http://localhost:${PORT}`);
});

