import { useCallback, useEffect, useRef, useState, type MouseEvent } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { api, isAbortError } from "../api/client";
import type {
  ExperimentDetail as ExperimentDetailType,
  ReferenceCrop,
  Trial,
  TrialCreatePayload,
} from "../types";
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
  const [deletingAll, setDeletingAll] = useState(false);
  const [stopping, setStopping] = useState(false);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const referenceImgRef = useRef<HTMLImageElement | null>(null);
  const [referenceCrop, setReferenceCrop] = useState<ReferenceCrop | null>(null);
  const [draftCrop, setDraftCrop] = useState<ReferenceCrop | null>(null);
  const [cropStart, setCropStart] = useState<{ x: number; y: number } | null>(null);

  const clamp01 = (value: number) => Math.min(1, Math.max(0, value));

  const getRelativePoint = (e: MouseEvent): { x: number; y: number } | null => {
    const img = referenceImgRef.current;
    if (!img) return null;
    const rect = img.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return null;

    return {
      x: clamp01((e.clientX - rect.left) / rect.width),
      y: clamp01((e.clientY - rect.top) / rect.height),
    };
  };

  const handleCropStart = (e: MouseEvent) => {
    if (e.button !== 0) return;
    const point = getRelativePoint(e);
    if (!point) return;
    setCropStart(point);
    setDraftCrop({ x: point.x, y: point.y, width: 0, height: 0 });
  };

  const handleCropMove = (e: MouseEvent) => {
    if (!cropStart) return;
    const point = getRelativePoint(e);
    if (!point) return;

    const x = Math.min(cropStart.x, point.x);
    const y = Math.min(cropStart.y, point.y);
    const width = Math.abs(point.x - cropStart.x);
    const height = Math.abs(point.y - cropStart.y);
    setDraftCrop({ x, y, width, height });
  };

  const finishCrop = () => {
    if (draftCrop && draftCrop.width > 0.01 && draftCrop.height > 0.01) {
      setReferenceCrop(draftCrop);
    } else {
      setReferenceCrop(null);
    }
    setDraftCrop(null);
    setCropStart(null);
  };

  const makeTempTrial = (
    exp: ExperimentDetailType,
    payload: TrialCreatePayload,
    index: number
  ): Trial => ({
    id: `tmp-${Date.now()}-${index}-${Math.random().toString(16).slice(2)}`,
    experiment_id: exp.id,
    prompt: payload.prompt,
    provider: payload.provider,
    model: payload.model,
    normalized_params: payload.normalized_params ?? null,
    extra_params: payload.extra_params ?? null,
    response_meta: null,
    result_image_path: null,
    score: null,
    notes: null,
    status: "running",
    error_message: null,
    duration_ms: null,
    created_at: new Date().toISOString(),
  });

  const addOptimisticTrials = (payloads: TrialCreatePayload[]) => {
    const optimisticIds: string[] = [];
    setExperiment((prev) => {
      if (!prev) return prev;
      const optimisticTrials = payloads.map((payload, index) =>
        makeTempTrial(prev, payload, index)
      );
      optimisticIds.push(...optimisticTrials.map((t) => t.id));
      return { ...prev, trials: [...optimisticTrials, ...prev.trials] };
    });
    return optimisticIds;
  };

  const removeTrialsByIds = (ids: string[]) => {
    if (ids.length === 0) return;
    const idSet = new Set(ids);
    setExperiment((prev) =>
      prev ? { ...prev, trials: prev.trials.filter((t) => !idSet.has(t.id)) } : prev
    );
  };

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
    const optimisticIds = addOptimisticTrials([payload]);
    try {
      await api.createTrial(experiment.id, payload);
      await load();
    } catch (error) {
      removeTrialsByIds(optimisticIds);
      if (!isAbortError(error)) throw error;
    } finally {
      setRunning(false);
    }
  };

  const handleBatchRun = async (payloads: TrialCreatePayload[]) => {
    setRunning(true);
    const optimisticIds = addOptimisticTrials(payloads);
    try {
      await api.createBatchTrials(experiment.id, payloads);
      await load();
    } catch (error) {
      removeTrialsByIds(optimisticIds);
      if (!isAbortError(error)) throw error;
    } finally {
      setRunning(false);
    }
  };

  const handleStopActiveRequests = async () => {
    setStopping(true);
    try {
      // 1) Abort in-flight frontend requests, 2) cancel active backend trials.
      api.cancelAllRequests();
      await api.cancelActiveTrials(experiment.id);
      setRunning(false);
      await load();
    } catch (error) {
      if (!isAbortError(error)) throw error;
    } finally {
      setStopping(false);
    }
  };

  const handleDeleteAllTrials = async () => {
    if (experiment.trials.length === 0) return;
    if (!confirm(`Delete all ${experiment.trials.length} trials?`)) return;

    setDeletingAll(true);
    try {
      const results = await Promise.allSettled(
        experiment.trials.map((trial) => api.deleteTrial(trial.id))
      );
      const failedCount = results.filter((r) => r.status === "rejected").length;

      await load();
      setSelectedIds(new Set());

      if (failedCount > 0) {
        alert(`Deleted with partial failures: ${failedCount} trial(s) could not be removed.`);
      }
    } finally {
      setDeletingAll(false);
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
        <div className="mb-2 flex items-center gap-3">
          <h2 className="text-sm font-medium text-gray-400">Reference Image</h2>
          <button
            type="button"
            onClick={() => {
              setReferenceCrop(null);
              setDraftCrop(null);
              setCropStart(null);
            }}
            className="text-xs text-gray-500 hover:text-gray-300"
          >
            Clear region
          </button>
        </div>
        <p className="mb-2 text-xs text-gray-500">
          Drag over the image to select a region used for generation.
        </p>
        <div
          className="relative inline-block"
          onMouseDown={handleCropStart}
          onMouseMove={handleCropMove}
          onMouseUp={finishCrop}
          onMouseLeave={finishCrop}
        >
          <img
            ref={referenceImgRef}
            src={api.imageUrl(experiment.reference_image_path)}
            alt="Reference"
            className="max-h-64 rounded-lg border border-gray-800 object-contain select-none"
            draggable={false}
          />
          {(draftCrop ?? referenceCrop) && (
            <div
              className="pointer-events-none absolute rounded border-2 border-blue-400 bg-blue-500/20"
              style={{
                left: `${(draftCrop ?? referenceCrop)!.x * 100}%`,
                top: `${(draftCrop ?? referenceCrop)!.y * 100}%`,
                width: `${(draftCrop ?? referenceCrop)!.width * 100}%`,
                height: `${(draftCrop ?? referenceCrop)!.height * 100}%`,
              }}
            />
          )}
        </div>
      </div>

      {/* Prompt editor */}
      <div className="mb-6">
        <PromptEditor
          onRun={handleRun}
          onBatchRun={handleBatchRun}
          running={running}
          referenceCrop={referenceCrop}
        />
      </div>

      {/* Toolbar */}
      <div className="mb-4 flex items-center gap-3">
        <h2 className="text-lg font-semibold">
          Trials ({experiment.trials.length})
        </h2>
        <select
          aria-label="Sort trials"
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
        <button
          onClick={handleDeleteAllTrials}
          disabled={deletingAll || experiment.trials.length === 0}
          className="ml-auto rounded border border-red-700/50 px-3 py-1 text-xs text-red-300 transition-colors hover:bg-red-900/30 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {deletingAll ? "Deleting..." : "Delete all trials"}
        </button>
        <button
          onClick={handleStopActiveRequests}
          disabled={stopping}
          className="rounded border border-orange-700/50 px-3 py-1 text-xs text-orange-300 transition-colors hover:bg-orange-900/30 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {stopping ? "Stopping..." : "Stop active requests"}
        </button>
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
