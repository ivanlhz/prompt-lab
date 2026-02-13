import type { KeyboardEvent } from "react";
import Label from "../atoms/Label";
import Textarea from "../atoms/Textarea";
import Button from "../atoms/Button";

interface Props {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  onRemove?: () => void;
  onKeyDown?: (e: KeyboardEvent<HTMLTextAreaElement>) => void;
  placeholder?: string;
  error?: string;
  showRemove: boolean;
}

export default function PromptRow({
  id,
  label,
  value,
  onChange,
  onRemove,
  onKeyDown,
  placeholder = "Describe the image transformation...",
  error,
  showRemove,
}: Props) {
  return (
    <div>
      <div className="mb-1 flex items-center justify-between">
        <Label htmlFor={id}>{label}</Label>
        {showRemove && onRemove && (
          <Button variant="ghost" className="!px-2 !py-1 text-xs" onClick={onRemove}>
            Remove
          </Button>
        )}
      </div>
      <Textarea
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={onKeyDown}
        placeholder={placeholder}
        rows={2}
      />
      {error && <p className="mt-1 text-xs text-red-400">{error}</p>}
    </div>
  );
}
