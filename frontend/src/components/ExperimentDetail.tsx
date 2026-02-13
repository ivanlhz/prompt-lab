import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { api } from "../api/client";
import type { ExperimentDetail as ExperimentDetailType, Trial, TrialCreatePayload } from "../types";
import ComparisonGrid from "./ComparisonGrid";
import PromptEditor from "./PromptEditor";
import TrialCard from "./TrialCard";

export default function ExperimentDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [experiment, setExperiment] = useState<ExperimentDetailType | null>(null);
  const [running, setRunning] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showComparison, setShowComparison] = useState(false);
  const [sortBy, setSortBy] = useState<"date" | "score">("date");
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const load = useCallback(async () => {
    if (!id) return;
    const data = await api.getExperiment(id);
    setExperiment(data);
    return data;
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  // Poll while there are pending/running trials
  useEffect(() => {
    const hasPending = experiment?.trials.some(
      (t) => t.status === "pending" || t.status === "running"
    );
    if (hasPending) {
      pollingRef.current = setInterval(load, 2000);
    }
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, [experiment?.trials, load]);

  if (!experiment) return <p className="text-gray-400">Loading...</p>;

  const handleRun = async (payload: TrialCreatePayload) => {
    setRunning(true);
    try {
      await api.createTrial(experiment.id, payload);
      await load();
    } finally {
      setRunning(false);
    }
  };

  const handleBatchRun = async (payloads: TrialCreatePayload[]) => {
    setRunning(true);
    try {
      await api.createBatchTrials(experiment.id, payloads);
      await load();
    } finally {
      setRunning(false);
    }
  };

  const handleTrialUpdated = (updated: Trial) => {
    setExperiment((prev) =>
      prev
        ? {
            ...prev,
            trials: prev.trials.map((t) =>
              t.id === updated.id ? updated : t
            ),
          }
        : prev
    );
  };

  const handleTrialDeleted = (trialId: string) => {
    setExperiment((prev) =>
      prev
        ? { ...prev, trials: prev.trials.filter((t) => t.id !== trialId) }
        : prev
    );
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.delete(trialId);
      return next;
    });
  };

  const handleDelete = async () => {
    if (!confirm("Delete this experiment and all its trials?")) return;
    await api.deleteExperiment(experiment.id);
    navigate("/");
  };

  const toggleSelect = (trialId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(trialId)) next.delete(trialId);
      else next.add(trialId);
      return next;
    });
  };

  const sortedTrials = [...experiment.trials].sort((a, b) => {
    if (sortBy === "score") return (b.score ?? 0) - (a.score ?? 0);
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });

  const selectedTrials = experiment.trials.filter((t) =>
    selectedIds.has(t.id)
  );

  return (
    <div>
      <div className="mb-4 flex items-center gap-3">
        <button
          onClick={() => navigate("/")}
          className="text-sm text-gray-400 hover:text-gray-200"
        >
          ← Back
        </button>
        <h1 className="text-2xl font-bold">{experiment.name}</h1>
        <button
          onClick={handleDelete}
          className="ml-auto text-sm text-gray-500 hover:text-red-400"
        >
          Delete experiment
        </button>
      </div>

      {experiment.description && (
        <p className="mb-4 text-sm text-gray-400">{experiment.description}</p>
      )}

      {/* Reference image */}
      <div className="mb-6">
        <h2 className="mb-2 text-sm font-medium text-gray-400">
          Reference Image
        </h2>
        <img
          src={api.imageUrl(experiment.reference_image_path)}
          alt="Reference"
          className="max-h-64 rounded-lg border border-gray-800 object-contain"
        />
      </div>

      {/* Prompt editor */}
      <div className="mb-6">
        <PromptEditor
          onRun={handleRun}
          onBatchRun={handleBatchRun}
          running={running}
        />
      </div>

      {/* Toolbar */}
      <div className="mb-4 flex items-center gap-3">
        <h2 className="text-lg font-semibold">
          Trials ({experiment.trials.length})
        </h2>
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as "date" | "score")}
          className="rounded border border-gray-700 bg-gray-800 px-2 py-1 text-xs"
        >
          <option value="date">Sort by date</option>
          <option value="score">Sort by score</option>
        </select>
        {selectedIds.size >= 2 && (
          <button
            onClick={() => setShowComparison(true)}
            className="rounded bg-purple-600 px-3 py-1 text-xs font-medium hover:bg-purple-700"
          >
            Compare ({selectedIds.size})
          </button>
        )}
      </div>

      {/* Trials grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {sortedTrials.map((trial) => (
          <TrialCard
            key={trial.id}
            trial={trial}
            selected={selectedIds.has(trial.id)}
            onToggleSelect={() => toggleSelect(trial.id)}
            onUpdated={handleTrialUpdated}
            onDeleted={handleTrialDeleted}
          />
        ))}
      </div>

      {/* Comparison modal */}
      {showComparison && selectedTrials.length >= 2 && (
        <ComparisonGrid
          trials={selectedTrials}
          onClose={() => setShowComparison(false)}
        />
      )}
    </div>
  );
}
