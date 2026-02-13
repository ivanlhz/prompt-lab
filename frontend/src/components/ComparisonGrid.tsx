import { useState } from "react";
import { api } from "../api/client";
import type { Trial } from "../types";
import ImageZoomModal from "./ImageZoomModal";

interface Props {
  trials: Trial[];
  onClose: () => void;
}

export default function ComparisonGrid({ trials, onClose }: Props) {
  const [zoomImageUrl, setZoomImageUrl] = useState<string | null>(null);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-6">
      <div className="max-h-[90vh] w-full max-w-7xl overflow-auto rounded-xl border border-gray-700 bg-gray-900 p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">
            Comparing {trials.length} trials
          </h2>
          <button
            onClick={onClose}
            className="rounded bg-gray-700 px-3 py-1 text-sm hover:bg-gray-600"
          >
            Close
          </button>
        </div>

        <div
          className="grid gap-4"
          style={{
            gridTemplateColumns: `repeat(${Math.min(trials.length, 4)}, 1fr)`,
          }}
        >
          {trials.map((trial) => (
            <div key={trial.id} className="space-y-2">
              {trial.result_image_path ? (
                <div className="relative">
                  <img
                    src={api.imageUrl(trial.result_image_path)}
                    alt="Result"
                    className="w-full rounded-lg object-contain"
                  />
                  <button
                    type="button"
                    onClick={() => setZoomImageUrl(api.imageUrl(trial.result_image_path!))}
                    aria-label="Zoom image"
                    title="Zoom image"
                    className="absolute inset-0 m-auto h-10 w-10 rounded-full bg-black/55 text-white transition-colors hover:bg-black/75"
                  >
                    <svg
                      viewBox="0 0 24 24"
                      className="mx-auto h-5 w-5"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                    >
                      <circle cx="11" cy="11" r="7" />
                      <line x1="21" y1="21" x2="16.65" y2="16.65" />
                      <line x1="11" y1="8" x2="11" y2="14" />
                      <line x1="8" y1="11" x2="14" y2="11" />
                    </svg>
                  </button>
                </div>
              ) : (
                <div className="flex h-48 items-center justify-center rounded-lg bg-gray-800 text-sm text-gray-500">
                  No image
                </div>
              )}
              <div className="text-xs">
                <p className="font-medium text-gray-300">
                  {trial.provider}/{trial.model}
                </p>
                <p className="mt-1 text-gray-400 line-clamp-3">
                  {trial.prompt}
                </p>
                <div className="mt-1 flex items-center gap-2">
                  {typeof trial.score === "number" ? (
                    <span className="text-yellow-400">
                      {"★".repeat(trial.score)}
                      {"☆".repeat(5 - trial.score)}
                    </span>
                  ) : null}
                  {trial.duration_ms != null && (
                    <span className="text-gray-500">
                      {(trial.duration_ms / 1000).toFixed(1)}s
                    </span>
                  )}
                </div>
                {trial.notes && (
                  <p className="mt-1 italic text-gray-500">{trial.notes}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
      {zoomImageUrl && (
        <ImageZoomModal
          imageUrl={zoomImageUrl}
          alt="Generated result"
          onClose={() => setZoomImageUrl(null)}
        />
      )}
    </div>
  );
}
