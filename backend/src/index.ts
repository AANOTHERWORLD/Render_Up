import express from "express";
import cors from "cors";
import multer from "multer";
import pino from "pino";
import pinoHttp from "pino-http";
import { randomUUID } from "node:crypto";

import sizeOf from "image-size";
import cors from "cors";
import { runDepthAnythingV2, runSDXLControlNetDepth } from "./providers/replicate";


type LightingPreset = "neutral_overcast" | "golden_hour" | "dramatic_contrast";

const PRESET_PROMPTS: Record<LightingPreset, string> = {
  neutral_overcast: "neutral overcast lighting, photoreal architecture",
  golden_hour: "warm golden hour lighting, photoreal architecture",
  dramatic_contrast: "dramatic high contrast lighting, photoreal architecture",
};


const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 },
});


  }
});

app.post("/controlnet", async (req, res) => {
  try {


app.post("/enhance", upload.single("image"), async (req, res) => {
  try {
    const file = req.file?.buffer;
    if (!file) {
      res.status(400).json({ error: "Missing image" });
      return;
    }



        }
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

