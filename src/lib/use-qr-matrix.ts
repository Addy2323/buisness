"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";

/**
 * Real, scannable QR matrix generated with the `qrcode` library
 * (Level H error correction). Used by every on-screen card renderer so the
 * QR shown in the studio is identical to the one exported for printing.
 */
export interface QrMatrix {
  url: string;
  size: number;
  /** SVG path ("M x y h1 v1 h-1 z ...") covering every dark module. */
  path: string;
  isDark: (row: number, col: number) => boolean;
}

const matrixCache = new Map<string, QrMatrix>();

export function buildQrMatrix(url: string): QrMatrix {
  const cached = matrixCache.get(url);
  if (cached) return cached;

  const qr = QRCode.create(url, { errorCorrectionLevel: "H" });
  const size = qr.modules.size;
  const data = qr.modules.data;
  const isDark = (row: number, col: number) => Boolean(data[row * size + col]);

  let path = "";
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (isDark(r, c)) path += `M${c} ${r}h1v1h-1z`;
    }
  }

  const matrix: QrMatrix = { url, size, path, isDark };
  matrixCache.set(url, matrix);
  return matrix;
}

function getInitialBrowserUrl(): string {
  if (typeof window !== "undefined" && window.location?.origin) {
    return `${window.location.origin}/hezlon`;
  }
  return "https://hezlon.lumo.co.tz/hezlon";
}

let destinationPromise: Promise<string> | null = null;

function fetchDestinationUrl(): Promise<string> {
  if (!destinationPromise) {
    destinationPromise = fetch("/api/admin/qr/destination")
      .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
      .then((d: { destinationUrl: string }) => d.destinationUrl)
      .catch(() => {
        destinationPromise = null;
        return getInitialBrowserUrl();
      });
  }
  return destinationPromise;
}

/** Returns the real QR matrix for the permanent HEZLON profile URL. */
export function usePermanentQrMatrix(): QrMatrix {
  const [matrix, setMatrix] = useState<QrMatrix>(() =>
    buildQrMatrix(getInitialBrowserUrl())
  );

  useEffect(() => {
    let active = true;
    fetchDestinationUrl().then((url) => {
      if (active && url) {
        setMatrix(buildQrMatrix(url));
      }
    });
    return () => {
      active = false;
    };
  }, []);

  return matrix;
}
