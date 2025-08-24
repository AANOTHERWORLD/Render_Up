import { createPrediction, getPrediction } from "../lib/replicate";
import { logger } from "../utils/logger";
import axios from "axios";

const DEPTH_VERSION = process.env.REPLICATE_MODEL_DEPTH!;
const SDXL_CONTROLNET_DEPTH_VERSION = process.env.REPLICATE_MODEL_SDXL_CONTROLNET_DEPTH!;
const UPSCALE_VERSION = process.env.REPLICATE_MODEL_UPSCALE || "";

export function adjustStrength(input: {
  strength: number;
  preserve: boolean;
}): { strength: number; controlnet_conditioning_scale: number } {
  if (input.preserve) {
    return {
      strength: Math.max(0.25, input.strength * 0.5),
      controlnet_conditioning_scale: 1.0
    };
  }
  return { strength: input.strength, controlnet_conditioning_scale: 0.7 };
}

export async function runDepthMap(imageUrl: string) {
  const input = { image: imageUrl };
  logger.info({ input }, "Creating depth prediction");
  const pred = await createPrediction(DEPTH_VERSION, input);
  while (true) {
    const cur = await getPrediction(pred.id);
    if (cur.status === "succeeded") return cur.output;
    if (cur.status === "failed" || cur.status === "canceled") {
      throw new Error(cur.error || "Depth prediction failed");
    }
    await new Promise(r => setTimeout(r, 800));
  }
}

export async function runSDXLDepth({
  imageUrl,
  depthUrl,
  prompt,
  strength,
  controlnet_conditioning_scale,
  width,
  height
}: {
  imageUrl: string;
  depthUrl: string;
  prompt: string;
  strength: number;
  controlnet_conditioning_scale: number;
  width?: number;
  height?: number;
}) {
  const input: Record<string, any> = {
    image: imageUrl,
    control_image: depthUrl,
    prompt,
    strength,
    controlnet_conditioning_scale,
  };
  if (width) input.width = width;
  if (height) input.height = height;

  const pred = await createPrediction(SDXL_CONTROLNET_DEPTH_VERSION, input);
  while (true) {
    const cur = await getPrediction(pred.id);
    if (cur.status === "succeeded") {
      const out = Array.isArray(cur.output) ? cur.output[0] : cur.output;
      return out;
    }
    if (cur.status === "failed" || cur.status === "canceled") {
      throw new Error(cur.error || "SDXL ControlNet-depth failed");
    }
    await new Promise(r => setTimeout(r, 1000));
  }
}

export async function runUpscale(imageUrl: string, factor: "2x"|"4x") {
  if (!UPSCALE_VERSION) return imageUrl;
  const input = { image: imageUrl, scale: factor === "4x" ? 4 : 2 };
  const pred = await createPrediction(UPSCALE_VERSION, input);
  while (true) {
    const cur = await getPrediction(pred.id);
    if (cur.status === "succeeded") {
      const out = Array.isArray(cur.output) ? cur.output[0] : cur.output;
      return out;
    }
    if (cur.status === "failed" || cur.status === "canceled") {
      throw new Error(cur.error || "Upscale failed");
    }
    await new Promise(r => setTimeout(r, 1000));
  }
}

export async function ensureHostedUrl(imageBuffer?: Buffer, fallbackUrl?: string): Promise<string> {
  if (fallbackUrl) return fallbackUrl;
  throw new Error("No image URL provided. Configure upload hosting or pass a URL.");
}
