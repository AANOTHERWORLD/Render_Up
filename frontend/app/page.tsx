"use client";

import React, { useState } from "react";
import UploadDropzone from "@/components/UploadDropzone";
import Controls from "@/components/Controls";
import CompareSlider from "@/components/CompareSlider";
import type { EnhanceSettings, EnhanceResponse } from "@/lib/types";

const API_BASE = (process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8787").replace(/\/$/, "");

export default function Page() {
  const [file, setFile] = useState<File | null>(null);
  const [settings, setSettings] = useState<EnhanceSettings>({
    preset: "neutral_overcast",
    strength: 0.35,
    preserveComposition: true,
    upscale: "native"
  });
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<EnhanceResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleRun = async () => {
    if (!file) return;
    setLoading(true); setError(null); setResult(null);

    const form = new FormData();
    form.append("image", file);
    form.append("preset", settings.preset);
    form.append("strength", settings.strength.toString());
    form.append("preserveComposition", String(settings.preserveComposition));
    form.append("upscale", settings.upscale);

    try {
      const res = await fetch(`${API_BASE}/enhance`, {
        method: "POST",
        body: form
      });
      if (!res.ok) throw new Error(`Server error ${res.status}`);
      const data = await res.json() as EnhanceResponse;
      setResult(data);
    } catch (e: any) {
      setError(e.message || "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="max-w-5xl mx-auto p-6 space-y-8">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold">Architectural Photo Regenerator</h1>
        <p className="text-zinc-600">
          Upload a rendering and regenerate a photoreal version with improved lighting and material realism.
        </p>
      </header>

      <section className="grid md:grid-cols-2 gap-8">
        <UploadDropzone onFileSelected={setFile} />
        <div>
          <Controls settings={settings} onChange={setSettings} disabled={loading} />
          <button
            onClick={handleRun}
            disabled={!file || loading}
            className="mt-6 w-full rounded-lg bg-black text-white py-3 disabled:opacity-60"
          >
            {loading ? "Working..." : "Regenerate"}
          </button>
          {error && <p className="text-red-600 text-sm mt-3">{error}</p>}
        </div>
      </section>

      {result && result.images?.length > 0 && file && (
        <section className="space-y-4">
          <h2 className="text-xl font-medium">Result</h2>
          <CompareSlider
            beforeUrl={URL.createObjectURL(file)}
            afterUrl={result.images[0]}
          />
          <div className="text-sm text-zinc-600">
            <div>Request ID: {result.requestId}</div>
            {result.depthUrl && <div className="truncate">Depth map: <a className="underline" href={result.depthUrl} target="_blank">open</a></div>}
          </div>
          <div className="flex gap-3">
            <a
              href={result.images[0]}
              target="_blank"
              className="px-4 py-2 rounded-lg border"
            >
              Open image
            </a>
          </div>
        </section>
      )}
    </main>
  );
}
