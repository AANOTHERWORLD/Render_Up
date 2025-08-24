export type LightingPreset = "neutral_overcast" | "golden_hour" | "dramatic_contrast";

export interface EnhanceSettings {
  preset: LightingPreset;
  strength: number; // 0 to 1
  preserveComposition: boolean;
  upscale: "none" | "2x" | "4x";
}

export interface EnhanceResponse {
  status: string;
  input: {
    preset: LightingPreset;
    preserve_composition?: boolean;
    upscale: "none" | "2x" | "4x";
  };
  output: {
    image: string;
  };
}
