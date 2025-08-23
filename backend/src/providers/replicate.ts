import Replicate from "replicate";
import type { Readable } from "node:stream";

export type FileInput = Buffer | Readable | string;

// --- Add a template literal type for Replicate model references ---
type ModelRef = `${string}/${string}` | `${string}/${string}:${string}`;

/**
 * Fetch an environment variable, falling back to a default when provided.
 * Throws if the variable is missing and no fallback value is supplied.
 */
function getEnv(name: string, fallback?: string): string {
  const value = process.env[name];
  if (value === undefined || value === "") {
    if (fallback !== undefined) return fallback;
    throw new Error(`Missing required environment variable ${name}`);
  }
  return value;
}

// Export the client so tests can stub its methods
export const replicate = new Replicate({
  // Allow tests or local development to omit the token by providing a blank string
  auth: getEnv("REPLICATE_API_TOKEN", "")
});

// Cast env-provided model IDs to the stricter ModelRef type. Defaults are
// public model references so the app can run without custom configuration.
const DEPTH_MODEL: ModelRef = getEnv(
  "REPLICATE_DEPTH_MODEL",
  "nvidia/Depth-Anything-V2"
) as ModelRef;

const CONTROLNET_MODEL: ModelRef = getEnv(
  "REPLICATE_CONTROLNET_DEPTH_MODEL",
  "stability-ai/sdxl-controlnet-depth"
) as ModelRef;

export interface DepthAnythingV2ResponseObject {
  image?: string;
  images?: string[];
  depth_map?: string;
  output?: string | string[];
}

export type DepthAnythingV2Response =
  | string
  | string[]
  | DepthAnythingV2ResponseObject;

export async function runDepthAnythingV2(
  image: FileInput,
  modelSize: "Large" | "Base" = "Large"
): Promise<string> {
  const out = (await replicate.run(DEPTH_MODEL, {
    input: { image, model: modelSize }
  })) as unknown as DepthAnythingV2Response;

  if (typeof out === "string") return out;
  if (Array.isArray(out) && out.length > 0) return out[0];

  if (!Array.isArray(out) && typeof out === "object" && out !== null) {
    if (typeof out.image === "string") return out.image;
    if (Array.isArray(out.images) && out.images.length > 0) return out.images[0];
    if (typeof out.depth_map === "string") return out.depth_map;
    if (typeof out.output === "string") return out.output;
    if (Array.isArray(out.output) && out.output.length > 0) return out.output[0];
  }

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

export interface ControlNetDepthResponseObject {
  images?: string[];
  image?: string;
  output?: string | string[];
}

export type ControlNetDepthResponse =
  | string
  | string[]
  | ControlNetDepthResponseObject;

export async function runSDXLControlNetDepth(input: ControlNetDepthInput): Promise<string[]> {
  const defaults = { num_inference_steps: 30, guidance_scale: 7, controlnet_conditioning_scale: 1.0 };
  const filtered = Object.fromEntries(
    Object.entries(input).filter(([, v]) => v !== undefined)
  );
  const out = (await replicate.run(CONTROLNET_MODEL, {
    input: { ...defaults, ...filtered }
  })) as unknown as ControlNetDepthResponse;

  if (Array.isArray(out)) return out.map(String);
  if (typeof out === "string") return [out];

  if (typeof out === "object" && out !== null) {
    if (Array.isArray(out.images)) return out.images.map(String);
    if (typeof out.image === "string") return [out.image];
    if (Array.isArray(out.output)) return out.output.map(String);
    if (typeof out.output === "string") return [out.output];
  }

  throw new Error("Unexpected ControlNet output shape");
}
