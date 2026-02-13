import { api } from "../api/client";
import type { Trial } from "../types";

interface Props {
  trials: Trial[];
  onClose: () => void;
}

export default function ComparisonGrid({ trials, onClose }: Props) {
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
                <img
                  src={api.imageUrl(trial.result_image_path)}
                  alt="Result"
                  className="w-full rounded-lg object-contain"
                />
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
                  {trial.score && (
                    <span className="text-yellow-400">
                      {"★".repeat(trial.score)}
                      {"☆".repeat(5 - trial.score)}
                    </span>
                  )}
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
    </div>
  );
}
