import { useState, type KeyboardEvent } from "react";
import { api } from "../api/client";
import type { Trial } from "../types";
import { formatDate } from "../lib/utils";
import ImageZoomModal from "./ImageZoomModal";

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
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [zoomOpen, setZoomOpen] = useState(false);

  const handleScore = async (score: number) => {
    const updated = await api.updateTrial(trial.id, { score });
    onUpdated(updated);
  };

  const handleSaveNotes = async () => {
    const updated = await api.updateTrial(trial.id, { notes });
    onUpdated(updated);
    setEditingNotes(false);
  };

  const handleNotesKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSaveNotes();
    } else if (e.key === "Escape") {
      setNotes(trial.notes || "");
      setEditingNotes(false);
    }
  };

  const handleDelete = async () => {
    if (!confirmDelete) {
      setConfirmDelete(true);
      setTimeout(() => setConfirmDelete(false), 3000);
      return;
    }
    await api.deleteTrial(trial.id);
    onDeleted(trial.id);
  };

  const statusColor = {
    pending: "text-yellow-400 bg-yellow-400/10",
    running: "text-blue-400 bg-blue-400/10",
    completed: "text-green-400 bg-green-400/10",
    failed: "text-red-400 bg-red-400/10",
  }[trial.status];
  const temperature =
    typeof trial.normalized_params?.temperature === "number"
      ? trial.normalized_params.temperature
      : null;

  return (
    <div
      className={`rounded-xl border bg-gray-900 p-3 transition ${
        selected ? "border-blue-500 ring-1 ring-blue-500/30" : "border-gray-800"
      }`}
    >
      {/* Header */}
      <div className="mb-2 flex items-start justify-between">
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={selected}
            onChange={onToggleSelect}
            aria-label="Select trial for comparison"
            className="mt-0.5 accent-blue-500"
          />
          <span
            className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${statusColor}`}
          >
            {trial.status}
          </span>
        </div>
        <button
          onClick={handleDelete}
          className={`text-xs transition-colors ${
            confirmDelete
              ? "text-red-400 font-medium"
              : "text-gray-600 hover:text-red-400"
          }`}
        >
          {confirmDelete ? "Confirm?" : "Delete"}
        </button>
      </div>

      {/* Model badge */}
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="text-[11px] text-gray-500 truncate">
          {trial.provider}/{trial.model}
        </p>
        <span className="shrink-0 rounded bg-gray-800 px-1.5 py-0.5 text-[10px] text-gray-300">
          temp: {temperature != null ? temperature.toFixed(1) : "-"}
        </span>
      </div>

      {/* Image / Status display */}
      {trial.status === "completed" && trial.result_image_path ? (
        <div className="relative mb-2">
          <img
            src={api.imageUrl(trial.result_image_path)}
            alt="Result"
            className="w-full rounded-lg object-contain"
          />
          <button
            type="button"
            onClick={() => setZoomOpen(true)}
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
      ) : trial.status === "failed" ? (
        <div className="mb-2 rounded-lg bg-red-900/20 border border-red-900/30 p-2.5 text-xs text-red-300">
          {trial.error_message}
        </div>
      ) : trial.status === "running" ? (
        <div className="mb-2 flex h-32 items-center justify-center">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-blue-400 border-t-transparent" />
        </div>
      ) : null}

      {/* Prompt */}
      <p className="mb-2 text-xs text-gray-300 line-clamp-3">{trial.prompt}</p>

      {/* Score */}
      <div className="mb-2 flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map((s) => (
          <button
            key={s}
            onClick={() => handleScore(s)}
            className={`text-lg transition-colors ${
              trial.score && s <= trial.score
                ? "text-yellow-400"
                : "text-gray-700 hover:text-yellow-300"
            }`}
          >
            ★
          </button>
        ))}
        {trial.duration_ms != null && (
          <span className="ml-auto text-[11px] text-gray-500">
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
            onKeyDown={handleNotesKeyDown}
            className="flex-1 rounded-md border border-gray-700 bg-gray-800 px-2 py-1 text-xs focus:border-blue-500 focus:outline-none transition-colors"
            placeholder="Add a note..."
            autoFocus
          />
          <button
            onClick={handleSaveNotes}
            className="rounded-md bg-gray-700 px-2 py-1 text-xs hover:bg-gray-600 transition-colors"
          >
            Save
          </button>
          <button
            onClick={() => {
              setNotes(trial.notes || "");
              setEditingNotes(false);
            }}
            className="rounded-md px-2 py-1 text-xs text-gray-500 hover:text-gray-300 transition-colors"
          >
            Esc
          </button>
        </div>
      ) : (
        <button
          onClick={() => setEditingNotes(true)}
          className="text-xs text-gray-500 hover:text-gray-300 transition-colors"
        >
          {trial.notes || "Add notes..."}
        </button>
      )}

      <div className="mt-1.5 text-[10px] text-gray-600">
        {formatDate(trial.created_at)}
      </div>

      {zoomOpen && trial.result_image_path && (
        <ImageZoomModal
          imageUrl={api.imageUrl(trial.result_image_path)}
          alt="Generated result"
          onClose={() => setZoomOpen(false)}
        />
      )}
    </div>
  );
}
