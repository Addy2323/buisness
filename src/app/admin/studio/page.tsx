"use client";

import React, { useEffect, useState, useCallback, Suspense, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Palette,
  Type,
  QrCode,
  Image as ImageIcon,
  Square,
  Minus,
  Sparkles,
  Undo2,
  Redo2,
  Save,
  Copy,
  Download,
  Printer,
  Layers,
  Eye,
  EyeOff,
  Lock,
  Unlock,
  Trash2,
  ArrowUp,
  ArrowDown,
  AlignLeft,
  AlignCenter,
  AlignRight,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Box,
  Grid,
  Wand2,
  Upload,
  Award,
  RefreshCw,
} from "lucide-react";
import { CardCanvasRenderer } from "@/components/studio/CardCanvasRenderer";
import { Card3DPreview } from "@/components/studio/Card3DPreview";
import { PdfExportModal } from "@/components/studio/PdfExportModal";
import { HEZLON_TEMPLATES } from "@/lib/templates-catalog";
import {
  CanvasElement,
  CardBackground,
  CardSide,
  CompanyInfoState,
  CornerStyle,
  FontFamilyOption,
  IconChoice,
  PaperFinish,
  PrintValidationReport,
} from "@/types/studio";

const FONT_OPTIONS: FontFamilyOption[] = [
  "Cinzel",
  "Playfair Display",
  "Cormorant Garamond",
  "Montserrat",
  "Space Grotesk",
  "Inter",
  "JetBrains Mono",
];

const LUXURY_SWATCHES = [
  "#0D2B22", // Deep Forest Green
  "#133B2E", // Rich Emerald
  "#28634E", // Viridian
  "#C9A96E", // Champagne Gold
  "#D4AF37", // Metallic Gold
  "#8F6E39", // Antique Bronze
  "#F8F5EE", // Warm Cream
  "#EFE9DB", // Cotton Ivory
  "#FFFFFF", // Pure Alabaster
  "#1A1D1C", // Charcoal
  "#0E100F", // Jet Obsidian
];

interface HistorySnapshot {
  frontBg: CardBackground;
  backBg: CardBackground;
  frontElements: CanvasElement[];
  backElements: CanvasElement[];
}

function StudioEditorContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialDesignId = searchParams.get("designId");
  const initialTemplateSlug = searchParams.get("template");

  // Card Document State
  const [designId, setDesignId] = useState<string | null>(initialDesignId);
  const [designName, setDesignName] = useState("HEZLON Executive Card");
  const [widthMm, setWidthMm] = useState(90);
  const [heightMm, setHeightMm] = useState(50);
  const [bleedMm, setBleedMm] = useState(3);
  const [safeMarginMm, setSafeMarginMm] = useState(5);
  const [isDoubleSided, setIsDoubleSided] = useState(true);
  const [paperFinish, setPaperFinish] = useState<PaperFinish>("SOFT_TOUCH");
  const [cornerStyle, setCornerStyle] = useState<CornerStyle>("SQUARE");
  const [status, setStatus] = useState<"DRAFT" | "APPROVED">("DRAFT");

  // Active Canvas Side & View Mode
  const [activeSide, setActiveSide] = useState<CardSide>("FRONT");
  const [viewMode, setViewMode] = useState<"SPLIT" | "2D" | "3D">("SPLIT");
  const [showPrintGuides, setShowPrintGuides] = useState(true);
  const [selectedElementId, setSelectedElementId] = useState<string | null>(
    null
  );
  const [activeLeftTab, setActiveLeftTab] = useState<
    "ADD" | "TEMPLATES" | "BACKGROUND" | "LAYERS" | "AI" | "PRINT"
  >("ADD");

  // Front & Back Canvas States
  const defaultTpl = HEZLON_TEMPLATES[0];
  const [frontBg, setFrontBg] = useState<CardBackground>(defaultTpl.frontBg);
  const [backBg, setBackBg] = useState<CardBackground>(defaultTpl.backBg);
  const [frontElements, setFrontElements] = useState<CanvasElement[]>(
    defaultTpl.frontElements
  );
  const [backElements, setBackElements] = useState<CanvasElement[]>(
    defaultTpl.backElements
  );

  // Company Info State for live binding
  const [companyInfo, setCompanyInfo] = useState<Partial<CompanyInfoState>>({
    companyName: "HEZLON Building Solutions",
    professionalTitle: "Aluminum & Glass Specialist",
    phone: "0673 571 344",
    email: "Casrycasry40@gmail.com",
    description:
      "HEZLON Building Solutions provides aluminium doors and windows, glass installation, office partitions, balustrades, curtains, and other building solutions.",
    instagram: "https://www.instagram.com/hezlon_building_solution/",
    facebook: "https://www.facebook.com/share/1CXYh7WkFm/",
  });

  // Undo / Redo History Stack
  const [history, setHistory] = useState<HistorySnapshot[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  // Save, Autosave & Export State
  const [saving, setSaving] = useState(false);
  const [lastSavedText, setLastSavedText] = useState<string>("Ready");
  const [exportingFormat, setExportingFormat] = useState<string | null>(null);
  const [isPdfModalOpen, setIsPdfModalOpen] = useState(false);
  const [duplexFlipMode, setDuplexFlipMode] = useState<"LONG_EDGE" | "SHORT_EDGE">("LONG_EDGE");
  const [exportSuccessBanner, setExportSuccessBanner] = useState<string | null>(null);
  const [validationReport, setValidationReport] =
    useState<PrintValidationReport | null>(null);
  const [aiRecommendationNote, setAiRecommendationNote] = useState<string>("");

  const logoInputRef = useRef<HTMLInputElement>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);

  const pushHistory = useCallback(
    (
      nextFrontBg: CardBackground,
      nextBackBg: CardBackground,
      nextFrontEl: CanvasElement[],
      nextBackEl: CanvasElement[]
    ) => {
      const snap: HistorySnapshot = {
        frontBg: JSON.parse(JSON.stringify(nextFrontBg)),
        backBg: JSON.parse(JSON.stringify(nextBackBg)),
        frontElements: JSON.parse(JSON.stringify(nextFrontEl)),
        backElements: JSON.parse(JSON.stringify(nextBackEl)),
      };
      setHistory((prev) => {
        const sliced = prev.slice(0, historyIndex + 1);
        return [...sliced.slice(-24), snap];
      });
      setHistoryIndex((prev) => Math.min(prev + 1, 24));
    },
    [historyIndex]
  );

  // Load initial company profile + template or saved design
  useEffect(() => {
    fetch("/api/admin/company")
      .then((r) => r.json())
      .then((res) => {
        if (res.company) {
          setCompanyInfo(res.company);
        }
      })
      .catch(() => {});

    if (initialDesignId) {
      fetch(`/api/admin/designs?id=${initialDesignId}`)
        .then((r) => r.json())
        .then((res) => {
          if (res.design) {
            const d = res.design;
            setDesignId(d.id);
            setDesignName(d.name);
            setWidthMm(d.widthMm);
            setHeightMm(d.heightMm);
            setBleedMm(d.bleedMm);
            setSafeMarginMm(d.safeMarginMm);
            setIsDoubleSided(d.isDoubleSided);
            setPaperFinish(d.paperFinish);
            setCornerStyle(d.cornerStyle);
            setStatus(d.status === "APPROVED" ? "APPROVED" : "DRAFT");
            setFrontBg(d.frontBg);
            setBackBg(d.backBg);
            setFrontElements(d.frontElements);
            setBackElements(d.backElements);
            if (d.lastValidation?.issues) {
              setValidationReport(d.lastValidation);
            }
            setHistory([
              {
                frontBg: d.frontBg,
                backBg: d.backBg,
                frontElements: d.frontElements,
                backElements: d.backElements,
              },
            ]);
            setHistoryIndex(0);
          }
        });
    } else if (initialTemplateSlug) {
      const found = HEZLON_TEMPLATES.find(
        (t) => t.slug === initialTemplateSlug
      );
      if (found) {
        setDesignName(`HEZLON — ${found.name}`);
        setWidthMm(found.widthMm);
        setHeightMm(found.heightMm);
        setIsDoubleSided(found.isDoubleSided);
        setPaperFinish(found.paperFinish);
        setCornerStyle(found.cornerStyle);
        setFrontBg(JSON.parse(JSON.stringify(found.frontBg)));
        setBackBg(JSON.parse(JSON.stringify(found.backBg)));
        setFrontElements(JSON.parse(JSON.stringify(found.frontElements)));
        setBackElements(JSON.parse(JSON.stringify(found.backElements)));
        setHistory([
          {
            frontBg: found.frontBg,
            backBg: found.backBg,
            frontElements: found.frontElements,
            backElements: found.backElements,
          },
        ]);
        setHistoryIndex(0);
      }
    } else {
      setHistory([
        {
          frontBg: defaultTpl.frontBg,
          backBg: defaultTpl.backBg,
          frontElements: defaultTpl.frontElements,
          backElements: defaultTpl.backElements,
        },
      ]);
      setHistoryIndex(0);
    }
  }, [initialDesignId, initialTemplateSlug, defaultTpl]);

  // Run pre-flight print validation whenever elements or dimensions change
  useEffect(() => {
    const timer = setTimeout(() => {
      fetch("/api/admin/export-pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          format: "VALIDATE_ONLY",
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
        }),
      })
        .then((r) => r.json())
        .then((res) => {
          if (res.validation) setValidationReport(res.validation);
        })
        .catch(() => {});
    }, 500);
    return () => clearTimeout(timer);
  }, [
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
  ]);

  // Autosave when designId exists
  useEffect(() => {
    if (!designId) return;
    const autoTimer = setTimeout(async () => {
      try {
        const res = await fetch("/api/admin/designs", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: designId,
            name: designName,
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
            status,
            isAutosave: true,
          }),
        });
        if (res.ok) {
          setLastSavedText(
            `Autosaved ${new Date().toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })}`
          );
        }
      } catch {
        // ignore background autosave network blip
      }
    }, 3500);

    return () => clearTimeout(autoTimer);
  }, [
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
    status,
  ]);

  const currentElements = activeSide === "FRONT" ? frontElements : backElements;
  const currentBg = activeSide === "FRONT" ? frontBg : backBg;
  const selectedElement =
    currentElements.find((el) => el.id === selectedElementId) || null;

  const updateCurrentElements = (
    updater: (prev: CanvasElement[]) => CanvasElement[]
  ) => {
    if (activeSide === "FRONT") {
      const next = updater(frontElements);
      setFrontElements(next);
      pushHistory(frontBg, backBg, next, backElements);
    } else {
      const next = updater(backElements);
      setBackElements(next);
      pushHistory(frontBg, backBg, frontElements, next);
    }
  };

  const handleUpdateElement = (id: string, patch: Partial<CanvasElement>) => {
    if (activeSide === "FRONT") {
      setFrontElements((prev) =>
        prev.map((el) => (el.id === id ? { ...el, ...patch } : el))
      );
    } else {
      setBackElements((prev) =>
        prev.map((el) => (el.id === id ? { ...el, ...patch } : el))
      );
    }
  };

  const handleUndo = () => {
    if (historyIndex <= 0) return;
    const prevIdx = historyIndex - 1;
    const snap = history[prevIdx];
    if (!snap) return;
    setFrontBg(snap.frontBg);
    setBackBg(snap.backBg);
    setFrontElements(snap.frontElements);
    setBackElements(snap.backElements);
    setHistoryIndex(prevIdx);
  };

  const handleRedo = () => {
    if (historyIndex >= history.length - 1) return;
    const nextIdx = historyIndex + 1;
    const snap = history[nextIdx];
    if (!snap) return;
    setFrontBg(snap.frontBg);
    setBackBg(snap.backBg);
    setFrontElements(snap.frontElements);
    setBackElements(snap.backElements);
    setHistoryIndex(nextIdx);
  };

  // Add New Element Helpers
  const addElement = (partial: Partial<CanvasElement>) => {
    const newEl: CanvasElement = {
      id: `el-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      type: partial.type || "text",
      label: partial.label || "Layer",
      xMm: partial.xMm ?? 15,
      yMm: partial.yMm ?? 15,
      widthMm: partial.widthMm ?? 45,
      heightMm: partial.heightMm ?? 6,
      rotation: 0,
      zIndex: currentElements.length + 1,
      ...partial,
    };
    updateCurrentElements((prev) => [...prev, newEl]);
    setSelectedElementId(newEl.id);
  };

  const handleUploadImageAsset = async (
    file: File,
    type: "logo" | "photo"
  ) => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("purpose", type);

    const res = await fetch("/api/admin/upload", {
      method: "POST",
      body: formData,
    });
    const data = await res.json();
    if (res.ok && (data.dataUrl || data.url)) {
      addElement({
        type,
        label: type === "logo" ? "HEZLON Logo" : "Company Photograph",
        xMm: 10,
        yMm: 10,
        widthMm: type === "logo" ? 18 : 24,
        heightMm: type === "logo" ? 18 : 24,
        imageUrl: data.dataUrl || data.url,
        objectFit: type === "logo" ? "contain" : "cover",
      });
    }
  };

  // Save or Duplicate Design
  const handleSaveDesign = async (targetStatus: "DRAFT" | "APPROVED" = status) => {
    setSaving(true);
    try {
      const method = designId ? "PUT" : "POST";
      const res = await fetch("/api/admin/designs", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: designId || undefined,
          name: designName,
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
          status: targetStatus,
        }),
      });
      const data = await res.json();
      if (res.ok && data.design) {
        setDesignId(data.design.id);
        setStatus(targetStatus);
        setLastSavedText(
          `Saved (${targetStatus}) at ${new Date().toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          })}`
        );
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDuplicateCurrent = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/admin/designs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: `${designName} (Copy)`,
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
          status: "DRAFT",
        }),
      });
      const data = await res.json();
      if (res.ok && data.design) {
        setDesignId(data.design.id);
        setDesignName(data.design.name);
        setLastSavedText("Duplicated as new draft");
      }
    } finally {
      setSaving(false);
    }
  };

  // Export Print-Ready Production File
  const handleExportAsset = async (
    format:
      | "PDF_PREVIEW"
      | "PDF_PREVIEW_FRONT"
      | "PDF_PREVIEW_BACK"
      | "PDF_PRINT_READY"
      | "PDF_COMPLETE"
      | "PDF_FRONT"
      | "PDF_BACK"
      | "PNG_FRONT"
      | "PNG_BACK"
      | "SVG_FRONT"
      | "SVG_BACK"
  ) => {
    setExportingFormat(format);
    setExportSuccessBanner(null);
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
          flipMode: duplexFlipMode,
          includeBleed: true,
          disposition: "attachment",
        }),
      });

      if (res.ok) {
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        const ext = format.startsWith("PDF")
          ? "pdf"
          : format.startsWith("PNG")
          ? "png"
          : "svg";
        const filename = `${designName
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")}-${format.toLowerCase().replace(/_/g, "-")}.${ext}`;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        setExportSuccessBanner(`Successfully generated & downloaded ${filename}`);
      }
    } finally {
      setExportingFormat(null);
    }
  };

  // AI-Assisted Smart Recommendations using real HEZLON data
  const applySmartRecommendation = (
    mode:
      | "SYNC_COMPANY_DATA"
      | "SAFE_MARGIN_FIX"
      | "FOREST_GOLD_HARMONY"
      | "ARCHITECTURAL_HIERARCHY"
  ) => {
    if (mode === "SYNC_COMPANY_DATA") {
      const syncSide = (els: CanvasElement[]) =>
        els.map((el) => {
          if (el.bindField === "companyName" && companyInfo.companyName) {
            return { ...el, text: companyInfo.companyName };
          }
          if (
            el.bindField === "professionalTitle" &&
            companyInfo.professionalTitle
          ) {
            return { ...el, text: companyInfo.professionalTitle };
          }
          if (el.bindField === "phone" && companyInfo.phone) {
            return { ...el, text: companyInfo.phone };
          }
          if (el.bindField === "email" && companyInfo.email) {
            return { ...el, text: companyInfo.email };
          }
          return el;
        });
      const nf = syncSide(frontElements);
      const nb = syncSide(backElements);
      setFrontElements(nf);
      setBackElements(nb);
      pushHistory(frontBg, backBg, nf, nb);
      setAiRecommendationNote(
        "Synchronized all bound text layers with live HEZLON Building Solutions company profile."
      );
    } else if (mode === "SAFE_MARGIN_FIX") {
      const clampSide = (els: CanvasElement[]) =>
        els.map((el) => {
          if (!["text", "qr", "monogram", "logo"].includes(el.type)) return el;
          const xMm = Math.max(
            safeMarginMm,
            Math.min(widthMm - safeMarginMm - el.widthMm, el.xMm)
          );
          const yMm = Math.max(
            safeMarginMm,
            Math.min(heightMm - safeMarginMm - el.heightMm, el.yMm)
          );
          return {
            ...el,
            xMm: Number(xMm.toFixed(1)),
            yMm: Number(yMm.toFixed(1)),
          };
        });
      const nf = clampSide(frontElements);
      const nb = clampSide(backElements);
      setFrontElements(nf);
      setBackElements(nb);
      pushHistory(frontBg, backBg, nf, nb);
      setAiRecommendationNote(
        `Aligned all text, logos, and QR modules inside the ${safeMarginMm}mm safe printing margin.`
      );
    } else if (mode === "FOREST_GOLD_HARMONY") {
      const nextFrontBg: CardBackground = {
        type: "luxury-border",
        primaryColor: "#0D2B22",
        secondaryColor: "#133B2E",
        accentColor: "#C9A96E",
        borderInsetMm: 4.5,
        borderWidthMm: 0.35,
      };
      const nextBackBg: CardBackground = {
        type: "solid",
        primaryColor: "#F8F5EE",
        accentColor: "#0D2B22",
      };
      setFrontBg(nextFrontBg);
      setBackBg(nextBackBg);
      pushHistory(nextFrontBg, nextBackBg, frontElements, backElements);
      setAiRecommendationNote(
        "Applied Deep Forest Green (#0D2B22), Warm Cream (#F8F5EE) & Champagne Gold (#C9A96E) executive palette."
      );
    } else if (mode === "ARCHITECTURAL_HIERARCHY") {
      const nf = frontElements.map((el) => {
        if (el.bindField === "companyName") {
          return {
            ...el,
            fontFamily: "Cinzel" as FontFamilyOption,
            fontWeight: "700" as const,
            letterSpacingEm: 0.16,
          };
        }
        if (el.bindField === "professionalTitle") {
          return {
            ...el,
            fontFamily: "Cormorant Garamond" as FontFamilyOption,
            fontStyle: "italic" as const,
          };
        }
        return el;
      });
      setFrontElements(nf);
      pushHistory(frontBg, backBg, nf, backElements);
      setAiRecommendationNote(
        "Refined typographic hierarchy with classical Cinzel headers and Cormorant Garamond specialist subtitles."
      );
    }
  };

  return (
    <div className="space-y-4">
      {/* 1. Top Studio Command Bar */}
      <div className="bg-forest-950 text-cream rounded-2xl p-4 border border-gold/30 shadow-luxury flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-forest-800 border border-gold flex items-center justify-center text-gold">
            <Palette className="w-4 h-4" />
          </div>
          <div>
            <input
              type="text"
              value={designName}
              onChange={(e) => setDesignName(e.target.value)}
              className="bg-transparent border-b border-transparent hover:border-gold/40 focus:border-gold text-base font-serif font-bold text-cream focus:outline-none px-1"
            />
            <div className="flex items-center gap-3 text-[11px] text-cream/65 px-1">
              <span>{lastSavedText}</span>
              <span>•</span>
              <span className="text-gold font-mono">
                {widthMm}×{heightMm}mm (+{bleedMm}mm bleed)
              </span>
            </div>
          </div>
        </div>

        {/* Center Undo/Redo, Guides & View Mode Switcher */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={historyIndex <= 0}
            onClick={handleUndo}
            title="Undo"
            className="p-2 rounded-lg bg-forest-900 border border-gold/25 text-cream hover:text-gold disabled:opacity-35"
          >
            <Undo2 className="w-4 h-4" />
          </button>
          <button
            type="button"
            disabled={historyIndex >= history.length - 1}
            onClick={handleRedo}
            title="Redo"
            className="p-2 rounded-lg bg-forest-900 border border-gold/25 text-cream hover:text-gold disabled:opacity-35"
          >
            <Redo2 className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={() => setShowPrintGuides((v) => !v)}
            className={`px-3 py-1.5 rounded-lg border text-xs font-semibold flex items-center gap-1.5 transition ${
              showPrintGuides
                ? "bg-emerald-950/90 border-emerald-400 text-emerald-200"
                : "bg-forest-900 border-gold/25 text-cream/70"
            }`}
          >
            <Grid className="w-3.5 h-3.5" />
            <span>Margins &amp; Bleed</span>
          </button>

          <div className="flex rounded-lg bg-forest-900 p-0.5 border border-gold/25 text-xs">
            {(["2D", "SPLIT", "3D"] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setViewMode(m)}
                className={`px-2.5 py-1 rounded-md font-bold transition ${
                  viewMode === m
                    ? "bg-gold text-forest-950"
                    : "text-cream/75 hover:text-cream"
                }`}
              >
                {m === "SPLIT" ? "2D + 3D Live" : `${m} View`}
              </button>
            ))}
          </div>
        </div>

        {/* Right Save, Duplicate, Export PDF & Order Print Buttons */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={saving}
            onClick={() => handleSaveDesign("DRAFT")}
            className="px-3.5 py-2 rounded-xl bg-forest-900 border border-gold/35 text-cream text-xs font-semibold hover:border-gold flex items-center gap-1.5"
          >
            <Save className="w-3.5 h-3.5 text-gold" />
            <span>{saving ? "Saving..." : "Save Draft"}</span>
          </button>

          <button
            type="button"
            disabled={saving}
            onClick={handleDuplicateCurrent}
            title="Duplicate Design"
            className="p-2 rounded-xl bg-forest-900 border border-gold/25 text-cream hover:text-gold"
          >
            <Copy className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={() => setIsPdfModalOpen(true)}
            className="px-4 py-2 rounded-xl bg-gold text-forest-950 font-bold text-xs uppercase tracking-wider hover:bg-gold-300 transition flex items-center gap-1.5 shadow-gold-glow"
          >
            <Eye className="w-3.5 h-3.5" />
            <span>PDF Preview &amp; Export</span>
          </button>

          <button
            type="button"
            onClick={async () => {
              await handleSaveDesign("APPROVED");
              router.push(
                `/admin/orders${designId ? `?designId=${designId}` : ""}`
              );
            }}
            className="px-3.5 py-2 rounded-xl bg-emerald-700 text-white font-bold text-xs uppercase tracking-wider hover:bg-emerald-600 transition flex items-center gap-1.5"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Order Prints</span>
          </button>
        </div>
      </div>

      {/* 2. Main 3-Column Studio Workspace */}
      <div className="grid lg:grid-cols-12 gap-5 items-start">
        {/* LEFT PANEL: Tools, Templates, Background, Layers, AI & Print Validation */}
        <div className="lg:col-span-3 bg-white rounded-2xl border border-charcoal-100 shadow-sm overflow-hidden">
          {/* Tab Strip */}
          <div className="grid grid-cols-6 border-b border-charcoal-100 bg-cream/60 text-[10px] font-bold uppercase">
            {[
              { id: "ADD", label: "Add", icon: Type },
              { id: "TEMPLATES", label: "Presets", icon: Sparkles },
              { id: "BACKGROUND", label: "Bg", icon: Palette },
              { id: "LAYERS", label: "Layers", icon: Layers },
              { id: "AI", label: "Smart", icon: Wand2 },
              { id: "PRINT", label: "Print", icon: Printer },
            ].map((t) => {
              const Icon = t.icon;
              const active = activeLeftTab === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() =>
                    setActiveLeftTab(
                      t.id as
                        | "ADD"
                        | "TEMPLATES"
                        | "BACKGROUND"
                        | "LAYERS"
                        | "AI"
                        | "PRINT"
                    )
                  }
                  className={`py-2.5 flex flex-col items-center justify-center gap-1 border-b-2 transition ${
                    active
                      ? "border-forest-900 bg-white text-forest-950"
                      : "border-transparent text-charcoal-500 hover:text-forest-900"
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{t.label}</span>
                </button>
              );
            })}
          </div>

          <div className="p-4 space-y-4 max-h-[640px] overflow-y-auto">
            {/* TAB 1: ADD ELEMENTS */}
            {activeLeftTab === "ADD" && (
              <div className="space-y-4">
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-forest-900 mb-2">
                    Add HEZLON Information Layers
                  </h3>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        addElement({
                          type: "text",
                          label: "Company Name",
                          bindField: "companyName",
                          text:
                            companyInfo.companyName ||
                            "HEZLON BUILDING SOLUTIONS",
                          fontFamily: "Cinzel",
                          fontSizePt: 10,
                          fontWeight: "700",
                          color: "#C9A96E",
                          widthMm: 60,
                          heightMm: 6,
                        })
                      }
                      className="p-2.5 rounded-xl border border-charcoal-200 hover:border-forest-800 text-left text-xs font-semibold text-forest-950 bg-cream/40"
                    >
                      + Company Name
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        addElement({
                          type: "text",
                          label: "Specialist Title",
                          bindField: "professionalTitle",
                          text:
                            companyInfo.professionalTitle ||
                            "Aluminum & Glass Specialist",
                          fontFamily: "Cormorant Garamond",
                          fontSizePt: 8.5,
                          fontStyle: "italic",
                          color: "#C9A96E",
                          widthMm: 50,
                          heightMm: 5,
                        })
                      }
                      className="p-2.5 rounded-xl border border-charcoal-200 hover:border-forest-800 text-left text-xs font-semibold text-forest-950 bg-cream/40"
                    >
                      + Specialist Title
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        addElement({
                          type: "text",
                          label: "Phone Number",
                          bindField: "phone",
                          text: companyInfo.phone || "0673 571 344",
                          fontFamily: "Inter",
                          fontSizePt: 8,
                          fontWeight: "600",
                          color: "#FFFFFF",
                          widthMm: 40,
                          heightMm: 5,
                        })
                      }
                      className="p-2.5 rounded-xl border border-charcoal-200 hover:border-forest-800 text-left text-xs font-semibold text-forest-950 bg-cream/40"
                    >
                      + Phone Number
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        addElement({
                          type: "text",
                          label: "Email Address",
                          bindField: "email",
                          text: companyInfo.email || "Casrycasry40@gmail.com",
                          fontFamily: "Inter",
                          fontSizePt: 7,
                          color: "#FFFFFF",
                          widthMm: 45,
                          heightMm: 5,
                        })
                      }
                      className="p-2.5 rounded-xl border border-charcoal-200 hover:border-forest-800 text-left text-xs font-semibold text-forest-950 bg-cream/40"
                    >
                      + Email Address
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        addElement({
                          type: "text",
                          label: "Custom Text",
                          bindField: "custom",
                          text: "Doors • Windows • Glass • Partitions",
                          fontFamily: "Inter",
                          fontSizePt: 6.5,
                          color: "#C9A96E",
                          widthMm: 55,
                          heightMm: 5,
                        })
                      }
                      className="p-2.5 rounded-xl border border-charcoal-200 hover:border-forest-800 text-left text-xs font-semibold text-forest-950 bg-cream/40 col-span-2"
                    >
                      + Custom Text / Services Line
                    </button>
                  </div>
                </div>

                {/* Permanent QR & Crest Monogram */}
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-forest-900 mb-2">
                    QR Code, Crest &amp; Media Uploads
                  </h3>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        addElement({
                          type: "qr",
                          label: "Permanent QR Code",
                          xMm: 63,
                          yMm: 14,
                          widthMm: 20,
                          heightMm: 20,
                          qrForeground: "#111111",
                          qrBackground: "#FFFFFF",
                          qrIncludeLogo: false,
                          qrFrameStyle: "thin-gold",
                        })
                      }
                      className="p-3 rounded-xl bg-forest-900 text-gold font-bold text-xs flex flex-col items-center gap-1.5 hover:bg-forest-800"
                    >
                      <QrCode className="w-5 h-5" />
                      <span>+ Permanent QR</span>
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        addElement({
                          type: "monogram",
                          label: "HEZLON Crest",
                          xMm: 38,
                          yMm: 10,
                          widthMm: 14,
                          heightMm: 14,
                          monogramText: "H",
                          badgeStyle: "circle-gold",
                          color: "#C9A96E",
                          fillColor: "#133B2E",
                          strokeColor: "#C9A96E",
                        })
                      }
                      className="p-3 rounded-xl bg-forest-900 text-gold font-bold text-xs flex flex-col items-center gap-1.5 hover:bg-forest-800"
                    >
                      <Award className="w-5 h-5" />
                      <span>+ H Monogram</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => logoInputRef.current?.click()}
                      className="p-2.5 rounded-xl border border-charcoal-200 hover:border-forest-800 text-xs font-semibold text-forest-950 flex items-center justify-center gap-1.5"
                    >
                      <Upload className="w-3.5 h-3.5 text-gold-700" />
                      <span>Upload Logo</span>
                    </button>
                    <input
                      ref={logoInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) handleUploadImageAsset(f, "logo");
                      }}
                    />

                    <button
                      type="button"
                      onClick={() => photoInputRef.current?.click()}
                      className="p-2.5 rounded-xl border border-charcoal-200 hover:border-forest-800 text-xs font-semibold text-forest-950 flex items-center justify-center gap-1.5"
                    >
                      <ImageIcon className="w-3.5 h-3.5 text-gold-700" />
                      <span>Upload Photo</span>
                    </button>
                    <input
                      ref={photoInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) handleUploadImageAsset(f, "photo");
                      }}
                    />
                  </div>
                </div>

                {/* Architectural Shapes, Lines & Icons */}
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-forest-900 mb-2">
                    Shapes, Borders &amp; Icons
                  </h3>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        addElement({
                          type: "line",
                          label: "Gold Divider Line",
                          xMm: 15,
                          yMm: 25,
                          widthMm: 40,
                          heightMm: 0.4,
                          fillColor: "#C9A96E",
                        })
                      }
                      className="p-2 rounded-xl border border-charcoal-200 hover:border-forest-800 text-[11px] font-semibold flex flex-col items-center gap-1"
                    >
                      <Minus className="w-4 h-4 text-gold-700" />
                      <span>Gold Line</span>
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        addElement({
                          type: "shape",
                          label: "Border Frame",
                          shapeVariant: "frame",
                          xMm: 5,
                          yMm: 5,
                          widthMm: widthMm - 10,
                          heightMm: heightMm - 10,
                          strokeColor: "#C9A96E",
                          strokeWidthMm: 0.35,
                        })
                      }
                      className="p-2 rounded-xl border border-charcoal-200 hover:border-forest-800 text-[11px] font-semibold flex flex-col items-center gap-1"
                    >
                      <Square className="w-4 h-4 text-gold-700" />
                      <span>Frame</span>
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        addElement({
                          type: "shape",
                          label: "Solid Block",
                          shapeVariant: "rect",
                          xMm: 0,
                          yMm: 0,
                          widthMm: 25,
                          heightMm: heightMm,
                          fillColor: "#133B2E",
                        })
                      }
                      className="p-2 rounded-xl border border-charcoal-200 hover:border-forest-800 text-[11px] font-semibold flex flex-col items-center gap-1"
                    >
                      <Box className="w-4 h-4 text-forest-800" />
                      <span>Panel</span>
                    </button>
                  </div>

                  {/* Quick Icons */}
                  <div className="grid grid-cols-4 gap-1.5 mt-2">
                    {(
                      [
                        "phone",
                        "mail",
                        "globe",
                        "map-pin",
                        "instagram",
                        "facebook",
                        "building",
                        "shield",
                      ] as IconChoice[]
                    ).map((ico) => (
                      <button
                        key={ico}
                        type="button"
                        onClick={() =>
                          addElement({
                            type: "icon",
                            label: `Icon (${ico})`,
                            iconName: ico,
                            xMm: 10,
                            yMm: 20,
                            widthMm: 5,
                            heightMm: 5,
                            color: "#C9A96E",
                          })
                        }
                        className="py-1.5 px-2 rounded-lg bg-cream hover:bg-gold/20 text-[10px] font-mono text-charcoal-700 capitalize"
                      >
                        {ico}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: QUICK TEMPLATE SWITCHER */}
            {activeLeftTab === "TEMPLATES" && (
              <div className="space-y-2.5">
                <div className="text-xs font-bold uppercase tracking-wider text-forest-900">
                  Apply Any of 20 HEZLON Templates
                </div>
                {HEZLON_TEMPLATES.map((tpl) => (
                  <button
                    key={tpl.slug}
                    type="button"
                    onClick={() => {
                      setDesignName(`HEZLON — ${tpl.name}`);
                      setPaperFinish(tpl.paperFinish);
                      setCornerStyle(tpl.cornerStyle);
                      const nfBg = JSON.parse(JSON.stringify(tpl.frontBg));
                      const nbBg = JSON.parse(JSON.stringify(tpl.backBg));
                      const nfEl = JSON.parse(JSON.stringify(tpl.frontElements));
                      const nbEl = JSON.parse(JSON.stringify(tpl.backElements));
                      setFrontBg(nfBg);
                      setBackBg(nbBg);
                      setFrontElements(nfEl);
                      setBackElements(nbEl);
                      pushHistory(nfBg, nbBg, nfEl, nbEl);
                    }}
                    className="w-full p-2.5 rounded-xl border border-charcoal-100 hover:border-gold bg-cream/40 text-left flex items-center justify-between transition"
                  >
                    <div>
                      <div className="text-xs font-bold text-forest-950">
                        {tpl.name}
                      </div>
                      <div className="text-[10px] text-charcoal-500">
                        {tpl.category}
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      {tpl.previewPalette.map((c, idx) => (
                        <span
                          key={idx}
                          style={{ backgroundColor: c }}
                          className="w-3 h-3 rounded-full border border-charcoal-200"
                        />
                      ))}
                    </div>
                  </button>
                ))}
              </div>
            )}

            {/* TAB 3: BACKGROUND & CARD SPECS */}
            {activeLeftTab === "BACKGROUND" && (
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-forest-900 mb-1.5">
                    {activeSide} Side Background Style
                  </label>
                  <select
                    value={currentBg.type}
                    onChange={(e) => {
                      const updated: CardBackground = {
                        ...currentBg,
                        type: e.target.value as CardBackground["type"],
                      };
                      if (activeSide === "FRONT") setFrontBg(updated);
                      else setBackBg(updated);
                    }}
                    className="w-full px-3 py-2 rounded-xl border border-charcoal-200 text-xs font-semibold"
                  >
                    <option value="solid">Solid Luxury Color</option>
                    <option value="gradient">Linear Metallic Gradient</option>
                    <option value="split-panel">Split Architectural Panel</option>
                    <option value="luxury-border">Double Gold Hairline Border</option>
                    <option value="architectural-grid">
                      Architectural Mullion Grid
                    </option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-forest-900 mb-1.5">
                    Primary Canvas Color
                  </label>
                  <div className="flex items-center gap-2 mb-2">
                    <input
                      type="color"
                      value={currentBg.primaryColor}
                      onChange={(e) => {
                        const updated = {
                          ...currentBg,
                          primaryColor: e.target.value,
                        };
                        if (activeSide === "FRONT") setFrontBg(updated);
                        else setBackBg(updated);
                      }}
                      className="w-9 h-9 rounded cursor-pointer border border-charcoal-200"
                    />
                    <input
                      type="text"
                      value={currentBg.primaryColor}
                      onChange={(e) => {
                        const updated = {
                          ...currentBg,
                          primaryColor: e.target.value,
                        };
                        if (activeSide === "FRONT") setFrontBg(updated);
                        else setBackBg(updated);
                      }}
                      className="flex-1 px-3 py-1.5 rounded-lg border border-charcoal-200 text-xs font-mono"
                    />
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {LUXURY_SWATCHES.map((hex) => (
                      <button
                        key={hex}
                        type="button"
                        onClick={() => {
                          const updated = { ...currentBg, primaryColor: hex };
                          if (activeSide === "FRONT") setFrontBg(updated);
                          else setBackBg(updated);
                        }}
                        style={{ backgroundColor: hex }}
                        className="w-6 h-6 rounded-md border border-charcoal-300"
                      />
                    ))}
                  </div>
                </div>

                {currentBg.type !== "solid" && (
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-forest-900 mb-1.5">
                      Secondary / Accent Color
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={
                          currentBg.secondaryColor ||
                          currentBg.accentColor ||
                          "#C9A96E"
                        }
                        onChange={(e) => {
                          const updated = {
                            ...currentBg,
                            secondaryColor: e.target.value,
                            accentColor: e.target.value,
                          };
                          if (activeSide === "FRONT") setFrontBg(updated);
                          else setBackBg(updated);
                        }}
                        className="w-9 h-9 rounded cursor-pointer border border-charcoal-200"
                      />
                      <span className="text-xs font-mono text-charcoal-600">
                        {currentBg.secondaryColor || currentBg.accentColor}
                      </span>
                    </div>
                  </div>
                )}

                <hr className="border-charcoal-100" />

                {/* Card Physical Dimensions, Finish & Corners */}
                <div className="space-y-3">
                  <div className="text-xs font-bold uppercase tracking-wider text-forest-900">
                    Physical Card &amp; Paper Stock
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setWidthMm(90);
                        setHeightMm(50);
                      }}
                      className={`py-2 px-2.5 rounded-xl border text-xs font-bold ${
                        widthMm === 90 && heightMm === 50
                          ? "bg-forest-900 text-gold border-gold"
                          : "border-charcoal-200 text-charcoal-700"
                      }`}
                    >
                      90 × 50 mm (ISO)
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setWidthMm(85);
                        setHeightMm(55);
                      }}
                      className={`py-2 px-2.5 rounded-xl border text-xs font-bold ${
                        widthMm === 85 && heightMm === 55
                          ? "bg-forest-900 text-gold border-gold"
                          : "border-charcoal-200 text-charcoal-700"
                      }`}
                    >
                      85 × 55 mm (EU)
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[10px] font-bold uppercase text-charcoal-500">
                        Paper Finish
                      </label>
                      <select
                        value={paperFinish}
                        onChange={(e) =>
                          setPaperFinish(e.target.value as PaperFinish)
                        }
                        className="w-full mt-1 px-2.5 py-1.5 rounded-lg border border-charcoal-200 text-xs font-semibold"
                      >
                        <option value="MATTE">Matte Silk</option>
                        <option value="GLOSS">High Gloss UV</option>
                        <option value="SOFT_TOUCH">Velvet Soft-Touch</option>
                        <option value="TEXTURED">Textured Cotton</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold uppercase text-charcoal-500">
                        Corner Style
                      </label>
                      <select
                        value={cornerStyle}
                        onChange={(e) =>
                          setCornerStyle(e.target.value as CornerStyle)
                        }
                        className="w-full mt-1 px-2.5 py-1.5 rounded-lg border border-charcoal-200 text-xs font-semibold"
                      >
                        <option value="SQUARE">Square (90°)</option>
                        <option value="ROUNDED">Rounded (3.5mm)</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 4: LAYER MANAGEMENT */}
            {activeLeftTab === "LAYERS" && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-forest-900">
                    {activeSide} Layers ({currentElements.length})
                  </span>
                </div>
                {[...currentElements]
                  .sort((a, b) => b.zIndex - a.zIndex)
                  .map((el) => {
                    const isSel = el.id === selectedElementId;
                    return (
                      <div
                        key={el.id}
                        onClick={() => setSelectedElementId(el.id)}
                        className={`p-2.5 rounded-xl border text-xs flex items-center justify-between cursor-pointer transition ${
                          isSel
                            ? "bg-forest-900 text-gold border-gold"
                            : "bg-cream/40 border-charcoal-100 text-charcoal-800 hover:border-gold"
                        }`}
                      >
                        <div className="truncate pr-2">
                          <div className="font-bold truncate">{el.label}</div>
                          <div className="text-[10px] opacity-75 font-mono uppercase">
                            {el.type} • ({el.xMm}, {el.yMm}mm)
                          </div>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleUpdateElement(el.id, {
                                zIndex: el.zIndex + 1,
                              });
                            }}
                            title="Bring Forward"
                            className="p-1 hover:opacity-80"
                          >
                            <ArrowUp className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleUpdateElement(el.id, {
                                zIndex: Math.max(1, el.zIndex - 1),
                              });
                            }}
                            title="Send Backward"
                            className="p-1 hover:opacity-80"
                          >
                            <ArrowDown className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleUpdateElement(el.id, {
                                locked: !el.locked,
                              });
                            }}
                            title="Lock / Unlock"
                            className="p-1 hover:opacity-80"
                          >
                            {el.locked ? (
                              <Lock className="w-3.5 h-3.5" />
                            ) : (
                              <Unlock className="w-3.5 h-3.5" />
                            )}
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleUpdateElement(el.id, {
                                hidden: !el.hidden,
                              });
                            }}
                            title="Show / Hide"
                            className="p-1 hover:opacity-80"
                          >
                            {el.hidden ? (
                              <EyeOff className="w-3.5 h-3.5" />
                            ) : (
                              <Eye className="w-3.5 h-3.5" />
                            )}
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              updateCurrentElements((prev) =>
                                prev.filter((item) => item.id !== el.id)
                              );
                              if (selectedElementId === el.id)
                                setSelectedElementId(null);
                            }}
                            title="Delete Layer"
                            className="p-1 text-rose-400 hover:text-rose-300"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
              </div>
            )}

            {/* TAB 5: AI SMART RECOMMENDATIONS */}
            {activeLeftTab === "AI" && (
              <div className="space-y-3">
                <div className="p-3 rounded-xl bg-forest-950 text-cream border border-gold/30">
                  <div className="flex items-center gap-2 text-xs font-bold text-gold">
                    <Wand2 className="w-4 h-4" />
                    <span>HEZLON Intelligent Design Assistant</span>
                  </div>
                  <p className="text-[11px] text-cream/75 mt-1">
                    Optimizes layout hierarchy, safe margins, and palette using
                    your actual HEZLON Building Solutions company profile.
                  </p>
                </div>

                {aiRecommendationNote && (
                  <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <span>{aiRecommendationNote}</span>
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => applySmartRecommendation("SYNC_COMPANY_DATA")}
                  className="w-full p-3 rounded-xl border border-charcoal-200 hover:border-forest-800 text-left space-y-1 transition"
                >
                  <div className="text-xs font-bold text-forest-950 flex items-center gap-1.5">
                    <RefreshCw className="w-3.5 h-3.5 text-gold-700" />
                    <span>Sync Live HEZLON Company Data</span>
                  </div>
                  <p className="text-[11px] text-charcoal-500">
                    Populates bound layers with your latest phone, email, and
                    specialist title.
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => applySmartRecommendation("SAFE_MARGIN_FIX")}
                  className="w-full p-3 rounded-xl border border-charcoal-200 hover:border-forest-800 text-left space-y-1 transition"
                >
                  <div className="text-xs font-bold text-forest-950 flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Auto-Fix Print Safe Margins</span>
                  </div>
                  <p className="text-[11px] text-charcoal-500">
                    Moves any text or QR module away from the guillotine trim
                    edge into the {safeMarginMm}mm safe zone.
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => applySmartRecommendation("FOREST_GOLD_HARMONY")}
                  className="w-full p-3 rounded-xl border border-charcoal-200 hover:border-forest-800 text-left space-y-1 transition"
                >
                  <div className="text-xs font-bold text-forest-950 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-gold-700" />
                    <span>Apply Signature Forest &amp; Gold Palette</span>
                  </div>
                  <p className="text-[11px] text-charcoal-500">
                    Harmonizes front and back backgrounds to Deep Forest Green,
                    Warm Cream &amp; Champagne Gold.
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() =>
                    applySmartRecommendation("ARCHITECTURAL_HIERARCHY")
                  }
                  className="w-full p-3 rounded-xl border border-charcoal-200 hover:border-forest-800 text-left space-y-1 transition"
                >
                  <div className="text-xs font-bold text-forest-950 flex items-center gap-1.5">
                    <Type className="w-3.5 h-3.5 text-gold-700" />
                    <span>Enhance Executive Typography</span>
                  </div>
                  <p className="text-[11px] text-charcoal-500">
                    Pairs wide-tracked Cinzel headers with italic Cormorant
                    Garamond subtitles.
                  </p>
                </button>
              </div>
            )}

            {/* TAB 6: PRE-FLIGHT PRINT VALIDATION & EXPORT */}
            {activeLeftTab === "PRINT" && (
              <div className="space-y-3">
                <div className="p-3 rounded-xl bg-forest-950 text-cream flex items-center justify-between">
                  <div>
                    <div className="text-[10px] uppercase tracking-widest text-gold font-bold">
                      PRE-FLIGHT SCORE
                    </div>
                    <div className="text-lg font-serif font-bold">
                      {validationReport?.score ?? 100}% Print-Ready
                    </div>
                  </div>
                  <span
                    className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                      validationReport?.isPrintReady !== false
                        ? "bg-emerald-500/20 text-emerald-300 border border-emerald-400/40"
                        : "bg-rose-500/20 text-rose-300 border border-rose-400/40"
                    }`}
                  >
                    {validationReport?.isPrintReady !== false
                      ? "PASSED"
                      : "NEEDS REVIEW"}
                  </span>
                </div>

                {/* Validation Issue List */}
                <div className="space-y-2">
                  {(validationReport?.issues || []).map((iss) => (
                    <div
                      key={iss.id}
                      className={`p-2.5 rounded-xl border text-xs flex items-start gap-2 ${
                        iss.severity === "ERROR"
                          ? "bg-rose-50 border-rose-200 text-rose-900"
                          : iss.severity === "WARNING"
                          ? "bg-amber-50 border-amber-200 text-amber-900"
                          : "bg-emerald-50/70 border-emerald-200 text-emerald-950"
                      }`}
                    >
                      {iss.severity === "ERROR" ? (
                        <XCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                      ) : iss.severity === "WARNING" ? (
                        <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                      ) : (
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                      )}
                      <div>
                        <div className="font-bold">{iss.title}</div>
                        <div className="text-[11px] opacity-80">
                          {iss.message}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* All Production Export Formats */}
                <div className="pt-2 space-y-2">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-charcoal-500">
                    Production &amp; Preview PDF
                  </div>

                  {exportSuccessBanner && (
                    <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span className="truncate">{exportSuccessBanner}</span>
                    </div>
                  )}

                  {/* Primary Modal Launcher */}
                  <button
                    type="button"
                    onClick={() => setIsPdfModalOpen(true)}
                    className="w-full py-2.5 px-3 rounded-xl bg-gold text-forest-950 font-bold text-xs flex items-center justify-between shadow-sm hover:bg-gold-300 transition"
                  >
                    <span className="flex items-center gap-1.5">
                      <Eye className="w-3.5 h-3.5" />
                      Open Live PDF Preview &amp; Inspector
                    </span>
                    <Sparkles className="w-3.5 h-3.5 text-forest-950" />
                  </button>

                  {/* Download Preview PDF */}
                  <button
                    type="button"
                    disabled={Boolean(exportingFormat)}
                    onClick={() => handleExportAsset("PDF_PREVIEW")}
                    className="w-full py-2 px-3 rounded-xl bg-forest-900 text-gold font-bold text-xs flex items-center justify-between hover:bg-forest-950 transition"
                  >
                    <span className="flex items-center gap-1.5">
                      <Download className="w-3.5 h-3.5" />
                      Download Preview PDF (2-Page Proof)
                    </span>
                    <span className="text-[10px] text-cream/70 font-mono">90×50mm</span>
                  </button>

                  {/* Download Print-Ready PDF */}
                  <button
                    type="button"
                    disabled={Boolean(exportingFormat)}
                    onClick={() => handleExportAsset("PDF_PRINT_READY")}
                    className="w-full py-2 px-3 rounded-xl bg-forest-950 text-cream font-bold text-xs flex items-center justify-between border border-gold/40 hover:bg-black transition"
                  >
                    <span className="flex items-center gap-1.5">
                      <Printer className="w-3.5 h-3.5 text-gold" />
                      Download Print-Ready PDF (A4 8-Up)
                    </span>
                    <span className="text-[10px] text-gold font-mono">8 Cards</span>
                  </button>

                  {/* Duplex Flip Selector */}
                  <div className="p-2 rounded-xl bg-cream/60 border border-charcoal-200 space-y-1 text-xs">
                    <div className="text-[10px] font-bold text-charcoal-600 uppercase">
                      Duplex Flip Orientation
                    </div>
                    <div className="grid grid-cols-2 gap-1">
                      <button
                        type="button"
                        onClick={() => setDuplexFlipMode("LONG_EDGE")}
                        className={`py-1 px-1.5 rounded-lg text-[11px] font-semibold transition ${
                          duplexFlipMode === "LONG_EDGE"
                            ? "bg-forest-900 text-gold font-bold"
                            : "bg-white text-charcoal-700 hover:bg-cream"
                        }`}
                      >
                        Long Edge (Standard)
                      </button>
                      <button
                        type="button"
                        onClick={() => setDuplexFlipMode("SHORT_EDGE")}
                        className={`py-1 px-1.5 rounded-lg text-[11px] font-semibold transition ${
                          duplexFlipMode === "SHORT_EDGE"
                            ? "bg-forest-900 text-gold font-bold"
                            : "bg-white text-charcoal-700 hover:bg-cream"
                        }`}
                      >
                        Short Edge (Calendar)
                      </button>
                    </div>
                  </div>

                  {/* Single Sides & Raster Formats */}
                  <div className="grid grid-cols-2 gap-1.5 pt-1">
                    <button
                      type="button"
                      onClick={() => handleExportAsset("PDF_FRONT")}
                      className="py-1.5 px-2 rounded-lg border border-charcoal-200 text-xs font-semibold hover:bg-cream"
                    >
                      Front PDF
                    </button>
                    <button
                      type="button"
                      onClick={() => handleExportAsset("PDF_BACK")}
                      className="py-1.5 px-2 rounded-lg border border-charcoal-200 text-xs font-semibold hover:bg-cream"
                    >
                      Back PDF
                    </button>
                    <button
                      type="button"
                      onClick={() => handleExportAsset("PNG_FRONT")}
                      className="py-1.5 px-2 rounded-lg border border-charcoal-200 text-xs font-semibold hover:bg-cream"
                    >
                      Front PNG (600dpi)
                    </button>
                    <button
                      type="button"
                      onClick={() => handleExportAsset("PNG_BACK")}
                      className="py-1.5 px-2 rounded-lg border border-charcoal-200 text-xs font-semibold hover:bg-cream"
                    >
                      Back PNG (600dpi)
                    </button>
                    <button
                      type="button"
                      onClick={() => handleExportAsset("SVG_FRONT")}
                      className="py-1.5 px-2 rounded-lg border border-charcoal-200 text-xs font-semibold hover:bg-cream"
                    >
                      Front SVG Vector
                    </button>
                    <button
                      type="button"
                      onClick={() => handleExportAsset("SVG_BACK")}
                      className="py-1.5 px-2 rounded-lg border border-charcoal-200 text-xs font-semibold hover:bg-cream"
                    >
                      Back SVG Vector
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* CENTER WORKSPACE: Interactive 2D Canvas & Live 3D Preview */}
        <div className="lg:col-span-6 space-y-5">
          {/* Front / Back & Double-Sided Controls */}
          <div className="bg-white rounded-2xl p-3.5 border border-charcoal-100 shadow-sm flex items-center justify-between">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setActiveSide("FRONT");
                  setSelectedElementId(null);
                }}
                className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition ${
                  activeSide === "FRONT"
                    ? "bg-forest-900 text-gold shadow-sm"
                    : "bg-cream text-charcoal-600 hover:text-forest-900"
                }`}
              >
                Front Side Design
              </button>
              {isDoubleSided && (
                <button
                  type="button"
                  onClick={() => {
                    setActiveSide("BACK");
                    setSelectedElementId(null);
                  }}
                  className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition ${
                    activeSide === "BACK"
                      ? "bg-forest-900 text-gold shadow-sm"
                      : "bg-cream text-charcoal-600 hover:text-forest-900"
                  }`}
                >
                  Back Side Design
                </button>
              )}
            </div>

            <label className="flex items-center gap-2 text-xs font-semibold text-charcoal-700 cursor-pointer">
              <input
                type="checkbox"
                checked={isDoubleSided}
                onChange={(e) => {
                  setIsDoubleSided(e.target.checked);
                  if (!e.target.checked) setActiveSide("FRONT");
                }}
                className="rounded border-charcoal-300 text-forest-900"
              />
              <span>Double-Sided Card</span>
            </label>
          </div>

          {/* 2D Interactive Design Canvas */}
          {(viewMode === "2D" || viewMode === "SPLIT") && (
            <div className="bg-gradient-to-br from-charcoal-900 via-forest-950 to-charcoal-950 rounded-2xl p-8 border border-gold/30 shadow-inner flex flex-col items-center justify-center relative min-h-[380px]">
              <div className="mb-3 flex items-center gap-2 text-[11px] text-cream/70 font-mono">
                <span>
                  EDITING: <strong className="text-gold">{activeSide} SIDE</strong>
                </span>
                <span>•</span>
                <span>Click &amp; drag any element to position, resize, or rotate</span>
              </div>

              <CardCanvasRenderer
                widthMm={widthMm}
                heightMm={heightMm}
                bleedMm={bleedMm}
                safeMarginMm={safeMarginMm}
                side={activeSide}
                background={currentBg}
                elements={currentElements}
                paperFinish={paperFinish}
                cornerStyle={cornerStyle}
                companyInfo={companyInfo}
                showPrintGuides={showPrintGuides}
                interactive={true}
                selectedElementId={selectedElementId}
                onSelectElement={setSelectedElementId}
                onUpdateElement={handleUpdateElement}
                scalePxPerMm={5.6}
              />
            </div>
          )}

          {/* Live 3D Realistic Business Card Preview */}
          {(viewMode === "3D" || viewMode === "SPLIT") && (
            <Card3DPreview
              widthMm={widthMm}
              heightMm={heightMm}
              frontBg={frontBg}
              backBg={backBg}
              frontElements={frontElements}
              backElements={backElements}
              isDoubleSided={isDoubleSided}
              paperFinish={paperFinish}
              cornerStyle={cornerStyle}
              companyInfo={companyInfo}
            />
          )}
        </div>

        {/* RIGHT PANEL: Selected Element Inspector */}
        <div className="lg:col-span-3 bg-white rounded-2xl border border-charcoal-100 shadow-sm p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-charcoal-100 pb-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-forest-950">
              {selectedElement
                ? `Inspector: ${selectedElement.label}`
                : "Element Inspector"}
            </h3>
            {selectedElement && (
              <button
                type="button"
                onClick={() => {
                  updateCurrentElements((prev) =>
                    prev.filter((e) => e.id !== selectedElement.id)
                  );
                  setSelectedElementId(null);
                }}
                className="text-xs font-semibold text-rose-600 hover:underline flex items-center gap-1"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete</span>
              </button>
            )}
          </div>

          {!selectedElement ? (
            <div className="py-12 text-center space-y-2 text-xs text-charcoal-500">
              <Palette className="w-8 h-8 text-gold-600 mx-auto opacity-75" />
              <div className="font-semibold text-charcoal-800">
                No Layer Selected
              </div>
              <p>
                Click any text, monogram, QR code, or shape on the business card
                canvas to customize its typography, colors, dimensions, or
                rotation.
              </p>
            </div>
          ) : (
            <div className="space-y-4 text-xs">
              {/* Position & Size in Physical Millimeters */}
              <div>
                <label className="block text-[10px] font-bold uppercase text-charcoal-500 mb-1.5">
                  Physical Position &amp; Size (mm)
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <span className="text-[10px] text-charcoal-500">X (mm)</span>
                    <input
                      type="number"
                      step="0.5"
                      value={selectedElement.xMm}
                      onChange={(e) =>
                        handleUpdateElement(selectedElement.id, {
                          xMm: Number(e.target.value),
                        })
                      }
                      className="w-full px-2.5 py-1.5 rounded-lg border border-charcoal-200 font-mono"
                    />
                  </div>
                  <div>
                    <span className="text-[10px] text-charcoal-500">Y (mm)</span>
                    <input
                      type="number"
                      step="0.5"
                      value={selectedElement.yMm}
                      onChange={(e) =>
                        handleUpdateElement(selectedElement.id, {
                          yMm: Number(e.target.value),
                        })
                      }
                      className="w-full px-2.5 py-1.5 rounded-lg border border-charcoal-200 font-mono"
                    />
                  </div>
                  <div>
                    <span className="text-[10px] text-charcoal-500">
                      Width (mm)
                    </span>
                    <input
                      type="number"
                      step="0.5"
                      value={selectedElement.widthMm}
                      onChange={(e) =>
                        handleUpdateElement(selectedElement.id, {
                          widthMm: Math.max(1, Number(e.target.value)),
                        })
                      }
                      className="w-full px-2.5 py-1.5 rounded-lg border border-charcoal-200 font-mono"
                    />
                  </div>
                  <div>
                    <span className="text-[10px] text-charcoal-500">
                      Height (mm)
                    </span>
                    <input
                      type="number"
                      step="0.5"
                      value={selectedElement.heightMm}
                      onChange={(e) =>
                        handleUpdateElement(selectedElement.id, {
                          heightMm: Math.max(0.2, Number(e.target.value)),
                        })
                      }
                      className="w-full px-2.5 py-1.5 rounded-lg border border-charcoal-200 font-mono"
                    />
                  </div>
                </div>
              </div>

              {/* Rotation & Center Alignment */}
              <div className="grid grid-cols-2 gap-2 items-end">
                <div>
                  <span className="text-[10px] text-charcoal-500">
                    Rotation (°)
                  </span>
                  <input
                    type="number"
                    value={selectedElement.rotation || 0}
                    onChange={(e) =>
                      handleUpdateElement(selectedElement.id, {
                        rotation: Number(e.target.value),
                      })
                    }
                    className="w-full px-2.5 py-1.5 rounded-lg border border-charcoal-200 font-mono"
                  />
                </div>
                <button
                  type="button"
                  onClick={() =>
                    handleUpdateElement(selectedElement.id, {
                      xMm: Number(
                        ((widthMm - selectedElement.widthMm) / 2).toFixed(2)
                      ),
                    })
                  }
                  className="py-1.5 px-2.5 rounded-lg bg-cream border border-charcoal-200 font-semibold hover:border-forest-800"
                >
                  Center Horizontally
                </button>
              </div>

              {/* Text-specific controls */}
              {selectedElement.type === "text" && (
                <div className="space-y-3 pt-2 border-t border-charcoal-100">
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-charcoal-500 mb-1">
                      Text Content
                    </label>
                    <textarea
                      rows={2}
                      value={selectedElement.text || ""}
                      onChange={(e) =>
                        handleUpdateElement(selectedElement.id, {
                          text: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 rounded-xl border border-charcoal-200 text-xs focus:outline-none focus:border-forest-900"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold uppercase text-charcoal-500 mb-1">
                      Font Family
                    </label>
                    <select
                      value={selectedElement.fontFamily || "Inter"}
                      onChange={(e) =>
                        handleUpdateElement(selectedElement.id, {
                          fontFamily: e.target.value as FontFamilyOption,
                        })
                      }
                      className="w-full px-2.5 py-1.5 rounded-lg border border-charcoal-200 font-semibold"
                    >
                      {FONT_OPTIONS.map((f) => (
                        <option key={f} value={f}>
                          {f}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[10px] font-bold uppercase text-charcoal-500 mb-1">
                        Size (pt)
                      </label>
                      <input
                        type="number"
                        step="0.5"
                        min={4}
                        max={48}
                        value={selectedElement.fontSizePt || 8}
                        onChange={(e) =>
                          handleUpdateElement(selectedElement.id, {
                            fontSizePt: Number(e.target.value),
                          })
                        }
                        className="w-full px-2.5 py-1.5 rounded-lg border border-charcoal-200 font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold uppercase text-charcoal-500 mb-1">
                        Weight
                      </label>
                      <select
                        value={selectedElement.fontWeight || "500"}
                        onChange={(e) =>
                          handleUpdateElement(selectedElement.id, {
                            fontWeight: e.target
                              .value as CanvasElement["fontWeight"],
                          })
                        }
                        className="w-full px-2.5 py-1.5 rounded-lg border border-charcoal-200"
                      >
                        <option value="300">Light (300)</option>
                        <option value="400">Regular (400)</option>
                        <option value="500">Medium (500)</option>
                        <option value="600">SemiBold (600)</option>
                        <option value="700">Bold (700)</option>
                        <option value="800">ExtraBold (800)</option>
                      </select>
                    </div>
                  </div>

                  {/* Alignment & Case */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex rounded-lg border border-charcoal-200 overflow-hidden">
                      {(["left", "center", "right"] as const).map((align) => (
                        <button
                          key={align}
                          type="button"
                          onClick={() =>
                            handleUpdateElement(selectedElement.id, {
                              textAlign: align,
                            })
                          }
                          className={`p-2 ${
                            selectedElement.textAlign === align
                              ? "bg-forest-900 text-gold"
                              : "bg-white text-charcoal-600"
                          }`}
                        >
                          {align === "left" ? (
                            <AlignLeft className="w-3.5 h-3.5" />
                          ) : align === "center" ? (
                            <AlignCenter className="w-3.5 h-3.5" />
                          ) : (
                            <AlignRight className="w-3.5 h-3.5" />
                          )}
                        </button>
                      ))}
                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        handleUpdateElement(selectedElement.id, {
                          textTransform:
                            selectedElement.textTransform === "uppercase"
                              ? "none"
                              : "uppercase",
                        })
                      }
                      className={`px-3 py-1.5 rounded-lg border text-xs font-bold ${
                        selectedElement.textTransform === "uppercase"
                          ? "bg-forest-900 text-gold border-gold"
                          : "border-charcoal-200"
                      }`}
                    >
                      UPPERCASE
                    </button>
                  </div>

                  {/* Text Color */}
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-charcoal-500 mb-1">
                      Text Color
                    </label>
                    <div className="flex items-center gap-2 mb-2">
                      <input
                        type="color"
                        value={selectedElement.color || "#FFFFFF"}
                        onChange={(e) =>
                          handleUpdateElement(selectedElement.id, {
                            color: e.target.value,
                          })
                        }
                        className="w-8 h-8 rounded border border-charcoal-200 cursor-pointer"
                      />
                      <span className="font-mono">
                        {selectedElement.color || "#FFFFFF"}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {LUXURY_SWATCHES.map((hex) => (
                        <button
                          key={hex}
                          type="button"
                          onClick={() =>
                            handleUpdateElement(selectedElement.id, {
                              color: hex,
                            })
                          }
                          style={{ backgroundColor: hex }}
                          className="w-5 h-5 rounded border border-charcoal-300"
                        />
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* QR-specific controls */}
              {selectedElement.type === "qr" && (
                <div className="space-y-3 pt-2 border-t border-charcoal-100">
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-charcoal-500 mb-1">
                      QR Foreground Color
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={selectedElement.qrForeground || "#0D2B22"}
                        onChange={(e) =>
                          handleUpdateElement(selectedElement.id, {
                            qrForeground: e.target.value,
                          })
                        }
                        className="w-8 h-8 rounded border"
                      />
                      <span className="font-mono">
                        {selectedElement.qrForeground || "#0D2B22"}
                      </span>
                    </div>
                  </div>
                  <label className="flex items-center gap-2 font-semibold cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedElement.qrIncludeLogo !== false}
                      onChange={(e) =>
                        handleUpdateElement(selectedElement.id, {
                          qrIncludeLogo: e.target.checked,
                        })
                      }
                    />
                    <span>Show Center HEZLON Emblem</span>
                  </label>
                </div>
              )}

              {/* Monogram / Shape Color Controls */}
              {(selectedElement.type === "shape" ||
                selectedElement.type === "line" ||
                selectedElement.type === "monogram") && (
                <div className="space-y-3 pt-2 border-t border-charcoal-100">
                  {selectedElement.type === "monogram" && (
                    <div>
                      <label className="block text-[10px] font-bold uppercase text-charcoal-500 mb-1">
                        Monogram Initials
                      </label>
                      <input
                        type="text"
                        maxLength={3}
                        value={selectedElement.monogramText || "H"}
                        onChange={(e) =>
                          handleUpdateElement(selectedElement.id, {
                            monogramText: e.target.value,
                          })
                        }
                        className="w-full px-2.5 py-1.5 rounded-lg border border-charcoal-200 font-serif font-bold"
                      />
                    </div>
                  )}
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-charcoal-500 mb-1">
                      Fill / Accent Color
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={
                          selectedElement.fillColor ||
                          selectedElement.strokeColor ||
                          "#C9A96E"
                        }
                        onChange={(e) =>
                          handleUpdateElement(selectedElement.id, {
                            fillColor: e.target.value,
                            strokeColor: e.target.value,
                          })
                        }
                        className="w-8 h-8 rounded border"
                      />
                      <span className="font-mono">
                        {selectedElement.fillColor ||
                          selectedElement.strokeColor}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Professional PDF Export & Proofing Modal */}
      <PdfExportModal
        isOpen={isPdfModalOpen}
        onClose={() => setIsPdfModalOpen(false)}
        designId={designId}
        designName={designName}
        widthMm={widthMm}
        heightMm={heightMm}
        bleedMm={bleedMm}
        safeMarginMm={safeMarginMm}
        isDoubleSided={isDoubleSided}
        paperFinish={paperFinish}
        cornerStyle={cornerStyle}
        frontBg={frontBg}
        backBg={backBg}
        frontElements={frontElements}
        backElements={backElements}
      />
    </div>
  );
}

export default function BusinessCardStudioPage() {
  return (
    <Suspense
      fallback={
        <div className="p-12 text-center text-sm text-charcoal-500">
          Initializing HEZLON Visual Design Studio...
        </div>
      }
    >
      <StudioEditorContent />
    </Suspense>
  );
}

