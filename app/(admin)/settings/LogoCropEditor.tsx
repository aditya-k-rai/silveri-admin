"use client";

/**
 * Interactive square-crop editor for the website logo. Admin picks a file
 * (PNG/JPG/SVG/WebP), positions and resizes a square crop region over the
 * source image, then applies — we export the crop to a fixed-size PNG data
 * URL ready to drop into Firestore (siteSettings.logo).
 *
 * Pure DOM/canvas, no external dependency. Supports mouse + touch.
 */

import { useEffect, useMemo, useRef, useState } from "react";
import { Check, X, Maximize2 } from "lucide-react";

const STAGE_SIZE = 420; // px — square viewport the source image is fit into
const DEFAULT_OUTPUT = 320; // exported logo dimensions, in px

interface Props {
  file: File;
  outputSize?: number;
  onCancel: () => void;
  onApply: (dataUrl: string) => void;
}

interface Crop {
  x: number;
  y: number;
  size: number;
}

export default function LogoCropEditor({ file, outputSize = DEFAULT_OUTPUT, onCancel, onApply }: Props) {
  // Derive the object URL from the file — useMemo (not useEffect+setState) so
  // we don't trip React 19's set-state-in-effect rule.
  const imgUrl = useMemo(() => URL.createObjectURL(file), [file]);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const [natural, setNatural] = useState<{ w: number; h: number } | null>(null);
  const [display, setDisplay] = useState<{ w: number; h: number }>({ w: 0, h: 0 });
  const [crop, setCrop] = useState<Crop>({ x: 0, y: 0, size: 0 });

  // Drag state — captured offset of pointer inside the crop box
  const dragRef = useRef<{ offsetX: number; offsetY: number } | null>(null);

  // Cleanup-only effect: revoke the object URL when this editor unmounts or
  // the source file changes. No setState in the body.
  useEffect(() => () => URL.revokeObjectURL(imgUrl), [imgUrl]);

  // Once the rendered <img> finishes loading, measure it and seed a centered
  // square crop. The handler runs from a DOM event, not synchronously during
  // render, so setState here is allowed.
  const onImgLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    const scale = Math.min(STAGE_SIZE / img.naturalWidth, STAGE_SIZE / img.naturalHeight, 1);
    const w = Math.max(1, Math.round(img.naturalWidth * scale));
    const h = Math.max(1, Math.round(img.naturalHeight * scale));
    const size = Math.min(w, h);
    setNatural({ w: img.naturalWidth, h: img.naturalHeight });
    setDisplay({ w, h });
    setCrop({ x: Math.round((w - size) / 2), y: Math.round((h - size) / 2), size });
  };

  // Maximum allowed crop size — never larger than the smaller image dimension
  const maxCropSize = useMemo(() => {
    if (!display.w || !display.h) return 0;
    return Math.min(display.w, display.h);
  }, [display.w, display.h]);

  const handleSizeChange = (next: number) => {
    setCrop((prev) => {
      const size = Math.max(32, Math.min(next, maxCropSize));
      // Re-clamp position so the resized box stays inside the image
      const x = Math.max(0, Math.min(prev.x, display.w - size));
      const y = Math.max(0, Math.min(prev.y, display.h - size));
      return { x, y, size };
    });
  };

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    const rect = e.currentTarget.getBoundingClientRect();
    dragRef.current = {
      offsetX: e.clientX - rect.left,
      offsetY: e.clientY - rect.top,
    };
  };

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragRef.current) return;
    // Translate pointer into stage-image coordinates
    const stage = e.currentTarget.parentElement?.getBoundingClientRect();
    if (!stage) return;
    const x = e.clientX - stage.left - dragRef.current.offsetX;
    const y = e.clientY - stage.top - dragRef.current.offsetY;
    setCrop((prev) => ({
      ...prev,
      x: Math.max(0, Math.min(x, display.w - prev.size)),
      y: Math.max(0, Math.min(y, display.h - prev.size)),
    }));
  };

  const onPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
    dragRef.current = null;
  };

  const handleApply = () => {
    if (!natural || !crop.size) return;
    // Scale crop from displayed coords back to natural-image coords
    const scale = natural.w / display.w;
    const sx = crop.x * scale;
    const sy = crop.y * scale;
    const sSize = crop.size * scale;

    const canvas = document.createElement("canvas");
    canvas.width = outputSize;
    canvas.height = outputSize;
    const ctx = canvas.getContext("2d");
    if (!ctx || !imgRef.current) return;
    // Slight smoothing — important when scaling up small logos
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(imgRef.current, sx, sy, sSize, sSize, 0, 0, outputSize, outputSize);
    // PNG preserves transparency for logos
    onApply(canvas.toDataURL("image/png"));
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/55 p-4" role="dialog" aria-modal="true">
      <div className="bg-white rounded-2xl shadow-xl max-w-[480px] w-full p-5 md:p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-[family-name:var(--font-heading)] text-lg font-semibold">Crop & Resize Logo</h3>
            <p className="text-xs text-[#7A7585] mt-0.5">Drag to position. Use the slider to adjust the crop size.</p>
          </div>
          <button
            onClick={onCancel}
            className="w-8 h-8 rounded-full hover:bg-[#FDFAF5] flex items-center justify-center"
            aria-label="Close"
          >
            <X size={18} className="text-[#7A7585]" />
          </button>
        </div>

        {/* Stage */}
        <div
          className="relative mx-auto bg-[#F4F2EE] rounded-xl overflow-hidden flex items-center justify-center"
          style={{ width: STAGE_SIZE, height: STAGE_SIZE, maxWidth: "100%" }}
        >
          {/* Source image. Rendered at intrinsic size until onLoad measures
              it and we switch to the computed display dimensions. */}
          {imgUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              ref={imgRef}
              src={imgUrl}
              alt="Logo source"
              draggable={false}
              onLoad={onImgLoad}
              style={
                display.w
                  ? { width: display.w, height: display.h, userSelect: "none" }
                  : { maxWidth: STAGE_SIZE, maxHeight: STAGE_SIZE, userSelect: "none" }
              }
              className="select-none pointer-events-none block"
            />
          )}

          {/* Dimmed mask + crop window. Container is positioned over the image. */}
          {display.w > 0 && (
            <div
              className="absolute"
              style={{
                width: display.w,
                height: display.h,
                // Center inside stage just like the <img> is
                top: (STAGE_SIZE - display.h) / 2,
                left: (STAGE_SIZE - display.w) / 2,
              }}
            >
              {/* The dimmed outside via 4 boxes around the crop region */}
              <div
                className="absolute inset-0 pointer-events-none"
                style={{
                  background: `linear-gradient(rgba(0,0,0,0.45), rgba(0,0,0,0.45))`,
                  clipPath: `polygon(
                    0 0, 100% 0, 100% 100%, 0 100%, 0 0,
                    ${crop.x}px ${crop.y}px,
                    ${crop.x}px ${crop.y + crop.size}px,
                    ${crop.x + crop.size}px ${crop.y + crop.size}px,
                    ${crop.x + crop.size}px ${crop.y}px,
                    ${crop.x}px ${crop.y}px
                  )`,
                }}
              />
              {/* Draggable crop window */}
              <div
                onPointerDown={onPointerDown}
                onPointerMove={onPointerMove}
                onPointerUp={onPointerUp}
                onPointerCancel={onPointerUp}
                className="absolute border-2 border-white shadow-[0_0_0_1px_rgba(0,0,0,0.35)] cursor-move touch-none"
                style={{
                  left: crop.x,
                  top: crop.y,
                  width: crop.size,
                  height: crop.size,
                }}
              >
                {/* Subtle rule-of-thirds guides */}
                <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 pointer-events-none">
                  {Array.from({ length: 9 }).map((_, i) => (
                    <div key={i} className="border border-white/30" />
                  ))}
                </div>
                {/* Corner handles (decorative — full square is the resize source) */}
                {(["tl", "tr", "bl", "br"] as const).map((c) => (
                  <span
                    key={c}
                    className="absolute w-2.5 h-2.5 bg-white border border-[#C9A84C] rounded-sm"
                    style={{
                      top: c.startsWith("t") ? -5 : "auto",
                      bottom: c.startsWith("b") ? -5 : "auto",
                      left: c.endsWith("l") ? -5 : "auto",
                      right: c.endsWith("r") ? -5 : "auto",
                    }}
                  />
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Size slider */}
        <div className="mt-5">
          <label className="flex items-center justify-between text-xs font-medium text-[#7A7585] mb-2">
            <span className="inline-flex items-center gap-1.5">
              <Maximize2 size={12} /> Crop size
            </span>
            <span>{crop.size} × {crop.size} px (export {outputSize}×{outputSize})</span>
          </label>
          <input
            type="range"
            min={32}
            max={maxCropSize || 320}
            step={1}
            value={crop.size}
            onChange={(e) => handleSizeChange(Number(e.target.value))}
            className="w-full accent-[#C9A84C]"
          />
        </div>

        <div className="flex items-center gap-3 mt-5">
          <button
            onClick={onCancel}
            className="px-4 py-2.5 border border-[#E8E8E8] rounded-xl text-sm font-medium hover:bg-[#FDFAF5] transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleApply}
            disabled={!natural || !crop.size}
            className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-[#C9A84C] text-white text-sm font-medium rounded-xl hover:bg-[#8A6E2F] transition-colors disabled:opacity-50"
          >
            <Check size={16} /> Apply Crop
          </button>
        </div>
      </div>
    </div>
  );
}
