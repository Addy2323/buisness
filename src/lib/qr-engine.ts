import QRCodeLib from "qrcode";
import jsQR from "jsqr";
import sharp from "sharp";

export interface QRGenerationOptions {
  url: string;
  foregroundColor?: string;
  backgroundColor?: string;
  accentFrameColor?: string;
  errorCorrectionLevel?: "L" | "M" | "Q" | "H";
  marginModules?: number;
  sizePx?: number;
  includeCenterLogo?: boolean;
  centerLogoText?: string;
}

export async function generatePermanentQrSvg(
  options: QRGenerationOptions
): Promise<string> {
  const fg = options.foregroundColor || "#0D2B22";
  const bg = options.backgroundColor || "#FFFFFF";
  const accent = options.accentFrameColor || "#C9A96E";
  const ecl = options.errorCorrectionLevel || "H";
  const margin = options.marginModules ?? 4;

  const rawSvg = await QRCodeLib.toString(options.url, {
    type: "svg",
    errorCorrectionLevel: ecl,
    margin,
    color: {
      dark: fg,
      light: bg,
    },
  });

  if (!options.includeCenterLogo) {
    return rawSvg;
  }

  // Optional small emblem (kept within 15% area so Level H 30% error correction remains scannable)
  const logoChar = (options.centerLogoText || "H").slice(0, 2).toUpperCase();
  const viewBoxMatch = rawSvg.match(/viewBox="0 0 (\d+) (\d+)"/);
  const vbSize = viewBoxMatch ? parseFloat(viewBoxMatch[1]) : 45;
  const badgeSize = vbSize * 0.16;
  const badgeXY = (vbSize - badgeSize) / 2;
  const center = vbSize / 2;

  const overlay = `
    <g>
      <rect x="${badgeXY.toFixed(2)}" y="${badgeXY.toFixed(2)}" width="${badgeSize.toFixed(2)}" height="${badgeSize.toFixed(2)}" rx="${(badgeSize * 0.18).toFixed(2)}" fill="${bg}" stroke="${accent}" stroke-width="${(vbSize * 0.012).toFixed(2)}" />
      <rect x="${(badgeXY + badgeSize * 0.08).toFixed(2)}" y="${(badgeXY + badgeSize * 0.08).toFixed(2)}" width="${(badgeSize * 0.84).toFixed(2)}" height="${(badgeSize * 0.84).toFixed(2)}" rx="${(badgeSize * 0.12).toFixed(2)}" fill="${fg}" />
      <text x="${center.toFixed(2)}" y="${(center + badgeSize * 0.24).toFixed(2)}" text-anchor="middle" fill="${accent}" font-family="Georgia, serif" font-weight="bold" font-size="${(badgeSize * 0.56).toFixed(2)}">${logoChar}</text>
    </g>
  </svg>`;

  return rawSvg.replace("</svg>", overlay);
}

export async function generatePermanentQrDataUrl(
  options: QRGenerationOptions
): Promise<string> {
  const fg = options.foregroundColor || "#0D2B22";
  const bg = options.backgroundColor || "#FFFFFF";
  const ecl = options.errorCorrectionLevel || "H";
  const margin = options.marginModules ?? 4;
  const width = options.sizePx || 1024;

  return await QRCodeLib.toDataURL(options.url, {
    errorCorrectionLevel: ecl,
    margin,
    width,
    color: {
      dark: fg,
      light: bg,
    },
  });
}

export async function generatePermanentQrBuffer(
  options: QRGenerationOptions
): Promise<Buffer> {
  const fg = options.foregroundColor || "#0D2B22";
  const bg = options.backgroundColor || "#FFFFFF";
  const ecl = options.errorCorrectionLevel || "H";
  const margin = options.marginModules ?? 4;
  const width = options.sizePx || 1024;

  return await QRCodeLib.toBuffer(options.url, {
    errorCorrectionLevel: ecl,
    margin,
    width,
    color: {
      dark: fg,
      light: bg,
    },
  });
}

/**
 * Optically decodes a PNG QR code buffer using sharp + jsQR to verify camera scannability
 * and confirm the encoded destination URL.
 */
export async function decodeQrFromPngBuffer(
  pngBuffer: Buffer
): Promise<string | null> {
  const { data, info } = await sharp(pngBuffer)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const clamped = new Uint8ClampedArray(data.buffer, data.byteOffset, data.byteLength);
  const decoded = jsQR(clamped, info.width, info.height);
  return decoded ? decoded.data : null;
}

// Compute contrast ratio between QR foreground and background for scannability check
export function checkColorContrast(hex1: string, hex2: string): number {
  const getLuminance = (hex: string) => {
    const clean = hex.replace("#", "").trim();
    const full =
      clean.length === 3
        ? clean
            .split("")
            .map((c) => c + c)
            .join("")
        : clean.padEnd(6, "0");
    const r = parseInt(full.slice(0, 2), 16) / 255;
    const g = parseInt(full.slice(2, 4), 16) / 255;
    const b = parseInt(full.slice(4, 6), 16) / 255;
    const toLinear = (c: number) =>
      c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    return (
      0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b)
    );
  };

  const l1 = getLuminance(hex1);
  const l2 = getLuminance(hex2);
  const brightest = Math.max(l1, l2);
  const darkest = Math.min(l1, l2);
  return Number(((brightest + 0.05) / (darkest + 0.05)).toFixed(2));
}
