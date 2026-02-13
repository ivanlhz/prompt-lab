import { useEffect, useState, type KeyboardEvent } from "react";
import { api } from "../api/client";
import type { ProviderInfo, ReferenceCrop, TrialCreatePayload } from "../types";
import {
  trialFormSchema,
  ASPECT_RATIOS,
  MAX_IMAGES_PER_PROMPT,
  getSizesForModel,
  supportsAspectRatio,
} from "../schemas/trial";

interface Props {
  onRun: (payload: TrialCreatePayload) => void;
  onBatchRun: (payloads: TrialCreatePayload[]) => void;
  running: boolean;
  referenceCrop: ReferenceCrop | null;
}

export default function PromptEditor({
  onRun,
  onBatchRun,
  running,
  referenceCrop,
}: Props) {
  const [providers, setProviders] = useState<ProviderInfo[]>([]);
  const [provider, setProvider] = useState("");
  const [model, setModel] = useState("");
  const [prompts, setPrompts] = useState<string[]>([""]);
  const [temperature, setTemperature] = useState("1");
  const [imagesPerPrompt, setImagesPerPrompt] = useState(1);
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
   const updateModel = () => {
    if (currentModels.length > 0 && !currentModels.includes(model)) {
      setModel(currentModels[0]);
    }
   }

   updateModel()
  }, [provider, currentModels, model, providers]);

  const availableSizes = getSizesForModel(model);
  const hasAspectRatio = supportsAspectRatio(model);

  // Reset image size / aspect ratio when model changes and doesn't support them
  useEffect(() => {
   const updateSizeImage = () => {
    if (imageSize && !availableSizes.some((s) => s.value === imageSize)) {
      setImageSize("");
    }
   }
   const updateAspectRatio = () => {
    if (aspectRatio && !hasAspectRatio) {
      setAspectRatio("");
    }
   }
   updateSizeImage()
   updateAspectRatio()
  }, [model, availableSizes, imageSize, aspectRatio, hasAspectRatio]);

  const updatePrompt = (index: number, value: string) => {
    setPrompts((prev) => prev.map((p, i) => (i === index ? value : p)));
  };

  const addPrompt = () => {
    setPrompts((prev) => [...prev, ""]);
  };

  const removePrompt = (index: number) => {
    setPrompts((prev) => prev.filter((_, i) => i !== index));
  };

  const buildPayload = (promptText: string): TrialCreatePayload => {
    const normalized_params: Record<string, unknown> = {
      temperature: parseFloat(temperature),
    };
    if (aspectRatio) normalized_params.aspect_ratio = aspectRatio;
    if (imageSize) normalized_params.image_size = imageSize;
    if (referenceCrop) normalized_params.reference_crop = referenceCrop;

    return {
      prompt: promptText,
      provider,
      model,
      normalized_params,
    };
  };

  const nonEmptyPrompts = prompts
    .map((p) => p.trim())
    .filter(Boolean);

  const totalTrials = nonEmptyPrompts.length * imagesPerPrompt;

  const validate = (): boolean => {
    const formData = {
      provider,
      model,
      temperature: parseFloat(temperature),
      prompts: prompts.map((p) => p.trim()),
      imagesPerPrompt,
      ...(aspectRatio && { aspectRatio }),
      ...(imageSize && { imageSize }),
    };

    const result = trialFormSchema.safeParse(formData);
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      for (const issue of result.error.issues) {
        const path = issue.path;
        const firstPath = path[0];
        // prompts.0 → "prompt-0", prompts → "prompts"
        const key =
          firstPath === "prompts" && typeof path[1] === "number"
            ? `prompt-${path[1]}`
            : typeof firstPath === "string" || typeof firstPath === "number"
              ? String(firstPath)
              : "form";
        if (!fieldErrors[key]) fieldErrors[key] = issue.message;
      }
      setErrors(fieldErrors);
      return false;
    }
    setErrors({});
    return true;
  };

  const handleSubmit = () => {
    if (!validate()) return;

    const payloads: TrialCreatePayload[] = [];
    for (const text of nonEmptyPrompts) {
      for (let i = 0; i < imagesPerPrompt; i++) {
        payloads.push(buildPayload(text));
      }
    }

    if (payloads.length === 1) {
      onRun(payloads[0]);
    } else {
      onBatchRun(payloads);
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
      e.preventDefault();
      handleSubmit();
    }
  };

  const selectClass =
    "w-full rounded-lg border border-app-border bg-app-input px-3 py-1.5 text-sm text-app-text focus:border-app-accent focus:outline-none focus:ring-1 focus:ring-app-accent/40 transition-colors";
  const labelClass = "block text-xs font-medium text-app-subtext mb-1";

  return (
    <div className="rounded-xl border border-app-border bg-app-card p-5">
      {/* Row 1: Provider, Model, Temperature, Images per prompt */}
      <div className="mb-3 grid grid-cols-[1fr_1fr_1fr_auto] gap-3 items-end">
        <div>
          <label className={labelClass} htmlFor="pe-provider">
            Provider
          </label>
          <select
            id="pe-provider"
            value={provider}
            onChange={(e) => setProvider(e.target.value)}
            className={selectClass}
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
          <label className={labelClass} htmlFor="pe-model">
            Model
          </label>
          <select
            id="pe-model"
            value={model}
            onChange={(e) => setModel(e.target.value)}
            className={selectClass}
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
          <div className="mb-1 flex items-center justify-between">
            <label className={labelClass + " mb-0"} htmlFor="pe-temp">
              Temperature
            </label>
            <span className="text-xs font-medium text-app-subtext">
              {Number(temperature).toFixed(1)}
            </span>
          </div>
          <input
            id="pe-temp"
            type="range"
            step="0.1"
            min="0"
            max="2"
            value={temperature}
            onChange={(e) => setTemperature(e.target.value)}
            className="h-2 w-full cursor-pointer appearance-none rounded-lg bg-app-input"
            aria-describedby="pe-temp-help"
          />
          <div className="mt-1 flex justify-between text-[11px] text-app-subtext">
            <span>0.0</span>
            <span>2.0</span>
          </div>
          <p id="pe-temp-help" className="mt-1 text-[11px] text-app-subtext">
            Lower = more consistent output. Higher = more creative variation.
          </p>
          {errors.temperature && (
            <p className="text-red-400 text-xs mt-1">{errors.temperature}</p>
          )}
        </div>

        <div>
          <label className={labelClass} htmlFor="pe-count">
            Images
          </label>
          <select
            id="pe-count"
            value={imagesPerPrompt}
            onChange={(e) => setImagesPerPrompt(Number(e.target.value))}
            className={selectClass}
          >
            {Array.from({ length: MAX_IMAGES_PER_PROMPT }, (_, i) => i + 1).map(
              (n) => (
                <option key={n} value={n}>
                  {n}x
                </option>
              )
            )}
          </select>
        </div>
      </div>

      {/* Row 2: Aspect Ratio, Image Size */}
      <div className="mb-4 grid grid-cols-[1fr_1fr_1fr_auto] gap-3 items-end">
        <div>
          <label className={labelClass} htmlFor="pe-aspect">
            Aspect Ratio
          </label>
          <select
            id="pe-aspect"
            value={aspectRatio}
            onChange={(e) => setAspectRatio(e.target.value)}
            className={selectClass}
            disabled={!hasAspectRatio}
          >
            <option value="">Auto</option>
            {ASPECT_RATIOS.map((ar) => (
              <option key={ar} value={ar}>
                {ar}
              </option>
            ))}
          </select>
          {!hasAspectRatio && (
            <p className="text-app-subtext text-xs mt-1">Not supported by model</p>
          )}
        </div>

        <div>
          <label className={labelClass} htmlFor="pe-size">
            Image Size
          </label>
          <select
            id="pe-size"
            value={imageSize}
            onChange={(e) => setImageSize(e.target.value)}
            className={selectClass}
            disabled={availableSizes.length <= 1}
          >
            <option value="">Default</option>
            {availableSizes.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
          {availableSizes.length <= 1 && (
            <p className="text-app-subtext text-xs mt-1">Fixed by model</p>
          )}
        </div>

        <div />
        <div />
      </div>

      {/* Separator */}
      <div className="border-t border-app-border mb-4" />

      {/* Prompt list */}
      <div className="space-y-3">
        {prompts.map((text, index) => (
          <div key={index}>
            <div className="flex items-center justify-between mb-1">
              <label
                className={labelClass + " mb-0"}
                htmlFor={`pe-prompt-${index}`}
              >
                Prompt {prompts.length > 1 ? index + 1 : ""}
              </label>
              {prompts.length > 1 && (
                <button
                  type="button"
                  onClick={() => removePrompt(index)}
                  className="text-xs text-app-subtext hover:text-red-400 transition-colors"
                >
                  Remove
                </button>
              )}
            </div>
            <textarea
              id={`pe-prompt-${index}`}
              value={text}
              onChange={(e) => updatePrompt(index, e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Describe the image transformation..."
              rows={2}
              className="w-full rounded-lg border border-app-border bg-app-input px-4 py-2.5 text-sm text-app-text placeholder-app-subtext focus:border-app-accent focus:outline-none focus:ring-1 focus:ring-app-accent/40 transition-colors"
            />
            {errors[`prompt-${index}`] && (
              <p className="text-red-400 text-xs mt-1">
                {errors[`prompt-${index}`]}
              </p>
            )}
          </div>
        ))}
      </div>

      {/* Add prompt + footer */}
      <div className="mt-3 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={addPrompt}
            className="text-xs text-app-accent hover:text-app-accent-hover transition-colors"
          >
            + Add Prompt
          </button>
          <span className="text-xs text-app-subtext">
            {running ? "" : "Ctrl+Enter to run"}
          </span>
        </div>
        <button
          onClick={handleSubmit}
          disabled={running || totalTrials === 0}
          className="rounded-lg bg-app-accent px-6 py-2 text-sm font-medium text-white transition-colors hover:bg-app-accent-hover disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {running
            ? "Running..."
            : totalTrials <= 1
              ? "Run"
              : `Run ${totalTrials} trials`}
        </button>
      </div>

      {errors.prompts && (
        <p className="text-red-400 text-xs mt-2">{errors.prompts}</p>
      )}
    </div>
  );
}
