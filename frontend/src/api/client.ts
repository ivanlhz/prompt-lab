import type {
  Experiment,
  ExperimentDetail,
  ProviderInfo,
  Trial,
  TrialCreatePayload,
} from "../types";

const BASE = "/api";
const activeControllers = new Set<AbortController>();

function buildAbortSignal(externalSignal?: AbortSignal) {
  const controller = new AbortController();
  let cleanup = () => {};

  if (externalSignal) {
    if (externalSignal.aborted) {
      controller.abort(externalSignal.reason);
    } else {
      const relayAbort = () => controller.abort(externalSignal.reason);
      externalSignal.addEventListener("abort", relayAbort, { once: true });
      cleanup = () => externalSignal.removeEventListener("abort", relayAbort);
    }
  }

  return { controller, signal: controller.signal, cleanup };
}

export function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === "AbortError";
}

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const { controller, signal, cleanup } = buildAbortSignal(
    init?.signal ?? undefined
  );
  activeControllers.add(controller);
  try {
    const res = await fetch(`${BASE}${url}`, { ...init, signal });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`API ${res.status}: ${text}`);
    }
    if (res.status === 204) return undefined as T;
    return res.json();
  } finally {
    cleanup();
    activeControllers.delete(controller);
  }
}

export const api = {
  cancelAllRequests: () => {
    const toAbort = Array.from(activeControllers);
    for (const controller of toAbort) controller.abort();
    return toAbort.length;
  },

  // Experiments
  listExperiments: () => request<Experiment[]>("/experiments"),

  getExperiment: (id: string) => request<ExperimentDetail>(`/experiments/${id}`),

  createExperiment: (form: FormData) =>
    request<Experiment>("/experiments", { method: "POST", body: form }),

  deleteExperiment: (id: string) =>
    request<void>(`/experiments/${id}`, { method: "DELETE" }),

  // Trials
  createTrial: (experimentId: string, payload: TrialCreatePayload) =>
    request<Trial>(`/experiments/${experimentId}/trials`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }),

  createBatchTrials: (experimentId: string, trials: TrialCreatePayload[]) =>
    request<Trial[]>(`/experiments/${experimentId}/trials/batch`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ trials }),
    }),

  cancelActiveTrials: (experimentId: string) =>
    request<{ cancelled: number }>(`/experiments/${experimentId}/trials/cancel-active`, {
      method: "POST",
    }),

  updateTrial: (trialId: string, data: { score?: number; notes?: string }) =>
    request<Trial>(`/trials/${trialId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    }),

  deleteTrial: (trialId: string) =>
    request<void>(`/trials/${trialId}`, { method: "DELETE" }),

  // Providers
  listProviders: () => request<ProviderInfo[]>("/providers"),

  // Images
  imageUrl: (path: string) => `${BASE}/images/${path}`,
};
