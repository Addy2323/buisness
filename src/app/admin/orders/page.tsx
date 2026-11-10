"use client";

import React, { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  Printer,
  Download,
  CheckCircle2,
  Plus,
  FileText,
  Sparkles,
  Eye,
} from "lucide-react";
import { HEZLON_TEMPLATES } from "@/lib/templates-catalog";

const ORDER_STATUSES = [
  "DRAFT",
  "PENDING_APPROVAL",
  "APPROVED",
  "SENT_TO_PRINTER",
  "IN_PRINTING",
  "READY_FOR_COLLECTION",
  "DISPATCHED",
  "DELIVERED",
  "CANCELLED",
] as const;

interface DesignOption {
  id: string;
  name: string;
  widthMm: number;
  heightMm: number;
  bleedMm: number;
  paperFinish: string;
  cornerStyle: string;
  isDoubleSided: boolean;
}

interface ProviderOption {
  id: string;
  name: string;
  contactPerson: string;
  phone: string;
  isDefault: boolean;
}

interface PricingMatrix {
  currency: string;
  currencySymbol: string;
  baseUnitCostMatte: number;
  baseUnitCostGloss: number;
  baseUnitCostSoftTouch: number;
  baseUnitCostTextured: number;
  roundedCornerSurcharge: number;
  doubleSidedMultiplier: number;
  setupFee: number;
  bulkDiscount100: number;
  bulkDiscount500: number;
  bulkDiscount1000: number;
}

interface PrintOrderRecord {
  id: string;
  orderReference: string;
  designId: string | null;
  designNameSnapshot: string;
  widthMm: number;
  heightMm: number;
  bleedMm: number;
  quantity: number;
  paperFinish: string;
  paperWeightGsm: number;
  cornerStyle: string;
  isDoubleSided: boolean;
  unitPrice: number;
  setupFee: number;
  totalCost: number;
  currency: string;
  providerNameSnapshot: string;
  status: string;
  deliveryMethod: string;
  deliveryNotes: string;
  productionNotes: string;
  createdAt: string;
}

