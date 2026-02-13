import type { ReferenceCrop, TrialCreatePayload } from "../types";
import Button from "./atoms/Button";
import Card from "./atoms/Card";
import Select from "./atoms/Select";
import FormField from "./molecules/FormField";
import PromptRow from "./molecules/PromptRow";
import TemperatureSlider from "./molecules/TemperatureSlider";
import { usePromptEditor } from "./usePromptEditor";

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
  const {
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
    handleSubmit,
    handleKeyDown,
    providerOptions,
    modelOptions,
    imagesOptions,
    aspectOptions,
    sizeOptions,
  } = usePromptEditor({ referenceCrop, onRun, onBatchRun, running });

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
          {!hasAspectRatio ? (
            <p className="mt-1 text-xs text-app-subtext">Not supported by model</p>
          ) : null}
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
          {availableSizes.length <= 1 ? (
            <p className="mt-1 text-xs text-app-subtext">Fixed by model</p>
          ) : null}
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

      {errors.prompts ? (
        <p className="mt-2 text-xs text-red-400">{errors.prompts}</p>
      ) : null}
    </Card>
  );
}
