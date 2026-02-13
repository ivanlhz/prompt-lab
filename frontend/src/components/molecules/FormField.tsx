import Label from "../atoms/Label";

interface Props {
  id?: string;
  label: string;
  error?: string;
  children: React.ReactNode;
  labelClassName?: string;
}

export default function FormField({
  id,
  label,
  error,
  children,
  labelClassName = "",
}: Props) {
  return (
    <div>
      <Label htmlFor={id} className={labelClassName}>
        {label}
      </Label>
      {children}
      {error && (
        <p className="mt-1 text-xs text-red-400">{error}</p>
      )}
    </div>
  );
}
