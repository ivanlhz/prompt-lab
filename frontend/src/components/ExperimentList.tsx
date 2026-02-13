import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api/client";
import { useExperiments } from "../hooks/useExperiments";
import { experimentSchema } from "../schemas/experiment";
import { PageHeader } from "./organisms/PageHeader";
import CreateExperimentForm from "./organisms/CreateExperimentForm";
import ExperimentCard from "./organisms/ExperimentCard";
import Button from "./atoms/Button";

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

  return (
    <div className="flex flex-col">
      <PageHeader.Root>
        <PageHeader.Title title="Experiments" />
        <PageHeader.Actions>
          <Button onClick={() => setShowCreate(!showCreate)}>
            + New Experiment
          </Button>
        </PageHeader.Actions>
      </PageHeader.Root>

      <div className="flex-1 p-6">
        {showCreate && (
          <CreateExperimentForm
            name={name}
            description={description}
            onNameChange={setName}
            onDescriptionChange={setDescription}
            onFileSelected={setFile}
            onSubmit={handleCreate}
            onCancel={handleCancel}
            creating={creating}
            errors={errors}
          />
        )}

        {loading ? (
          <p className="text-app-subtext">Loading...</p>
        ) : experiments.length === 0 ? (
          <p className="text-app-subtext">
            No experiments yet. Create one to get started.
          </p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {experiments.map((exp) => (
              <ExperimentCard
                key={exp.id}
                experiment={exp}
                onClick={() => navigate(`/experiments/${exp.id}`)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
