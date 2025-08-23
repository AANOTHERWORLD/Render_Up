export type LightingPreset = "neutral_overcast" | "golden_hour" | "dramatic_contrast";

export interface EnhanceSettings {
  preset: LightingPreset;
  strength: number; // 0 to 1
  preserveComposition: boolean;
  upscale: "native" | "1.5x";
}

export interface EnhanceResponse {
  requestId: string;
  images: string[]; // URLs to images
  meta: Record<string, any>;
  depthUrl?: string;
}
