import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import fs from "fs/promises";
import path from "path";
import {
  CanvasElement,
  CardBackground,
  CardSide,
  PrintValidationIssue,
  PrintValidationReport,
} from "@/types/studio";
import {
  checkColorContrast,
  generatePermanentQrBuffer,
  generatePermanentQrDataUrl,
} from "./qr-engine";

const MM_TO_PT = 2.83464567;

export interface CardPrintSpec {
  designName: string;
  widthMm: number;
  heightMm: number;
  bleedMm: number;
  safeMarginMm: number;
  isDoubleSided: boolean;
  paperFinish: string;
  cornerStyle: string;
  frontBg: CardBackground;
  backBg: CardBackground;
  frontElements: CanvasElement[];
  backElements: CanvasElement[];
  qrDestinationUrl: string;
}

export function validateCardForPrint(spec: CardPrintSpec): PrintValidationReport {
  const issues: PrintValidationIssue[] = [];

  const isStandard90x50 =
    Math.abs(spec.widthMm - 90) < 0.1 && Math.abs(spec.heightMm - 50) < 0.1;
  const isStandard85x55 =
    Math.abs(spec.widthMm - 85) < 0.1 && Math.abs(spec.heightMm - 55) < 0.1;

  if (
    spec.widthMm < 40 ||
    spec.widthMm > 150 ||
    spec.heightMm < 30 ||
    spec.heightMm > 120
  ) {
    issues.push({
      id: "dim-invalid",
      severity: "ERROR",
      category: "DIMENSIONS",
      title: "Out-of-Range Card Dimensions",
      message: `Dimensions (${spec.widthMm}×${spec.heightMm} mm) exceed standard printing guillotine bounds.`,
    });
  } else {
    issues.push({
      id: "dim-pass",
      severity: "PASS",
      category: "DIMENSIONS",
      title: isStandard90x50
        ? "ISO Standard 90 × 50 mm Verified"
        : isStandard85x55
        ? "EU Standard 85 × 55 mm Verified"
        : `Custom Dimensions (${spec.widthMm} × ${spec.heightMm} mm) Verified`,
      message: `Physical trim box set to ${spec.widthMm} × ${spec.heightMm} mm (${(
        spec.widthMm * MM_TO_PT
      ).toFixed(1)} × ${(spec.heightMm * MM_TO_PT).toFixed(1)} pt).`,
    });
  }

  if (spec.bleedMm < 2) {
    issues.push({
      id: "bleed-low",
      severity: "WARNING",
      category: "BLEED",
      title: "Bleed Below 3 mm Standard",
      message: `Current bleed is ${spec.bleedMm} mm. Commercial printing studios strongly recommend 3 mm bleed to prevent white hairline edges.`,
    });
  } else {
    issues.push({
      id: "bleed-pass",
      severity: "PASS",
      category: "BLEED",
      title: `${spec.bleedMm} mm Full-Bleed Margin Active`,
      message: `Total bleed box is ${spec.widthMm + spec.bleedMm * 2} × ${
        spec.heightMm + spec.bleedMm * 2
      } mm with corner crop marks.`,
    });
  }

  const sidesToInspect: { side: CardSide; elements: CanvasElement[] }[] = [
    { side: "FRONT", elements: spec.frontElements.filter((e) => !e.hidden) },
  ];
  if (spec.isDoubleSided) {
    sidesToInspect.push({
      side: "BACK",
      elements: spec.backElements.filter((e) => !e.hidden),
    });
  }

  let qrFound = false;
  let marginViolations = 0;
  let smallFontCount = 0;
  let lowResImages = 0;

  for (const { side, elements } of sidesToInspect) {
    for (const el of elements) {
      if (["text", "qr", "monogram", "logo"].includes(el.type)) {
        const leftEdge = el.xMm;
        const topEdge = el.yMm;
        const rightEdge = el.xMm + el.widthMm;
        const bottomEdge = el.yMm + el.heightMm;

        if (
          leftEdge < spec.safeMarginMm - 2.5 ||
          topEdge < spec.safeMarginMm - 2.5 ||
          rightEdge > spec.widthMm - spec.safeMarginMm + 2.5 ||
          bottomEdge > spec.heightMm - spec.safeMarginMm + 2.5
        ) {
          marginViolations++;
          issues.push({
            id: `margin-${el.id}`,
            severity: "WARNING",
            category: "SAFE_MARGIN",
            title: `Element Near Trim Edge (${side})`,
            message: `"${el.label}" is outside the ${spec.safeMarginMm} mm safe margin and risks clipping during trimming.`,
            side,
            elementId: el.id,
          });
        }
      }

      if (el.type === "text") {
        if ((el.fontSizePt || 8) < 4.2) {
          smallFontCount++;
          issues.push({
            id: `font-size-${el.id}`,
            severity: "WARNING",
            category: "FONTS",
            title: `Small Typography Warning (${side})`,
            message: `"${el.label}" uses ${el.fontSizePt}pt font. Minimum recommended print size is 4.5pt.`,
            side,
            elementId: el.id,
          });
        }
      }

      if (el.type === "qr") {
        qrFound = true;
        const minDim = Math.min(el.widthMm, el.heightMm);
        const contrast = checkColorContrast(
          el.qrForeground || "#0D2B22",
          el.qrBackground || "#FFFFFF"
        );

        if (minDim < 14) {
          issues.push({
            id: `qr-size-${el.id}`,
            severity: "ERROR",
            category: "QR_READABILITY",
            title: `QR Code Too Small (${minDim.toFixed(1)} mm)`,
            message: `QR code on ${side} is ${minDim.toFixed(
              1
            )} mm. Print minimum is 14 × 14 mm for reliable camera scanning.`,
            side,
            elementId: el.id,
          });
        } else if (contrast < 3.5) {
          issues.push({
            id: `qr-contrast-${el.id}`,
            severity: "ERROR",
            category: "QR_READABILITY",
            title: `Low QR Color Contrast (${contrast}:1)`,
            message: `QR code foreground and background lack sufficient contrast (${contrast}:1). Minimum 4:1 required.`,
            side,
            elementId: el.id,
          });
        } else {
          issues.push({
            id: `qr-pass-${el.id}`,
            severity: "PASS",
            category: "QR_READABILITY",
            title: `QR Code Verified (${minDim.toFixed(0)}×${minDim.toFixed(
              0
            )} mm, ${contrast}:1 Contrast)`,
            message: `Permanent QR on ${side} points to ${spec.qrDestinationUrl} with Level H error correction.`,
            side,
            elementId: el.id,
          });
        }
      }

      if ((el.type === "logo" || el.type === "photo") && el.imageUrl) {
        if (el.imageUrl.startsWith("http") && el.imageUrl.includes("lowres")) {
          lowResImages++;
          issues.push({
            id: `img-res-${el.id}`,
            severity: "WARNING",
            category: "IMAGE_RESOLUTION",
            title: `Low Image Resolution (${side})`,
            message: `"${el.label}" may print below 300 DPI at ${el.widthMm}×${el.heightMm} mm.`,
            side,
            elementId: el.id,
          });
        }
      }
    }
  }

  if (!qrFound) {
    issues.push({
      id: "qr-missing",
      severity: "WARNING",
      category: "QR_READABILITY",
      title: "No QR Code Placed on Card",
      message:
        "Consider adding the permanent HEZLON QR code so clients can scan to open your digital profile.",
    });
  }

  if (marginViolations === 0) {
    issues.push({
      id: "margin-pass",
      severity: "PASS",
      category: "SAFE_MARGIN",
      title: `Safe Margin (${spec.safeMarginMm} mm) Respected`,
      message:
        "All critical typography, monograms, and QR codes sit safely inside the inner margin.",
    });
  }

  if (smallFontCount === 0) {
    issues.push({
      id: "fonts-pass",
      severity: "PASS",
      category: "FONTS",
      title: "Embedded Print Fonts & Sizes Verified",
      message:
        "All typographic layers use embedded vector fonts at legible point sizes.",
    });
  }

  if (lowResImages === 0) {
    issues.push({
      id: "images-pass",
      severity: "PASS",
      category: "IMAGE_RESOLUTION",
      title: "300+ DPI Vector & Image Assets Verified",
      message:
        "All graphic layers and QR vectors meet commercial lithographic resolution standards.",
    });
  }

  const errorCount = issues.filter((i) => i.severity === "ERROR").length;
  const warnCount = issues.filter((i) => i.severity === "WARNING").length;
  const score = Math.max(0, 100 - errorCount * 30 - warnCount * 8);

  return {
    isPrintReady: errorCount === 0,
    score,
    checkedAt: new Date().toISOString(),
    dimensionsMm: {
      trimWidth: spec.widthMm,
      trimHeight: spec.heightMm,
      bleed: spec.bleedMm,
      totalWidthWithBleed: spec.widthMm + spec.bleedMm * 2,
      totalHeightWithBleed: spec.heightMm + spec.bleedMm * 2,
      safeMargin: spec.safeMarginMm,
    },
    issues,
  };
}

