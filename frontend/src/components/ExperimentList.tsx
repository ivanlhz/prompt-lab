import { useNavigate } from "react-router-dom";
import { useExperiments } from "../hooks/useExperiments";
import { useCreateExperimentForm } from "../hooks/useCreateExperimentForm";
import { PageHeader } from "./organisms/PageHeader";
import CreateExperimentForm from "./organisms/CreateExperimentForm";
import ExperimentCard from "./organisms/ExperimentCard";
import Button from "./atoms/Button";

export default function ExperimentList() {
  const { experiments, loading, refresh } = useExperiments();
  const navigate = useNavigate();
  const createForm = useCreateExperimentForm(refresh);

  return (
    <div className="flex flex-col">
      <PageHeader.Root>
        <PageHeader.Title title="Experiments" />
        <PageHeader.Actions>
          <Button onClick={() => createForm.setShowCreate(!createForm.showCreate)}>
            + New Experiment
          </Button>
        </PageHeader.Actions>
      </PageHeader.Root>

      <div className="flex-1 p-6">
        {createForm.showCreate ? (
          <CreateExperimentForm
            name={createForm.name}
            description={createForm.description}
            onNameChange={createForm.setName}
            onDescriptionChange={createForm.setDescription}
            onFileSelected={createForm.setFile}
            onSubmit={createForm.handleCreate}
            onCancel={createForm.handleCancel}
            creating={createForm.creating}
            errors={createForm.errors}
          />
        ) : null}

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
