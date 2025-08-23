export type LightingPreset = "neutral_overcast" | "golden_hour" | "dramatic_contrast";

export function buildPrompt(preset: LightingPreset) {
  const base = [
    "architectural photograph",
    "realistic PBR materials",
    "physically plausible lighting",
    "clean glass reflections",
    "accurate soft shadows",
    "global illumination look",
    "no fantasy, no surreal distortion"
  ].join(", ");
  const suffix = {
    neutral_overcast: "neutral overcast sky, diffuse ambient light, desaturated shadows",
    golden_hour: "warm golden hour key light, long soft shadows, gentle sky bounce",
    dramatic_contrast: "strong directional key light, higher microcontrast, crisp reflections"
  }[preset];
  return `${base}, ${suffix}`;
}

export function controlWeights(preserveComposition: boolean) {
  return preserveComposition ? { strength: 0.3, controlWeight: 1.2 } : { strength: 0.45, controlWeight: 0.8 };
}
