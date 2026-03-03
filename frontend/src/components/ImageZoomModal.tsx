import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

interface Props {
  imageUrl: string;
  alt: string;
  onClose: () => void;
}

const MIN_SCALE = 0.5;
const MAX_SCALE = 5;
const ZOOM_STEP = 0.25;

export default function ImageZoomModal({ imageUrl, alt, onClose }: Props) {
  const [scale, setScale] = useState(1);
  const [translate, setTranslate] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0 });
  const translateStart = useRef({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  const resetView = useCallback(() => {
    setScale(1);
    setTranslate({ x: 0, y: 0 });
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "+" || e.key === "=")
        setScale((s) => Math.min(MAX_SCALE, s + ZOOM_STEP));
      if (e.key === "-")
        setScale((s) => Math.max(MIN_SCALE, s - ZOOM_STEP));
      if (e.key === "0") resetView();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose, resetView]);

  // Lock body scroll
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  // Wheel zoom towards cursor
  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
      e.preventDefault();
      const delta = e.deltaY > 0 ? -ZOOM_STEP : ZOOM_STEP;
      setScale((prev) => {
        const next = Math.min(MAX_SCALE, Math.max(MIN_SCALE, prev + delta));
        if (next === prev) return prev;
        // Zoom toward cursor position
        const rect = containerRef.current?.getBoundingClientRect();
        if (rect) {
          const cx = e.clientX - rect.left - rect.width / 2;
          const cy = e.clientY - rect.top - rect.height / 2;
          const factor = next / prev;
          setTranslate((t) => ({
            x: cx - factor * (cx - t.x),
            y: cy - factor * (cy - t.y),
          }));
        }
        return next;
      });
    },
    []
  );

  // Pan handlers
  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (e.button !== 0) return;
      // Only pan if zoomed in
      if (scale <= 1) return;
      setDragging(true);
      dragStart.current = { x: e.clientX, y: e.clientY };
      translateStart.current = { ...translate };
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    },
    [scale, translate]
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!dragging) return;
      setTranslate({
        x: translateStart.current.x + (e.clientX - dragStart.current.x),
        y: translateStart.current.y + (e.clientY - dragStart.current.y),
      });
    },
    [dragging]
  );

  const handlePointerUp = useCallback(() => {
    setDragging(false);
  }, []);

  // Click backdrop to close (only if not dragging and not zoomed)
  const handleBackdropClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.target === containerRef.current && scale <= 1) {
        onClose();
      }
    },
    [onClose, scale]
  );

  // Double-click to toggle zoom
  const handleDoubleClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      if (scale > 1) {
        resetView();
      } else {
        const rect = containerRef.current?.getBoundingClientRect();
        if (rect) {
          const cx = e.clientX - rect.left - rect.width / 2;
          const cy = e.clientY - rect.top - rect.height / 2;
          const nextScale = 2.5;
          const factor = nextScale / scale;
          setTranslate({
            x: cx - factor * cx,
            y: cy - factor * cy,
          });
          setScale(nextScale);
        }
      }
    },
    [scale, resetView]
  );

  const scalePercent = Math.round(scale * 100);

  const modalContent = (
    <div
      className="fixed inset-0 z-[9999] flex flex-col bg-black/95"
      role="dialog"
      aria-modal="true"
      aria-label="Image zoom preview"
    >
      {/* Toolbar */}
      <div className="flex shrink-0 items-center justify-between px-4 py-2 bg-black/60 backdrop-blur-sm border-b border-white/5">
        <span className="text-xs text-gray-400 truncate max-w-[40%]">{alt}</span>

        <div className="flex items-center gap-1">
          {/* Zoom out */}
          <button
            type="button"
            onClick={() => setScale((s) => Math.max(MIN_SCALE, s - ZOOM_STEP))}
            disabled={scale <= MIN_SCALE}
            className="rounded p-1.5 text-gray-300 hover:bg-white/10 disabled:opacity-30 transition-colors"
            aria-label="Zoom out"
            title="Zoom out (-)"
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="7" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
              <line x1="8" y1="11" x2="14" y2="11" />
            </svg>
          </button>

          {/* Scale indicator */}
          <button
            type="button"
            onClick={resetView}
            className="min-w-[52px] rounded px-2 py-1 text-center text-xs font-medium text-gray-200 hover:bg-white/10 transition-colors"
            title="Reset zoom (0)"
          >
            {scalePercent}%
          </button>

          {/* Zoom in */}
          <button
            type="button"
            onClick={() => setScale((s) => Math.min(MAX_SCALE, s + ZOOM_STEP))}
            disabled={scale >= MAX_SCALE}
            className="rounded p-1.5 text-gray-300 hover:bg-white/10 disabled:opacity-30 transition-colors"
            aria-label="Zoom in"
            title="Zoom in (+)"
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="7" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
              <line x1="11" y1="8" x2="11" y2="14" />
              <line x1="8" y1="11" x2="14" y2="11" />
            </svg>
          </button>

          {/* Separator */}
          <div className="mx-1 h-4 w-px bg-white/10" />

          {/* Close */}
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1.5 text-gray-300 hover:bg-white/10 transition-colors"
            aria-label="Close"
            title="Close (Esc)"
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
      </div>

      {/* Image area */}
      <div
        ref={containerRef}
        className="flex-1 flex items-center justify-center overflow-hidden select-none"
        style={{ cursor: scale > 1 ? (dragging ? "grabbing" : "grab") : "default" }}
        onClick={handleBackdropClick}
        onWheel={handleWheel}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
      >
        <img
          src={imageUrl}
          alt={alt}
          draggable={false}
          onDoubleClick={handleDoubleClick}
          className="max-h-full max-w-full object-contain transition-transform duration-100"
          style={{
            transform: `translate(${translate.x}px, ${translate.y}px) scale(${scale})`,
            transitionProperty: dragging ? "none" : "transform",
          }}
        />
      </div>

      {/* Bottom hint */}
      {scale <= 1 && (
        <div className="shrink-0 py-1.5 text-center text-[11px] text-gray-600">
          Scroll to zoom &middot; Double-click to zoom in &middot; Esc to close
        </div>
      )}
    </div>
  );

  return createPortal(modalContent, document.body);
}
