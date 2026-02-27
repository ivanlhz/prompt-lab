import { useCallback, useEffect, useRef, useState, type MouseEvent } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { api, isAbortError } from "../api/client";
import type {
  ExperimentDetail as ExperimentDetailType,
  ReferenceCrop,
  Trial,
  TrialCreatePayload,
} from "../types";

export function useExperimentDetail() {
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
  const [page, setPage] = useState(1);

  const TRIALS_PAGE_SIZE = 12;

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

  const finishCrop = useCallback(() => {
    setDraftCrop((prev) => {
      if (prev && prev.width > 0.01 && prev.height > 0.01) {
        setReferenceCrop(prev);
      } else {
        setReferenceCrop(null);
      }
      return null;
    });
    setCropStart(null);
  }, []);

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

  const addOptimisticTrials = useCallback((payloads: TrialCreatePayload[]) => {
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
  }, []);

  const removeTrialsByIds = useCallback((ids: string[]) => {
    if (ids.length === 0) return;
    const idSet = new Set(ids);
    setExperiment((prev) =>
      prev ? { ...prev, trials: prev.trials.filter((t) => !idSet.has(t.id)) } : prev
    );
  }, []);

  const load = useCallback(async () => {
    if (!id) return;
    const data = await api.getExperiment(id);
    setExperiment(data);
    return data;
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

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

  const handleRun = useCallback(
    async (payload: TrialCreatePayload) => {
      if (!experiment) return;
      setRunning(true);
      const optimisticIds = addOptimisticTrials([payload]);
      try {
        await api.createTrial(experiment.id, payload);
        load();
      } catch (error) {
        removeTrialsByIds(optimisticIds);
        if (!isAbortError(error)) throw error;
      } finally {
        setRunning(false);
      }
    },
    [experiment, addOptimisticTrials, removeTrialsByIds, load]
  );

  const handleBatchRun = useCallback(
    async (payloads: TrialCreatePayload[]) => {
      if (!experiment) return;
      setRunning(true);
      const optimisticIds = addOptimisticTrials(payloads);
      try {
        await api.createBatchTrials(experiment.id, payloads);
        load();
      } catch (error) {
        removeTrialsByIds(optimisticIds);
        if (!isAbortError(error)) throw error;
      } finally {
        setRunning(false);
      }
    },
    [experiment, addOptimisticTrials, removeTrialsByIds, load]
  );

  const handleStopActiveRequests = useCallback(async () => {
    if (!experiment) return;
    setStopping(true);
    try {
      api.cancelAllRequests();
      await api.cancelActiveTrials(experiment.id);
      setRunning(false);
      await load();
    } catch (error) {
      if (!isAbortError(error)) throw error;
    } finally {
      setStopping(false);
    }
  }, [experiment, load]);

  const handleDeleteAllTrials = useCallback(async () => {
    if (!experiment || experiment.trials.length === 0) return;
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
  }, [experiment, load]);

  const handleTrialUpdated = useCallback((updated: Trial) => {
    setExperiment((prev) =>
      prev
        ? { ...prev, trials: prev.trials.map((t) => (t.id === updated.id ? updated : t)) }
        : prev
    );
  }, []);

  const handleTrialDeleted = useCallback((trialId: string) => {
    setExperiment((prev) =>
      prev ? { ...prev, trials: prev.trials.filter((t) => t.id !== trialId) } : prev
    );
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.delete(trialId);
      return next;
    });
  }, []);

  const clearCropRegion = useCallback(() => {
    setReferenceCrop(null);
    setDraftCrop(null);
    setCropStart(null);
  }, []);

  const handleUploadReferenceImage = useCallback(
    async (file: File) => {
      if (!experiment) return;
      const form = new FormData();
      form.append("reference_image", file);
      if (experiment.reference_image_paths.length === 0) {
        await api.uploadReferenceImage(experiment.id, form);
      } else {
        await api.addReferenceImage(experiment.id, form);
      }
      await load();
    },
    [experiment, load]
  );

  const handleRemoveReferenceImageAt = useCallback(
    async (index: number) => {
      if (!experiment) return;
      await api.deleteReferenceImageAt(experiment.id, index);
      if (index === 0) clearCropRegion();
      await load();
    },
    [experiment, load, clearCropRegion]
  );

  const handleDelete = useCallback(async () => {
    if (!experiment) return;
    if (!confirm("Delete this experiment and all its trials?")) return;
    await api.deleteExperiment(experiment.id);
    navigate("/");
  }, [experiment, navigate]);

  const toggleSelect = useCallback((trialId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(trialId)) next.delete(trialId);
      else next.add(trialId);
      return next;
    });
  }, []);

  const handleDeleteAllReferenceImages = useCallback(async () => {
    if (!experiment) return;
    await api.deleteReferenceImage(experiment.id);
    await load();
    clearCropRegion();
  }, [experiment, load, clearCropRegion]);

  const sortedTrials =
    experiment != null
      ? [...experiment.trials].sort((a, b) => {
          if (sortBy === "score") return (b.score ?? 0) - (a.score ?? 0);
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        })
      : [];

  const totalPages = Math.max(1, Math.ceil(sortedTrials.length / TRIALS_PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const paginatedTrials = sortedTrials.slice(
    (safePage - 1) * TRIALS_PAGE_SIZE,
    safePage * TRIALS_PAGE_SIZE
  );

  useEffect(() => {
    setPage(1);
  }, [sortBy, experiment?.trials.length]);

  const selectedTrials =
    experiment != null
      ? experiment.trials.filter((t) => selectedIds.has(t.id))
      : [];

  return {
    experiment,
    referenceImgRef,
    referenceCrop,
    draftCrop,
    running,
    sortBy,
    setSortBy,
    selectedIds,
    showComparison,
    setShowComparison,
    deletingAll,
    stopping,
    handleCropStart,
    handleCropMove,
    finishCrop,
    clearCropRegion,
    handleRun,
    handleBatchRun,
    handleStopActiveRequests,
    handleDeleteAllTrials,
    handleTrialUpdated,
    handleTrialDeleted,
    handleUploadReferenceImage,
    handleRemoveReferenceImageAt,
    handleDeleteAllReferenceImages,
    handleDelete,
    toggleSelect,
    sortedTrials: paginatedTrials,
    selectedTrials,
    navigate,
    page: safePage,
    totalPages,
    trialsPageSize: TRIALS_PAGE_SIZE,
    setPage,
  };
}
