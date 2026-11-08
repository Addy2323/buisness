"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Sparkles,
  FlipHorizontal,
  Palette,
  Box,
  Check,
  Search,
} from "lucide-react";
import { CardCanvasRenderer } from "@/components/studio/CardCanvasRenderer";
import { Card3DPreview } from "@/components/studio/Card3DPreview";
import { TEMPLATE_CATEGORIES } from "@/lib/templates-catalog";
import { CardTemplateData } from "@/types/studio";

export default function DesignTemplatesPage() {
  const router = useRouter();
  const [templates, setTemplates] = useState<CardTemplateData[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] =
    useState<string>("All Templates");
  const [searchQuery, setSearchQuery] = useState("");
  const [flippedSlugs, setFlippedSlugs] = useState<Record<string, boolean>>({});
  const [inspect3DTemplate, setInspect3DTemplate] =
    useState<CardTemplateData | null>(null);

  useEffect(() => {
    fetch("/api/admin/templates")
      .then((r) => r.json())
      .then((res) => {
        setTemplates(res.templates || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const filteredTemplates = templates.filter((t) => {
    const matchesCat =
      selectedCategory === "All Templates" || t.category === selectedCategory;
    const matchesSearch =
      !searchQuery.trim() ||
      t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCat && matchesSearch;
  });

  const toggleSide = (slug: string) => {
    setFlippedSlugs((prev) => ({ ...prev, [slug]: !prev[slug] }));
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="bg-forest-950 text-cream rounded-2xl p-6 border border-gold/30 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-widest text-gold">
            <Sparkles className="w-3.5 h-3.5" />
            <span>20 Bespoke Architectural &amp; Executive Layouts</span>
          </div>
          <h1 className="text-2xl font-serif font-bold text-cream mt-1">
            HEZLON Premium Design Templates
          </h1>
          <p className="text-xs text-cream/75 mt-1 max-w-2xl">
            Every template is pre-configured with{" "}
            <strong className="text-white">HEZLON Building Solutions</strong>{" "}
            information, permanent QR code placement, and distinct visual
            hierarchy across 12 architectural categories.
          </p>
        </div>

        <div className="relative w-full md:w-72">
          <Search className="w-4 h-4 text-gold/70 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search templates or styles..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-forest-900 border border-gold/30 text-xs text-cream placeholder:text-cream/50 focus:outline-none focus:border-gold"
          />
        </div>
      </div>

      {/* Category Filter Pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2">
        {TEMPLATE_CATEGORIES.map((cat) => {
          const active = selectedCategory === cat;
          return (
            <button
              key={cat}
              type="button"
              onClick={() => setSelectedCategory(cat)}
              className={`px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition border ${
                active
                  ? "bg-forest-900 text-gold border-gold shadow-sm"
                  : "bg-white text-charcoal-700 border-charcoal-200 hover:border-forest-700"
              }`}
            >
              {cat}
            </button>
          );
        })}
      </div>

      {/* Templates Grid */}
      {loading ? (
        <div className="p-12 text-center text-sm text-charcoal-500">
          Loading 20 HEZLON architectural templates...
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredTemplates.map((tpl) => {
            const showBack = Boolean(flippedSlugs[tpl.slug]);
            return (
              <div
                key={tpl.slug}
                className="bg-white rounded-2xl border border-charcoal-100 shadow-sm hover:shadow-luxury hover:border-gold/60 transition flex flex-col justify-between overflow-hidden"
              >
                {/* Card Canvas Preview Stage */}
                <div className="bg-gradient-to-br from-charcoal-900 via-forest-950 to-charcoal-900 p-5 flex flex-col items-center justify-center relative">
                  <div className="w-full flex items-center justify-between mb-3 text-[10px]">
                    <span className="px-2.5 py-0.5 rounded-full bg-gold/15 text-gold border border-gold/30 font-semibold">
                      {tpl.category}
                    </span>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => toggleSide(tpl.slug)}
                        className="px-2 py-0.5 rounded bg-forest-900/90 text-cream border border-gold/30 hover:border-gold flex items-center gap-1"
                      >
                        <FlipHorizontal className="w-3 h-3 text-gold" />
                        <span>{showBack ? "BACK" : "FRONT"}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setInspect3DTemplate(tpl)}
                        className="px-2 py-0.5 rounded bg-gold/20 text-gold border border-gold/40 hover:bg-gold hover:text-forest-950 flex items-center gap-1 font-semibold transition"
                      >
                        <Box className="w-3 h-3" />
                        <span>3D</span>
                      </button>
                    </div>
                  </div>

                  <div className="py-1 flex items-center justify-center">
                    <CardCanvasRenderer
                      widthMm={tpl.widthMm}
                      heightMm={tpl.heightMm}
                      side={showBack ? "BACK" : "FRONT"}
                      background={showBack ? tpl.backBg : tpl.frontBg}
                      elements={showBack ? tpl.backElements : tpl.frontElements}
                      paperFinish={tpl.paperFinish}
                      cornerStyle={tpl.cornerStyle}
                      scalePxPerMm={3.5}
                    />
                  </div>

                  <div className="w-full flex items-center justify-between mt-3 text-[10px] text-cream/60 font-mono">
                    <span>
                      {tpl.widthMm}×{tpl.heightMm}mm • {tpl.paperFinish}
                    </span>
                    <span>{tpl.cornerStyle} CORNERS</span>
                  </div>
                </div>

                {/* Template Details & Action */}
                <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                  <div>
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="text-base font-serif font-bold text-forest-950">
                        {tpl.name}
                      </h3>
                      <div className="flex items-center gap-1">
                        {(tpl.previewPalette || []).map((hex, i) => (
                          <span
                            key={i}
                            style={{ backgroundColor: hex }}
                            className="w-3.5 h-3.5 rounded-full border border-charcoal-200"
                          />
                        ))}
                      </div>
                    </div>
                    <p className="text-xs text-charcoal-600 mt-1.5 leading-relaxed">
                      {tpl.description}
                    </p>
                  </div>

                  <div className="pt-2 flex items-center gap-2.5">
                    <button
                      type="button"
                      onClick={() =>
                        router.push(`/admin/studio?template=${tpl.slug}`)
                      }
                      className="flex-1 py-2.5 px-4 rounded-xl bg-forest-900 text-gold font-bold text-xs uppercase tracking-wider hover:bg-forest-800 transition flex items-center justify-center gap-2"
                    >
                      <Palette className="w-3.5 h-3.5" />
                      <span>Customize in Studio</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 3D Inspection Modal */}
      {inspect3DTemplate && (
        <div className="fixed inset-0 z-50 bg-forest-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-forest-950 border border-gold/40 rounded-2xl max-w-3xl w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[10px] uppercase tracking-widest text-gold font-bold">
                  {inspect3DTemplate.category}
                </span>
                <h3 className="text-xl font-serif font-bold text-cream">
                  {inspect3DTemplate.name} — Live 3D Mockup
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setInspect3DTemplate(null)}
                className="px-3 py-1.5 rounded-lg bg-forest-900 text-cream text-xs hover:bg-forest-800"
              >
                Close ✕
              </button>
            </div>

            <Card3DPreview
              widthMm={inspect3DTemplate.widthMm}
              heightMm={inspect3DTemplate.heightMm}
              frontBg={inspect3DTemplate.frontBg}
              backBg={inspect3DTemplate.backBg}
              frontElements={inspect3DTemplate.frontElements}
              backElements={inspect3DTemplate.backElements}
              isDoubleSided={inspect3DTemplate.isDoubleSided}
              paperFinish={inspect3DTemplate.paperFinish}
              cornerStyle={inspect3DTemplate.cornerStyle}
            />

            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setInspect3DTemplate(null)}
                className="px-4 py-2 rounded-xl border border-gold/30 text-cream text-xs font-semibold"
              >
                Back to Library
              </button>
              <button
                type="button"
                onClick={() =>
                  router.push(`/admin/studio?template=${inspect3DTemplate.slug}`)
                }
                className="px-5 py-2.5 rounded-xl bg-gold text-forest-950 font-bold text-xs uppercase tracking-wider flex items-center gap-2"
              >
                <Check className="w-4 h-4" />
                <span>Use &amp; Customize This Template</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

