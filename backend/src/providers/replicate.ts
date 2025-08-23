import Replicate from "replicate";
import type { Readable } from "node:stream";

export type FileInput = Buffer | Readable | string;

// --- Add a template literal type for Replicate model references ---
type ModelRef = `${string}/${string}` | `${string}/${string}:${string}`;

// Export the client so tests can stub its methods
export const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN
});

// Cast env-provided model IDs to the stricter ModelRef type
const DEPTH_MODEL: ModelRef =
  (process.env.REPLICATE_DEPTH_MODEL ?? "chenxwh/depth-anything-v2") as ModelRef;

const CONTROLNET_MODEL: ModelRef =
  (process.env.REPLICATE_CONTROLNET_DEPTH_MODEL ?? "lucataco/sdxl-controlnet-depth") as ModelRef;

export async function runDepthAnythingV2(image: FileInput, modelSize: "Large" | "Base" = "Large"): Promise<string> {
  const out = await replicate.run(DEPTH_MODEL, { input: { image, model: modelSize } }) as any;
  if (typeof out === "string") return out;
  if (Array.isArray(out) && out.length > 0) return out[0];
  if (out?.image) return out.image;
  throw new Error("Unexpected depth model output shape");
}

export interface ControlNetDepthInput {
  image: FileInput;
  control_image: FileInput;
  prompt: string;
  num_inference_steps?: number;
  strength?: number;
  guidance_scale?: number;
  controlnet_conditioning_scale?: number;
}

export async function runSDXLControlNetDepth(input: ControlNetDepthInput): Promise<string[]> {
  const defaults = { num_inference_steps: 30, guidance_scale: 7, controlnet_conditioning_scale: 1.0 };
  const filtered = Object.fromEntries(
    Object.entries(input).filter(([, v]) => v !== undefined)
  );
  const out = await replicate.run(CONTROLNET_MODEL, { input: { ...defaults, ...filtered } }) as any;
  if (Array.isArray(out)) return out.map(String);
  if (typeof out === "string") return [out];
  if (out?.images && Array.isArray(out.images)) return out.images;
  throw new Error("Unexpected ControlNet output shape");
}
