import Replicate from "replicate";
import type { Readable } from "node:stream";

export type FileInput = Buffer | Readable | string; // Buffer/stream or URL string

const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN
});

const DEPTH_MODEL = process.env.REPLICATE_DEPTH_MODEL || "chenxwh/depth-anything-v2";
const CONTROLNET_MODEL = process.env.REPLICATE_CONTROLNET_DEPTH_MODEL || "lucataco/sdxl-controlnet-depth";

export async function runDepthAnythingV2(image: FileInput, modelSize: "Large" | "Base" = "Large"): Promise<string> {
  // Returns a URL to the generated depth image
  // The model accepts { image, model } and returns a single image
  const out = await replicate.run(DEPTH_MODEL, {
    input: { image, model: modelSize }
  }) as any;
  // Replicate output could be a string URL or an array
  if (typeof out === "string") return out;
  if (Array.isArray(out) && out.length > 0) return out[0];
  // Some models return objects with "image" field
  if (out?.image) return out.image;
  throw new Error("Unexpected depth model output shape");
}

export interface ControlNetDepthInput {
  image: FileInput;
  control_image: FileInput; // depth map
  prompt: string;
  num_inference_steps?: number;
  strength?: number; // denoise
  guidance_scale?: number;
  controlnet_conditioning_scale?: number; // control weight
}

export async function runSDXLControlNetDepth(input: ControlNetDepthInput): Promise<string[]> {
  const defaults = {
    num_inference_steps: 30,
    guidance_scale: 7,
    controlnet_conditioning_scale: 1.0
  };
  const out = await replicate.run(CONTROLNET_MODEL, {
    input: { ...defaults, ...input }
  }) as any;

  if (Array.isArray(out)) return out.map(String);
  if (typeof out === "string") return [out];
  if (out?.images && Array.isArray(out.images)) return out.images;
  throw new Error("Unexpected ControlNet output shape");
}
