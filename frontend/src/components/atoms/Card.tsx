import type { HTMLAttributes } from "react";

interface Props extends HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
  /** Borde acentuado (p. ej. para referencia seleccionada) */
  accent?: boolean;
}

export default function Card({
  children,
  className = "",
  accent = false,
  ...props
}: Props) {
  const borderClass = accent
    ? "border-2 border-app-accent shadow-[0_0_15px_rgba(168,85,247,0.15)]"
    : "border border-app-border";
  return (
    <div
      className={`rounded-xl bg-app-card p-4 ${borderClass} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}
