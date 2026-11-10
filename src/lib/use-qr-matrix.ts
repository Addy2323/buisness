"use client";

import { useEffect, useState } from "react";
import { buildQrMatrix, QrMatrix } from "./qr-matrix";

export type { QrMatrix };
export { buildQrMatrix };

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
