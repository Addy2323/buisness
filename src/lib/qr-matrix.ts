import QRCode from "qrcode";

/**
 * Real, scannable QR matrix generated with the `qrcode` library
 * (Level H error correction). Pure isomorphic function safe for both
 * Node.js server routes and browser client components.
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
  const cleanUrl = url && url.trim().length > 0 ? url.trim() : "https://hezlon.lumo.co.tz/hezlon";
  const cached = matrixCache.get(cleanUrl);
  if (cached) return cached;

  const qr = QRCode.create(cleanUrl, { errorCorrectionLevel: "H" });
  const size = qr.modules.size;
  const data = qr.modules.data;
  const isDark = (row: number, col: number) => Boolean(data[row * size + col]);

  let path = "";
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (isDark(r, c)) path += `M${c} ${r}h1v1h-1z`;
    }
  }

  const matrix: QrMatrix = { url: cleanUrl, size, path, isDark };
  matrixCache.set(cleanUrl, matrix);
  return matrix;
}

