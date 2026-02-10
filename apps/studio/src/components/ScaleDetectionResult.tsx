'use client';

import type { ScaleDetectionResult as DetectionResult } from '@/types/texture';
import { MODEL_SCALES, type ModelScale } from '@tidkit/config';

interface ScaleDetectionResultProps {
  result: DetectionResult;
  onConfirm: (scale: ModelScale, dpi: number) => void;
  onAdjustManually: () => void;
}

export function ScaleDetectionResult({
  result,
  onConfirm,
  onAdjustManually,
}: ScaleDetectionResultProps) {
  const confidencePercent = Math.round(result.confidence * 100);
  const dpi = result.measurements
    ? Math.round(result.measurements.pixelWidth / result.measurements.realWidth)
    : 0;
  const dpiQuality = dpi >= 300 ? 'Excellent' : dpi >= 150 ? 'Good' : 'Low';
  const dpiColor =
    dpi >= 300
      ? 'text-green-600'
      : dpi >= 150
        ? 'text-yellow-600'
        : 'text-red-600';

  return (
    <div className="p-6 space-y-5">
      {/* Detection header */}
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
          <svg
            className="w-5 h-5 text-green-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M5 13l4 4L19 7"
            />
          </svg>
        </div>
        <div>
          <h3 className="text-lg font-semibold text-gray-900">
            Reference Card Detected
          </h3>
          <p className="text-sm text-gray-500">
            {result.referenceObject === 'credit card'
              ? 'Credit card'
              : 'TidKit reference card'}{' '}
            found with {confidencePercent}% confidence
          </p>
        </div>
      </div>

      {/* Confidence bar */}
      <div>
        <div className="flex justify-between text-xs text-gray-500 mb-1">
          <span>Detection confidence</span>
          <span>{confidencePercent}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className={`h-2 rounded-full transition-all ${
              confidencePercent >= 70
                ? 'bg-green-500'
                : confidencePercent >= 50
                  ? 'bg-yellow-500'
                  : 'bg-red-500'
            }`}
            style={{ width: `${confidencePercent}%` }}
          />
        </div>
      </div>

      {/* Measurements grid */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-gray-50 rounded-lg p-3">
          <div className="text-xs text-gray-500">Resolution</div>
          <div className={`text-lg font-semibold ${dpiColor}`}>{dpi} DPI</div>
          <div className="text-xs text-gray-400">{dpiQuality} for printing</div>
        </div>
        <div className="bg-gray-50 rounded-lg p-3">
          <div className="text-xs text-gray-500">Recommended Scale</div>
          <div className="text-lg font-semibold text-gray-900">
            {result.scale?.name}
          </div>
          <div className="text-xs text-gray-400">{result.scale?.label}</div>
        </div>
        {result.measurements && (
          <>
            <div className="bg-gray-50 rounded-lg p-3">
              <div className="text-xs text-gray-500">Card Width</div>
              <div className="text-sm font-medium text-gray-900">
                {result.measurements.pixelWidth}px
              </div>
              <div className="text-xs text-gray-400">
                = {result.measurements.realWidth}"
              </div>
            </div>
            <div className="bg-gray-50 rounded-lg p-3">
              <div className="text-xs text-gray-500">Pixels Per Inch</div>
              <div className="text-sm font-medium text-gray-900">{dpi} PPI</div>
              <div className="text-xs text-gray-400">of source image</div>
            </div>
          </>
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <button
          onClick={() => result.scale && onConfirm(result.scale, dpi)}
          className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
        >
          Use These Settings
        </button>
        <button
          onClick={onAdjustManually}
          className="px-4 py-2.5 bg-white text-gray-700 rounded-lg font-medium border border-gray-300 hover:bg-gray-50 transition-colors"
        >
          Adjust Manually
        </button>
      </div>
    </div>
  );
}
