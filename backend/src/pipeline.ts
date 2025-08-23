import { runDepthAnythingV2, runSDXLControlNetDepth, FileInput } from "./providers/replicate.js";
import { buildPrompt, controlWeights } from "./presets.js";

export interface PipelineOptions {
  image: FileInput;
  preset: "neutral_overcast" | "golden_hour" | "dramatic_contrast";
  strength: number; // 0..1
  preserveComposition: boolean;
  upscale?: "native" | "1.5x";
}

export interface PipelineResult {
  images: string[];
  depthUrl: string;
  meta: Record<string, any>;
}

export async function enhance(options: PipelineOptions): Promise<PipelineResult> {
  const depthUrl = await runDepthAnythingV2(options.image, "Large");

  const prompt = buildPrompt(options.preset);
  const weights = controlWeights(options.preserveComposition);

  const images = await runSDXLControlNetDepth({
    image: options.image,
    control_image: depthUrl,
    prompt,
    strength: options.strength ?? weights.strength,
    controlnet_conditioning_scale: weights.controlWeight
  });

  return {
    images,
    depthUrl,
    meta: {
      prompt,
      strength: options.strength,
      preserveComposition: options.preserveComposition
    }
  };
}
