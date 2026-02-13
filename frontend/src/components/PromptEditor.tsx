import { useEffect, useState } from "react";
import { api } from "../api/client";
import type { ProviderInfo, TrialCreatePayload } from "../types";

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

  const buildPayload = (promptText: string): TrialCreatePayload => ({
    prompt: promptText,
    provider,
    model,
    normalized_params: { temperature: parseFloat(temperature) },
  });

  const handleRun = () => {
    if (!prompt.trim()) return;
    onRun(buildPayload(prompt.trim()));
  };

  const handleBatchRun = () => {
    const prompts = batchPrompts
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);
    if (prompts.length === 0) return;
    onBatchRun(prompts.map(buildPayload));
  };

  return (
    <div className="rounded-lg border border-gray-800 bg-gray-900 p-4">
      <div className="mb-3 flex gap-3">
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
        <label className="flex items-center gap-1.5 text-sm text-gray-400">
          <input
            type="checkbox"
            checked={batchMode}
            onChange={(e) => setBatchMode(e.target.checked)}
          />
          Batch
        </label>
      </div>

      {batchMode ? (
        <>
          <textarea
            value={batchPrompts}
            onChange={(e) => setBatchPrompts(e.target.value)}
            placeholder="One prompt per line..."
            rows={5}
            className="mb-3 w-full rounded-lg border border-gray-700 bg-gray-800 px-4 py-2 text-sm focus:border-blue-500 focus:outline-none"
          />
          <button
            onClick={handleBatchRun}
            disabled={running || !batchPrompts.trim()}
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
            className="mb-3 w-full rounded-lg border border-gray-700 bg-gray-800 px-4 py-2 text-sm focus:border-blue-500 focus:outline-none"
          />
          <button
            onClick={handleRun}
            disabled={running || !prompt.trim()}
            className="rounded-lg bg-blue-600 px-5 py-2 text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
          >
            {running ? "Running..." : "Run"}
          </button>
        </>
      )}
    </div>
  );
}
