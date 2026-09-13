"use client";

/**
 * components/refs/FaceSelectModal.tsx
 *
 * Quando uma foto tem 2+ rostos detectados, força user a escolher qual é a
 * pessoa daquela aba. Story 01 — AC6.5, AC6.9.
 *
 * Renderiza imagem com bounding boxes numerados (1, 2, 3...) e ao clicar em
 * um, recorta automaticamente e devolve via onConfirm.
 *
 * Vocabulário 100% neutro (PRD §1.bis).
 */

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Loader2 } from "lucide-react";
import { faceSelectPrompt } from "@/lib/face/messages";
import { cropToFile, fileToImage } from "@/lib/face/loader";
import type { FaceBox } from "@/lib/face/quality";

interface Props {
  open: boolean;
  file: File;
  faces: FaceBox[];
  personLabel: string;
  onClose: () => void;
  onConfirm: (croppedFile: File, chosenIndex: number) => void;
}

export function FaceSelectModal({ open, file, faces, personLabel, onClose, onConfirm }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const [imgUrl, setImgUrl] = useState<string | null>(null);
  const [naturalSize, setNaturalSize] = useState<{ w: number; h: number } | null>(null);
  const [renderSize, setRenderSize] = useState<{ w: number; h: number } | null>(null);
  const [busyIdx, setBusyIdx] = useState<number | null>(null);

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
      .catch(() => onClose());
    return () => {
      revoked = true;
    };
  }, [open, file, onClose]);

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

  async function handlePick(idx: number) {
    if (!imgRef.current || !naturalSize) return;
    const face = faces[idx];
    if (!face) return;
    setBusyIdx(idx);
    try {
      const cropped = await cropToFile(imgRef.current, face, file.name, 0.3);
      onConfirm(cropped, idx);
    } finally {
      setBusyIdx(null);
    }
  }

  // Mostra apenas as 5 maiores (ordenadas no analyzeImage). Se tiver mais,
  // scroll horizontal abaixo da imagem com botões numerados extras.
  const visibleFaces = faces.slice(0, 5);
  const overflowFaces = faces.slice(5);

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
              <div>
                <h3 className="text-base font-semibold">{faceSelectPrompt(personLabel)}</h3>
                <p className="text-xs text-[var(--muted)] mt-0.5">
                  Mais de uma pessoa nessa foto. Toque na que é {personLabel}.
                </p>
              </div>
              <button
                onClick={onClose}
                aria-label="Fechar"
                className="w-8 h-8 rounded-lg hover:bg-[var(--background-elev-2)] flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div ref={containerRef} className="flex-1 overflow-auto p-4 flex items-center justify-center bg-[var(--background-elev-2)]">
              {imgUrl && naturalSize && renderSize ? (
                <div
                  className="relative select-none"
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
                  {visibleFaces.map((face, idx) => {
                    const scale = renderSize.w / naturalSize.w;
                    const x = face.x * scale;
                    const y = face.y * scale;
                    const w = face.width * scale;
                    const h = face.height * scale;
                    const busy = busyIdx === idx;
                    return (
                      <button
                        key={idx}
                        onClick={() => handlePick(idx)}
                        disabled={busyIdx !== null}
                        className="absolute border-2 border-[var(--primary)] bg-[var(--primary)]/10 hover:bg-[var(--primary)]/25 transition rounded-md flex items-start justify-start"
                        style={{ left: x, top: y, width: w, height: h }}
                        aria-label={`Escolher rosto ${idx + 1}`}
                      >
                        <span className="m-1 inline-flex items-center justify-center w-7 h-7 rounded-full bg-[var(--primary)] text-white text-xs font-bold shadow">
                          {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : idx + 1}
                        </span>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="flex items-center gap-2 text-sm text-[var(--muted)]">
                  <Loader2 className="w-4 h-4 animate-spin" /> Carregando foto...
                </div>
              )}
            </div>

            {overflowFaces.length > 0 && (
              <div className="px-4 py-2 border-t border-[var(--border)] flex gap-2 overflow-x-auto">
                <span className="text-xs text-[var(--muted)] self-center shrink-0">Mais rostos:</span>
                {overflowFaces.map((_, i) => {
                  const idx = i + 5;
                  return (
                    <button
                      key={idx}
                      onClick={() => handlePick(idx)}
                      disabled={busyIdx !== null}
                      className="shrink-0 w-8 h-8 rounded-full bg-[var(--primary)] text-white text-xs font-bold"
                    >
                      {idx + 1}
                    </button>
                  );
                })}
              </div>
            )}

            <div className="px-4 py-3 border-t border-[var(--border)] text-xs text-[var(--muted)]">
              A foto original continua salva — só recortamos a pessoa escolhida pra usar como referência.
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
