"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  Palette,
  QrCode,
  Printer,
  FolderKanban,
  Sparkles,
  CheckCircle2,
  Clock,
  ArrowRight,
  Building2,
  BarChart3,
  ExternalLink,
  Plus,
} from "lucide-react";
import { CardCanvasRenderer } from "@/components/studio/CardCanvasRenderer";
import { CanvasElement, CardBackground, CornerStyle, PaperFinish } from "@/types/studio";

interface DashboardDesign {
  id: string;
  name: string;
  widthMm: number;
  heightMm: number;
  paperFinish: PaperFinish;
  cornerStyle: CornerStyle;
  status: string;
  updatedAt: string;
  frontBg: CardBackground;
  frontElements: CanvasElement[];
}

interface DashboardOrder {
  id: string;
  orderReference: string;
  designNameSnapshot: string;
  quantity: number;
  totalCost: number;
  currency: string;
  status: string;
  createdAt: string;
}

interface OverviewResponse {
  metrics: {
    totalDesigns: number;
    isProfilePublished: boolean;
    profileSlug: string;
    totalQrScans: number;
    totalPrintOrders: number;
    pendingPrintOrders: number;
    servicesCount: number;
    templatesCount: number;
  };
  companyProfile: {
    companyName: string;
    professionalTitle: string;
    phone: string;
    email: string;
  } | null;
  recentDesigns: DashboardDesign[];
  recentOrders: DashboardOrder[];
}

