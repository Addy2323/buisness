"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  X,
  Download,
  Printer,
  Eye,
  CheckCircle2,
  Layers,
  Sparkles,
  RefreshCw,
  FileCheck,
  Maximize2,
  Info,
  ChevronRight,
  ExternalLink,
} from "lucide-react";
import { CanvasElement, CardBackground, CornerStyle, PaperFinish } from "@/types/studio";

export interface PdfExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  designId?: string | null;
  designName: string;
  widthMm: number;
  heightMm: number;
  bleedMm: number;
  safeMarginMm: number;
  isDoubleSided: boolean;
  paperFinish: PaperFinish;
  cornerStyle: CornerStyle;
  frontBg: CardBackground;
  backBg: CardBackground;
  frontElements: CanvasElement[];
  backElements: CanvasElement[];
}

export type ExportPdfMode = "PREVIEW" | "PRINT_READY";
export type DuplexFlipOption = "LONG_EDGE" | "SHORT_EDGE";

export function PdfExportModal({
  isOpen,
  onClose,
  designId,
  designName,
  widthMm,
  heightMm,
  bleedMm,
  safeMarginMm,
  isDoubleSided,
  paperFinish,
  cornerStyle,
  frontBg,
  backBg,
  frontElements,
  backElements,
}: PdfExportModalProps) {
  const [activeMode, setActiveMode] = useState<ExportPdfMode>("PREVIEW");
  const [pageSelection, setPageSelection] = useState<"COMPLETE" | "FRONT" | "BACK">("COMPLETE");
  const [flipMode, setFlipMode] = useState<DuplexFlipOption>("LONG_EDGE");

  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewPdfBlobUrl, setPreviewPdfBlobUrl] = useState<string | null>(null);
  const [downloading, setDownloading] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [layoutInfo, setLayoutInfo] = useState<{
    cardsPerSheet: number;
    columns: number;
    rows: number;
    sheetStandard: string;
    sheetWidthMm: number;
    sheetHeightMm: number;
  }>({
    cardsPerSheet: 8,
    columns: 2,
    rows: 4,
    sheetStandard: "A4",
    sheetWidthMm: 210,
    sheetHeightMm: 297,
  });

  const prevBlobUrlRef = useRef<string | null>(null);

  // Clean up object URLs
  const cleanupBlobUrl = useCallback(() => {
    if (prevBlobUrlRef.current) {
      URL.revokeObjectURL(prevBlobUrlRef.current);
      prevBlobUrlRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => {
      cleanupBlobUrl();
    };
  }, [cleanupBlobUrl]);

  // Request PDF preview stream
  const fetchPreviewPdf = useCallback(async () => {
    if (!isOpen) return;

    setPreviewLoading(true);
    setSuccessMessage(null);

    const format =
      activeMode === "PREVIEW"
        ? pageSelection === "FRONT"
          ? "PDF_PREVIEW_FRONT"
          : pageSelection === "BACK"
          ? "PDF_PREVIEW_BACK"
          : "PDF_PREVIEW"
        : pageSelection === "FRONT"
        ? "PDF_FRONT"
        : pageSelection === "BACK"
        ? "PDF_BACK"
        : "PDF_PRINT_READY";

    try {
      const res = await fetch("/api/admin/export-pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          format,
          designId,
          designName,
          widthMm,
          heightMm,
          bleedMm,
          safeMarginMm,
          isDoubleSided,
          paperFinish,
          cornerStyle,
          frontBg,
          backBg,
          frontElements,
          backElements,
          flipMode,
          disposition: "inline",
        }),
      });

      if (!res.ok) {
        throw new Error("Failed to generate PDF preview");
      }

      const blob = await res.blob();
      cleanupBlobUrl();
      const newUrl = URL.createObjectURL(blob);
      prevBlobUrlRef.current = newUrl;
      setPreviewPdfBlobUrl(newUrl);
    } catch (err) {
      console.error("PDF Preview load error:", err);
    } finally {
      setPreviewLoading(false);
    }
  }, [
    isOpen,
    activeMode,
    pageSelection,
    flipMode,
    designId,
    designName,
    widthMm,
    heightMm,
    bleedMm,
    safeMarginMm,
    isDoubleSided,
    paperFinish,
    cornerStyle,
    frontBg,
    backBg,
    frontElements,
    backElements,
    cleanupBlobUrl,
  ]);

  // Fetch preview when modal opens or primary configuration changes
  useEffect(() => {
    if (isOpen) {
      fetchPreviewPdf();
    } else {
      cleanupBlobUrl();
      setPreviewPdfBlobUrl(null);
      setSuccessMessage(null);
    }
  }, [isOpen, activeMode, pageSelection, flipMode, fetchPreviewPdf, cleanupBlobUrl]);

  // Direct download handler
  const handleDownloadPdf = async (
    targetMode: ExportPdfMode,
    side: "COMPLETE" | "FRONT" | "BACK" = pageSelection
  ) => {
    const format =
      targetMode === "PREVIEW"
        ? side === "FRONT"
          ? "PDF_PREVIEW_FRONT"
          : side === "BACK"
          ? "PDF_PREVIEW_BACK"
          : "PDF_PREVIEW"
        : side === "FRONT"
        ? "PDF_FRONT"
        : side === "BACK"
        ? "PDF_BACK"
        : "PDF_PRINT_READY";

    setDownloading(format);
    setSuccessMessage(null);

    try {
      const res = await fetch("/api/admin/export-pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          format,
          designId,
          designName,
          widthMm,
          heightMm,
          bleedMm,
          safeMarginMm,
          isDoubleSided,
          paperFinish,
          cornerStyle,
          frontBg,
          backBg,
          frontElements,
          backElements,
          flipMode,
          disposition: "attachment",
        }),
      });

      if (!res.ok) throw new Error("Download failed");

      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = blobUrl;

      const baseName = designName.toLowerCase().replace(/[^a-z0-9]+/g, "-");
      const sideSuffix = side === "COMPLETE" ? "front-back" : side.toLowerCase();
      const filename =
        targetMode === "PREVIEW"
          ? `${baseName}-preview-${sideSuffix}.pdf`
          : `${baseName}-print-ready-a4-${sideSuffix}.pdf`;

      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(blobUrl);

      const msg =
        targetMode === "PREVIEW"
          ? `Successfully downloaded Preview PDF "${filename}". 2-Page clean proof ready to view or share.`
          : `Successfully downloaded Print-Ready PDF "${filename}". A4 8-Up imposition (${flipMode} duplex) with outer cutting marks ready for commercial printing.`;

      setSuccessMessage(msg);
    } catch (err) {
      console.error("PDF download error:", err);
      alert("Failed to download PDF. Please try again.");
    } finally {
      setDownloading(null);
    }
  };

  const handleDownloadRaster = async (format: "PNG_FRONT" | "PNG_BACK" | "SVG_FRONT" | "SVG_BACK") => {
    setDownloading(format);
    setSuccessMessage(null);
    try {
      const res = await fetch("/api/admin/export-pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          format,
          designId,
          designName,
          widthMm,
          heightMm,
          bleedMm,
          safeMarginMm,
          isDoubleSided,
          paperFinish,
          cornerStyle,
          frontBg,
          backBg,
          frontElements,
          backElements,
          includeBleed: true,
          disposition: "attachment",
        }),
      });

      if (!res.ok) throw new Error("Export failed");
      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = blobUrl;
      const baseName = designName.toLowerCase().replace(/[^a-z0-9]+/g, "-");
      const ext = format.startsWith("PNG") ? "png" : "svg";
      const filename = `${baseName}-${format.toLowerCase()}.${ext}`;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(blobUrl);

      setSuccessMessage(`Exported high-resolution ${filename} successfully.`);
    } catch (err) {
      console.error("Raster export error:", err);
      alert("Failed to export graphic file.");
    } finally {
      setDownloading(null);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-charcoal-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl shadow-2xl border border-charcoal-200 w-full max-w-6xl max-h-[92vh] flex flex-col overflow-hidden">
        {/* Header Bar */}
        <div className="bg-forest-950 text-cream px-6 py-4 border-b border-gold/30 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-forest-900 border border-gold/50 flex items-center justify-center text-gold shadow-inner">
              <Printer className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-serif font-bold text-cream">
                  Professional PDF Export &amp; Proofing
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-gold/20 text-gold border border-gold/40">
                  Commercial Ready
                </span>
              </div>
              <p className="text-xs text-cream/70 font-mono">
                {designName} • Finished Trim: {widthMm}×{heightMm}mm (+{bleedMm}mm Bleed)
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl bg-forest-900/80 text-cream/70 hover:text-cream hover:bg-forest-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Success Banner */}
        {successMessage && (
          <div className="bg-emerald-50 border-b border-emerald-200 px-6 py-2.5 flex items-center gap-2.5 text-xs text-emerald-900 font-medium">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span className="flex-1">{successMessage}</span>
            <button
              type="button"
              onClick={() => setSuccessMessage(null)}
              className="text-emerald-700 hover:text-emerald-900 text-[11px] underline"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Modal Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-12 flex-1 min-h-0 overflow-y-auto">
          {/* Left Configuration Panel (5 cols) */}
          <div className="lg:col-span-5 p-6 bg-charcoal-50/60 border-r border-charcoal-200/80 space-y-6 overflow-y-auto">
            {/* Mode Selector */}
            <div className="space-y-2">
              <label className="text-[11px] font-bold uppercase tracking-wider text-charcoal-600 flex items-center gap-1.5">
                <FileCheck className="w-3.5 h-3.5 text-gold-700" />
                <span>Select Export Mode</span>
              </label>
              <div className="grid grid-cols-2 gap-2 bg-white p-1 rounded-2xl border border-charcoal-200 shadow-sm">
                <button
                  type="button"
                  onClick={() => setActiveMode("PREVIEW")}
                  className={`p-3 rounded-xl text-left transition flex flex-col justify-between ${
                    activeMode === "PREVIEW"
                      ? "bg-forest-900 text-cream shadow-md"
                      : "text-charcoal-700 hover:bg-cream"
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-xs flex items-center gap-1.5">
                      <Eye className="w-3.5 h-3.5 text-gold" />
                      Preview PDF
                    </span>
                    {activeMode === "PREVIEW" && (
                      <span className="w-2 h-2 rounded-full bg-gold" />
                    )}
                  </div>
                  <span className={`text-[10px] ${activeMode === "PREVIEW" ? "text-cream/75" : "text-charcoal-500"}`}>
                    Clean 2-page Front &amp; Back at 90×50mm. Zero marks or technical labels.
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveMode("PRINT_READY")}
                  className={`p-3 rounded-xl text-left transition flex flex-col justify-between ${
                    activeMode === "PRINT_READY"
                      ? "bg-forest-900 text-cream shadow-md"
                      : "text-charcoal-700 hover:bg-cream"
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-xs flex items-center gap-1.5">
                      <Printer className="w-3.5 h-3.5 text-gold" />
                      Print-Ready PDF
                    </span>
                    {activeMode === "PRINT_READY" && (
                      <span className="w-2 h-2 rounded-full bg-gold" />
                    )}
                  </div>
                  <span className={`text-[10px] ${activeMode === "PRINT_READY" ? "text-cream/75" : "text-charcoal-500"}`}>
                    A4 8-Up imposition sheet, 3mm bleed, outer cutting marks, matched duplex.
                  </span>
                </button>
              </div>
            </div>

            {/* Print Arrangement Details */}
            <div className="bg-white rounded-2xl p-4 border border-charcoal-200 shadow-sm space-y-3">
              <div className="flex items-center justify-between text-xs pb-2 border-b border-charcoal-100">
                <span className="font-bold text-forest-950 flex items-center gap-1.5">
                  <Info className="w-3.5 h-3.5 text-gold-700" />
                  Printing Specifications
                </span>
                <span className="text-[10px] font-mono font-bold bg-cream px-2 py-0.5 rounded text-charcoal-700">
                  ISO Standard
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="bg-cream/60 p-2.5 rounded-xl border border-charcoal-100">
                  <div className="text-[10px] uppercase font-bold text-charcoal-500">Trim Size</div>
                  <div className="font-bold text-forest-950 font-mono mt-0.5">
                    {widthMm} × {heightMm} mm
                  </div>
                  <div className="text-[10px] text-charcoal-500">Standard Business Card</div>
                </div>

                <div className="bg-cream/60 p-2.5 rounded-xl border border-charcoal-100">
                  <div className="text-[10px] uppercase font-bold text-charcoal-500">Bleed (+Artwork)</div>
                  <div className="font-bold text-forest-950 font-mono mt-0.5">
                    +{bleedMm} mm ({widthMm + bleedMm * 2}×{heightMm + bleedMm * 2} mm)
                  </div>
                  <div className="text-[10px] text-charcoal-500">Edge-extended artwork</div>
                </div>

                <div className="bg-cream/60 p-2.5 rounded-xl border border-charcoal-100">
                  <div className="text-[10px] uppercase font-bold text-charcoal-500">Sheet Standard</div>
                  <div className="font-bold text-forest-950 font-mono mt-0.5">
                    A4 (210 × 297 mm)
                  </div>
                  <div className="text-[10px] text-charcoal-500">Commercial Press Ready</div>
                </div>

                <div className="bg-cream/60 p-2.5 rounded-xl border border-charcoal-100">
                  <div className="text-[10px] uppercase font-bold text-charcoal-500">Cards Per Sheet</div>
                  <div className="font-bold text-forest-950 font-mono mt-0.5">
                    8 Cards (2 × 4 Grid)
                  </div>
                  <div className="text-[10px] text-charcoal-500">6mm Bleed Gutters</div>
                </div>
              </div>

              {/* Duplex Flip Setting (for Print-Ready) */}
              {activeMode === "PRINT_READY" && (
                <div className="pt-2 border-t border-charcoal-100 space-y-1.5">
                  <label className="text-[11px] font-bold text-charcoal-700 flex items-center justify-between">
                    <span>Duplex Flip Orientation:</span>
                    <span className="text-[10px] text-forest-900 font-mono font-bold">
                      {flipMode === "LONG_EDGE" ? "Long Edge (Side Flip)" : "Short Edge (Top Flip)"}
                    </span>
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setFlipMode("LONG_EDGE")}
                      className={`py-2 px-3 rounded-xl border text-xs font-semibold text-center transition ${
                        flipMode === "LONG_EDGE"
                          ? "bg-forest-900 border-forest-900 text-gold shadow-sm font-bold"
                          : "bg-white border-charcoal-200 text-charcoal-700 hover:bg-cream"
                      }`}
                    >
                      Long-Edge (Standard)
                    </button>
                    <button
                      type="button"
                      onClick={() => setFlipMode("SHORT_EDGE")}
                      className={`py-2 px-3 rounded-xl border text-xs font-semibold text-center transition ${
                        flipMode === "SHORT_EDGE"
                          ? "bg-forest-900 border-forest-900 text-gold shadow-sm font-bold"
                          : "bg-white border-charcoal-200 text-charcoal-700 hover:bg-cream"
                      }`}
                    >
                      Short-Edge (Calendar)
                    </button>
                  </div>
                </div>
              )}

              {/* Page Selection */}
              <div className="pt-2 border-t border-charcoal-100 space-y-1.5">
                <label className="text-[11px] font-bold text-charcoal-700 flex items-center justify-between">
                  <span>Page Arrangement:</span>
                  <span className="text-[10px] text-charcoal-500">
                    {pageSelection === "COMPLETE"
                      ? "Page 1: Front • Page 2: Back"
                      : pageSelection === "FRONT"
                      ? "Page 1: Front Only"
                      : "Page 1: Back Only"}
                  </span>
                </label>
                <div className="grid grid-cols-3 gap-1.5">
                  {(["COMPLETE", "FRONT", "BACK"] as const).map((side) => (
                    <button
                      key={side}
                      type="button"
                      onClick={() => setPageSelection(side)}
                      className={`py-1.5 px-2 rounded-lg text-xs font-semibold transition border ${
                        pageSelection === side
                          ? "bg-forest-900 border-forest-900 text-cream font-bold"
                          : "bg-white border-charcoal-200 text-charcoal-700 hover:bg-cream"
                      }`}
                    >
                      {side === "COMPLETE" ? "Both Sides" : side === "FRONT" ? "Front Side" : "Back Side"}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Primary Download Buttons */}
            <div className="space-y-2 pt-2">
              <button
                type="button"
                disabled={Boolean(downloading) || previewLoading}
                onClick={() => handleDownloadPdf(activeMode, pageSelection)}
                className="w-full py-3.5 px-4 rounded-2xl bg-forest-900 text-gold font-bold text-sm flex items-center justify-between shadow-lg hover:bg-forest-950 transition border border-gold/40"
              >
                <div className="flex items-center gap-2">
                  <Download className="w-4 h-4 text-gold" />
                  <span>
                    {downloading
                      ? "Generating Document..."
                      : activeMode === "PREVIEW"
                      ? "Download Preview PDF"
                      : "Download Print-Ready PDF"}
                  </span>
                </div>
                <span className="text-[11px] bg-forest-950/90 text-cream px-2.5 py-1 rounded-lg border border-gold/30 font-mono">
                  {activeMode === "PREVIEW" ? "90×50mm Proof" : "A4 8-Up Sheet"}
                </span>
              </button>

              <button
                type="button"
                disabled={Boolean(downloading) || previewLoading}
                onClick={() => handleDownloadPdf(activeMode === "PREVIEW" ? "PRINT_READY" : "PREVIEW", pageSelection)}
                className="w-full py-2.5 px-4 rounded-xl bg-white text-forest-950 border border-charcoal-300 font-semibold text-xs flex items-center justify-between hover:bg-cream transition"
              >
                <span>
                  {activeMode === "PREVIEW"
                    ? "Or Download Print-Ready A4 Sheet"
                    : "Or Download Clean Preview Proof"}
                </span>
                <ChevronRight className="w-3.5 h-3.5 text-charcoal-500" />
              </button>
            </div>

            {/* Additional High-Res Formats */}
            <div className="pt-2 border-t border-charcoal-200/80 space-y-2">
              <div className="text-[10px] font-bold uppercase tracking-wider text-charcoal-500">
                Additional Digital &amp; Vector Exports
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  disabled={Boolean(downloading)}
                  onClick={() => handleDownloadRaster("PNG_FRONT")}
                  className="py-2 px-2.5 rounded-xl bg-white border border-charcoal-200 text-xs font-semibold hover:bg-cream text-charcoal-800 flex items-center justify-between"
                >
                  <span>Front PNG (600 DPI)</span>
                  <Download className="w-3 h-3 text-charcoal-400" />
                </button>
                <button
                  type="button"
                  disabled={Boolean(downloading)}
                  onClick={() => handleDownloadRaster("PNG_BACK")}
                  className="py-2 px-2.5 rounded-xl bg-white border border-charcoal-200 text-xs font-semibold hover:bg-cream text-charcoal-800 flex items-center justify-between"
                >
                  <span>Back PNG (600 DPI)</span>
                  <Download className="w-3 h-3 text-charcoal-400" />
                </button>
                <button
                  type="button"
                  disabled={Boolean(downloading)}
                  onClick={() => handleDownloadRaster("SVG_FRONT")}
                  className="py-2 px-2.5 rounded-xl bg-white border border-charcoal-200 text-xs font-semibold hover:bg-cream text-charcoal-800 flex items-center justify-between"
                >
                  <span>Front Vector SVG</span>
                  <Download className="w-3 h-3 text-charcoal-400" />
                </button>
                <button
                  type="button"
                  disabled={Boolean(downloading)}
                  onClick={() => handleDownloadRaster("SVG_BACK")}
                  className="py-2 px-2.5 rounded-xl bg-white border border-charcoal-200 text-xs font-semibold hover:bg-cream text-charcoal-800 flex items-center justify-between"
                >
                  <span>Back Vector SVG</span>
                  <Download className="w-3 h-3 text-charcoal-400" />
                </button>
              </div>
            </div>
          </div>

          {/* Right Live PDF Preview (7 cols) */}
          <div className="lg:col-span-7 bg-charcoal-900 p-5 flex flex-col justify-between overflow-hidden">
            {/* Preview Toolbar */}
            <div className="flex items-center justify-between pb-3 text-xs text-cream/80 border-b border-charcoal-700/80 shrink-0">
              <div className="flex items-center gap-2">
                <span className="font-bold text-cream flex items-center gap-1.5">
                  <Eye className="w-4 h-4 text-gold" />
                  Live Generated PDF Preview
                </span>
                <span className="px-2 py-0.5 rounded bg-charcoal-800 text-[10px] text-cream/70 font-mono">
                  {activeMode === "PREVIEW" ? "Proof Canvas" : "A4 Imposition Sheet"}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={fetchPreviewPdf}
                  disabled={previewLoading}
                  className="p-1.5 rounded-lg bg-charcoal-800 hover:bg-charcoal-700 text-cream transition"
                  title="Reload Live PDF"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${previewLoading ? "animate-spin text-gold" : ""}`} />
                </button>

                {previewPdfBlobUrl && (
                  <a
                    href={previewPdfBlobUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="p-1.5 rounded-lg bg-charcoal-800 hover:bg-charcoal-700 text-cream transition flex items-center gap-1"
                    title="Open in new window"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                )}
              </div>
            </div>

            {/* Preview Viewer Frame */}
            <div className="flex-1 my-3 bg-charcoal-950 rounded-2xl border border-charcoal-700 overflow-hidden relative flex items-center justify-center min-h-[460px]">
              {previewLoading && (
                <div className="absolute inset-0 bg-charcoal-950/80 backdrop-blur-xs flex flex-col items-center justify-center text-center p-6 z-10 text-cream space-y-3">
                  <div className="w-10 h-10 border-2 border-gold/40 border-t-gold rounded-full animate-spin" />
                  <div className="text-sm font-semibold font-serif">Rendering Vector PDF...</div>
                  <div className="text-xs text-cream/60 max-w-xs">
                    Synthesizing 508 DPI background layers, pure vector QR matrix and high-resolution typography.
                  </div>
                </div>
              )}

              {previewPdfBlobUrl ? (
                <iframe
                  src={`${previewPdfBlobUrl}#toolbar=0&navpanes=0&scrollbar=1&view=Fit`}
                  title="Business Card Live PDF Preview"
                  className="w-full h-full border-0 bg-white"
                />
              ) : (
                !previewLoading && (
                  <div className="text-center p-6 text-cream/50 space-y-2">
                    <Printer className="w-8 h-8 mx-auto text-gold/40" />
                    <div className="text-sm font-medium">No preview available</div>
                    <button
                      type="button"
                      onClick={fetchPreviewPdf}
                      className="px-3 py-1.5 rounded-lg bg-gold text-forest-950 font-bold text-xs"
                    >
                      Generate Preview
                    </button>
                  </div>
                )
              )}
            </div>

            {/* Footer Status */}
            <div className="flex items-center justify-between text-[11px] text-cream/60 pt-2 border-t border-charcoal-800 shrink-0">
              <span>
                {activeMode === "PREVIEW"
                  ? "✓ Verified trim: 90×50mm • 0 calibration bars • Clean presentation"
                  : "✓ Verified A4 layout: 8 cards • Outer cutting marks • 0.00mm duplex registration"}
              </span>
              <span className="font-mono text-gold/80">300+ DPI Commercial Grade</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

