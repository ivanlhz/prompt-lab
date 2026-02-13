import { useState } from "react";
import { api } from "../api/client";
import type { Trial } from "../types";
import { formatDate } from "../lib/utils";

interface Props {
  trial: Trial;
  selected: boolean;
  onToggleSelect: () => void;
  onUpdated: (trial: Trial) => void;
  onDeleted: (id: string) => void;
}

export default function TrialCard({
  trial,
  selected,
  onToggleSelect,
  onUpdated,
  onDeleted,
}: Props) {
  const [editingNotes, setEditingNotes] = useState(false);
  const [notes, setNotes] = useState(trial.notes || "");

  const handleScore = async (score: number) => {
    const updated = await api.updateTrial(trial.id, { score });
    onUpdated(updated);
  };

  const handleSaveNotes = async () => {
    const updated = await api.updateTrial(trial.id, { notes });
    onUpdated(updated);
    setEditingNotes(false);
  };

  const handleDelete = async () => {
    await api.deleteTrial(trial.id);
    onDeleted(trial.id);
  };

  const statusColor = {
    pending: "text-yellow-400",
    running: "text-blue-400",
    completed: "text-green-400",
    failed: "text-red-400",
  }[trial.status];

  return (
    <div
      className={`rounded-lg border bg-gray-900 p-3 transition ${
        selected ? "border-blue-500" : "border-gray-800"
      }`}
    >
      <div className="mb-2 flex items-start justify-between">
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={selected}
            onChange={onToggleSelect}
            className="mt-0.5"
          />
          <span className={`text-xs font-medium ${statusColor}`}>
            {trial.status}
          </span>
          <span className="text-xs text-gray-500">
            {trial.provider}/{trial.model}
          </span>
        </div>
        <button
          onClick={handleDelete}
          className="text-xs text-gray-500 hover:text-red-400"
        >
          Delete
        </button>
      </div>

      {trial.status === "completed" && trial.result_image_path ? (
        <img
          src={api.imageUrl(trial.result_image_path)}
          alt="Result"
          className="mb-2 w-full rounded object-contain"
        />
      ) : trial.status === "failed" ? (
        <div className="mb-2 rounded bg-red-900/30 p-2 text-xs text-red-300">
          {trial.error_message}
        </div>
      ) : trial.status === "running" ? (
        <div className="mb-2 flex h-32 items-center justify-center text-blue-400">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-blue-400 border-t-transparent" />
        </div>
      ) : null}

      <p className="mb-2 text-xs text-gray-300 line-clamp-3">{trial.prompt}</p>

      {/* Score */}
      <div className="mb-2 flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((s) => (
          <button
            key={s}
            onClick={() => handleScore(s)}
            className={`text-lg ${
              trial.score && s <= trial.score
                ? "text-yellow-400"
                : "text-gray-600"
            } hover:text-yellow-300`}
          >
            ★
          </button>
        ))}
        {trial.duration_ms != null && (
          <span className="ml-auto text-xs text-gray-500">
            {(trial.duration_ms / 1000).toFixed(1)}s
          </span>
        )}
      </div>

      {/* Notes */}
      {editingNotes ? (
        <div className="flex gap-1">
          <input
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="flex-1 rounded border border-gray-700 bg-gray-800 px-2 py-1 text-xs"
            autoFocus
          />
          <button
            onClick={handleSaveNotes}
            className="rounded bg-gray-700 px-2 py-1 text-xs hover:bg-gray-600"
          >
            Save
          </button>
        </div>
      ) : (
        <button
          onClick={() => setEditingNotes(true)}
          className="text-xs text-gray-500 hover:text-gray-300"
        >
          {trial.notes || "Add notes..."}
        </button>
      )}

      <div className="mt-1 text-[10px] text-gray-600">
        {formatDate(trial.created_at)}
      </div>
    </div>
  );
}
