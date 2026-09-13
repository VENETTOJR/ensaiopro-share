"use client";

/**
 * components/refs/FaceCropModal.tsx
 *
 * Modal de recorte de foto com bounding box arrastável.
 * Story 01 — AC6.4.
 *
 * Fluxo:
 *   1. Recebe File original + bounding box sugerido (já vindo do detector)
 *   2. Renderiza imagem em canvas + overlay com box arrastável/redimensionável
 *   3. User confirma → gera novo File JPEG via lib/face/loader#cropToFile
 *   4. Caller decide se substitui ref original ou adiciona como nova
 *
 * Vocabulário 100% neutro (PRD §1.bis).
 */

import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Check, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { CROP_CTA_TEXT } from "@/lib/face/messages";
import { cropToFile, fileToImage } from "@/lib/face/loader";
import type { FaceBox } from "@/lib/face/quality";

interface Props {
  open: boolean;
  file: File;
  /** Bounding box sugerido (em pixels da imagem original). Pode ser null. */
  suggestedBox?: FaceBox | null;
  onClose: () => void;
  onConfirm: (croppedFile: File) => void;
}

interface BoxState {
  x: number;
  y: number;
  width: number;
  height: number;
}

export function FaceCropModal({ open, file, suggestedBox, onClose, onConfirm }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const [imgUrl, setImgUrl] = useState<string | null>(null);
  const [naturalSize, setNaturalSize] = useState<{ w: number; h: number } | null>(null);
  const [renderSize, setRenderSize] = useState<{ w: number; h: number } | null>(null);
  /** Override manual do user (drag/resize). Se null, renderiza `initialBox`. */
  const [boxOverride, setBoxOverride] = useState<BoxState | null>(null);
  const [busy, setBusy] = useState(false);
  const [drag, setDrag] = useState<
    | null
    | { mode: "move"; startX: number; startY: number; origBox: BoxState }
    | { mode: "resize"; startX: number; startY: number; origBox: BoxState }
  >(null);

  // Carrega imagem ao abrir
  useEffect(() => {
    if (!open) return;
    let revoked = false;
    fileToImage(file)
      .then((img) => {
        if (revoked) {
          URL.revokeObjectURL(img.src);
          return;
        }
        imgRef.current = img;
        setImgUrl(img.src);
        setNaturalSize({ w: img.naturalWidth, h: img.naturalHeight });
      })
      .catch(() => {
        // Falha silenciosa — fecha modal
        onClose();
      });
    return () => {
      revoked = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, file]);

  // Recalcula renderSize quando container monta + naturalSize chega
  useEffect(() => {
    if (!naturalSize) return;
    const compute = () => {
      const el = containerRef.current;
      if (!el) return;
      const maxW = el.clientWidth;
      const maxH = Math.min(window.innerHeight - 240, 600);
      const ratio = naturalSize.w / naturalSize.h;
      let w = maxW;
      let h = w / ratio;
      if (h > maxH) {
        h = maxH;
        w = h * ratio;
      }
      setRenderSize({ w: Math.round(w), h: Math.round(h) });
    };
    compute();
    window.addEventListener("resize", compute);
    return () => window.removeEventListener("resize", compute);
  }, [naturalSize]);

  // Box inicial derivado — sem setState em effect (react-hooks/set-state-in-effect).
  const initialBox = useMemo<BoxState | null>(() => {
    if (!renderSize || !naturalSize) return null;
    const scale = renderSize.w / naturalSize.w;
    if (suggestedBox) {
      return {
        x: suggestedBox.x * scale,
        y: suggestedBox.y * scale,
        width: suggestedBox.width * scale,
        height: suggestedBox.height * scale,
      };
    }
    const side = Math.min(renderSize.w, renderSize.h) * 0.5;
    return {
      x: (renderSize.w - side) / 2,
      y: (renderSize.h - side) / 2,
      width: side,
      height: side,
    };
  }, [renderSize, naturalSize, suggestedBox]);

  // Reset override quando initialBox muda (render/suggested mudou). Padrão
  // "derived state during render" do React — NÃO usar useEffect aqui.
  const lastInitialRef = useRef<BoxState | null>(null);
  if (lastInitialRef.current !== initialBox) {
    lastInitialRef.current = initialBox;
    if (boxOverride !== null) {
      // setState durante render é aceitável quando reseta por mudança de identity
      // e não dispara cascata (estado derivado).
      setBoxOverride(null);
    }
  }

  const box: BoxState | null = boxOverride ?? initialBox;
  const setBox = setBoxOverride;

  // Drag handlers globais
  useEffect(() => {
    if (!drag || !box || !renderSize) return;
    const onMove = (ev: MouseEvent | TouchEvent) => {
      const point = "touches" in ev ? ev.touches[0] : ev;
      if (!point) return;
      const dx = point.clientX - drag.startX;
      const dy = point.clientY - drag.startY;
      if (drag.mode === "move") {
        const nx = clamp(drag.origBox.x + dx, 0, renderSize.w - drag.origBox.width);
        const ny = clamp(drag.origBox.y + dy, 0, renderSize.h - drag.origBox.height);
        setBox({ ...drag.origBox, x: nx, y: ny });
      } else {
        // resize: arrastar canto SE (mantém quadrado)
        const delta = Math.max(dx, dy);
        const newSide = clamp(
          drag.origBox.width + delta,
          40,
          Math.min(renderSize.w - drag.origBox.x, renderSize.h - drag.origBox.y)
        );
        setBox({ ...drag.origBox, width: newSide, height: newSide });
      }
    };
    const onUp = () => setDrag(null);
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    window.addEventListener("touchmove", onMove, { passive: false });
    window.addEventListener("touchend", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
      window.removeEventListener("touchmove", onMove);
      window.removeEventListener("touchend", onUp);
    };
  }, [drag, box, renderSize, setBox]);

  async function handleConfirm() {
    if (!box || !naturalSize || !renderSize || !imgRef.current) return;
    setBusy(true);
    try {
      const scale = naturalSize.w / renderSize.w;
      const realBox = {
        x: box.x * scale,
        y: box.y * scale,
        width: box.width * scale,
        height: box.height * scale,
      };
      const cropped = await cropToFile(imgRef.current, realBox, file.name, 0.0);
      onConfirm(cropped);
    } finally {
      setBusy(false);
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.95, y: 16 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.95, y: 16 }}
            transition={{ type: "spring", stiffness: 320, damping: 28 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-[var(--background-elev)] border border-[var(--border)] rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col"
          >
            <div className="flex items-center justify-between p-4 border-b border-[var(--border)]">
              <h3 className="text-base font-semibold">{CROP_CTA_TEXT}</h3>
              <button
                onClick={onClose}
                aria-label="Fechar"
                className="w-8 h-8 rounded-lg hover:bg-[var(--background-elev-2)] flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div ref={containerRef} className="flex-1 overflow-auto p-4 flex items-center justify-center bg-[var(--background-elev-2)]">
              {imgUrl && renderSize && box ? (
                <div
                  className="relative select-none touch-none"
                  style={{ width: renderSize.w, height: renderSize.h }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={imgUrl}
                    alt=""
                    draggable={false}
                    width={renderSize.w}
                    height={renderSize.h}
                    style={{ width: renderSize.w, height: renderSize.h, objectFit: "cover" }}
                    className="rounded-lg"
                  />
                  {/* Overlay escurecendo fora do box */}
                  <svg
                    className="absolute inset-0 pointer-events-none"
                    width={renderSize.w}
                    height={renderSize.h}
                  >
                    <defs>
                      <mask id="crop-mask">
                        <rect width={renderSize.w} height={renderSize.h} fill="white" />
                        <rect
                          x={box.x}
                          y={box.y}
                          width={box.width}
                          height={box.height}
                          fill="black"
                        />
                      </mask>
                    </defs>
                    <rect
                      width={renderSize.w}
                      height={renderSize.h}
                      fill="rgba(0,0,0,0.55)"
                      mask="url(#crop-mask)"
                    />
                  </svg>
                  {/* Box */}
                  <div
                    onMouseDown={(e) => {
                      setDrag({
                        mode: "move",
                        startX: e.clientX,
                        startY: e.clientY,
                        origBox: box,
                      });
                    }}
                    onTouchStart={(e) => {
                      const t = e.touches[0];
                      setDrag({
                        mode: "move",
                        startX: t.clientX,
                        startY: t.clientY,
                        origBox: box,
                      });
                    }}
                    className={cn(
                      "absolute border-2 border-white shadow-[0_0_0_1px_rgba(0,0,0,0.5)] cursor-move",
                      "rounded-md"
                    )}
                    style={{
                      left: box.x,
                      top: box.y,
                      width: box.width,
                      height: box.height,
                    }}
                  >
                    {/* Handle SE */}
                    <div
                      onMouseDown={(e) => {
                        e.stopPropagation();
                        setDrag({
                          mode: "resize",
                          startX: e.clientX,
                          startY: e.clientY,
                          origBox: box,
                        });
                      }}
                      onTouchStart={(e) => {
                        e.stopPropagation();
                        const t = e.touches[0];
                        setDrag({
                          mode: "resize",
                          startX: t.clientX,
                          startY: t.clientY,
                          origBox: box,
                        });
                      }}
                      className="absolute right-0 bottom-0 translate-x-1/2 translate-y-1/2 w-4 h-4 bg-white border-2 border-[var(--primary)] rounded-sm cursor-se-resize"
                    />
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-sm text-[var(--muted)]">
                  <Loader2 className="w-4 h-4 animate-spin" /> Carregando foto...
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 p-4 border-t border-[var(--border)]">
              <button onClick={onClose} className="btn btn-ghost btn-sm" disabled={busy}>
                Cancelar
              </button>
              <button
                onClick={handleConfirm}
                disabled={busy || !box}
                className="btn btn-primary btn-sm"
              >
                {busy ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> Salvando...
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" /> Usar este recorte
                  </>
                )}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v));
}