export default function AdminDashboardOverviewPage() {
  const [data, setData] = useState<OverviewResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/overview")
      .then((r) => r.json())
      .then((res) => {
        setData(res);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="p-12 text-center">
        <div className="inline-block w-10 h-10 rounded-xl bg-forest-900 text-gold font-serif font-bold text-xl flex items-center justify-center animate-pulse mx-auto mb-3">
          H
        </div>
        <div className="text-sm text-charcoal-600">
          Loading HEZLON Executive Dashboard...
        </div>
      </div>
    );
  }

  const metrics = data?.metrics || {
    totalDesigns: 0,
    isProfilePublished: true,
    profileSlug: "hezlon",
    totalQrScans: 0,
    totalPrintOrders: 0,
    pendingPrintOrders: 0,
    servicesCount: 7,
    templatesCount: 20,
  };

  return (
    <div className="max-w-7xl mx-auto space-y-7">
      {/* Executive Welcome Banner */}
      <div className="rounded-2xl bg-gradient-to-r from-forest-950 via-forest-900 to-forest-800 text-cream p-7 border border-gold/30 shadow-luxury flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gold/15 border border-gold/35 text-gold text-[11px] font-semibold uppercase tracking-widest">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Single-Company Executive Workspace</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-serif font-bold text-cream">
            {data?.companyProfile?.companyName || "HEZLON Building Solutions"}
          </h1>
          <p className="text-xs sm:text-sm text-cream/80 max-w-2xl">
            {data?.companyProfile?.professionalTitle ||
              "Aluminum & Glass Specialist"}{" "}
            • Manage your company identity, customize{" "}
            {metrics.templatesCount} architectural business card templates,
            inspect live 3D finishes, and export CMYK-ready production PDFs.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 shrink-0">
          <Link
            href="/admin/studio"
            className="px-5 py-3 rounded-xl bg-gold text-forest-950 font-bold text-xs uppercase tracking-wider hover:bg-gold-300 transition flex items-center gap-2 shadow-gold-glow"
          >
            <Plus className="w-4 h-4" />
            <span>Create Business Card</span>
          </Link>
          <Link
            href="/admin/templates"
            className="px-4 py-3 rounded-xl bg-forest-950/80 border border-gold/40 text-cream font-semibold text-xs uppercase tracking-wider hover:border-gold transition flex items-center gap-2"
          >
            <Sparkles className="w-4 h-4 text-gold" />
            <span>Browse {metrics.templatesCount} Templates</span>
          </Link>
        </div>
      </div>

      {/* Primary KPI Metric Cards (Real Database Counts) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-white rounded-2xl p-5 border border-charcoal-100 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-charcoal-500">
              Total Designs
            </span>
            <div className="w-9 h-9 rounded-xl bg-forest-50 text-forest-900 flex items-center justify-center">
              <FolderKanban className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-3xl font-serif font-bold text-forest-950">
              {metrics.totalDesigns}
            </div>
            <Link
              href="/admin/designs"
              className="text-[11px] font-semibold text-forest-700 hover:underline inline-flex items-center gap-1 mt-1"
            >
              <span>Manage saved designs</span>
              <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-charcoal-100 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-charcoal-500">
              Digital QR Profile
            </span>
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
              <QrCode className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4">
            <div className="flex items-center gap-2">
              <span
                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold ${
                  metrics.isProfilePublished
                    ? "bg-emerald-100 text-emerald-800"
                    : "bg-amber-100 text-amber-800"
                }`}
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                {metrics.isProfilePublished ? "Published" : "Private"}
              </span>
            </div>
            <Link
              href={`/${metrics.profileSlug}`}
              target="_blank"
              className="text-[11px] font-semibold text-forest-700 hover:underline inline-flex items-center gap-1 mt-2"
            >
              <span>/{metrics.profileSlug}</span>
              <ExternalLink className="w-3 h-3" />
            </Link>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-charcoal-100 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-charcoal-500">
              Total QR Scans
            </span>
            <div className="w-9 h-9 rounded-xl bg-gold-50 text-gold-700 flex items-center justify-center">
              <BarChart3 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-3xl font-serif font-bold text-forest-950">
              {metrics.totalQrScans}
            </div>
            <Link
              href="/admin/analytics"
              className="text-[11px] font-semibold text-forest-700 hover:underline inline-flex items-center gap-1 mt-1"
            >
              <span>View scan analytics</span>
              <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-charcoal-100 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-charcoal-500">
              Print Orders
            </span>
            <div className="w-9 h-9 rounded-xl bg-forest-50 text-forest-900 flex items-center justify-center">
              <Printer className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-3xl font-serif font-bold text-forest-950">
              {metrics.totalPrintOrders}
            </div>
            <Link
              href="/admin/orders"
              className="text-[11px] font-semibold text-forest-700 hover:underline inline-flex items-center gap-1 mt-1"
            >
              <span>Order physical cards</span>
              <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-charcoal-100 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-charcoal-500">
              Pending Orders
            </span>
            <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-3xl font-serif font-bold text-forest-950">
              {metrics.pendingPrintOrders}
            </div>
            <span className="text-[11px] text-charcoal-500 mt-1 block">
              In production pipeline
            </span>
          </div>
        </div>
      </div>

      {/* Main Content Split: Recent Design Activity & Print Orders */}
      <div className="grid lg:grid-cols-12 gap-6">
        {/* Recent Design Activity */}
        <div className="lg:col-span-7 bg-white rounded-2xl border border-charcoal-100 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-base font-serif font-bold text-forest-950">
                Recent Design Activity
              </h2>
              <p className="text-xs text-charcoal-500">
                Your saved HEZLON business card designs and drafts
              </p>
            </div>
            <Link
              href="/admin/studio"
              className="text-xs font-bold text-forest-800 hover:text-forest-600 flex items-center gap-1"
            >
              <span>+ New Design</span>
            </Link>
          </div>

          {!data?.recentDesigns || data.recentDesigns.length === 0 ? (
            <div className="rounded-2xl border-2 border-dashed border-charcoal-200 bg-cream/50 p-10 text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-forest-900 text-gold flex items-center justify-center mx-auto">
                <Palette className="w-6 h-6" />
              </div>
              <div className="text-base font-serif font-bold text-forest-950">
                No Business Card Designs Saved Yet
              </div>
              <p className="text-xs text-charcoal-500 max-w-md mx-auto">
                Start by selecting one of the 20 pre-configured architectural
                templates for HEZLON Building Solutions or open the visual
                design studio to craft your first card.
              </p>
              <div className="flex items-center justify-center gap-3 pt-2">
                <Link
                  href="/admin/templates"
                  className="px-4 py-2 rounded-xl bg-forest-900 text-gold font-semibold text-xs hover:bg-forest-800 transition"
                >
                  Select a Template
                </Link>
                <Link
                  href="/admin/studio"
                  className="px-4 py-2 rounded-xl border border-forest-900 text-forest-900 font-semibold text-xs hover:bg-forest-50 transition"
                >
                  Open Blank Studio
                </Link>
              </div>
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 gap-4">
              {data.recentDesigns.map((d) => (
                <div
                  key={d.id}
                  className="rounded-xl border border-charcoal-100 p-3.5 bg-cream/40 hover:border-gold transition flex flex-col justify-between gap-3"
                >
                  <div className="flex items-center justify-center bg-charcoal-900/5 rounded-lg p-2 overflow-hidden">
                    <CardCanvasRenderer
                      widthMm={d.widthMm}
                      heightMm={d.heightMm}
                      side="FRONT"
                      background={d.frontBg}
                      elements={d.frontElements}
                      paperFinish={d.paperFinish}
                      cornerStyle={d.cornerStyle}
                      scalePxPerMm={2.6}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-xs font-bold text-forest-950 truncate">
                        {d.name}
                      </div>
                      <div className="text-[10px] text-charcoal-500">
                        {d.widthMm}×{d.heightMm}mm • {d.paperFinish}
                      </div>
                    </div>
                    <Link
                      href={`/admin/studio?designId=${d.id}`}
                      className="px-3 py-1.5 rounded-lg bg-forest-900 text-gold text-[11px] font-semibold hover:bg-forest-800"
                    >
                      Edit
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Print Orders & Company Status */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white rounded-2xl border border-charcoal-100 p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-base font-serif font-bold text-forest-950">
                  Recent Print Orders
                </h2>
                <p className="text-xs text-charcoal-500">
                  Production runs for physical HEZLON cards
                </p>
              </div>
              <Link
                href="/admin/orders"
                className="text-xs font-bold text-forest-800 hover:underline"
              >
                View All
              </Link>
            </div>

            {!data?.recentOrders || data.recentOrders.length === 0 ? (
              <div className="rounded-xl border border-dashed border-charcoal-200 bg-cream/40 p-7 text-center space-y-2.5">
                <Printer className="w-7 h-7 text-forest-800 mx-auto" />
                <div className="text-sm font-serif font-bold text-forest-950">
                  No Print Orders Recorded Yet
                </div>
                <p className="text-xs text-charcoal-500">
                  Once you finalize a business card design, you can generate a
                  quotation for 50, 100, or 1,000 copies and export the
                  production PDF.
                </p>
                <Link
                  href="/admin/orders"
                  className="inline-block mt-1 px-4 py-2 rounded-xl bg-forest-900 text-gold text-xs font-semibold hover:bg-forest-800 transition"
                >
                  Create Print Order
                </Link>
              </div>
            ) : (
              <div className="space-y-2.5">
                {data.recentOrders.map((ord) => (
                  <div
                    key={ord.id}
                    className="p-3.5 rounded-xl bg-cream/50 border border-charcoal-100 flex items-center justify-between text-xs"
                  >
                    <div>
                      <div className="font-mono font-bold text-forest-900">
                        {ord.orderReference}
                      </div>
                      <div className="text-charcoal-600">
                        {ord.designNameSnapshot} • {ord.quantity} copies
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-forest-950">
                        ${ord.totalCost.toFixed(2)}
                      </div>
                      <span className="inline-block px-2 py-0.5 rounded bg-forest-100 text-forest-800 text-[10px] font-semibold">
                        {ord.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Company Profile Quick Status Card */}
          <div className="bg-forest-950 text-cream rounded-2xl p-6 border border-gold/30 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Building2 className="w-5 h-5 text-gold" />
                <h3 className="text-sm font-serif font-bold text-cream">
                  HEZLON Company Identity
                </h3>
              </div>
              <Link
                href="/admin/company"
                className="text-xs text-gold hover:underline"
              >
                Edit Details →
              </Link>
            </div>
            <div className="text-xs space-y-1.5 text-cream/80 font-mono">
              <div>
                <span className="text-gold">Company:</span>{" "}
                {data?.companyProfile?.companyName}
              </div>
              <div>
                <span className="text-gold">Title:</span>{" "}
                {data?.companyProfile?.professionalTitle}
              </div>
              <div>
                <span className="text-gold">Phone:</span>{" "}
                {data?.companyProfile?.phone}
              </div>
              <div>
                <span className="text-gold">Email:</span>{" "}
                {data?.companyProfile?.email}
              </div>
              <div>
                <span className="text-gold">Published Services:</span>{" "}
                {metrics.servicesCount} active services
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

