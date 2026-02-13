import { useEffect } from "react";

interface Props {
  imageUrl: string;
  alt: string;
  onClose: () => void;
}

export default function ImageZoomModal({ imageUrl, alt, onClose }: Props) {
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-60 flex items-center justify-center bg-black/85 p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Image zoom preview"
    >
      <button
        type="button"
        onClick={onClose}
        className="absolute right-4 top-4 rounded bg-gray-800 px-3 py-1 text-sm text-gray-100 hover:bg-gray-700"
      >
        Close
      </button>
      <img
        src={imageUrl}
        alt={alt}
        onClick={(e) => e.stopPropagation()}
        className="max-h-[92vh] max-w-[92vw] rounded-lg object-contain shadow-2xl"
      />
    </div>
  );
}
