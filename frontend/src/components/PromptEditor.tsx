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
import Button from "./atoms/Button";
import Card from "./atoms/Card";
import Select from "./atoms/Select";
import FormField from "./molecules/FormField";
import PromptRow from "./molecules/PromptRow";
import TemperatureSlider from "./molecules/TemperatureSlider";

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

  const providerOptions = providers.map((p) => ({ value: p.name, label: p.name }));
  const modelOptions = currentModels.map((m) => ({ value: m, label: m }));
  const imagesOptions = Array.from(
    { length: MAX_IMAGES_PER_PROMPT },
    (_, i) => ({ value: String(i + 1), label: `${i + 1}x` })
  );
  const aspectOptions = [
    { value: "", label: "Auto" },
    ...ASPECT_RATIOS.map((ar) => ({ value: ar, label: ar })),
  ];
  const sizeOptions = [
    { value: "", label: "Default" },
    ...availableSizes.map((s) => ({ value: s.value, label: s.label })),
  ];

  return (
    <Card className="p-5">
      <div className="mb-3 grid grid-cols-[1fr_1fr_1fr_auto] gap-3 items-end">
        <FormField label="Provider" error={errors.provider}>
          <Select
            id="pe-provider"
            options={providerOptions}
            value={provider}
            onChange={(e) => setProvider(e.target.value)}
          />
        </FormField>
        <FormField label="Model" error={errors.model}>
          <Select
            id="pe-model"
            options={modelOptions}
            value={model}
            onChange={(e) => setModel(e.target.value)}
          />
        </FormField>
        <TemperatureSlider
          id="pe-temp"
          value={temperature}
          onChange={setTemperature}
          error={errors.temperature}
        />
        <FormField label="Images">
          <Select
            id="pe-count"
            options={imagesOptions}
            value={String(imagesPerPrompt)}
            onChange={(e) => setImagesPerPrompt(Number(e.target.value))}
          />
        </FormField>
      </div>

      <div className="mb-4 grid grid-cols-[1fr_1fr_1fr_auto] gap-3 items-end">
        <div>
          <FormField label="Aspect Ratio">
            <Select
              id="pe-aspect"
              options={aspectOptions}
              value={aspectRatio}
              onChange={(e) => setAspectRatio(e.target.value)}
              disabled={!hasAspectRatio}
            />
          </FormField>
          {!hasAspectRatio && (
            <p className="mt-1 text-xs text-app-subtext">Not supported by model</p>
          )}
        </div>
        <div>
          <FormField label="Image Size">
            <Select
              id="pe-size"
              options={sizeOptions}
              value={imageSize}
              onChange={(e) => setImageSize(e.target.value)}
              disabled={availableSizes.length <= 1}
            />
          </FormField>
          {availableSizes.length <= 1 && (
            <p className="mt-1 text-xs text-app-subtext">Fixed by model</p>
          )}
        </div>
        <div />
        <div />
      </div>

      <div className="mb-4 border-t border-app-border" />

      <div className="space-y-3">
        {prompts.map((text, index) => (
          <PromptRow
            key={index}
            id={`pe-prompt-${index}`}
            label={prompts.length > 1 ? `Prompt ${index + 1}` : "Prompt"}
            value={text}
            onChange={(v) => updatePrompt(index, v)}
            onRemove={prompts.length > 1 ? () => removePrompt(index) : undefined}
            onKeyDown={handleKeyDown}
            error={errors[`prompt-${index}`]}
            showRemove={prompts.length > 1}
          />
        ))}
      </div>

      <div className="mt-3 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            className="!px-0 !py-0 text-xs"
            onClick={addPrompt}
          >
            + Add Prompt
          </Button>
          <span className="text-xs text-app-subtext">
            {running ? "" : "Ctrl+Enter to run"}
          </span>
        </div>
        <Button
          onClick={handleSubmit}
          disabled={running || totalTrials === 0}
        >
          {running
            ? "Running..."
            : totalTrials <= 1
              ? "Run"
              : `Run ${totalTrials} trials`}
        </Button>
      </div>

      {errors.prompts && (
        <p className="mt-2 text-xs text-red-400">{errors.prompts}</p>
      )}
    </Card>
  );
}
