import type { ButtonHTMLAttributes } from "react";

type Variant = "primary" | "secondary" | "danger" | "ghost";

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  children: React.ReactNode;
  className?: string;
}

const variantClasses: Record<Variant, string> = {
  primary:
    "bg-app-accent text-white hover:bg-app-accent-hover disabled:opacity-50 disabled:cursor-not-allowed",
  secondary:
    "border border-app-border bg-app-card text-app-text hover:bg-app-input disabled:opacity-50",
  danger:
    "border border-red-700/50 text-red-300 hover:bg-red-900/30 disabled:opacity-50",
  ghost:
    "text-app-subtext hover:text-app-text hover:bg-app-card disabled:opacity-50",
};

export default function Button({
  variant = "primary",
  className = "",
  children,
  ...props
}: Props) {
  return (
    <button
      type="button"
      className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${variantClasses[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
