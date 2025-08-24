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
// Replicate model slugs are lowercase; normalize env override to prevent 404s
const DEPTH_MODEL: ModelRef = getEnv(
  "REPLICATE_DEPTH_MODEL",
  // Depth Anything V2 public model with pinned version
  "chenxwh/depth-anything-v2:b239ea33cff32bb7abb5db39ffe9a09c14cbc2894331d1ef66fe096eed88ebd4"
).toLowerCase() as ModelRef;

const CONTROLNET_MODEL: ModelRef = getEnv(
  "REPLICATE_CONTROLNET_DEPTH_MODEL",
  "stability-ai/sdxl-controlnet-depth"
).toLowerCase() as ModelRef;

// Normalize Replicate file outputs into plain URLs
function toUrl(value: unknown): string | undefined {
  if (typeof value === "string") return value;
  if (value) return String(value);
  return undefined;
}

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
  if (Array.isArray(out) && out.length > 0) {
    const url = toUrl(out[0]);
    if (url) return url;
  }

  if (
    !Array.isArray(out) &&
    typeof out === "object" &&
    out !== null &&
    typeof (out as any).toString === "function"
  ) {
    const url =
      toUrl((out as any).url) ||
      toUrl((out as any).data) ||
      toUrl(out);
    if (url) return url;
  }

  if (!Array.isArray(out) && typeof out === "object" && out !== null) {
    const url =
      toUrl((out as any).image) ||
      (Array.isArray((out as any).images) && toUrl((out as any).images[0])) ||
      toUrl((out as any).depth_map) ||
      toUrl((out as any).output) ||
      (Array.isArray((out as any).output) && toUrl((out as any).output[0]));
    if (url) return url;
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
  width?: number;
  height?: number;
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
    if ((out as any).image !== undefined) return [String((out as any).image)];
    if (Array.isArray((out as any).output)) return (out as any).output.map(String);
    if (typeof (out as any).output === "string") return [(out as any).output];
  }

  throw new Error("Unexpected ControlNet output shape");
}
