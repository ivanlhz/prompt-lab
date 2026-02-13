import type { SelectHTMLAttributes } from "react";

interface Props extends SelectHTMLAttributes<HTMLSelectElement> {
  className?: string;
  options: { value: string; label: string }[];
}

const baseClass =
  "w-full rounded-lg border border-app-border bg-app-input px-3 py-1.5 text-sm text-app-text focus:border-app-accent focus:outline-none focus:ring-1 focus:ring-app-accent/40 transition-colors";

export default function Select({
  options,
  className = "",
  ...props
}: Props) {
  return (
    <select className={`${baseClass} ${className}`} {...props}>
      {options.map(({ value, label }) => (
        <option key={value} value={value}>
          {label}
        </option>
      ))}
    </select>
  );
}
