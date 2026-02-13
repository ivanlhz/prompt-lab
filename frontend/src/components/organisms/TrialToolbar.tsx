import Button from "../atoms/Button";
import Select from "../atoms/Select";

interface Props {
  trialCount: number;
  sortBy: "date" | "score";
  onSortChange: (value: "date" | "score") => void;
  compareCount: number;
  onCompare: () => void;
  onDeleteAll: () => void;
  onStopActive: () => void;
  deletingAll: boolean;
  stopping: boolean;
}

const sortOptions = [
  { value: "date", label: "Sort by date" },
  { value: "score", label: "Sort by score" },
];

export default function TrialToolbar({
  trialCount,
  sortBy,
  onSortChange,
  compareCount,
  onCompare,
  onDeleteAll,
  onStopActive,
  deletingAll,
  stopping,
}: Props) {
  return (
    <div className="mb-4 flex flex-wrap items-center gap-3">
      <h2 className="text-lg font-semibold text-app-text">
        Trials ({trialCount})
      </h2>
      <Select
        options={sortOptions}
        value={sortBy}
        onChange={(e) => onSortChange(e.target.value as "date" | "score")}
        aria-label="Sort trials"
        className="w-auto min-w-[140px] px-2 py-1.5 text-xs"
      />
      {compareCount >= 2 && (
        <Button onClick={onCompare} className="!px-3 !py-1.5 text-xs">
          Compare ({compareCount})
        </Button>
      )}
      <Button
        variant="danger"
        onClick={onDeleteAll}
        disabled={deletingAll || trialCount === 0}
        className="ml-auto !px-3 !py-1.5 text-xs"
      >
        {deletingAll ? "Deleting..." : "Delete all trials"}
      </Button>
      <Button
        variant="secondary"
        onClick={onStopActive}
        disabled={stopping}
        className="!border-orange-700/50 !text-orange-300 !hover:bg-orange-900/30 !px-3 !py-1.5 text-xs"
      >
        {stopping ? "Stopping..." : "Stop active requests"}
      </Button>
    </div>
  );
}
