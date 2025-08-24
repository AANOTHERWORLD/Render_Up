"use client";

import React from "react";
import type { EnhanceSettings, LightingPreset } from "@/lib/types";

interface Props {
  settings: EnhanceSettings;
  onChange: (s: EnhanceSettings) => void;
  disabled?: boolean;
}

const presetLabels: Record<LightingPreset, string> = {
  neutral_overcast: "Neutral overcast",
  golden_hour: "Golden hour",
  dramatic_contrast: "Dramatic contrast"
};

export default function Controls({ settings, onChange, disabled }: Props) {
  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium mb-1">Lighting preset</label>
        <select
          className="w-full border rounded-lg px-3 py-2"
          value={settings.preset}
          onChange={e => onChange({ ...settings, preset: e.target.value as LightingPreset })}
          disabled={disabled}
        >
          {Object.entries(presetLabels).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">
          Enhancement strength <span className="text-zinc-500">(denoise)</span>
        </label>
        <input
          type="range"
          min={0.2}
          max={0.55}
          step={0.01}
          value={settings.strength}
          onChange={e => onChange({ ...settings, strength: parseFloat(e.target.value) })}
          disabled={disabled}
        />
        <div className="text-xs text-zinc-600 mt-1">Lower preserves more of the original. Higher allows more relighting.</div>
      </div>

      <div className="flex items-center gap-2">
        <input
          id="preserve"
          type="checkbox"
          checked={settings.preserveComposition}
          onChange={e => onChange({ ...settings, preserveComposition: e.target.checked })}
          disabled={disabled}
        />
        <label htmlFor="preserve" className="text-sm">Preserve composition</label>
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Output size</label>
        <select
          className="w-full border rounded-lg px-3 py-2"
          value={settings.upscale}
          onChange={e =>
            onChange({ ...settings, upscale: e.target.value as "none" | "2x" | "4x" })
          }
          disabled={disabled}
        >
          <option value="none">Original</option>
          <option value="2x">2x</option>
          <option value="4x">4x</option>
        </select>
      </div>
    </div>
  );
}
