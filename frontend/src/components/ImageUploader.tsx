import { useCallback, useState } from "react";

interface Props {
  onFileSelected: (file: File) => void;
}

export default function ImageUploader({ onFileSelected }: Props) {
  const [preview, setPreview] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);

  const handleFile = useCallback(
    (file: File) => {
      if (!file.type.startsWith("image/")) return;
      onFileSelected(file);
      setPreview(URL.createObjectURL(file));
    },
    [onFileSelected]
  );

  return (
    <label
      onDragOver={(e) => {
        e.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragOver(false);
        const file = e.dataTransfer.files[0];
        if (file) handleFile(file);
      }}
      className={`flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed p-8 transition ${
        dragOver
          ? "border-blue-500 bg-blue-500/10"
          : "border-gray-700 hover:border-gray-500"
      }`}
    >
      {preview ? (
        <img
          src={preview}
          alt="Preview"
          className="max-h-48 rounded object-contain"
        />
      ) : (
        <div className="text-center text-gray-400">
          <p className="text-lg">Drop reference image here</p>
          <p className="text-sm">or click to select</p>
        </div>
      )}
      <input
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
        }}
      />
    </label>
  );
}
