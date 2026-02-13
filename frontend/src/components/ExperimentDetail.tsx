import { lazy, Suspense } from "react";
import { api } from "../api/client";
import { PageHeader } from "./organisms/PageHeader";
import ReferenceImageCard from "./organisms/ReferenceImageCard";
import TrialToolbar from "./organisms/TrialToolbar";
import PromptEditor from "./PromptEditor";
import TrialCard from "./TrialCard";
import Button from "./atoms/Button";
import { useExperimentDetail } from "./useExperimentDetail";

const ComparisonGrid = lazy(() =>
  import("./ComparisonGrid").then((m) => ({ default: m.default }))
);

export default function ExperimentDetail() {
  const {
    experiment,
    referenceImgRef,
    referenceCrop,
    draftCrop,
    running,
    sortBy,
    setSortBy,
    selectedIds,
    showComparison,
    setShowComparison,
    deletingAll,
    stopping,
    handleCropStart,
    handleCropMove,
    finishCrop,
    clearCropRegion,
    handleRun,
    handleBatchRun,
    handleStopActiveRequests,
    handleDeleteAllTrials,
    handleTrialUpdated,
    handleTrialDeleted,
    handleDelete,
    toggleSelect,
    sortedTrials,
    selectedTrials,
    navigate,
  } = useExperimentDetail();

  if (!experiment) {
    return <p className="text-app-subtext">Loading...</p>;
  }

  return (
    <div className="flex flex-col">
      <PageHeader.Root>
        <PageHeader.Left>
          <Button variant="ghost" className="!px-0" onClick={() => navigate("/")}>
            ← Back
          </Button>
        </PageHeader.Left>
        <PageHeader.Title
          title={experiment.name}
          description={experiment.description ?? undefined}
        />
        <PageHeader.Actions>
          <Button variant="ghost" className="!text-red-400" onClick={handleDelete}>
            Delete experiment
          </Button>
        </PageHeader.Actions>
      </PageHeader.Root>

      <div className="flex-1 p-6">
        <section className="mb-6 grid grid-cols-12 gap-4" data-purpose="top-grid">
          <ReferenceImageCard
            imageUrl={api.imageUrl(experiment.reference_image_path)}
            referenceCrop={referenceCrop}
            draftCrop={draftCrop}
            imageRef={referenceImgRef}
            onCropStart={handleCropStart}
            onCropMove={handleCropMove}
            onCropEnd={finishCrop}
            onClearRegion={clearCropRegion}
          />

          <article className="col-span-12 lg:col-span-8">
            <PromptEditor
              onRun={handleRun}
              onBatchRun={handleBatchRun}
              running={running}
              referenceCrop={referenceCrop}
            />
          </article>
        </section>

        <section>
          <TrialToolbar
            trialCount={experiment.trials.length}
            sortBy={sortBy}
            onSortChange={setSortBy}
            compareCount={selectedIds.size}
            onCompare={() => setShowComparison(true)}
            onDeleteAll={handleDeleteAllTrials}
            onStopActive={handleStopActiveRequests}
            deletingAll={deletingAll}
            stopping={stopping}
          />

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {sortedTrials.map((trial) => (
              <TrialCard
                key={trial.id}
                trial={trial}
                selected={selectedIds.has(trial.id)}
                onToggleSelect={() => toggleSelect(trial.id)}
                onUpdated={handleTrialUpdated}
                onDeleted={handleTrialDeleted}
              />
            ))}
          </div>
        </section>
      </div>

      {showComparison && selectedTrials.length >= 2 ? (
        <Suspense fallback={null}>
          <ComparisonGrid
            trials={selectedTrials}
            onClose={() => setShowComparison(false)}
          />
        </Suspense>
      ) : null}
    </div>
  );
}
