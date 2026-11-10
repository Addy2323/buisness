"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  FolderKanban,
  Plus,
  Copy,
  Trash2,
  Printer,
  Download,
  Palette,
  FlipHorizontal,
  CheckCircle2,
  Sparkles,
  Eye,
} from "lucide-react";
import { CardCanvasRenderer } from "@/components/studio/CardCanvasRenderer";
import {
  CanvasElement,
  CardBackground,
  CornerStyle,
  PaperFinish,
} from "@/types/studio";

interface SavedDesignItem {
  id: string;
  name: string;
  widthMm: number;
  heightMm: number;
  bleedMm: number;
  safeMarginMm: number;
  isDoubleSided: boolean;
  paperFinish: PaperFinish;
  cornerStyle: CornerStyle;
  status: string;
  updatedAt: string;
  frontBg: CardBackground;
  backBg: CardBackground;
  frontElements: CanvasElement[];
  backElements: CanvasElement[];
}

export default function MyDesignsPage() {
  const router = useRouter();
  const [designs, setDesigns] = useState<SavedDesignItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [flippedIds, setFlippedIds] = useState<Record<string, boolean>>({});
  const [busyId, setBusyId] = useState<string | null>(null);

  const loadDesigns = () => {
    setLoading(true);
    fetch("/api/admin/designs")
      .then((r) => r.json())
      .then((res) => {
        setDesigns(res.designs || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  useEffect(() => {
    loadDesigns();
  }, []);

  const handleDuplicate = async (id: string) => {
    setBusyId(id);
    await fetch("/api/admin/designs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ duplicateFromId: id }),
    });
    setBusyId(null);
    loadDesigns();
  };

  const handleDelete = async (id: string, name: string) => {
    if (!window.confirm(`Delete business card design "${name}"?`)) return;
    setBusyId(id);
    await fetch(`/api/admin/designs?id=${id}`, { method: "DELETE" });
    setBusyId(null);
    loadDesigns();
  };

  const handleDownloadPdf = async (
    design: SavedDesignItem,
    mode: "PREVIEW" | "PRINT_READY" = "PREVIEW"
  ) => {
    setBusyId(`${design.id}-${mode}`);
    try {
      const format = mode === "PREVIEW" ? "PDF_PREVIEW" : "PDF_PRINT_READY";
      const res = await fetch("/api/admin/export-pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          designId: design.id,
          format,
        }),
      });
      if (res.ok) {
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        const suffix = mode === "PREVIEW" ? "preview" : "print-ready-a4";
        a.download = `${design.name
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")}-${suffix}.pdf`;
        a.click();
        URL.revokeObjectURL(url);
      }
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="bg-white rounded-2xl p-6 border border-charcoal-100 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-serif font-bold text-forest-950 flex items-center gap-2.5">
            <FolderKanban className="w-6 h-6 text-gold-700" />
            <span>My HEZLON Business Card Designs</span>
          </h1>
          <p className="text-xs text-charcoal-500 mt-1">
            Manage your saved drafts and approved production-ready card layouts
            for HEZLON Building Solutions.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/admin/templates"
            className="px-4 py-2.5 rounded-xl border border-forest-900 text-forest-900 text-xs font-semibold hover:bg-forest-50 transition flex items-center gap-1.5"
          >
            <Sparkles className="w-4 h-4 text-gold-700" />
            <span>Templates Library</span>
          </Link>
          <Link
            href="/admin/studio"
            className="px-5 py-2.5 rounded-xl bg-forest-900 text-gold text-xs font-bold uppercase tracking-wider hover:bg-forest-800 transition flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            <span>Create New Design</span>
          </Link>
        </div>
      </div>

      {loading ? (
        <div className="p-12 text-center text-sm text-charcoal-500">
          Loading saved designs...
        </div>
      ) : designs.length === 0 ? (
        <div className="bg-white rounded-2xl border-2 border-dashed border-charcoal-200 p-14 text-center space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-forest-900 text-gold flex items-center justify-center mx-auto">
            <Palette className="w-7 h-7" />
          </div>
          <h2 className="text-xl font-serif font-bold text-forest-950">
            No Saved Designs Yet
          </h2>
          <p className="text-xs text-charcoal-500 max-w-md mx-auto">
            Select one of our 20 bespoke architectural templates or launch the
            visual design studio to create your first business card for HEZLON
            Building Solutions.
          </p>
          <div className="flex items-center justify-center gap-3 pt-2">
            <Link
              href="/admin/templates"
              className="px-5 py-2.5 rounded-xl bg-forest-900 text-gold font-bold text-xs uppercase tracking-wider"
            >
              Browse 20 Templates
            </Link>
            <Link
              href="/admin/studio"
              className="px-5 py-2.5 rounded-xl border border-forest-900 text-forest-900 font-bold text-xs uppercase tracking-wider"
            >
              Open Visual Studio
            </Link>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {designs.map((d) => {
            const showBack = Boolean(flippedIds[d.id]);
            return (
              <div
                key={d.id}
                className="bg-white rounded-2xl border border-charcoal-100 shadow-sm hover:border-gold transition overflow-hidden flex flex-col justify-between"
              >
                <div className="bg-charcoal-950 p-5 flex flex-col items-center">
                  <div className="w-full flex items-center justify-between mb-3 text-[10px]">
                    <span
                      className={`px-2.5 py-0.5 rounded-full font-bold flex items-center gap-1 ${
                        d.status === "APPROVED"
                          ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                          : "bg-gold/20 text-gold border border-gold/40"
                      }`}
                    >
                      <CheckCircle2 className="w-3 h-3" />
                      {d.status}
                    </span>

                    <button
                      type="button"
                      onClick={() =>
                        setFlippedIds((p) => ({ ...p, [d.id]: !p[d.id] }))
                      }
                      className="px-2.5 py-0.5 rounded bg-forest-900 text-cream border border-gold/30 hover:border-gold flex items-center gap-1"
                    >
                      <FlipHorizontal className="w-3 h-3 text-gold" />
                      <span>{showBack ? "BACK SIDE" : "FRONT SIDE"}</span>
                    </button>
                  </div>

                  <CardCanvasRenderer
                    widthMm={d.widthMm}
                    heightMm={d.heightMm}
                    side={showBack ? "BACK" : "FRONT"}
                    background={showBack ? d.backBg : d.frontBg}
                    elements={showBack ? d.backElements : d.frontElements}
                    paperFinish={d.paperFinish}
                    cornerStyle={d.cornerStyle}
                    scalePxPerMm={3.4}
                  />

                  <div className="w-full flex items-center justify-between mt-3 text-[10px] text-cream/60 font-mono">
                    <span>
                      {d.widthMm}×{d.heightMm}mm (+{d.bleedMm}mm bleed)
                    </span>
                    <span>
                      {d.paperFinish} • {d.cornerStyle}
                    </span>
                  </div>
                </div>

                <div className="p-5 space-y-4">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="text-base font-serif font-bold text-forest-950">
                        {d.name}
                      </h3>
                      <p className="text-[11px] text-charcoal-500">
                        Updated {new Date(d.updatedAt).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        disabled={busyId === d.id}
                        onClick={() => handleDuplicate(d.id)}
                        title="Duplicate design"
                        className="p-2 rounded-lg border border-charcoal-200 text-charcoal-700 hover:bg-cream transition"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        disabled={busyId === d.id}
                        onClick={() => handleDelete(d.id, d.name)}
                        title="Delete design"
                        className="p-2 rounded-lg border border-rose-200 text-rose-600 hover:bg-rose-50 transition"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        router.push(`/admin/studio?designId=${d.id}`)
                      }
                      className="py-2 px-3 rounded-xl bg-forest-900 text-gold font-bold text-xs flex items-center justify-center gap-1.5 hover:bg-forest-800 transition"
                    >
                      <Palette className="w-3.5 h-3.5" />
                      <span>Edit</span>
                    </button>
                    <button
                      type="button"
                      disabled={busyId === `${d.id}-PREVIEW`}
                      onClick={() => handleDownloadPdf(d, "PREVIEW")}
                      className="py-2 px-2.5 rounded-xl border border-charcoal-200 text-charcoal-800 font-bold text-xs flex items-center justify-center gap-1 hover:bg-cream transition"
                      title="Download Clean 2-Page Preview Proof (90x50mm)"
                    >
                      <Eye className="w-3.5 h-3.5 text-gold-700" />
                      <span>Preview</span>
                    </button>
                    <button
                      type="button"
                      disabled={busyId === `${d.id}-PRINT_READY`}
                      onClick={() => handleDownloadPdf(d, "PRINT_READY")}
                      className="py-2 px-2.5 rounded-xl border border-forest-900 text-forest-900 font-bold text-xs flex items-center justify-center gap-1 hover:bg-forest-50 transition"
                      title="Download A4 8-Up Print-Ready PDF with Bleed & Crop Marks"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Print PDF</span>
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        router.push(`/admin/orders?designId=${d.id}`)
                      }
                      className="py-2 px-3 rounded-xl bg-gold/25 border border-gold text-forest-950 font-bold text-xs flex items-center justify-center gap-1.5 hover:bg-gold transition"
                    >
                      <Printer className="w-3.5 h-3.5" />
                      <span>Print</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

