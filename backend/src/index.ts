import express from "express";
import cors from "cors";
import multer from "multer";
import pino from "pino";
import pinoHttp from "pino-http";
import { randomUUID } from "node:crypto";
import sizeOf from "image-size";
import { runDepthAnythingV2, runSDXLControlNetDepth } from "./providers/replicate";

type LightingPreset = "neutral_overcast" | "golden_hour" | "dramatic_contrast";

const PRESET_PROMPTS: Record<LightingPreset, string> = {
  neutral_overcast: "neutral overcast lighting, photoreal architecture",
  golden_hour: "warm golden hour lighting, photoreal architecture",
  dramatic_contrast: "dramatic high contrast lighting, photoreal architecture",
};

const app = express();

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

app.use(cors({ origin: process.env.ALLOWED_ORIGIN }));
app.use(express.json());

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 },
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
  try {
    const file = req.file?.buffer;
    if (!file) {
      res.status(400).json({ error: "Missing image" });
      return;
    }

    const preset = req.body.preset as LightingPreset;
    const strength = req.body.strength ? Number(req.body.strength) : undefined;
    const preserveComposition = req.body.preserveComposition === "true";
    const upscale = req.body.upscale;

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

    const depthUrl = await runDepthAnythingV2(file);
    const prompt = PRESET_PROMPTS[preset] || "";
    const images = await runSDXLControlNetDepth({
      image: file,
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
  }
});

app.use((req, res) => {
  res.status(404).send("Not Found");
});

const PORT = Number(process.env.PORT) || 8787;
app.listen(PORT, () => {
  logger.info(`Server listening on http://localhost:${PORT}`);
});

