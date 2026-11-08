"use client";

import React, { useEffect, useState } from "react";
import {
  Sliders,
  Save,
  Plus,
  Trash2,
  CheckCircle2,
  Printer,
} from "lucide-react";

interface PrintProviderItem {
  id: string;
  name: string;
  contactPerson: string;
  phone: string;
  email: string;
  address: string;
  notes: string;
  isDefault: boolean;
}

export default function PrintSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedMsg, setSavedMsg] = useState("");

  // Default Dimensions
  const [defaultWidthMm, setDefaultWidthMm] = useState(90);
  const [defaultHeightMm, setDefaultHeightMm] = useState(50);
  const [defaultBleedMm, setDefaultBleedMm] = useState(3);
  const [defaultSafeMarginMm, setDefaultSafeMarginMm] = useState(5);

  // Pricing Config
  const [currency, setCurrency] = useState("USD");
  const [currencySymbol, setCurrencySymbol] = useState("$");
  const [baseUnitCostMatte, setBaseUnitCostMatte] = useState(0.35);
  const [baseUnitCostGloss, setBaseUnitCostGloss] = useState(0.38);
  const [baseUnitCostSoftTouch, setBaseUnitCostSoftTouch] = useState(0.48);
  const [baseUnitCostTextured, setBaseUnitCostTextured] = useState(0.55);
  const [roundedCornerSurcharge, setRoundedCornerSurcharge] = useState(0.05);
  const [doubleSidedMultiplier, setDoubleSidedMultiplier] = useState(1.25);
  const [setupFee, setSetupFee] = useState(15.0);
  const [bulkDiscount100, setBulkDiscount100] = useState(0.05);
  const [bulkDiscount500, setBulkDiscount500] = useState(0.15);
  const [bulkDiscount1000, setBulkDiscount1000] = useState(0.25);

  // External Print Providers
  const [providers, setProviders] = useState<PrintProviderItem[]>([]);
  const [provName, setProvName] = useState("");
  const [provContact, setProvContact] = useState("");
  const [provPhone, setProvPhone] = useState("");
  const [provEmail, setProvEmail] = useState("");
  const [provNotes, setProvNotes] = useState("");
  const [provDefault, setProvDefault] = useState(false);

  const loadSettings = () => {
    setLoading(true);
    fetch("/api/admin/print-settings")
      .then((r) => r.json())
      .then((res) => {
        if (res.defaults) {
          setDefaultWidthMm(res.defaults.defaultWidthMm || 90);
          setDefaultHeightMm(res.defaults.defaultHeightMm || 50);
          setDefaultBleedMm(res.defaults.defaultBleedMm ?? 3);
          setDefaultSafeMarginMm(res.defaults.defaultSafeMarginMm ?? 5);
        }
        if (res.pricing) {
          const p = res.pricing;
          setCurrency(p.currency || "USD");
          setCurrencySymbol(p.currencySymbol || "$");
          setBaseUnitCostMatte(p.baseUnitCostMatte ?? 0.35);
          setBaseUnitCostGloss(p.baseUnitCostGloss ?? 0.38);
          setBaseUnitCostSoftTouch(p.baseUnitCostSoftTouch ?? 0.48);
          setBaseUnitCostTextured(p.baseUnitCostTextured ?? 0.55);
          setRoundedCornerSurcharge(p.roundedCornerSurcharge ?? 0.05);
          setDoubleSidedMultiplier(p.doubleSidedMultiplier ?? 1.25);
          setSetupFee(p.setupFee ?? 15.0);
          setBulkDiscount100(p.bulkDiscount100 ?? 0.05);
          setBulkDiscount500(p.bulkDiscount500 ?? 0.15);
          setBulkDiscount1000(p.bulkDiscount1000 ?? 0.25);
        }
        setProviders(res.providers || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  useEffect(() => {
    loadSettings();
  }, []);

  const handleSavePricing = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSavedMsg("");
    try {
      const res = await fetch("/api/admin/print-settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          defaults: {
            defaultWidthMm,
            defaultHeightMm,
            defaultBleedMm,
            defaultSafeMarginMm,
          },
          pricing: {
            currency,
            currencySymbol,
            baseUnitCostMatte,
            baseUnitCostGloss,
            baseUnitCostSoftTouch,
            baseUnitCostTextured,
            roundedCornerSurcharge,
            doubleSidedMultiplier,
            setupFee,
            bulkDiscount100,
            bulkDiscount500,
            bulkDiscount1000,
          },
        }),
      });
      if (res.ok) {
        setSavedMsg(
          "Default card specifications and printing price matrix updated!"
        );
      }
    } finally {
      setSaving(false);
    }
  };

  const handleAddProvider = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!provName.trim()) return;
    const res = await fetch("/api/admin/print-settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        provider: {
          name: provName,
          contactPerson: provContact,
          phone: provPhone,
          email: provEmail,
          notes: provNotes,
          isDefault: provDefault,
        },
      }),
    });
    const data = await res.json();
    if (res.ok && data.providers) {
      setProviders(data.providers);
      setProvName("");
      setProvContact("");
      setProvPhone("");
      setProvEmail("");
      setProvNotes("");
      setProvDefault(false);
    }
  };

  const handleDeleteProvider = async (id: string) => {
    const res = await fetch(`/api/admin/print-settings?providerId=${id}`, {
      method: "DELETE",
    });
    const data = await res.json();
    if (res.ok && data.providers) {
      setProviders(data.providers);
    }
  };

  if (loading) {
    return (
      <div className="p-12 text-center text-sm text-charcoal-500">
        Loading HEZLON Print Production Settings...
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="bg-white rounded-2xl p-6 border border-charcoal-100 shadow-sm">
        <h1 className="text-2xl font-serif font-bold text-forest-950 flex items-center gap-2.5">
          <Sliders className="w-6 h-6 text-gold-700" />
          <span>Print Production Specifications &amp; Pricing Settings</span>
        </h1>
        <p className="text-xs text-charcoal-500 mt-1">
          Configure default physical card dimensions, bleed &amp; safe margins,
          quotation unit rates, and external commercial printing studios.
        </p>
      </div>

      {savedMsg && (
        <div className="p-4 rounded-xl bg-emerald-950 text-emerald-200 border border-emerald-500/40 text-xs flex items-center gap-2.5">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{savedMsg}</span>
        </div>
      )}

      <div className="grid lg:grid-cols-12 gap-6 items-start">
        {/* Left: Default Dimensions & Pricing Matrix */}
        <form
          onSubmit={handleSavePricing}
          className="lg:col-span-7 bg-white rounded-2xl p-6 border border-charcoal-100 shadow-sm space-y-6"
        >
          <div>
            <h2 className="text-base font-serif font-bold text-forest-950">
              1. Default Physical Card Specifications
            </h2>
            <div className="grid sm:grid-cols-4 gap-3 mt-3">
              <div>
                <label className="block text-[10px] font-bold uppercase text-charcoal-500 mb-1">
                  Width (mm)
                </label>
                <input
                  type="number"
                  value={defaultWidthMm}
                  onChange={(e) => setDefaultWidthMm(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl border border-charcoal-200 text-xs font-mono font-bold"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase text-charcoal-500 mb-1">
                  Height (mm)
                </label>
                <input
                  type="number"
                  value={defaultHeightMm}
                  onChange={(e) => setDefaultHeightMm(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl border border-charcoal-200 text-xs font-mono font-bold"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase text-charcoal-500 mb-1">
                  Bleed (mm)
                </label>
                <input
                  type="number"
                  step="0.5"
                  value={defaultBleedMm}
                  onChange={(e) => setDefaultBleedMm(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl border border-charcoal-200 text-xs font-mono font-bold"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase text-charcoal-500 mb-1">
                  Safe Margin (mm)
                </label>
                <input
                  type="number"
                  step="0.5"
                  value={defaultSafeMarginMm}
                  onChange={(e) =>
                    setDefaultSafeMarginMm(Number(e.target.value))
                  }
                  className="w-full px-3 py-2 rounded-xl border border-charcoal-200 text-xs font-mono font-bold"
                />
              </div>
            </div>
          </div>

          <hr className="border-charcoal-100" />

          <div>
            <h2 className="text-base font-serif font-bold text-forest-950">
              2. Configurable Printing Price Matrix ({currency})
            </h2>
            <p className="text-xs text-charcoal-500 mb-3">
              Used by the Print Order quotation calculator when estimating 50,
              100, or 1,000 card batches.
            </p>

            <div className="grid sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-[10px] font-bold uppercase text-charcoal-500 mb-1">
                  Matte Base ($/card)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={baseUnitCostMatte}
                  onChange={(e) => setBaseUnitCostMatte(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl border border-charcoal-200 text-xs font-mono"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase text-charcoal-500 mb-1">
                  Gloss Base ($/card)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={baseUnitCostGloss}
                  onChange={(e) => setBaseUnitCostGloss(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl border border-charcoal-200 text-xs font-mono"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase text-charcoal-500 mb-1">
                  Soft-Touch ($/card)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={baseUnitCostSoftTouch}
                  onChange={(e) =>
                    setBaseUnitCostSoftTouch(Number(e.target.value))
                  }
                  className="w-full px-3 py-2 rounded-xl border border-charcoal-200 text-xs font-mono"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase text-charcoal-500 mb-1">
                  Textured Stock ($/card)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={baseUnitCostTextured}
                  onChange={(e) =>
                    setBaseUnitCostTextured(Number(e.target.value))
                  }
                  className="w-full px-3 py-2 rounded-xl border border-charcoal-200 text-xs font-mono"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase text-charcoal-500 mb-1">
                  Rounded Corner Extra
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={roundedCornerSurcharge}
                  onChange={(e) =>
                    setRoundedCornerSurcharge(Number(e.target.value))
                  }
                  className="w-full px-3 py-2 rounded-xl border border-charcoal-200 text-xs font-mono"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase text-charcoal-500 mb-1">
                  Pre-Press Setup Fee ($)
                </label>
                <input
                  type="number"
                  step="1"
                  value={setupFee}
                  onChange={(e) => setSetupFee(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl border border-charcoal-200 text-xs font-mono"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-3 rounded-xl bg-forest-900 text-gold font-bold text-xs uppercase tracking-wider hover:bg-forest-800 transition flex items-center gap-2"
            >
              <Save className="w-4 h-4" />
              <span>Save Specifications &amp; Pricing</span>
            </button>
          </div>
        </form>

        {/* Right: External Commercial Printing Studios */}
        <div className="lg:col-span-5 bg-white rounded-2xl p-6 border border-charcoal-100 shadow-sm space-y-5">
          <div>
            <h2 className="text-base font-serif font-bold text-forest-950 flex items-center gap-2">
              <Printer className="w-4 h-4 text-gold-700" />
              <span>External Printing Studios</span>
            </h2>
            <p className="text-xs text-charcoal-500">
              Manage external printing partners that receive your CMYK
              production PDFs.
            </p>
          </div>

          <div className="space-y-2.5">
            {providers.map((p) => (
              <div
                key={p.id}
                className="p-3.5 rounded-xl border border-charcoal-100 bg-cream/40 flex items-start justify-between gap-2 text-xs"
              >
                <div>
                  <div className="font-bold text-forest-950 flex items-center gap-2">
                    <span>{p.name}</span>
                    {p.isDefault && (
                      <span className="px-2 py-0.5 rounded-full bg-gold/20 text-gold-800 text-[10px] font-bold">
                        Preferred
                      </span>
                    )}
                  </div>
                  <div className="text-charcoal-500 text-[11px] mt-0.5">
                    {p.contactPerson} • {p.phone} • {p.email}
                  </div>
                  {p.notes && (
                    <div className="text-[11px] text-forest-800 mt-1">
                      {p.notes}
                    </div>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => handleDeleteProvider(p.id)}
                  className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>

          <form
            onSubmit={handleAddProvider}
            className="pt-4 border-t border-charcoal-100 space-y-3"
          >
            <div className="text-xs font-bold uppercase text-forest-900">
              + Register External Print Studio
            </div>
            <input
              type="text"
              required
              value={provName}
              onChange={(e) => setProvName(e.target.value)}
              placeholder="Printing Studio Name"
              className="w-full px-3 py-2 rounded-xl border border-charcoal-200 text-xs font-semibold"
            />
            <div className="grid grid-cols-2 gap-2">
              <input
                type="text"
                value={provPhone}
                onChange={(e) => setProvPhone(e.target.value)}
                placeholder="Studio Phone"
                className="px-3 py-2 rounded-xl border border-charcoal-200 text-xs"
              />
              <input
                type="email"
                value={provEmail}
                onChange={(e) => setProvEmail(e.target.value)}
                placeholder="Pre-press Email"
                className="px-3 py-2 rounded-xl border border-charcoal-200 text-xs"
              />
            </div>
            <input
              type="text"
              value={provNotes}
              onChange={(e) => setProvNotes(e.target.value)}
              placeholder="Bleed / stock notes..."
              className="w-full px-3 py-2 rounded-xl border border-charcoal-200 text-xs"
            />
            <label className="flex items-center gap-2 text-xs font-semibold cursor-pointer">
              <input
                type="checkbox"
                checked={provDefault}
                onChange={(e) => setProvDefault(e.target.checked)}
              />
              <span>Set as preferred default printing studio</span>
            </label>
            <button
              type="submit"
              className="w-full py-2.5 rounded-xl bg-forest-900 text-gold font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>Add Printing Studio</span>
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

