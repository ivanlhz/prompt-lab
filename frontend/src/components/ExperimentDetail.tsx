import { lazy, Suspense } from "react";
import { api } from "../api/client";
import { PageHeader } from "./organisms/PageHeader";
import ReferenceImageCard from "./organisms/ReferenceImageCard";
import ImageUploader from "./ImageUploader";
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
    handleUploadReferenceImage,
    handleRemoveReferenceImageAt,
    handleDelete,
    toggleSelect,
    sortedTrials,
    selectedTrials,
    navigate,
    page,
    totalPages,
    setPage,
  } = useExperimentDetail();

  if (!experiment) {
    return <p className="text-app-subtext">Loading...</p>;
  }

  const refPaths = experiment.reference_image_paths ?? [];
  const hasReferenceImages = refPaths.length > 0;
  const firstRefPath = refPaths[0];

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
          {hasReferenceImages ? (
            <div className="col-span-12 flex flex-col gap-3 lg:col-span-4">
              <ReferenceImageCard
                imageUrl={api.imageUrl(firstRefPath)}
                referenceCrop={referenceCrop}
                draftCrop={draftCrop}
                imageRef={referenceImgRef}
                onCropStart={handleCropStart}
                onCropMove={handleCropMove}
                onCropEnd={finishCrop}
                onClearRegion={clearCropRegion}
                onReplace={handleUploadReferenceImage}
                onRemove={() => handleRemoveReferenceImageAt(0)}
              />
              {refPaths.length > 1 ? (
                <div className="flex flex-wrap gap-2">
                  {refPaths.slice(1).map((path, i) => (
                    <div
                      key={path}
                      className="relative inline-block rounded-lg border border-app-border overflow-hidden"
                    >
                      <img
                        src={api.imageUrl(path)}
                        alt={`Reference ${i + 2}`}
                        className="h-20 w-20 object-cover"
                      />
                      <button
                        type="button"
                        className="absolute right-1 top-1 rounded bg-red-500/90 px-1.5 py-0.5 text-xs text-white hover:bg-red-500"
                        onClick={() => handleRemoveReferenceImageAt(i + 1)}
                        aria-label={`Remove reference image ${i + 2}`}
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              ) : null}
              <ImageUploader
                onFileSelected={handleUploadReferenceImage}
                label="Add another image"
              />
            </div>
          ) : (
            <article className="col-span-12 lg:col-span-4">
              <h2 className="mb-2 text-sm font-medium text-app-subtext">Reference images</h2>
              <ImageUploader onFileSelected={handleUploadReferenceImage} />
            </article>
          )}

          <article className={hasReferenceImages ? "col-span-12 lg:col-span-8" : "col-span-12 lg:col-span-8"}>
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

          {totalPages > 1 ? (
            <nav
              className="mt-4 flex items-center justify-center gap-3"
              aria-label="Paginación de trials"
            >
              <Button
                variant="secondary"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
              >
                Anterior
              </Button>
              <span className="text-sm text-app-subtext">
                Página {page} de {totalPages}
              </span>
              <Button
                variant="secondary"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
              >
                Siguiente
              </Button>
            </nav>
          ) : null}
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
