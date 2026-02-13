import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api/client";
import { useExperiments } from "../hooks/useExperiments";
import { formatDate } from "../lib/utils";
import ImageUploader from "./ImageUploader";

export default function ExperimentList() {
  const { experiments, loading, refresh } = useExperiments();
  const navigate = useNavigate();
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [creating, setCreating] = useState(false);

  const handleCreate = async () => {
    if (!name.trim() || !file) return;
    setCreating(true);
    try {
      const form = new FormData();
      form.append("name", name.trim());
      if (description.trim()) form.append("description", description.trim());
      form.append("reference_image", file);
      const exp = await api.createExperiment(form);
      setShowCreate(false);
      setName("");
      setDescription("");
      setFile(null);
      await refresh();
      navigate(`/experiments/${exp.id}`);
    } finally {
      setCreating(false);
    }
  };

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Experiments</h1>
        <button
          onClick={() => setShowCreate(!showCreate)}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium hover:bg-blue-700"
        >
          + New Experiment
        </button>
      </div>

      {showCreate && (
        <div className="mb-6 rounded-lg border border-gray-800 bg-gray-900 p-6">
          <h2 className="mb-4 text-lg font-semibold">Create Experiment</h2>
          <div className="space-y-4">
            <input
              type="text"
              placeholder="Experiment name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-lg border border-gray-700 bg-gray-800 px-4 py-2 focus:border-blue-500 focus:outline-none"
            />
            <textarea
              placeholder="Description (optional)"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className="w-full rounded-lg border border-gray-700 bg-gray-800 px-4 py-2 focus:border-blue-500 focus:outline-none"
            />
            <ImageUploader onFileSelected={setFile} />
            <button
              onClick={handleCreate}
              disabled={!name.trim() || !file || creating}
              className="rounded-lg bg-green-600 px-6 py-2 text-sm font-medium hover:bg-green-700 disabled:opacity-50"
            >
              {creating ? "Creating..." : "Create"}
            </button>
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
              className="cursor-pointer rounded-lg border border-gray-800 bg-gray-900 p-4 transition hover:border-gray-600"
            >
              <img
                src={api.imageUrl(exp.reference_image_path)}
                alt={exp.name}
                className="mb-3 h-40 w-full rounded object-cover"
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
