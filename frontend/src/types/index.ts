export interface Experiment {
  id: string;
  name: string;
  description: string | null;
  reference_image_path: string;
  created_at: string;
  updated_at: string;
  trial_count: number;
}

export interface ExperimentDetail extends Experiment {
  trials: Trial[];
}

export interface Trial {
  id: string;
  experiment_id: string;
  prompt: string;
  provider: string;
  model: string;
  normalized_params: Record<string, unknown> | null;
  extra_params: Record<string, unknown> | null;
  response_meta: Record<string, unknown> | null;
  result_image_path: string | null;
  score: number | null;
  notes: string | null;
  status: "pending" | "running" | "completed" | "failed";
  error_message: string | null;
  duration_ms: number | null;
  created_at: string;
}

export interface ProviderInfo {
  name: string;
  models: string[];
}

export interface TrialCreatePayload {
  prompt: string;
  provider: string;
  model: string;
  normalized_params?: Record<string, unknown>;
  extra_params?: Record<string, unknown>;
}
