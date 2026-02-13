import type { Experiment } from "../../types";
import { api } from "../../api/client";
import { formatDate } from "../../lib/utils";

interface Props {
  experiment: Experiment;
  onClick: () => void;
}

export default function ExperimentCard({ experiment, onClick }: Props) {
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => e.key === "Enter" && onClick()}
      className="group cursor-pointer rounded-xl border border-app-border bg-app-card p-4 transition hover:border-app-accent/50 hover:bg-app-card/90"
    >
      <img
        src={api.imageUrl(experiment.reference_image_path)}
        alt={experiment.name}
        className="mb-3 h-40 w-full rounded-lg object-cover transition group-hover:opacity-90"
      />
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