function PrintOrdersContent() {
  const searchParams = useSearchParams();
  const initialDesignId = searchParams.get("designId") || "";

  const [orders, setOrders] = useState<PrintOrderRecord[]>([]);
  const [designs, setDesigns] = useState<DesignOption[]>([]);
  const [providers, setProviders] = useState<ProviderOption[]>([]);
  const [pricing, setPricing] = useState<PricingMatrix | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  // Order Form State
  const [selectedDesignId, setSelectedDesignId] = useState(initialDesignId);
  const [dimensionPreset, setDimensionPreset] = useState<
    "90x50" | "85x55" | "CUSTOM"
  >("90x50");
  const [widthMm, setWidthMm] = useState(90);
  const [heightMm, setHeightMm] = useState(50);
  const [bleedMm, setBleedMm] = useState(3);
  const [quantity, setQuantity] = useState(100);
  const [paperFinish, setPaperFinish] = useState<
    "MATTE" | "GLOSS" | "SOFT_TOUCH" | "TEXTURED"
  >("SOFT_TOUCH");
  const [paperWeightGsm, setPaperWeightGsm] = useState(400);
  const [cornerStyle, setCornerStyle] = useState<"SQUARE" | "ROUNDED">(
    "SQUARE"
  );
  const [isDoubleSided, setIsDoubleSided] = useState(true);
  const [printProviderId, setPrintProviderId] = useState("");
  const [deliveryMethod, setDeliveryMethod] = useState<
    "COLLECTION" | "DELIVERY"
  >("COLLECTION");
  const [productionNotes, setProductionNotes] = useState(
    "3mm full bleed with crop marks. Verify HEZLON Forest Green & Champagne Gold density."
  );

  const loadAll = async () => {
    setLoading(true);
    try {
      const [ordRes, desRes] = await Promise.all([
        fetch("/api/admin/orders").then((r) => r.json()),
        fetch("/api/admin/designs").then((r) => r.json()),
      ]);

      setOrders(ordRes.orders || []);
      setPricing(ordRes.pricing || null);
      setProviders(ordRes.providers || []);

      const defaultProv = (ordRes.providers || []).find(
        (p: ProviderOption) => p.isDefault
      );
      if (defaultProv && !printProviderId) {
        setPrintProviderId(defaultProv.id);
      }

      const loadedDesigns: DesignOption[] = desRes.designs || [];
      setDesigns(loadedDesigns);

      if (initialDesignId) {
        setSelectedDesignId(initialDesignId);
      } else if (loadedDesigns.length > 0 && !selectedDesignId) {
        setSelectedDesignId(loadedDesigns[0].id);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Calculate live quotation
  const computeQuotation = () => {
    const baseRate =
      paperFinish === "TEXTURED"
        ? pricing?.baseUnitCostTextured ?? 0.55
        : paperFinish === "SOFT_TOUCH"
        ? pricing?.baseUnitCostSoftTouch ?? 0.48
        : paperFinish === "GLOSS"
        ? pricing?.baseUnitCostGloss ?? 0.38
        : pricing?.baseUnitCostMatte ?? 0.35;

    const cornerExtra =
      cornerStyle === "ROUNDED" ? pricing?.roundedCornerSurcharge ?? 0.05 : 0;
    const sidedMult = isDoubleSided
      ? pricing?.doubleSidedMultiplier ?? 1.25
      : 1.0;

    const discount =
      quantity >= 1000
        ? pricing?.bulkDiscount1000 ?? 0.25
        : quantity >= 500
        ? pricing?.bulkDiscount500 ?? 0.15
        : quantity >= 100
        ? pricing?.bulkDiscount100 ?? 0.05
        : 0;

    const unitPrice = Number(
      ((baseRate + cornerExtra) * sidedMult * (1 - discount)).toFixed(3)
    );
    const setupFee = Number((pricing?.setupFee ?? 15.0).toFixed(2));
    const totalCost = Number((unitPrice * quantity + setupFee).toFixed(2));
    return { unitPrice, setupFee, totalCost, discountPct: Math.round(discount * 100) };
  };

  const quote = computeQuotation();

  const handleCreateOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      let targetDesignId = selectedDesignId;

      // If no design exists yet, auto-save the flagship HEZLON Emerald Sovereign design
      if (!targetDesignId) {
        const flagship = HEZLON_TEMPLATES[0];
        const createDesRes = await fetch("/api/admin/designs", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: `HEZLON — ${flagship.name}`,
            widthMm,
            heightMm,
            bleedMm,
            safeMarginMm: 5,
            isDoubleSided,
            paperFinish,
            cornerStyle,
            frontBg: flagship.frontBg,
            backBg: flagship.backBg,
            frontElements: flagship.frontElements,
            backElements: flagship.backElements,
            status: "APPROVED",
          }),
        });
        const desData = await createDesRes.json();
        if (desData.design?.id) {
          targetDesignId = desData.design.id;
          setSelectedDesignId(targetDesignId);
        }
      }

      const res = await fetch("/api/admin/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          designId: targetDesignId,
          widthMm,
          heightMm,
          bleedMm,
          safeMarginMm: 5,
          quantity,
          paperFinish,
          paperWeightGsm,
          cornerStyle,
          isDoubleSided,
          printProviderId: printProviderId || null,
          deliveryMethod,
          productionNotes,
          status: "APPROVED",
        }),
      });

      if (res.ok) {
        await loadAll();
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateStatus = async (orderId: string, nextStatus: string) => {
    await fetch("/api/admin/orders", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: orderId, status: nextStatus }),
    });
    await loadAll();
  };

  const handleDownloadOrderPdf = async (
    order: PrintOrderRecord,
    mode: "PREVIEW" | "PRINT_READY" = "PRINT_READY"
  ) => {
    setDownloadingId(`${order.id}-${mode}`);
    try {
      const format = mode === "PREVIEW" ? "PDF_PREVIEW" : "PDF_PRINT_READY";
      const res = await fetch("/api/admin/export-pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId: order.id,
          format,
        }),
      });
      if (res.ok) {
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        const suffix = mode === "PREVIEW" ? "preview" : "a4-print-ready";
        a.download = `${order.orderReference}-${suffix}.pdf`;
        a.click();
        URL.revokeObjectURL(url);
      }
    } finally {
      setDownloadingId(null);
    }
  };

  if (loading) {
    return (
      <div className="p-12 text-center text-sm text-charcoal-500">
        Loading HEZLON Print Order Management &amp; Quotation Engine...
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-7">
      {/* Header */}
      <div className="bg-forest-950 text-cream rounded-2xl p-6 border border-gold/30 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-widest text-gold">
            <Sparkles className="w-3.5 h-3.5" />
            <span>External Print Studio Production Workflow</span>
          </div>
          <h1 className="text-2xl font-serif font-bold text-cream mt-1">
            Print Order Management &amp; Order History
          </h1>
          <p className="text-xs text-cream/80 mt-1 max-w-2xl">
            Configure print runs (50, 100, 1,000, or custom quantities),
            generate instant quotations, approve production files with 3&nbsp;mm
            bleed &amp; crop marks, and track external printer status.
          </p>
        </div>

        <Link
          href="/admin/print-settings"
          className="px-4 py-2.5 rounded-xl bg-forest-900 border border-gold/40 text-gold text-xs font-bold uppercase tracking-wider hover:bg-forest-800 transition shrink-0"
        >
          Configure Print Prices &amp; Studios →
        </Link>
      </div>

      {/* Create Print Order & Live Quotation Builder */}
      <form
        onSubmit={handleCreateOrder}
        className="grid lg:grid-cols-12 gap-6 items-start"
      >
        <div className="lg:col-span-8 bg-white rounded-2xl p-6 border border-charcoal-100 shadow-sm space-y-5">
          <h2 className="text-base font-serif font-bold text-forest-950 flex items-center gap-2">
            <Plus className="w-4 h-4 text-gold-700" />
            <span>Configure New Physical Print Order</span>
          </h2>

          <div className="grid sm:grid-cols-2 gap-4">
            {/* Select Business Card Design */}
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold uppercase text-forest-900 mb-1.5">
                1. Business Card Design
              </label>
              {designs.length > 0 ? (
                <select
                  value={selectedDesignId}
                  onChange={(e) => setSelectedDesignId(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-charcoal-200 text-xs font-semibold"
                >
                  {designs.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name} ({d.widthMm}×{d.heightMm}mm • {d.paperFinish})
                    </option>
                  ))}
                </select>
              ) : (
                <div className="p-3 rounded-xl bg-cream/60 border border-charcoal-200 text-xs text-charcoal-700 flex items-center justify-between">
                  <span>
                    Using Flagship Default:{" "}
                    <strong>HEZLON — The Emerald Sovereign (90×50mm)</strong>
                  </span>
                  <Link
                    href="/admin/studio"
                    className="text-forest-900 font-bold underline"
                  >
                    Customize in Studio
                  </Link>
                </div>
              )}
            </div>

            {/* Quantity Presets (50, 100, 1000, Custom) */}
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold uppercase text-forest-900 mb-1.5">
                2. Print Quantity (Copies)
              </label>
              <div className="grid grid-cols-5 gap-2 mb-2">
                {[50, 100, 250, 500, 1000].map((q) => (
                  <button
                    key={q}
                    type="button"
                    onClick={() => setQuantity(q)}
                    className={`py-2 rounded-xl border text-xs font-bold transition ${
                      quantity === q
                        ? "bg-forest-900 text-gold border-gold shadow-sm"
                        : "border-charcoal-200 text-charcoal-700 hover:bg-cream"
                    }`}
                  >
                    {q.toLocaleString()} Cards
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-charcoal-500">
                  Or enter custom quantity:
                </span>
                <input
                  type="number"
                  min={10}
                  max={50000}
                  value={quantity}
                  onChange={(e) =>
                    setQuantity(Math.max(10, Number(e.target.value)))
                  }
                  className="w-32 px-3 py-1.5 rounded-lg border border-charcoal-200 text-xs font-mono font-bold"
                />
              </div>
            </div>

            {/* Dimensions */}
            <div>
              <label className="block text-xs font-bold uppercase text-forest-900 mb-1">
                3. Card Dimensions
              </label>
              <select
                value={dimensionPreset}
                onChange={(e) => {
                  const val = e.target.value as "90x50" | "85x55" | "CUSTOM";
                  setDimensionPreset(val);
                  if (val === "90x50") {
                    setWidthMm(90);
                    setHeightMm(50);
                  } else if (val === "85x55") {
                    setWidthMm(85);
                    setHeightMm(55);
                  }
                }}
                className="w-full px-3 py-2 rounded-xl border border-charcoal-200 text-xs font-semibold"
              >
                <option value="90x50">90 × 50 mm (Standard ISO)</option>
                <option value="85x55">85 × 55 mm (Standard EU)</option>
                <option value="CUSTOM">Custom Dimensions (mm)</option>
              </select>
              {dimensionPreset === "CUSTOM" && (
                <div className="grid grid-cols-2 gap-2 mt-2">
                  <input
                    type="number"
                    value={widthMm}
                    onChange={(e) => setWidthMm(Number(e.target.value))}
                    placeholder="Width mm"
                    className="px-2.5 py-1.5 rounded-lg border text-xs font-mono"
                  />
                  <input
                    type="number"
                    value={heightMm}
                    onChange={(e) => setHeightMm(Number(e.target.value))}
                    placeholder="Height mm"
                    className="px-2.5 py-1.5 rounded-lg border text-xs font-mono"
                  />
                </div>
              )}
            </div>

            {/* Bleed Configuration */}
            <div>
              <label className="block text-xs font-bold uppercase text-forest-900 mb-1">
                Printer Bleed Margin (mm)
              </label>
              <input
                type="number"
                step="0.5"
                min={0}
                max={10}
                value={bleedMm}
                onChange={(e) => setBleedMm(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-xl border border-charcoal-200 text-xs font-mono"
              />
            </div>

            {/* Paper Finish */}
            <div>
              <label className="block text-xs font-bold uppercase text-forest-900 mb-1">
                4. Paper Stock &amp; Finishing
              </label>
              <select
                value={paperFinish}
                onChange={(e) =>
                  setPaperFinish(
                    e.target.value as
                      | "MATTE"
                      | "GLOSS"
                      | "SOFT_TOUCH"
                      | "TEXTURED"
                  )
                }
                className="w-full px-3 py-2 rounded-xl border border-charcoal-200 text-xs font-semibold"
              >
                <option value="MATTE">Matte Silk Lamination (400gsm)</option>
                <option value="GLOSS">High-Gloss UV Coating (400gsm)</option>
                <option value="SOFT_TOUCH">
                  Velvet Soft-Touch Lamination (450gsm)
                </option>
                <option value="TEXTURED">
                  Premium Textured Cotton Stock (450gsm)
                </option>
              </select>
            </div>

            {/* Corner Style */}
            <div>
              <label className="block text-xs font-bold uppercase text-forest-900 mb-1">
                5. Corner Finishing
              </label>
              <select
                value={cornerStyle}
                onChange={(e) =>
                  setCornerStyle(e.target.value as "SQUARE" | "ROUNDED")
                }
                className="w-full px-3 py-2 rounded-xl border border-charcoal-200 text-xs font-semibold"
              >
                <option value="SQUARE">Square Architectural Corners</option>
                <option value="ROUNDED">Rounded Die-Cut Corners (3.5mm)</option>
              </select>
            </div>

            {/* External Print Studio */}
            <div>
              <label className="block text-xs font-bold uppercase text-forest-900 mb-1">
                6. External Printing Studio
              </label>
              <select
                value={printProviderId}
                onChange={(e) => setPrintProviderId(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-charcoal-200 text-xs font-semibold"
              >
                {providers.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} {p.isDefault ? "(Preferred)" : ""}
                  </option>
                ))}
              </select>
            </div>

            {/* Collection or Delivery */}
            <div>
              <label className="block text-xs font-bold uppercase text-forest-900 mb-1">
                7. Fulfillment Method
              </label>
              <select
                value={deliveryMethod}
                onChange={(e) =>
                  setDeliveryMethod(
                    e.target.value as "COLLECTION" | "DELIVERY"
                  )
                }
                className="w-full px-3 py-2 rounded-xl border border-charcoal-200 text-xs font-semibold"
              >
                <option value="COLLECTION">Studio Collection</option>
                <option value="DELIVERY">Courier Delivery to HEZLON</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase text-forest-900 mb-1">
              Pre-Press Production Notes for Printer
            </label>
            <input
              type="text"
              value={productionNotes}
              onChange={(e) => setProductionNotes(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl border border-charcoal-200 text-xs"
            />
          </div>
        </div>

        {/* Right Live Price Quotation Summary & Approve Card */}
        <div className="lg:col-span-4 bg-forest-950 text-cream rounded-2xl p-6 border border-gold/30 shadow-luxury space-y-5">
          <div>
            <div className="text-[10px] font-bold uppercase tracking-widest text-gold">
              INSTANT PRODUCTION QUOTATION
            </div>
            <h3 className="text-xl font-serif font-bold text-cream mt-1">
              HEZLON Print Run Summary
            </h3>
          </div>

          <div className="space-y-2.5 text-xs border-y border-gold/20 py-4">
            <div className="flex justify-between">
              <span className="text-cream/70">Quantity:</span>
              <span className="font-bold font-mono">
                {quantity.toLocaleString()} Business Cards
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-cream/70">Dimensions &amp; Bleed:</span>
              <span className="font-mono">
                {widthMm}×{heightMm}mm (+{bleedMm}mm bleed)
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-cream/70">Paper &amp; Finish:</span>
              <span className="font-semibold">
                {paperWeightGsm}gsm {paperFinish.replace("_", "-")}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-cream/70">Corners &amp; Sides:</span>
              <span>
                {cornerStyle} • {isDoubleSided ? "Double-Sided" : "Single-Sided"}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-cream/70">Unit Price:</span>
              <span className="font-mono">${quote.unitPrice.toFixed(3)} / card</span>
            </div>
            {quote.discountPct > 0 && (
              <div className="flex justify-between text-emerald-300">
                <span>Volume Discount Applied:</span>
                <span className="font-mono">-{quote.discountPct}%</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-cream/70">Pre-Press Setup &amp; Plates:</span>
              <span className="font-mono">${quote.setupFee.toFixed(2)}</span>
            </div>
          </div>

          <div className="flex items-baseline justify-between">
            <span className="text-xs uppercase tracking-wider text-gold font-bold">
              Estimated Total:
            </span>
            <span className="text-3xl font-serif font-bold text-gold">
              ${quote.totalCost.toFixed(2)}
            </span>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3.5 rounded-xl bg-gold text-forest-950 font-bold text-xs uppercase tracking-wider hover:bg-gold-300 transition flex items-center justify-center gap-2 shadow-gold-glow"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>
              {submitting
                ? "Recording Print Order..."
                : `Approve & Record Order (${quantity} Cards)`}
            </span>
          </button>
        </div>
      </form>

      {/* Section 14: Print Order History Table */}
      <div className="bg-white rounded-2xl p-6 border border-charcoal-100 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-serif font-bold text-forest-950 flex items-center gap-2">
              <FileText className="w-5 h-5 text-gold-700" />
              <span>Print Order History &amp; Production Pipeline</span>
            </h2>
            <p className="text-xs text-charcoal-500">
              Track every physical print order from approval to external studio
              printing and delivery. Download approved production PDFs anytime.
            </p>
          </div>
        </div>

        {orders.length === 0 ? (
          <div className="p-10 rounded-xl border border-dashed border-charcoal-200 text-center space-y-2">
            <Printer className="w-8 h-8 text-forest-800 mx-auto" />
            <div className="text-sm font-serif font-bold text-forest-950">
              No Print Orders Placed Yet
            </div>
            <p className="text-xs text-charcoal-500">
              Use the quotation form above to approve and record your first
              batch of 100 HEZLON business cards.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-charcoal-100 text-charcoal-500 uppercase text-[10px]">
                  <th className="py-3 px-3">Order Ref</th>
                  <th className="py-3 px-3">Design Name</th>
                  <th className="py-3 px-3">Specs</th>
                  <th className="py-3 px-3">Qty</th>
                  <th className="py-3 px-3">Unit / Total</th>
                  <th className="py-3 px-3">Printing Studio</th>
                  <th className="py-3 px-3">Order Status</th>
                  <th className="py-3 px-3 text-right">Production PDF</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-charcoal-100">
                {orders.map((ord) => (
                  <tr key={ord.id} className="hover:bg-cream/40">
                    <td className="py-3 px-3 font-mono font-bold text-forest-900">
                      {ord.orderReference}
                      <div className="text-[10px] font-normal text-charcoal-400">
                        {new Date(ord.createdAt).toLocaleDateString()}
                      </div>
                    </td>
                    <td className="py-3 px-3 font-semibold text-forest-950">
                      {ord.designNameSnapshot}
                    </td>
                    <td className="py-3 px-3 text-[11px] text-charcoal-600">
                      {ord.widthMm}×{ord.heightMm}mm • {ord.paperFinish} •{" "}
                      {ord.cornerStyle}
                    </td>
                    <td className="py-3 px-3 font-mono font-bold">
                      {ord.quantity.toLocaleString()}
                    </td>
                    <td className="py-3 px-3 font-mono">
                      <div className="font-bold text-forest-950">
                        ${ord.totalCost.toFixed(2)}
                      </div>
                      <div className="text-[10px] text-charcoal-500">
                        ${ord.unitPrice.toFixed(3)}/ea
                      </div>
                    </td>
                    <td className="py-3 px-3 text-charcoal-700">
                      {ord.providerNameSnapshot}
                    </td>
                    <td className="py-3 px-3">
                      <select
                        value={ord.status}
                        onChange={(e) =>
                          handleUpdateStatus(ord.id, e.target.value)
                        }
                        className="px-2.5 py-1.5 rounded-lg border border-charcoal-200 bg-white font-bold text-[11px] text-forest-900"
                      >
                        {ORDER_STATUSES.map((st) => (
                          <option key={st} value={st}>
                            {st}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="py-3 px-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          disabled={downloadingId === `${ord.id}-PREVIEW`}
                          onClick={() => handleDownloadOrderPdf(ord, "PREVIEW")}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-charcoal-200 text-charcoal-800 font-bold text-[11px] hover:bg-cream transition"
                          title="Download Clean 2-Page Preview Proof"
                        >
                          <Eye className="w-3.5 h-3.5 text-gold-700" />
                          <span>Preview</span>
                        </button>
                        <button
                          type="button"
                          disabled={downloadingId === `${ord.id}-PRINT_READY`}
                          onClick={() => handleDownloadOrderPdf(ord, "PRINT_READY")}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-forest-900 text-gold font-bold text-[11px] hover:bg-forest-800 transition"
                          title="Download A4 8-Up Commercial Print PDF"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span>
                            {downloadingId === `${ord.id}-PRINT_READY` ? "Building..." : "Print A4"}
                          </span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

export default function PrintOrdersPage() {
  return (
    <Suspense
      fallback={
        <div className="p-12 text-center text-sm text-charcoal-500">
          Loading Print Orders...
        </div>
      }
    >
      <PrintOrdersContent />
    </Suspense>
  );
}