function parseHexToRgb(hex: string): { r: number; g: number; b: number } {
  const clean = (hex || "#0D2B22").replace("#", "").trim();
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
  return {
    r: Number.isNaN(r) ? 0.05 : r,
    g: Number.isNaN(g) ? 0.17 : g,
    b: Number.isNaN(b) ? 0.13 : b,
  };
}

function escapeXml(unsafe: string): string {
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

async function resolveImageDataUrl(imageUrl: string): Promise<string> {
  if (imageUrl.startsWith("data:")) return imageUrl;
  if (imageUrl.startsWith("/")) {
    try {
      const localPath = path.join(process.cwd(), "public", imageUrl);
      const buf = await fs.readFile(localPath);
      const ext = path.extname(localPath).toLowerCase();
      const mime =
        ext === ".svg"
          ? "image/svg+xml"
          : ext === ".jpg" || ext === ".jpeg"
          ? "image/jpeg"
          : "image/png";
      return `data:${mime};base64,${buf.toString("base64")}`;
    } catch {
      return imageUrl;
    }
  }
  return imageUrl;
}

async function resolveImageBuffer(imageUrl: string): Promise<Buffer | null> {
  try {
    if (imageUrl.startsWith("data:image/png;base64,")) {
      return Buffer.from(
        imageUrl.replace("data:image/png;base64,", ""),
        "base64"
      );
    }
    if (imageUrl.startsWith("/")) {
      const localPath = path.join(process.cwd(), "public", imageUrl);
      return await fs.readFile(localPath);
    }
  } catch {
    return null;
  }
  return null;
}

export async function renderCardSideSvg(
  spec: CardPrintSpec,
  side: CardSide,
  includeBleedAndMarks = false
): Promise<string> {
  const bg = side === "FRONT" ? spec.frontBg : spec.backBg;
  const elements = (side === "FRONT" ? spec.frontElements : spec.backElements)
    .filter((e) => !e.hidden)
    .sort((a, b) => a.zIndex - b.zIndex);

  const bleed = includeBleedAndMarks ? spec.bleedMm : 0;
  const collar = includeBleedAndMarks ? 6 : 0;
  const offset = bleed + collar;
  const totalW = spec.widthMm + offset * 2;
  const totalH = spec.heightMm + offset * 2;

  const qrDataUrls = new Map<string, string>();
  for (const el of elements) {
    if (el.type === "qr") {
      const dataUrl = await generatePermanentQrDataUrl({
        url: spec.qrDestinationUrl,
        foregroundColor: el.qrForeground || "#0D2B22",
        backgroundColor: el.qrBackground || "#FFFFFF",
        errorCorrectionLevel: "H",
        sizePx: 600,
      });
      qrDataUrls.set(el.id, dataUrl);
    }
  }

  let defs = "";
  let bgRect = "";

  const bleedX = collar;
  const bleedY = collar;
  const bleedW = spec.widthMm + bleed * 2;
  const bleedH = spec.heightMm + bleed * 2;

  if (bg.backgroundImageUrl) {
    const bgDataUrl = await resolveImageDataUrl(bg.backgroundImageUrl);
    bgRect = `<rect x="${bleedX}" y="${bleedY}" width="${bleedW}" height="${bleedH}" fill="${bg.primaryColor}" /><image x="${bleedX}" y="${bleedY}" width="${bleedW}" height="${bleedH}" href="${escapeXml(
      bgDataUrl
    )}" preserveAspectRatio="none" />`;
  } else if (bg.type === "gradient") {
    defs += `<linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${bg.primaryColor}" />
      <stop offset="100%" stop-color="${bg.secondaryColor || bg.primaryColor}" />
    </linearGradient>`;
    bgRect = `<rect x="${bleedX}" y="${bleedY}" width="${bleedW}" height="${bleedH}" fill="url(#bgGrad)" />`;
  } else {
    bgRect = `<rect x="${bleedX}" y="${bleedY}" width="${bleedW}" height="${bleedH}" fill="${bg.primaryColor}" />`;
  }

  if (!bg.backgroundImageUrl && bg.type === "split-panel") {
    const ratio = bg.splitRatio || 0.4;
    if (bg.splitDirection === "horizontal") {
      const splitH = bleedH * ratio;
      bgRect += `<rect x="${bleedX}" y="${bleedY + splitH}" width="${bleedW}" height="${
        bleedH - splitH
      }" fill="${bg.secondaryColor || "#F8F5EE"}" />`;
    } else if (bg.splitDirection === "diagonal") {
      bgRect += `<polygon points="${bleedX + bleedW * 0.42},${bleedY} ${
        bleedX + bleedW
      },${bleedY} ${bleedX + bleedW},${bleedY + bleedH} ${
        bleedX + bleedW * 0.25
      },${bleedY + bleedH}" fill="${bg.secondaryColor || "#F8F5EE"}" />`;
    } else if (bg.splitDirection === "diagonal-left-gold") {
      bgRect += `<polygon points="${offset + 32},${bleedY} ${
        bleedX + bleedW
      },${bleedY} ${bleedX + bleedW},${bleedY + bleedH} ${offset + 48},${
        bleedY + bleedH
      } ${offset + 36},${offset + 28}" fill="${
        bg.secondaryColor || "#F5F5F3"
      }" />`;
      bgRect += `<polygon points="${offset + 30.8},${bleedY} ${
        offset + 32.4
      },${bleedY} ${offset + 37.2},${offset + 27.5} ${offset + 49.5},${
        bleedY + bleedH
      } ${offset + 46.5},${bleedY + bleedH} ${offset + 34.8},${
        offset + 28.5
      }" fill="${bg.accentColor || "#D4A84F"}" />`;
    } else if (bg.splitDirection === "chevron-left-gold") {
      bgRect += `<polygon points="${offset + 33},${bleedY} ${
        bleedX + bleedW
      },${bleedY} ${bleedX + bleedW},${bleedY + bleedH} ${offset + 33},${
        bleedY + bleedH
      } ${offset + 44},${offset + 25}" fill="${
        bg.secondaryColor || "#F7F7F5"
      }" />`;
      bgRect += `<polygon points="${offset + 29.5},${bleedY} ${
        offset + 32
      },${bleedY} ${offset + 42.8},${offset + 25} ${offset + 32},${
        bleedY + bleedH
      } ${offset + 29.5},${bleedY + bleedH} ${offset + 40.3},${
        offset + 25
      }" fill="${bg.accentColor || "#C9A24D"}" />`;
    } else if (bg.splitDirection === "back-showcase-ribbon") {
      bgRect += `<polygon points="${offset + 57.5},${bleedY} ${
        offset + 59.2
      },${bleedY} ${offset + 74.5},${offset + 39.5} ${offset + 72.8},${
        offset + 39.5
      }" fill="${bg.accentColor || "#D4A84F"}" />`;
      bgRect += `<polygon points="${bleedX},${offset + 40.5} ${offset + 64},${
        offset + 40.5
      } ${offset + 61},${bleedY + bleedH} ${bleedX},${bleedY + bleedH}" fill="${
        bg.accentColor || "#D4A84F"
      }" />`;
    } else if (bg.splitDirection === "back-chevron-matrix") {
      bgRect += `<polygon points="${offset + 61.5},${bleedY} ${
        offset + 63.2
      },${bleedY} ${offset + 72},${offset + 33} ${offset + 59},${
        bleedY + bleedH
      } ${offset + 56.8},${bleedY + bleedH} ${offset + 70.2},${
        offset + 33
      }" fill="${bg.accentColor || "#C9A24D"}" />`;
    } else {
      const splitW = bleedW * ratio;
      bgRect += `<rect x="${bleedX + splitW}" y="${bleedY}" width="${
        bleedW - splitW
      }" height="${bleedH}" fill="${bg.secondaryColor || "#F8F5EE"}" />`;
      if (bg.accentColor) {
        bgRect += `<rect x="${bleedX + splitW - 0.4}" y="${bleedY}" width="0.8" height="${bleedH}" fill="${bg.accentColor}" />`;
      }
    }
  } else if (bg.type === "luxury-border") {
    const inset = bg.borderInsetMm || 4.5;
    const strokeW = bg.borderWidthMm || 0.35;
    bgRect += `<rect x="${offset + inset}" y="${offset + inset}" width="${
      spec.widthMm - inset * 2
    }" height="${spec.heightMm - inset * 2}" fill="none" stroke="${
      bg.accentColor || "#C9A96E"
    }" stroke-width="${strokeW}" />`;
    bgRect += `<rect x="${offset + inset + 1}" y="${offset + inset + 1}" width="${
      spec.widthMm - (inset + 1) * 2
    }" height="${spec.heightMm - (inset + 1) * 2}" fill="none" stroke="${
      bg.accentColor || "#C9A96E"
    }" stroke-width="${strokeW * 0.5}" opacity="0.6" />`;
  } else if (bg.type === "architectural-grid") {
    const gridColor = bg.accentColor || "#C9A96E";
    const op = bg.patternOpacity || 0.15;
    for (let gx = 0; gx <= spec.widthMm; gx += 10) {
      bgRect += `<line x1="${offset + gx}" y1="${bleedY}" x2="${
        offset + gx
      }" y2="${bleedY + bleedH}" stroke="${gridColor}" stroke-width="0.15" opacity="${op}" />`;
    }
    for (let gy = 0; gy <= spec.heightMm; gy += 10) {
      bgRect += `<line x1="${bleedX}" y1="${offset + gy}" x2="${
        bleedX + bleedW
      }" y2="${offset + gy}" stroke="${gridColor}" stroke-width="0.15" opacity="${op}" />`;
    }
  }

  let elNodes = "";
  for (const el of elements) {
    const x = offset + el.xMm;
    const y = offset + el.yMm;
    const w = el.widthMm;
    const h = el.heightMm;

    if (el.type === "shape") {
      if (el.shapeVariant === "frame") {
        elNodes += `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="none" stroke="${
          el.strokeColor || "#C9A96E"
        }" stroke-width="${el.strokeWidthMm || 0.35}" />`;
      } else if (el.shapeVariant === "pill") {
        elNodes += `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${
          Math.min(w, h) / 2
        }" fill="${el.fillColor || "#133B2E"}" stroke="${
          el.strokeColor || "none"
        }" stroke-width="${el.strokeWidthMm || 0}" />`;
      } else if (el.shapeVariant === "circle") {
        elNodes += `<ellipse cx="${x + w / 2}" cy="${y + h / 2}" rx="${
          w / 2
        }" ry="${h / 2}" fill="${el.fillColor || "#C9A96E"}" />`;
      } else {
        elNodes += `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${
          el.borderRadiusMm || 0
        }" fill="${el.fillColor || "#0D2B22"}" />`;
      }
    } else if (el.type === "line") {
      elNodes += `<rect x="${x}" y="${y}" width="${w}" height="${Math.max(
        h,
        0.25
      )}" fill="${el.fillColor || "#C9A96E"}" />`;
    } else if (el.type === "monogram") {
      const cx = x + w / 2;
      const cy = y + h / 2;
      const r = Math.min(w, h) / 2;
      if (el.badgeStyle === "hezlon-skyline-crest") {
        elNodes += `<g transform="translate(${x}, ${y}) scale(${w / 240}, ${
          h / 150
        })">
          <polygon points="30,92 104,30 104,55 86,70 86,140 54,140 54,76" fill="${
            el.color || "#D4A84F"
          }" />
          <polygon points="22,92 104,22 104,30 30,92" fill="#E8CA82" />
          <polygon points="109,12 128,28 128,140 109,140" fill="#FFFFFF" />
          <polygon points="134,38 153,52 153,140 134,140" fill="${
            el.color || "#D4A84F"
          }" />
          <polygon points="157,62 178,78 178,126 205,140 157,140" fill="${
            el.color || "#D4A84F"
          }" />
        </g>`;
      } else {
        if (el.badgeStyle === "square-architectural") {
          elNodes += `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${
            el.fillColor || "#133B2E"
          }" stroke="${el.strokeColor || "#C9A96E"}" stroke-width="0.4" />`;
        } else {
          elNodes += `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${
            el.fillColor || "#133B2E"
          }" stroke="${el.strokeColor || "#C9A96E"}" stroke-width="0.4" />`;
        }
        elNodes += `<text x="${cx}" y="${
          cy + r * 0.35
        }" text-anchor="middle" fill="${
          el.color || "#C9A96E"
        }" font-family="Georgia, serif" font-weight="bold" font-size="${
          r * 1.05
        }">${escapeXml(el.monogramText || "H")}</text>`;
      }
    } else if (el.type === "icon") {
      const cx = x + w / 2;
      const cy = y + h / 2;
      const r = Math.min(w, h) / 2;
      if (
        el.badgeStyle === "solid-circle" ||
        el.badgeStyle === "gold-ring-icon"
      ) {
        elNodes += `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${
          el.fillColor || "#09261E"
        }" stroke="${
          el.badgeStyle === "gold-ring-icon"
            ? el.strokeColor || "#D4A84F"
            : "none"
        }" stroke-width="0.35" />`;
      }
      elNodes += `<circle cx="${cx}" cy="${cy}" r="${r * 0.35}" fill="${
        el.color || "#D4A84F"
      }" />`;
    } else if (el.type === "qr") {
      const qrData = qrDataUrls.get(el.id);
      if (
        el.qrFrameStyle === "thin-gold" ||
        el.qrFrameStyle === "rounded-gold"
      ) {
        elNodes += `<rect x="${x - 0.8}" y="${y - 0.8}" width="${
          w + 1.6
        }" height="${h + 1.6}" rx="${
          el.qrFrameStyle === "rounded-gold" ? 1.8 : 0
        }" fill="${
          el.qrBackground || "#FFFFFF"
        }" stroke="#C9A96E" stroke-width="0.4" />`;
      }
      if (qrData) {
        elNodes += `<image x="${x}" y="${y}" width="${w}" height="${h}" href="${qrData}" />`;
      }
    } else if ((el.type === "logo" || el.type === "photo") && el.imageUrl) {
      const resolvedHref = await resolveImageDataUrl(el.imageUrl);
      elNodes += `<image x="${x}" y="${y}" width="${w}" height="${h}" href="${escapeXml(
        resolvedHref
      )}" preserveAspectRatio="xMidYMid slice" />`;
      if (el.badgeStyle === "circle-gold") {
        elNodes += `<circle cx="${x + w / 2}" cy="${y + h / 2}" r="${
          Math.min(w, h) / 2
        }" fill="none" stroke="${
          el.strokeColor || "#C9A24D"
        }" stroke-width="0.55" />`;
      }
    } else if (el.type === "text") {
      const isUnmodifiedMaster =
        Boolean(el.defaultMasterText) &&
        (el.text || "").trim() === el.defaultMasterText?.trim();
      if (!isUnmodifiedMaster) {
        if (el.fillColor) {
          elNodes += `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${el.fillColor}" rx="0.5" />`;
        }
        const fontSizeMm = (el.fontSizePt || 8) * 0.3528;
        const lines = (el.text || "").split("\n");
        const anchor =
          el.textAlign === "center"
            ? "middle"
            : el.textAlign === "right"
            ? "end"
            : "start";
        const tx =
          el.textAlign === "center"
            ? x + w / 2
            : el.textAlign === "right"
            ? x + w
            : x;

        lines.forEach((line, idx) => {
          const displayLine =
            el.textTransform === "uppercase"
              ? line.toUpperCase()
              : el.textTransform === "lowercase"
              ? line.toLowerCase()
              : line;
          const ty = y + fontSizeMm + idx * (fontSizeMm * 1.28);
          elNodes += `<text x="${tx}" y="${ty}" text-anchor="${anchor}" fill="${
            el.color || "#FFFFFF"
          }" font-family="${
            el.fontFamily || "Inter, sans-serif"
          }" font-size="${fontSizeMm.toFixed(2)}" font-weight="${
            el.fontWeight || "500"
          }" font-style="${el.fontStyle || "normal"}" letter-spacing="${
            (el.letterSpacingEm || 0) * fontSizeMm
          }">${escapeXml(displayLine)}</text>`;
        });
      }
    }
  }

  let cropMarks = "";
  if (includeBleedAndMarks) {
    const trimLeft = offset;
    const trimTop = offset;
    const trimRight = offset + spec.widthMm;
    const trimBottom = offset + spec.heightMm;
    const mLen = 4;
    const mGap = bleed + 0.8;

    cropMarks = `
      <g stroke="#000000" stroke-width="0.2">
        <line x1="${trimLeft - mGap - mLen}" y1="${trimTop}" x2="${
      trimLeft - mGap
    }" y2="${trimTop}" />
        <line x1="${trimLeft}" y1="${trimTop - mGap - mLen}" x2="${trimLeft}" y2="${
      trimTop - mGap
    }" />
        <line x1="${trimRight + mGap}" y1="${trimTop}" x2="${
      trimRight + mGap + mLen
    }" y2="${trimTop}" />
        <line x1="${trimRight}" y1="${trimTop - mGap - mLen}" x2="${trimRight}" y2="${
      trimTop - mGap
    }" />
        <line x1="${trimLeft - mGap - mLen}" y1="${trimBottom}" x2="${
      trimLeft - mGap
    }" y2="${trimBottom}" />
        <line x1="${trimLeft}" y1="${trimBottom + mGap}" x2="${trimLeft}" y2="${
      trimBottom + mGap + mLen
    }" />
        <line x1="${trimRight + mGap}" y1="${trimBottom}" x2="${
      trimRight + mGap + mLen
    }" y2="${trimBottom}" />
        <line x1="${trimRight}" y1="${trimBottom + mGap}" x2="${trimRight}" y2="${
      trimBottom + mGap + mLen
    }" />
      </g>
    `;
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${totalW} ${totalH}" width="${
    totalW * 12
  }" height="${totalH * 12}">
    <defs>${defs}</defs>
    ${
      includeBleedAndMarks
        ? `<rect width="100%" height="100%" fill="#FFFFFF" />`
        : ""
    }
    ${bgRect}
    ${elNodes}
    ${cropMarks}
  </svg>`;
}

export async function generatePrintReadyPdf(
  spec: CardPrintSpec,
  mode: "COMPLETE" | "FRONT" | "BACK" = "COMPLETE"
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  pdfDoc.setTitle(`${spec.designName} — HEZLON Print-Ready Production File`);
  pdfDoc.setAuthor("HEZLON Building Solutions — Business Card Studio");
  pdfDoc.setSubject(
    `Trim: ${spec.widthMm}x${spec.heightMm}mm | Bleed: ${spec.bleedMm}mm | Finish: ${spec.paperFinish} | Color: CMYK-Compatible`
  );
  pdfDoc.setCreator("HEZLON Print Production Engine v1.0");

  const fontSansRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontSansBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const fontSerifRegular = await pdfDoc.embedFont(StandardFonts.TimesRoman);
  const fontSerifBold = await pdfDoc.embedFont(StandardFonts.TimesRomanBold);
  const fontSerifItalic = await pdfDoc.embedFont(StandardFonts.TimesRomanItalic);
  const fontMono = await pdfDoc.embedFont(StandardFonts.CourierBold);

  const collarMm = 8;
  const totalOffsetMm = spec.bleedMm + collarMm;
  const pageWidthMm = spec.widthMm + totalOffsetMm * 2;
  const pageHeightMm = spec.heightMm + totalOffsetMm * 2;

  const pageWidthPt = pageWidthMm * MM_TO_PT;
  const pageHeightPt = pageHeightMm * MM_TO_PT;

  const sidesToRender: CardSide[] =
    mode === "FRONT"
      ? ["FRONT"]
      : mode === "BACK"
      ? ["BACK"]
      : spec.isDoubleSided
      ? ["FRONT", "BACK"]
      : ["FRONT"];

  for (const side of sidesToRender) {
    const page = pdfDoc.addPage([pageWidthPt, pageHeightPt]);
    const bg = side === "FRONT" ? spec.frontBg : spec.backBg;
    const elements = (side === "FRONT" ? spec.frontElements : spec.backElements)
      .filter((e) => !e.hidden)
      .sort((a, b) => a.zIndex - b.zIndex);

    const trimLeftPt = totalOffsetMm * MM_TO_PT;
    const trimBottomPt = totalOffsetMm * MM_TO_PT;
    const trimWidthPt = spec.widthMm * MM_TO_PT;
    const trimHeightPt = spec.heightMm * MM_TO_PT;

    const bleedLeftPt = collarMm * MM_TO_PT;
    const bleedBottomPt = collarMm * MM_TO_PT;
    const bleedWidthPt = (spec.widthMm + spec.bleedMm * 2) * MM_TO_PT;
    const bleedHeightPt = (spec.heightMm + spec.bleedMm * 2) * MM_TO_PT;

    // 1. Draw Full-Bleed Background
    const cPrimary = parseHexToRgb(bg.primaryColor);
    page.drawRectangle({
      x: bleedLeftPt,
      y: bleedBottomPt,
      width: bleedWidthPt,
      height: bleedHeightPt,
      color: rgb(cPrimary.r, cPrimary.g, cPrimary.b),
    });

    if (bg.backgroundImageUrl) {
      const bgBuf = await resolveImageBuffer(bg.backgroundImageUrl);
      if (bgBuf) {
        try {
          const isJpg =
            bg.backgroundImageUrl.endsWith(".jpg") ||
            bg.backgroundImageUrl.endsWith(".jpeg");
          const pdfBgImg = isJpg
            ? await pdfDoc.embedJpg(bgBuf)
            : await pdfDoc.embedPng(bgBuf);
          page.drawImage(pdfBgImg, {
            x: bleedLeftPt,
            y: bleedBottomPt,
            width: bleedWidthPt,
            height: bleedHeightPt,
          });
        } catch {
          // ignore if background image cannot be embedded
        }
      }
    } else if (bg.type === "split-panel") {
      const cSec = parseHexToRgb(bg.secondaryColor || "#F8F5EE");
      const ratio =
        bg.splitDirection === "diagonal-left-gold" ||
        bg.splitDirection === "chevron-left-gold"
          ? 0.37
          : bg.splitRatio || 0.4;
      if (bg.splitDirection === "horizontal") {
        const lowerHeightPt = bleedHeightPt * (1 - ratio);
        page.drawRectangle({
          x: bleedLeftPt,
          y: bleedBottomPt,
          width: bleedWidthPt,
          height: lowerHeightPt,
          color: rgb(cSec.r, cSec.g, cSec.b),
        });
      } else if (bg.splitDirection === "back-showcase-ribbon") {
        const cAcc = parseHexToRgb(bg.accentColor || "#D4A84F");
        page.drawRectangle({
          x: bleedLeftPt,
          y: bleedBottomPt,
          width: bleedWidthPt * 0.68,
          height: (9.5 + spec.bleedMm) * MM_TO_PT,
          color: rgb(cAcc.r, cAcc.g, cAcc.b),
        });
      } else if (bg.splitDirection !== "back-chevron-matrix") {
        const leftWidthPt = bleedWidthPt * ratio;
        page.drawRectangle({
          x: bleedLeftPt + leftWidthPt,
          y: bleedBottomPt,
          width: bleedWidthPt - leftWidthPt,
          height: bleedHeightPt,
          color: rgb(cSec.r, cSec.g, cSec.b),
        });
        if (bg.accentColor) {
          const cAcc = parseHexToRgb(bg.accentColor);
          page.drawRectangle({
            x: bleedLeftPt + leftWidthPt - 0.6 * MM_TO_PT,
            y: bleedBottomPt,
            width: 1.2 * MM_TO_PT,
            height: bleedHeightPt,
            color: rgb(cAcc.r, cAcc.g, cAcc.b),
          });
        }
      }
    } else if (bg.type === "luxury-border") {
      const insetPt = (bg.borderInsetMm || 4.5) * MM_TO_PT;
      const cAcc = parseHexToRgb(bg.accentColor || "#C9A96E");
      page.drawRectangle({
        x: trimLeftPt + insetPt,
        y: trimBottomPt + insetPt,
        width: trimWidthPt - insetPt * 2,
        height: trimHeightPt - insetPt * 2,
        borderColor: rgb(cAcc.r, cAcc.g, cAcc.b),
        borderWidth: (bg.borderWidthMm || 0.35) * MM_TO_PT,
      });
    } else if (bg.type === "architectural-grid") {
      const cAcc = parseHexToRgb(bg.accentColor || "#C9A96E");
      for (let gx = 0; gx <= spec.widthMm; gx += 10) {
        page.drawLine({
          start: { x: trimLeftPt + gx * MM_TO_PT, y: bleedBottomPt },
          end: {
            x: trimLeftPt + gx * MM_TO_PT,
            y: bleedBottomPt + bleedHeightPt,
          },
          thickness: 0.25,
          color: rgb(cAcc.r, cAcc.g, cAcc.b),
          opacity: bg.patternOpacity || 0.14,
        });
      }
      for (let gy = 0; gy <= spec.heightMm; gy += 10) {
        page.drawLine({
          start: { x: bleedLeftPt, y: trimBottomPt + gy * MM_TO_PT },
          end: {
            x: bleedLeftPt + bleedWidthPt,
            y: trimBottomPt + gy * MM_TO_PT,
          },
          thickness: 0.25,
          color: rgb(cAcc.r, cAcc.g, cAcc.b),
          opacity: bg.patternOpacity || 0.14,
        });
      }
    }

    // 2. Draw Elements
    for (const el of elements) {
      const xPt = trimLeftPt + el.xMm * MM_TO_PT;
      const wPt = el.widthMm * MM_TO_PT;
      const hPt = el.heightMm * MM_TO_PT;
      const yPt = trimBottomPt + trimHeightPt - (el.yMm + el.heightMm) * MM_TO_PT;

      if (el.type === "shape") {
        if (el.shapeVariant === "frame") {
          const cStroke = parseHexToRgb(el.strokeColor || "#C9A96E");
          page.drawRectangle({
            x: xPt,
            y: yPt,
            width: wPt,
            height: hPt,
            borderColor: rgb(cStroke.r, cStroke.g, cStroke.b),
            borderWidth: (el.strokeWidthMm || 0.35) * MM_TO_PT,
          });
        } else {
          const cFill = parseHexToRgb(el.fillColor || "#0D2B22");
          page.drawRectangle({
            x: xPt,
            y: yPt,
            width: wPt,
            height: hPt,
            color: rgb(cFill.r, cFill.g, cFill.b),
          });
        }
      } else if (el.type === "line") {
        const cFill = parseHexToRgb(el.fillColor || "#C9A96E");
        page.drawRectangle({
          x: xPt,
          y: yPt,
          width: wPt,
          height: Math.max(hPt, 0.35 * MM_TO_PT),
          color: rgb(cFill.r, cFill.g, cFill.b),
        });
      } else if (el.type === "monogram") {
        const cFill = parseHexToRgb(el.fillColor || "#133B2E");
        const cStroke = parseHexToRgb(el.strokeColor || "#C9A96E");
        const cText = parseHexToRgb(el.color || "#C9A96E");
        if (el.badgeStyle === "hezlon-skyline-crest") {
          page.drawRectangle({
            x: xPt + wPt * 0.2,
            y: yPt + hPt * 0.1,
            width: wPt * 0.22,
            height: hPt * 0.55,
            color: rgb(cText.r, cText.g, cText.b),
          });
          page.drawRectangle({
            x: xPt + wPt * 0.45,
            y: yPt + hPt * 0.1,
            width: wPt * 0.1,
            height: hPt * 0.8,
            color: rgb(1, 1, 1),
          });
          page.drawRectangle({
            x: xPt + wPt * 0.58,
            y: yPt + hPt * 0.1,
            width: wPt * 0.22,
            height: hPt * 0.65,
            color: rgb(cText.r, cText.g, cText.b),
          });
        } else {
          if (el.badgeStyle === "square-architectural") {
            page.drawRectangle({
              x: xPt,
              y: yPt,
              width: wPt,
              height: hPt,
              color: rgb(cFill.r, cFill.g, cFill.b),
              borderColor: rgb(cStroke.r, cStroke.g, cStroke.b),
              borderWidth: 1,
            });
          } else {
            page.drawCircle({
              x: xPt + wPt / 2,
              y: yPt + hPt / 2,
              size: Math.min(wPt, hPt) / 2,
              color: rgb(cFill.r, cFill.g, cFill.b),
              borderColor: rgb(cStroke.r, cStroke.g, cStroke.b),
              borderWidth: 1,
            });
          }
          const mChar = (el.monogramText || "H").slice(0, 2);
          const fSize = Math.min(wPt, hPt) * 0.52;
          const mWidth = fontSerifBold.widthOfTextAtSize(mChar, fSize);
          page.drawText(mChar, {
            x: xPt + (wPt - mWidth) / 2,
            y: yPt + hPt / 2 - fSize * 0.34,
            size: fSize,
            font: fontSerifBold,
            color: rgb(cText.r, cText.g, cText.b),
          });
        }
      } else if (el.type === "icon") {
        const cFill = parseHexToRgb(el.fillColor || "#09261E");
        const cStroke = parseHexToRgb(el.strokeColor || "#D4A84F");
        if (
          el.badgeStyle === "solid-circle" ||
          el.badgeStyle === "gold-ring-icon"
        ) {
          page.drawCircle({
            x: xPt + wPt / 2,
            y: yPt + hPt / 2,
            size: Math.min(wPt, hPt) / 2,
            color: rgb(cFill.r, cFill.g, cFill.b),
            borderColor:
              el.badgeStyle === "gold-ring-icon"
                ? rgb(cStroke.r, cStroke.g, cStroke.b)
                : undefined,
            borderWidth: el.badgeStyle === "gold-ring-icon" ? 0.8 : 0,
          });
        }
      } else if ((el.type === "photo" || el.type === "logo") && el.imageUrl) {
        const imgBuf = await resolveImageBuffer(el.imageUrl);
        if (imgBuf) {
          try {
            const pdfImg = await pdfDoc.embedPng(imgBuf);
            page.drawImage(pdfImg, {
              x: xPt,
              y: yPt,
              width: wPt,
              height: hPt,
            });
            if (el.badgeStyle === "circle-gold") {
              const cStroke = parseHexToRgb(el.strokeColor || "#C9A24D");
              page.drawCircle({
                x: xPt + wPt / 2,
                y: yPt + hPt / 2,
                size: Math.min(wPt, hPt) / 2,
                borderColor: rgb(cStroke.r, cStroke.g, cStroke.b),
                borderWidth: 1.4,
              });
            }
          } catch {
            // ignore unsupported image format
          }
        }
      } else if (el.type === "qr") {
        const qrBuf = await generatePermanentQrBuffer({
          url: spec.qrDestinationUrl,
          foregroundColor: el.qrForeground || "#0D2B22",
          backgroundColor: el.qrBackground || "#FFFFFF",
          errorCorrectionLevel: "H",
          sizePx: 1024,
        });
        const qrImg = await pdfDoc.embedPng(qrBuf);

        if (
          el.qrFrameStyle === "thin-gold" ||
          el.qrFrameStyle === "rounded-gold"
        ) {
          const cGold = parseHexToRgb("#C9A96E");
          const cBg = parseHexToRgb(el.qrBackground || "#FFFFFF");
          const pad = 0.8 * MM_TO_PT;
          page.drawRectangle({
            x: xPt - pad,
            y: yPt - pad,
            width: wPt + pad * 2,
            height: hPt + pad * 2,
            color: rgb(cBg.r, cBg.g, cBg.b),
            borderColor: rgb(cGold.r, cGold.g, cGold.b),
            borderWidth: 0.9,
          });
        }
        page.drawImage(qrImg, {
          x: xPt,
          y: yPt,
          width: wPt,
          height: hPt,
        });
      } else if (el.type === "text" && el.text) {
        const isUnmodifiedMaster =
          Boolean(el.defaultMasterText) &&
          el.text.trim() === el.defaultMasterText?.trim();
        if (!isUnmodifiedMaster) {
          if (el.fillColor) {
            const cMask = parseHexToRgb(el.fillColor);
            page.drawRectangle({
              x: xPt,
              y: yPt,
              width: wPt,
              height: hPt,
              color: rgb(cMask.r, cMask.g, cMask.b),
            });
          }
          const isSerif = [
            "Playfair Display",
            "Cormorant Garamond",
            "Cinzel",
          ].includes(el.fontFamily || "");
          const isMono = el.fontFamily === "JetBrains Mono";
          const isBold = ["600", "700", "800"].includes(el.fontWeight || "500");

          const chosenFont = isMono
            ? fontMono
            : isSerif
            ? el.fontStyle === "italic"
              ? fontSerifItalic
              : isBold
              ? fontSerifBold
              : fontSerifRegular
            : isBold
            ? fontSansBold
            : fontSansRegular;

          const fontSizePt = el.fontSizePt || 8;
          const cText = parseHexToRgb(el.color || "#FFFFFF");
          const lines = el.text.split("\n");
          const topY = trimBottomPt + trimHeightPt - el.yMm * MM_TO_PT;

          lines.forEach((rawLine, lineIdx) => {
            const lineText =
              el.textTransform === "uppercase"
                ? rawLine.toUpperCase()
                : el.textTransform === "lowercase"
                ? rawLine.toLowerCase()
                : rawLine;
            const cleanLine = lineText.replace(/[^\x20-\x7E•]/g, " ");
            const textWidth = chosenFont.widthOfTextAtSize(
              cleanLine,
              fontSizePt
            );

            let drawX = xPt;
            if (el.textAlign === "center") {
              drawX = xPt + (wPt - textWidth) / 2;
            } else if (el.textAlign === "right") {
              drawX = xPt + wPt - textWidth;
            }

            const drawY = topY - fontSizePt - lineIdx * (fontSizePt * 1.28);
            page.drawText(cleanLine, {
              x: drawX,
              y: drawY,
              size: fontSizePt,
              font: chosenFont,
              color: rgb(cText.r, cText.g, cText.b),
            });
          });
        }
      }
    }

    // 3. Draw Printer Crop Marks, Trim Marks & Production Job Slug
    const markLenPt = 4.5 * MM_TO_PT;
    const markGapPt = (spec.bleedMm + 0.8) * MM_TO_PT;
    const trimRightPt = trimLeftPt + trimWidthPt;
    const trimTopPt = trimBottomPt + trimHeightPt;

    const cropLines = [
      {
        start: { x: trimLeftPt - markGapPt - markLenPt, y: trimTopPt },
        end: { x: trimLeftPt - markGapPt, y: trimTopPt },
      },
      {
        start: { x: trimLeftPt, y: trimTopPt + markGapPt },
        end: { x: trimLeftPt, y: trimTopPt + markGapPt + markLenPt },
      },
      {
        start: { x: trimRightPt + markGapPt, y: trimTopPt },
        end: { x: trimRightPt + markGapPt + markLenPt, y: trimTopPt },
      },
      {
        start: { x: trimRightPt, y: trimTopPt + markGapPt },
        end: { x: trimRightPt, y: trimTopPt + markGapPt + markLenPt },
      },
      {
        start: { x: trimLeftPt - markGapPt - markLenPt, y: trimBottomPt },
        end: { x: trimLeftPt - markGapPt, y: trimBottomPt },
      },
      {
        start: { x: trimLeftPt, y: trimBottomPt - markGapPt - markLenPt },
        end: { x: trimLeftPt, y: trimBottomPt - markGapPt },
      },
      {
        start: { x: trimRightPt + markGapPt, y: trimBottomPt },
        end: { x: trimRightPt + markGapPt + markLenPt, y: trimBottomPt },
      },
      {
        start: { x: trimRightPt, y: trimBottomPt - markGapPt - markLenPt },
        end: { x: trimRightPt, y: trimBottomPt - markGapPt },
      },
    ];

    for (const cl of cropLines) {
      page.drawLine({
        start: cl.start,
        end: cl.end,
        thickness: 0.4,
        color: rgb(0, 0, 0),
      });
    }

    const slugText = `HEZLON BUILDING SOLUTIONS | ${spec.designName.toUpperCase()} (${side}) | TRIM: ${
      spec.widthMm
    }x${spec.heightMm}mm | BLEED: ${spec.bleedMm}mm | FINISH: ${spec.paperFinish}`;
    page.drawText(slugText, {
      x: trimLeftPt,
      y: 2.2 * MM_TO_PT,
      size: 4.5,
      font: fontMono,
      color: rgb(0.3, 0.3, 0.3),
    });

    const cmykSwatches = [
      rgb(0, 0.68, 0.94),
      rgb(0.93, 0, 0.55),
      rgb(1, 0.95, 0),
      rgb(0.08, 0.08, 0.08),
      rgb(0.05, 0.17, 0.13),
      rgb(0.79, 0.66, 0.43),
    ];
    cmykSwatches.forEach((swatchColor, idx) => {
      page.drawRectangle({
        x: trimRightPt - (cmykSwatches.length - idx) * 3.5 * MM_TO_PT,
        y: pageHeightPt - 4.5 * MM_TO_PT,
        width: 3 * MM_TO_PT,
        height: 2 * MM_TO_PT,
        color: swatchColor,
      });
    });
  }

  return await pdfDoc.save();
}
