import type { LabelHTMLAttributes } from "react";

interface Props extends LabelHTMLAttributes<HTMLLabelElement> {
  children: React.ReactNode;
  className?: string;
  optional?: boolean;
}

const baseClass = "block text-xs font-medium text-app-subtext mb-1";

export default function Label({
  children,
  className = "",
  optional,
  ...props
}: Props) {
  return (
    <label className={`${baseClass} ${className}`} {...props}>
      {children}
      {optional && (
        <span className="font-normal"> (optional)</span>
      )}
    </label>
  );
}
