import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api/client";
import { experimentSchema } from "../schemas/experiment";

export function useCreateExperimentForm(refresh: () => Promise<void>) {
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
        const key = String(issue.path[0] ?? "form");
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
      if (result.data.description) {
        form.append("description", result.data.description);
      }
      if (result.data.file) {
        form.append("reference_image", result.data.file);
      }
      const exp = await api.createExperiment(form);
      setShowCreate(false);
      resetForm();
      await refresh();
      navigate(`/experiments/${exp.id}`);
    } catch (error) {
      setErrors({
        form:
          error instanceof Error ? error.message : "Failed to create experiment",
      });
    } finally {
      setCreating(false);
    }
  };

  return {
    showCreate,
    setShowCreate,
    name,
    setName,
    description,
    setDescription,
    file,
    setFile,
    creating,
    errors,
    handleCreate,
    handleCancel,
  };
}
