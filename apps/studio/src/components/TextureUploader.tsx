'use client';

import { useCallback, useState } from 'react';

interface TextureUploaderProps {
  onUpload: (file: File) => void;
}

export function TextureUploader({ onUpload }: TextureUploaderProps) {
  const [isDragging, setIsDragging] = useState(false);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);

      const file = e.dataTransfer.files[0];
      if (file && file.type.startsWith('image/')) {
        onUpload(file);
      }
    },
    [onUpload]
  );

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        onUpload(file);
      }
    },
    [onUpload]
  );

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`
        relative border-2 border-dashed rounded-xl p-12 text-center transition-colors
        ${isDragging ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400'}
      `}
    >
      <input
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
      />

      <div className="space-y-4">
        <div className="w-16 h-16 mx-auto bg-gray-100 rounded-full flex items-center justify-center">
          <svg
            className="w-8 h-8 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
            />
          </svg>
        </div>

        <div>
          <p className="text-lg font-medium text-gray-900">
            Drop your texture image here
          </p>
          <p className="text-sm text-gray-500 mt-1">
            or click to browse • PNG, JPG, WebP supported
          </p>
        </div>

        <div className="text-xs text-gray-400">
          For best results, use high-resolution images (2000×2000 or larger)
        </div>
      </div>
    </div>
  );
}
