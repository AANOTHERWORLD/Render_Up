"use client";

import React, { useRef, useState } from "react";

interface Props {
  beforeUrl: string;
  afterUrl: string;
}

export default function CompareSlider({ beforeUrl, afterUrl }: Props) {
  const [pos, setPos] = useState(50);
  const clip = `${pos}%`;

  return (
    <div className="w-full max-w-3xl mx-auto">
      <div className="relative w-full overflow-hidden rounded-xl border">
        <img src={beforeUrl} alt="before" className="block w-full" />
        <img
          src={afterUrl}
          alt="after"
          className="block w-full absolute left-0 top-0"
          style={{ clipPath: `inset(0 0 0 ${clip})` }}
        />
        <input
          type="range"
          min={0}
          max={100}
          value={pos}
          onChange={e => setPos(parseInt(e.target.value, 10))}
          className="absolute bottom-2 left-2 right-2"
        />
      </div>
      <div className="flex justify-between text-xs text-zinc-600 pt-1">
        <span>Before</span><span>After</span>
      </div>
    </div>
  );
}
