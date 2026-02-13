import type { TextareaHTMLAttributes } from "react";

interface Props extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  className?: string;
}

const baseClass =
  "w-full rounded-lg border border-app-border bg-app-input px-4 py-2.5 text-sm text-app-text placeholder-app-subtext focus:border-app-accent focus:outline-none focus:ring-1 focus:ring-app-accent/40 transition-colors";

export default function Textarea({ className = "", ...props }: Props) {
  return <textarea className={`${baseClass} ${className}`} {...props} />;
}
