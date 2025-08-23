"use client";

import React, { useCallback, useRef, useState } from "react";

interface Props {
  onFileSelected: (file: File) => void;
}

export default function UploadDropzone({ onFileSelected }: Props) {
  const [isDragging, setDragging] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const preventDefaults = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    preventDefaults(e);
    setDragging(false);
    const f = e.dataTransfer.files?.[0];
    if (f) onFileSelected(f);
  }, [onFileSelected, preventDefaults]);

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    preventDefaults(e);
    if (!isDragging) setDragging(true);
  }, [preventDefaults, isDragging]);

  const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    preventDefaults(e);
    setDragging(false);
  }, [preventDefaults]);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) onFileSelected(f);
    // reset so selecting the same file again triggers onChange
    e.target.value = "";
  }, [onFileSelected]);

  return (
    <div
      onDragOver={handleDragOver}
      onDragEnter={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition
        ${isDragging ? "border-blue-500 bg-blue-50" : "border-zinc-300 bg-white"}`}
      onClick={() => fileRef.current?.click()}
    >
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleChange}
        onClick={(e) => e.stopPropagation()}
      />
      <p className="text-lg font-medium">Drop an image here, or click to select</p>
      <p className="text-sm text-zinc-500 mt-2">PNG or JPG, up to 20 MB</p>
    </div>
  );
}
