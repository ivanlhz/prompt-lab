import type { InputHTMLAttributes } from "react";

interface Props extends InputHTMLAttributes<HTMLInputElement> {
  className?: string;
}

const baseClass =
  "w-full rounded-lg border border-app-border bg-app-input px-4 py-2 text-sm text-app-text placeholder-app-subtext focus:border-app-accent focus:outline-none focus:ring-1 focus:ring-app-accent/40 transition-colors";

export default function Input({ className = "", ...props }: Props) {
  return <input className={`${baseClass} ${className}`} {...props} />;
}
