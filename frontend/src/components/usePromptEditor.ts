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

interface UsePromptEditorArgs {
  referenceCrop: ReferenceCrop | null;
  onRun: (payload: TrialCreatePayload) => void;
  onBatchRun: (payloads: TrialCreatePayload[]) => void;
  running: boolean;
}

export function usePromptEditor({
  referenceCrop,
  onRun,
  onBatchRun,
  running,
}: UsePromptEditorArgs) {
  const [providers, setProviders] = useState<ProviderInfo[]>([]);
  const [provider, setProvider] = useState("");
  const [model, setModel] = useState("");
  const [prompts, setPrompts] = useState<string[]>([""]);
  const [temperature, setTemperature] = useState("1");
  const [imagesPerPrompt, setImagesPerPrompt] = useState(1);
  const [aspectRatio, setAspectRatio] = useState("");
  const [imageSize, setImageSize] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  const currentModels = providers.find((p) => p.name === provider)?.models ?? [];

  useEffect(() => {
    api.listProviders().then((list) => {
      setProviders(list);
      if (list.length > 0) {
        setProvider(list[0].name);
        setModel(list[0].models[0] ?? "");
      }
    });
  }, []);

  useEffect(() => {
    if (currentModels.length > 0 && !currentModels.includes(model)) {
      setModel(currentModels[0]);
    }
  }, [provider, currentModels, model]);

  const availableSizes = getSizesForModel(model);
  const hasAspectRatio = supportsAspectRatio(model);

  useEffect(() => {
    if (imageSize && !availableSizes.some((s) => s.value === imageSize)) {
      setImageSize("");
    }
    if (aspectRatio && !hasAspectRatio) {
      setAspectRatio("");
    }
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

  const nonEmptyPrompts = prompts.map((p) => p.trim()).filter(Boolean);
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

  return {
    provider,
    setProvider,
    model,
    setModel,
    prompts,
    updatePrompt,
    addPrompt,
    removePrompt,
    temperature,
    setTemperature,
    imagesPerPrompt,
    setImagesPerPrompt,
    aspectRatio,
    setAspectRatio,
    imageSize,
    setImageSize,
    errors,
    hasAspectRatio,
    availableSizes,
    totalTrials,
    running,
    handleSubmit,
    handleKeyDown,
    providerOptions,
    modelOptions,
    imagesOptions,
    aspectOptions,
    sizeOptions,
  };
}
