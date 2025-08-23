"use client";

import React, { useCallback, useRef, useState } from "react";

interface Props {
  onFileSelected: (file: File) => void;
}

export default function UploadDropzone({ onFileSelected }: Props) {
  const [isDragging, setDragging] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer.files?.[0];
    if (f) onFileSelected(f);
  }, [onFileSelected]);

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={onDrop}
      className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition
        ${isDragging ? "border-blue-500 bg-blue-50" : "border-zinc-300 bg-white"}`}
      onClick={() => fileRef.current?.click()}
    >
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onFileSelected(f);
        }}
      />
      <p className="text-lg font-medium">Drop an image here, or click to select</p>
      <p className="text-sm text-zinc-500 mt-2">PNG or JPG, up to 20 MB</p>
    </div>
  );
}
