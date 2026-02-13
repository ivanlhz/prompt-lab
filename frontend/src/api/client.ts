import type {
  Experiment,
  ExperimentDetail,
  ProviderInfo,
  Trial,
  TrialCreatePayload,
} from "../types";

const BASE = "/api";

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${url}`, init);
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`API ${res.status}: ${text}`);
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

export const api = {
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
