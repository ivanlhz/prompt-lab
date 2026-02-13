import type { InputHTMLAttributes } from "react";

interface Props extends Omit<InputHTMLAttributes<HTMLInputElement>, "type"> {
  className?: string;
}

const baseClass =
  "h-2 w-full cursor-pointer appearance-none rounded-lg bg-app-input";

export default function Range({ className = "", ...props }: Props) {
  return (
    <input
      type="range"
      className={`${baseClass} ${className}`}
      {...props}
    />
  );
}
