import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api/client";
import { useExperiments } from "../hooks/useExperiments";
import { formatDate } from "../lib/utils";
import { experimentSchema } from "../schemas/experiment";
import ImageUploader from "./ImageUploader";

export default function ExperimentList() {
  const { experiments, loading, refresh } = useExperiments();
  const navigate = useNavigate();
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [creating, setCreating] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const resetForm = () => {
    setName("");
    setDescription("");
    setFile(null);
    setErrors({});
  };

  const handleCancel = () => {
    setShowCreate(false);
    resetForm();
  };

  const handleCreate = async () => {
    const result = experimentSchema.safeParse({
      name: name.trim(),
      description: description.trim() || undefined,
      file,
    });

    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      for (const issue of result.error.issues) {
        const key = String(issue.path[0] || "form");
        if (!fieldErrors[key]) fieldErrors[key] = issue.message;
      }
      setErrors(fieldErrors);
      return;
    }

    setErrors({});
    setCreating(true);
    try {
      const form = new FormData();
      form.append("name", result.data.name);
      if (result.data.description)
        form.append("description", result.data.description);
      form.append("reference_image", result.data.file);
      const exp = await api.createExperiment(form);
      setShowCreate(false);
      resetForm();
      await refresh();
      navigate(`/experiments/${exp.id}`);
    } finally {
      setCreating(false);
    }
  };

  const labelClass = "block text-xs font-medium text-gray-400 mb-1";

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Experiments</h1>
        <button
          onClick={() => setShowCreate(!showCreate)}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium hover:bg-blue-500 transition-colors"
        >
          + New Experiment
        </button>
      </div>

      {showCreate && (
        <div className="mb-6 rounded-xl border border-gray-800 bg-gray-900 p-6">
          <h2 className="mb-4 text-lg font-semibold">Create Experiment</h2>
          <div className="space-y-4">
            <div>
              <label className={labelClass} htmlFor="exp-name">
                Name
              </label>
              <input
                id="exp-name"
                type="text"
                placeholder="Experiment name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={100}
                className="w-full rounded-lg border border-gray-700 bg-gray-800 px-4 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500/40 transition-colors"
              />
              <div className="flex justify-between mt-1">
                {errors.name ? (
                  <p className="text-red-400 text-xs">{errors.name}</p>
                ) : (
                  <span />
                )}
                <span className="text-xs text-gray-600">
                  {name.length}/100
                </span>
              </div>
            </div>

            <div>
              <label className={labelClass} htmlFor="exp-desc">
                Description{" "}
                <span className="text-gray-600 font-normal">(optional)</span>
              </label>
              <textarea
                id="exp-desc"
                placeholder="What are you testing?"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
                className="w-full rounded-lg border border-gray-700 bg-gray-800 px-4 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500/40 transition-colors"
              />
            </div>

            <div>
              <label className={labelClass}>Reference Image</label>
              <ImageUploader onFileSelected={setFile} />
              {errors.file && (
                <p className="text-red-400 text-xs mt-1">{errors.file}</p>
              )}
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={handleCreate}
                disabled={creating}
                className="rounded-lg bg-green-600 px-6 py-2 text-sm font-medium hover:bg-green-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {creating ? "Creating..." : "Create"}
              </button>
              <button
                onClick={handleCancel}
                type="button"
                className="rounded-lg px-4 py-2 text-sm text-gray-400 hover:text-gray-200 hover:bg-gray-800 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <p className="text-gray-400">Loading...</p>
      ) : experiments.length === 0 ? (
        <p className="text-gray-400">
          No experiments yet. Create one to get started.
        </p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {experiments.map((exp) => (
            <div
              key={exp.id}
              onClick={() => navigate(`/experiments/${exp.id}`)}
              className="group cursor-pointer rounded-xl border border-gray-800 bg-gray-900 p-4 transition hover:border-gray-600 hover:bg-gray-900/80"
            >
              <img
                src={api.imageUrl(exp.reference_image_path)}
                alt={exp.name}
                className="mb-3 h-40 w-full rounded-lg object-cover transition group-hover:opacity-90"
              />
              <h3 className="font-semibold">{exp.name}</h3>
              {exp.description && (
                <p className="mt-1 text-sm text-gray-400 line-clamp-2">
                  {exp.description}
                </p>
              )}
              <div className="mt-2 flex items-center justify-between text-xs text-gray-500">
                <span>{exp.trial_count} trials</span>
                <span>{formatDate(exp.created_at)}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
