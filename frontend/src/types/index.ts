export interface Experiment {
  id: string;
  name: string;
  description: string | null;
  /** @deprecated Use reference_image_paths; first image for backward compat */
  reference_image_path: string | null;
  reference_image_paths: string[];
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

export interface ReferenceCrop {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface NormalizedParams {
  temperature?: number;
  aspect_ratio?: string;
  image_size?: string;
  reference_crop?: ReferenceCrop;
  [key: string]: unknown;
}

export interface TrialCreatePayload {
  prompt: string;
  provider: string;
  model: string;
  normalized_params?: NormalizedParams;
  extra_params?: Record<string, unknown>;
}

export interface AppSettings {
  GEMINI_API_KEY: string;
  OPENAI_API_KEY: string;
  PYAPI_API_KEY: string;
  GEMINI_API_BASE_URL: string;
  PYAPI_BASE_URL: string;
  DATA_DIR: string;
  CLOUDINARY_CLOUD_NAME: string;
  CLOUDINARY_API_KEY: string;
  CLOUDINARY_API_SECRET: string;
  MAX_CONCURRENT_TRIALS: number;
}
