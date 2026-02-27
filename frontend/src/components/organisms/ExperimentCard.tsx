import { memo } from "react";
import type { Experiment } from "../../types";
import { api } from "../../api/client";
import { formatDate } from "../../lib/utils";

interface Props {
  experiment: Experiment;
  onClick: () => void;
}

function ExperimentCard({ experiment, onClick }: Props) {
  const firstRef =
    experiment.reference_image_paths?.[0] ?? experiment.reference_image_path;
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => e.key === "Enter" && onClick()}
      className="experiment-card-item group cursor-pointer rounded-xl border border-app-border bg-app-card p-4 transition hover:border-app-accent/50 hover:bg-app-card/90"
    >
      {firstRef ? (
        <img
          src={api.imageUrl(firstRef)}
          alt={experiment.name}
          className="mb-3 h-40 w-full rounded-lg object-cover transition group-hover:opacity-90"
        />
      ) : (
        <div className="mb-3 flex h-40 w-full items-center justify-center rounded-lg border border-dashed border-app-border bg-app-card/40 text-xs text-app-subtext">
          No reference image
        </div>
      )}
      <h3 className="font-semibold text-app-text">{experiment.name}</h3>
      {experiment.description && (
        <p className="mt-1 line-clamp-2 text-sm text-app-subtext">
          {experiment.description}
        </p>
      )}
      <div className="mt-2 flex items-center justify-between text-xs text-app-subtext">
        <span>{experiment.trial_count} trials</span>
        <span>{formatDate(experiment.created_at)}</span>
      </div>
    </div>
  );
}

export default memo(ExperimentCard);
