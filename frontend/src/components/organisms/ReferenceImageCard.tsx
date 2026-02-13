import type { MouseEvent } from "react";
import type { ReferenceCrop } from "../../types";
import { Button, Card } from "../atoms";

interface Props {
  imageUrl: string;
  referenceCrop: ReferenceCrop | null;
  draftCrop: ReferenceCrop | null;
  imageRef: React.RefObject<HTMLImageElement | null>;
  onCropStart: (e: MouseEvent) => void;
  onCropMove: (e: MouseEvent) => void;
  onCropEnd: () => void;
  onClearRegion: () => void;
}

export default function ReferenceImageCard({
  imageUrl,
  referenceCrop,
  draftCrop,
  imageRef,
  onCropStart,
  onCropMove,
  onCropEnd,
  onClearRegion,
}: Props) {
  const crop = draftCrop ?? referenceCrop;

  return (
    <Card accent className="col-span-12 lg:col-span-4">
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-sm font-medium text-app-subtext">Reference Image</h2>
        <Button variant="ghost" className="!px-2 !py-1 text-xs" onClick={onClearRegion}>
          Clear region
        </Button>
      </div>
      <p className="mb-2 text-xs text-app-subtext">
        Drag over the image to select a region used for generation.
      </p>
      <div
        className="relative inline-block w-full"
        onMouseDown={onCropStart}
        onMouseMove={onCropMove}
        onMouseUp={onCropEnd}
        onMouseLeave={onCropEnd}
      >
        <img
          ref={imageRef}
          src={imageUrl}
          alt="Reference"
          className="max-h-64 w-full rounded-lg border border-app-border object-contain select-none"
          draggable={false}
        />
        {crop && (
          <div
            className="pointer-events-none absolute rounded border-2 border-app-accent bg-app-accent/20"
            style={{
              left: `${crop.x * 100}%`,
              top: `${crop.y * 100}%`,
              width: `${crop.width * 100}%`,
              height: `${crop.height * 100}%`,
            }}
          />
        )}
      </div>
    </Card>
  );
}
