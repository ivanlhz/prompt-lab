import { useEffect, useState } from "react";
import { api } from "../api/client";
import type { ProviderInfo, TrialCreatePayload } from "../types";
import {
  trialFormSchema,
  ASPECT_RATIOS,
  IMAGE_SIZES,
} from "../schemas/trial";

interface Props {
  onRun: (payload: TrialCreatePayload) => void;
  onBatchRun: (payloads: TrialCreatePayload[]) => void;
  running: boolean;
}

export default function PromptEditor({ onRun, onBatchRun, running }: Props) {
  const [providers, setProviders] = useState<ProviderInfo[]>([]);
  const [provider, setProvider] = useState("");
  const [model, setModel] = useState("");
  const [prompt, setPrompt] = useState("");
  const [temperature, setTemperature] = useState("1");
  const [batchMode, setBatchMode] = useState(false);
  const [batchPrompts, setBatchPrompts] = useState("");
  const [aspectRatio, setAspectRatio] = useState("");
  const [imageSize, setImageSize] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    api.listProviders().then((list) => {
      setProviders(list);
      if (list.length > 0) {
        setProvider(list[0].name);
        setModel(list[0].models[0] || "");
      }
    });
  }, []);

  const currentModels =
    providers.find((p) => p.name === provider)?.models || [];

  useEffect(() => {
    const initializeModel = () => {
      if (currentModels.length > 0 && !currentModels.includes(model)) {
        setModel(currentModels[0]);
      }
    }

    initializeModel()
  }, [provider, currentModels, model, providers]);

  const buildPayload = (promptText: string): TrialCreatePayload => {
    const normalized_params: Record<string, unknown> = {
      temperature: parseFloat(temperature),
    };
    if (aspectRatio) normalized_params.aspect_ratio = aspectRatio;
    if (imageSize) normalized_params.image_size = imageSize;

    return {
      prompt: promptText,
      provider,
      model,
      normalized_params,
    };
  };

  const validate = (): boolean => {
    const formData = batchMode
      ? {
          batchMode: true as const,
          provider,
          model,
          temperature: parseFloat(temperature),
          batchPrompts,
          ...(aspectRatio && { aspectRatio }),
          ...(imageSize && { imageSize }),
        }
      : {
          batchMode: false as const,
          provider,
          model,
          temperature: parseFloat(temperature),
          prompt,
          ...(aspectRatio && { aspectRatio }),
          ...(imageSize && { imageSize }),
        };

    const result = trialFormSchema.safeParse(formData);
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      for (const issue of result.error.issues) {
        const key = String(issue.path[0] || "form");
        if (!fieldErrors[key]) fieldErrors[key] = issue.message;
      }
      setErrors(fieldErrors);
      return false;
    }
    setErrors({});
    return true;
  };

  const handleRun = () => {
    if (!validate()) return;
    onRun(buildPayload(prompt.trim()));
  };

  const handleBatchRun = () => {
    if (!validate()) return;
    const prompts = batchPrompts
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);
    onBatchRun(prompts.map(buildPayload));
  };

  return (
    <div className="rounded-lg border border-gray-800 bg-gray-900 p-4">
      <div className="mb-2 flex flex-wrap gap-3">
        <div>
          <select
            title="provider"
            value={provider}
            onChange={(e) => setProvider(e.target.value)}
            className="rounded border border-gray-700 bg-gray-800 px-3 py-1.5 text-sm"
          >
            {providers.map((p) => (
              <option key={p.name} value={p.name}>
                {p.name}
              </option>
            ))}
          </select>
          {errors.provider && (
            <p className="text-red-400 text-xs mt-1">{errors.provider}</p>
          )}
        </div>
        <div>
          <select
            title="model"
            value={model}
            onChange={(e) => setModel(e.target.value)}
            className="rounded border border-gray-700 bg-gray-800 px-3 py-1.5 text-sm"
          >
            {currentModels.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
          {errors.model && (
            <p className="text-red-400 text-xs mt-1">{errors.model}</p>
          )}
        </div>
        <div>
          <label>
            <input
              type="number"
              step="0.1"
              min="0"
              max="2"
              value={temperature}
              onChange={(e) => setTemperature(e.target.value)}
              className="w-20 rounded border border-gray-700 bg-gray-800 px-3 py-1.5 text-sm"
              title="Temperature"
            />
            Temperature
          </label>
          {errors.temperature && (
            <p className="text-red-400 text-xs mt-1">{errors.temperature}</p>
          )}
        </div>
        <label className="flex items-center gap-1.5 text-sm text-gray-400">
          <input
            type="checkbox"
            checked={batchMode}
            onChange={(e) => setBatchMode(e.target.checked)}
          />
          Batch
        </label>
      </div>

      <div className="mb-3 flex flex-wrap gap-3">
        <div>
          <select
            title="Aspect Ratio"
            value={aspectRatio}
            onChange={(e) => setAspectRatio(e.target.value)}
            className="rounded border border-gray-700 bg-gray-800 px-3 py-1.5 text-sm"
          >
            <option value="">Aspect Ratio</option>
            {ASPECT_RATIOS.map((ar) => (
              <option key={ar} value={ar}>
                {ar}
              </option>
            ))}
          </select>
        </div>
        <div>
          <select
            title="Image Size"
            value={imageSize}
            onChange={(e) => setImageSize(e.target.value)}
            className="rounded border border-gray-700 bg-gray-800 px-3 py-1.5 text-sm"
          >
            <option value="">Image Size</option>
            {IMAGE_SIZES.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {batchMode ? (
        <>
          <textarea
            value={batchPrompts}
            onChange={(e) => setBatchPrompts(e.target.value)}
            placeholder="One prompt per line..."
            rows={5}
            className="mb-1 w-full rounded-lg border border-gray-700 bg-gray-800 px-4 py-2 text-sm focus:border-blue-500 focus:outline-none"
          />
          {errors.batchPrompts && (
            <p className="text-red-400 text-xs mb-2">{errors.batchPrompts}</p>
          )}
          <button
            onClick={handleBatchRun}
            disabled={running}
            className="rounded-lg bg-purple-600 px-5 py-2 text-sm font-medium hover:bg-purple-700 disabled:opacity-50"
          >
            {running ? "Running..." : "Run Batch"}
          </button>
        </>
      ) : (
        <>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Enter your prompt..."
            rows={3}
            className="mb-1 w-full rounded-lg border border-gray-700 bg-gray-800 px-4 py-2 text-sm focus:border-blue-500 focus:outline-none"
          />
          {errors.prompt && (
            <p className="text-red-400 text-xs mb-2">{errors.prompt}</p>
          )}
          <button
            onClick={handleRun}
            disabled={running}
            className="rounded-lg bg-blue-600 px-5 py-2 text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
          >
            {running ? "Running..." : "Run"}
          </button>
        </>
      )}
    </div>
  );
}
