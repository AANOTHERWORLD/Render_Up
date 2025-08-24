import type { EnhanceResponse } from "./types";

export async function enhanceImage({
  file,
  imageUrl,
  preset = "neutral_overcast",
  strength = 0.55,
  preserve_composition = true,
  upscale = "none",
  mode = "sync"
}: {
  file?: File;
  imageUrl?: string;
  preset?: "neutral_overcast"|"golden_hour"|"dramatic"|"dramatic_contrast";
  strength?: number;
  preserve_composition?: boolean;
  upscale?: "none"|"2x"|"4x";
  mode?: "sync"|"async";
}): Promise<EnhanceResponse> {
  const form = new FormData();
  if (file) form.append("file", file);
  if (imageUrl) form.append("imageUrl", imageUrl);
  form.append("preset", preset);
  form.append("strength", String(strength));
  form.append("preserve_composition", String(preserve_composition));
  form.append("upscale", upscale);
  form.append("mode", mode);

  const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/enhance`, {
    method: "POST",
    body: form
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error || "Enhance failed");
  }
  return res.json();
}
