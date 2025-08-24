import { z } from "zod";

export const lightingPresets = [
  "neutral_overcast",
  "golden_hour",
  "dramatic"
] as const;

export const enhanceBodySchema = z.object({
  preset: z.enum(lightingPresets).default("neutral_overcast"),
  strength: z.number().min(0.1).max(1).default(0.55),
  preserve_composition: z.boolean().default(true),
  upscale: z.enum(["none", "2x", "4x"]).default("none"),
  mode: z.enum(["sync", "async"]).default(
    process.env.ENHANCE_ALLOW_ASYNC === "true" ? "async" : "sync"
  )
});

export type EnhanceBody = z.infer<typeof enhanceBodySchema>;

export function presetPrompt(preset: EnhanceBody["preset"]) {
  switch (preset) {
    case "neutral_overcast":
      return "neutral overcast lighting, photoreal architecture, high detail";
    case "golden_hour":
      return "warm golden hour lighting, photoreal architecture, long shadows, high detail";
    case "dramatic":
      return "dramatic directional lighting, strong contrast, photoreal architecture, high detail";
  }
}
