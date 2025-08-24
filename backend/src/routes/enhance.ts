import { Router } from "express";
import multer from "multer";
import crypto from "crypto";
import { logger } from "../utils/logger";
import { normalizeImageToMaxSize } from "../utils/image";
import { enhanceBodySchema, presetPrompt } from "../schemas/enhance";
import { adjustStrength, runDepthMap, runSDXLDepth, runUpscale, ensureHostedUrl } from "../services/enhance";

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 25 * 1024 * 1024 } });
export const enhanceRouter = Router();

/**
 * POST /api/enhance
 * form-data:
 *  - file: image (optional if imageUrl provided)
 *  - imageUrl: string (optional if file provided)
 *  - preset, strength, preserve_composition, upscale, mode
 */
enhanceRouter.post("/", upload.single("file"), async (req, res) => {
  try {
    const parsed = enhanceBodySchema.safeParse({
      preset: req.body?.preset,
      strength: req.body?.strength ? Number(req.body.strength) : undefined,
      preserve_composition: req.body?.preserve_composition === "false" ? false : req.body?.preserve_composition === "true" ? true : undefined,
      upscale: req.body?.upscale,
      mode: req.body?.mode
    });
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.flatten() });
    }
    const body = parsed.data;

    const maxSide = Number(process.env.ENHANCE_DEFAULT_MAX_SIZE || 1536);
    let hostedUrl = req.body?.imageUrl as string | undefined;

    if (req.file?.buffer) {
      const normalized = await normalizeImageToMaxSize(req.file.buffer, maxSide);
      hostedUrl = await ensureHostedUrl(normalized, hostedUrl);
    }

    if (!hostedUrl) {
      return res.status(400).json({ error: "Provide a file or imageUrl" });
    }

    const prompt = presetPrompt(body.preset);
    const tune = adjustStrength({ strength: body.strength, preserve: body.preserve_composition });

    const depthOutput = await runDepthMap(hostedUrl);
    const depthUrl = Array.isArray(depthOutput) ? depthOutput[0] : depthOutput;

    const sdxlUrl = await runSDXLDepth({
      imageUrl: hostedUrl,
      depthUrl,
      prompt,
      strength: tune.strength,
      controlnet_conditioning_scale: tune.controlnet_conditioning_scale
    });

    let finalUrl = sdxlUrl;
    if (body.upscale !== "none") {
      finalUrl = await runUpscale(sdxlUrl, body.upscale);
    }

    return res.json({
      status: "succeeded",
      input: { preset: body.preset, preserve_composition: body.preserve_composition, upscale: body.upscale },
      output: { image: finalUrl }
    });

  } catch (err: any) {
    logger.error({ err }, "Enhance failed");
    return res.status(500).json({ error: err?.message || "Internal error" });
  }
});
