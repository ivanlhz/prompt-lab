import Label from "../atoms/Label";
import Range from "../atoms/Range";

interface Props {
  id: string;
  value: string;
  onChange: (value: string) => void;
  min?: number;
  max?: number;
  step?: string;
  helpText?: string;
  error?: string;
}

export default function TemperatureSlider({
  id,
  value,
  onChange,
  min = 0,
  max = 2,
  step = "0.1",
  helpText = "Lower = more consistent output. Higher = more creative variation.",
  error,
}: Props) {
  return (
    <div>
      <div className="mb-1 flex items-center justify-between">
        <Label htmlFor={id}>Temperature</Label>
        <span className="text-xs font-medium text-app-subtext">
          {Number(value).toFixed(1)}
        </span>
      </div>
      <Range
        id={id}
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-describedby={helpText ? `${id}-help` : undefined}
      />
      <div className="mt-1 flex justify-between text-[11px] text-app-subtext">
        <span>{min}</span>
        <span>{max}</span>
      </div>
      {helpText && (
        <p id={`${id}-help`} className="mt-1 text-[11px] text-app-subtext">
          {helpText}
        </p>
      )}
      {error && <p className="mt-1 text-xs text-red-400">{error}</p>}
    </div>
  );
}
