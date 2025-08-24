import Replicate from "replicate";
import type { Readable } from "node:stream";
import pino from "pino";

export type FileInput = Buffer | Readable | string;

const logger = pino();

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
  // Pinned model version so Replicate's API doesn't require a version lookup
  // which can return 404s when the model-specific predictions endpoint is
  // unavailable.
  "lucataco/sdxl-controlnet-depth:465fb41789dc2203a9d7158be11d1d2570606a039c65e0e236fd329b5eecb10c"
).toLowerCase() as ModelRef;

/**
 * Replicate's JS client posts to a model-specific endpoint when a model
 * reference omits the version. Some models – including community models –
 * don't expose that endpoint and instead require a fully qualified
 * `owner/model:version` reference. When the version is missing, resolve the
 * latest version via the Models API and retry with an explicit version.
 */
async function runWithResolvedVersion(
  ref: ModelRef,
  options: Parameters<typeof replicate.run>[1]
): Promise<unknown> {
  if (!ref.includes(":")) {
    try {
      const [owner, name] = ref.split("/");
      const model = await replicate.models.get(owner, name);
      const version = (model as any)?.latest_version?.id as string | undefined;
      if (version) {
        ref = `${ref}:${version}` as ModelRef;
      } else {
        logger.warn({ model: ref }, "Unable to resolve latest version");
      }
    } catch (err) {
      logger.error(err as Error, "Failed to fetch model info");
    }
  }
  return replicate.run(ref, options);
}

// Normalize Replicate file outputs into plain URLs
function toUrl(value: unknown): string | undefined {
  if (typeof value === "string") return value;
  if (value) return String(value);
  return undefined;
}

function sampleForLogging(value: unknown, maxLength = 200): string {
  try {
    const json = JSON.stringify(
      value,
      (_key, v) =>
        typeof v === "string" && v.length > 100 ? `${v.slice(0, 97)}...` : v
    );
    return json.slice(0, maxLength);
  } catch {
    return "[unserializable]";
  }
}

// Replicate's client accepts either strings or raw binary data (Buffer/Blob)
// for file inputs. Our application sometimes provides Node.js Readable
// streams which the client library does not automatically handle. When a
// stream is passed through unchanged, it ends up serialized as an object in
// the request payload which the Replicate API rejects with a 422 error. To
// avoid that, convert any Readable stream into a Buffer before forwarding the
// request to the client.
async function normalizeFileInput(file: FileInput): Promise<string | Buffer> {
  if (typeof file === "string" || Buffer.isBuffer(file)) return file;

  const chunks: Buffer[] = [];
  for await (const chunk of file as Readable) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
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
  const img = await normalizeFileInput(image);
  const out = (await runWithResolvedVersion(DEPTH_MODEL, {
    input: { image: img, model: modelSize }
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

  // Ensure any stream inputs are converted to Buffers before calling the API
  if (filtered.image) {
    filtered.image = await normalizeFileInput(filtered.image as FileInput);
  }
  if (filtered.control_image) {
    filtered.control_image = await normalizeFileInput(
      filtered.control_image as FileInput
    );
  }

  const out = (await runWithResolvedVersion(CONTROLNET_MODEL, {
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

  throw new Error(
    `Unexpected ControlNet output shape: ${sampleForLogging(out)}`
  );
}
