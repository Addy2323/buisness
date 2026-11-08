"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  QrCode,
  Download,
  ExternalLink,
  CheckCircle2,
  AlertTriangle,
  Save,
  ShieldCheck,
  Sparkles,
  Smartphone,
} from "lucide-react";

export default function DigitalQrProfileAdminPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedMsg, setSavedMsg] = useState("");

  // QR Config State
  const [slug, setSlug] = useState("hezlon");
  const [customBaseDomain, setCustomBaseDomain] = useState("");
  const [foregroundColor, setForegroundColor] = useState("#0D2B22");
  const [backgroundColor, setBackgroundColor] = useState("#FFFFFF");
  const [accentFrameColor, setAccentFrameColor] = useState("#C9A96E");
  const [errorCorrectionLevel, setErrorCorrectionLevel] = useState<
    "L" | "M" | "Q" | "H"
  >("H");
  const [includeCenterLogo, setIncludeCenterLogo] = useState(false);
  const [centerLogoText, setCenterLogoText] = useState("H");

  // Generated Output
  const [destinationUrl, setDestinationUrl] = useState("");
  const [svgCode, setSvgCode] = useState("");
  const [pngDataUrl, setPngDataUrl] = useState("");
  const [scanHealth, setScanHealth] = useState<{
    isScannable: boolean;
    verifiedDecode?: boolean;
    decodedUrl?: string | null;
    contrastRatio: number;
    errorCorrectionLevel: string;
    recommendation?: string;
  } | null>(null);

  // Digital Profile Visibility
  const [isPublished, setIsPublished] = useState(true);
  const [headline, setHeadline] = useState(
    "Architectural Aluminium & Precision Glass Solutions"
  );
  const [showServices, setShowServices] = useState(true);
  const [showGallery, setShowGallery] = useState(true);
  const [enableVCard, setEnableVCard] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/admin/qr").then((r) => r.json()),
      fetch("/api/admin/company").then((r) => r.json()),
    ])
      .then(([qrRes, compRes]) => {
        if (qrRes.qrConfig) {
          const q = qrRes.qrConfig;
          setSlug(q.slug || "hezlon");
          setCustomBaseDomain(q.customBaseDomain || "");
          setForegroundColor(q.foregroundColor || "#0D2B22");
          setBackgroundColor(q.backgroundColor || "#FFFFFF");
          setAccentFrameColor(q.accentFrameColor || "#C9A96E");
          setErrorCorrectionLevel(q.errorCorrectionLevel || "H");
          setIncludeCenterLogo(Boolean(q.includeCenterLogo));
          setCenterLogoText(q.centerLogoText || "H");
          setDestinationUrl(qrRes.destinationUrl || "");
          setSvgCode(qrRes.svg || "");
          setPngDataUrl(qrRes.pngDataUrl || "");
          setScanHealth(qrRes.scanHealth || null);
        }
        if (compRes.digitalProfile) {
          const dp = compRes.digitalProfile;
          setIsPublished(dp.isPublished !== false);
          setHeadline(dp.headline || "");
          setShowServices(dp.showServices !== false);
          setShowGallery(dp.showGallery !== false);
          setEnableVCard(dp.enableVCard !== false);
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const handleSaveAll = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSavedMsg("");
    try {
      const qrRes = await fetch("/api/admin/qr", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slug,
          customBaseDomain,
          foregroundColor,
          backgroundColor,
          accentFrameColor,
          errorCorrectionLevel,
          includeCenterLogo,
          centerLogoText,
        }),
      });
      const qrData = await qrRes.json();
      if (qrRes.ok) {
        setDestinationUrl(qrData.destinationUrl);
        setSvgCode(qrData.svg);
        setPngDataUrl(qrData.pngDataUrl);
        setScanHealth(qrData.scanHealth);
      }

      // Also update DigitalProfile publishing toggles via company endpoint
      const compRes = await fetch("/api/admin/company").then((r) => r.json());
      if (compRes.company) {
        await fetch("/api/admin/company", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...compRes.company,
            digitalProfile: {
              slug,
              isPublished,
              headline,
              showServices,
              showGallery,
              enableVCard,
            },
          }),
        });
      }

      setSavedMsg(
        "Permanent QR code and Digital Profile settings saved! All printed business cards point to your live digital profile."
      );
    } finally {
      setSaving(false);
    }
  };

  const downloadSvg = () => {
    if (!svgCode) return;
    const blob = new Blob([svgCode], { type: "image/svg+xml" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "hezlon-permanent-qr.svg";
    a.click();
    URL.revokeObjectURL(url);
  };

  const downloadPng = () => {
    if (!pngDataUrl) return;
    const a = document.createElement("a");
    a.href = pngDataUrl;
    a.download = "hezlon-permanent-qr-1024px.png";
    a.click();
  };

  if (loading) {
    return (
      <div className="p-12 text-center text-sm text-charcoal-500">
        Loading Permanent QR System &amp; Digital Profile...
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="bg-forest-950 text-cream rounded-2xl p-6 border border-gold/30 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-widest text-gold">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Permanent QR Routing Architecture</span>
          </div>
          <h1 className="text-2xl font-serif font-bold text-cream mt-1">
            HEZLON Permanent QR &amp; Digital Profile
          </h1>
          <p className="text-xs text-cream/80 mt-1 max-w-2xl">
            Your QR code points to{" "}
            <strong className="text-gold font-mono">{destinationUrl}</strong>.
            Updating your phone number, email, services, or project photos never
            requires reprinting your physical business cards.
          </p>
        </div>

        <Link
          href={`/${slug}`}
          target="_blank"
          className="px-5 py-3 rounded-xl bg-gold text-forest-950 font-bold text-xs uppercase tracking-wider hover:bg-gold-300 transition flex items-center gap-2 shrink-0 shadow-gold-glow"
        >
          <Smartphone className="w-4 h-4" />
          <span>Open Public QR Profile (/{slug})</span>
          <ExternalLink className="w-3.5 h-3.5" />
        </Link>
      </div>

      {savedMsg && (
        <div className="p-4 rounded-xl bg-emerald-950 text-emerald-200 border border-emerald-500/40 text-xs flex items-center gap-2.5">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{savedMsg}</span>
        </div>
      )}

      <div className="grid lg:grid-cols-12 gap-6 items-start">
        {/* Left: QR & Digital Profile Settings Form */}
        <form
          onSubmit={handleSaveAll}
          className="lg:col-span-7 bg-white rounded-2xl p-6 border border-charcoal-100 shadow-sm space-y-6"
        >
          <div>
            <h2 className="text-base font-serif font-bold text-forest-950">
              1. Permanent QR Destination &amp; Styling
            </h2>
            <p className="text-xs text-charcoal-500">
              Configure how your permanent QR code looks on business cards and
              print exports.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase text-forest-900 mb-1">
                Permanent Profile Path Slug
              </label>
              <div className="flex items-center">
                <span className="px-3 py-2 rounded-l-xl bg-cream border border-r-0 border-charcoal-200 text-xs font-mono text-charcoal-600">
                  /
                </span>
                <input
                  type="text"
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                  className="w-full px-3 py-2 rounded-r-xl border border-charcoal-200 text-xs font-mono font-bold"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase text-forest-900 mb-1">
                Production Domain Override (Optional)
              </label>
              <input
                type="text"
                value={customBaseDomain}
                onChange={(e) => setCustomBaseDomain(e.target.value)}
                placeholder="e.g., https://yourdomain.com"
                className="w-full px-3 py-2 rounded-xl border border-charcoal-200 text-xs font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase text-forest-900 mb-1">
                QR Foreground Color
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={foregroundColor}
                  onChange={(e) => setForegroundColor(e.target.value)}
                  className="w-9 h-9 rounded border"
                />
                <input
                  type="text"
                  value={foregroundColor}
                  onChange={(e) => setForegroundColor(e.target.value)}
                  className="flex-1 px-3 py-2 rounded-xl border border-charcoal-200 text-xs font-mono"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase text-forest-900 mb-1">
                QR Background Color
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={backgroundColor}
                  onChange={(e) => setBackgroundColor(e.target.value)}
                  className="w-9 h-9 rounded border"
                />
                <input
                  type="text"
                  value={backgroundColor}
                  onChange={(e) => setBackgroundColor(e.target.value)}
                  className="flex-1 px-3 py-2 rounded-xl border border-charcoal-200 text-xs font-mono"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase text-forest-900 mb-1">
                Error Correction Level
              </label>
              <select
                value={errorCorrectionLevel}
                onChange={(e) =>
                  setErrorCorrectionLevel(
                    e.target.value as "L" | "M" | "Q" | "H"
                  )
                }
                className="w-full px-3 py-2 rounded-xl border border-charcoal-200 text-xs font-semibold"
              >
                <option value="H">Level H — High (30% recovery, best for logos)</option>
                <option value="Q">Level Q — Quartile (25% recovery)</option>
                <option value="M">Level M — Medium (15% recovery)</option>
                <option value="L">Level L — Low (7% recovery)</option>
              </select>
            </div>

            <div className="flex flex-col justify-end">
              <label className="flex items-center gap-2 text-xs font-bold text-forest-950 cursor-pointer pb-2">
                <input
                  type="checkbox"
                  checked={includeCenterLogo}
                  onChange={(e) => setIncludeCenterLogo(e.target.checked)}
                  className="rounded"
                />
                <span>Embed Center HEZLON Crest ({centerLogoText})</span>
              </label>
            </div>
          </div>

          <hr className="border-charcoal-100" />

          {/* Digital Profile Publishing Controls */}
          <div className="space-y-4">
            <h2 className="text-base font-serif font-bold text-forest-950">
              2. Public Digital Profile Permissions
            </h2>

            <div className="flex items-center justify-between p-4 rounded-xl bg-cream/60 border border-charcoal-200">
              <div>
                <div className="text-xs font-bold text-forest-950">
                  Publish Digital Profile Publicly
                </div>
                <div className="text-[11px] text-charcoal-500">
                  When enabled, visitors scanning your QR code can view approved
                  company details.
                </div>
              </div>
              <input
                type="checkbox"
                checked={isPublished}
                onChange={(e) => setIsPublished(e.target.checked)}
                className="w-5 h-5 accent-forest-900 cursor-pointer"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase text-forest-900 mb-1">
                Profile Headline Tagline
              </label>
              <input
                type="text"
                value={headline}
                onChange={(e) => setHeadline(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl border border-charcoal-200 text-xs font-semibold"
              />
            </div>

            <div className="grid sm:grid-cols-3 gap-3 text-xs font-semibold">
              <label className="flex items-center gap-2 p-3 rounded-xl border border-charcoal-200 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showServices}
                  onChange={(e) => setShowServices(e.target.checked)}
                />
                <span>Display Services</span>
              </label>
              <label className="flex items-center gap-2 p-3 rounded-xl border border-charcoal-200 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showGallery}
                  onChange={(e) => setShowGallery(e.target.checked)}
                />
                <span>Display Gallery</span>
              </label>
              <label className="flex items-center gap-2 p-3 rounded-xl border border-charcoal-200 cursor-pointer">
                <input
                  type="checkbox"
                  checked={enableVCard}
                  onChange={(e) => setEnableVCard(e.target.checked)}
                />
                <span>Enable vCard Download</span>
              </label>
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-3 rounded-xl bg-forest-900 text-gold font-bold text-xs uppercase tracking-wider hover:bg-forest-800 transition flex items-center gap-2"
            >
              <Save className="w-4 h-4" />
              <span>
                {saving
                  ? "Updating QR & Profile..."
                  : "Save QR & Profile Configuration"}
              </span>
            </button>
          </div>
        </form>

        {/* Right: Live High-Res QR Preview, Scan Test & Vector Downloads */}
        <div className="lg:col-span-5 space-y-5">
          <div className="bg-forest-950 text-cream rounded-2xl p-6 border border-gold/30 shadow-luxury flex flex-col items-center text-center space-y-4">
            <div className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-widest text-gold">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Live High-Resolution QR Asset</span>
            </div>

            <div
              className="w-60 h-60 rounded-2xl p-4 border-2 border-gold shadow-gold-glow flex items-center justify-center bg-white"
              dangerouslySetInnerHTML={{ __html: svgCode }}
            />

            <div className="text-xs font-mono text-gold break-all px-2">
              {destinationUrl}
            </div>

            {/* Scan Verification Status */}
            {scanHealth && (
              <div
                className={`w-full p-3.5 rounded-xl border text-left text-xs flex items-start gap-2.5 ${
                  scanHealth.isScannable
                    ? "bg-emerald-950/80 border-emerald-500/40 text-emerald-200"
                    : "bg-amber-950/80 border-amber-500/40 text-amber-200"
                }`}
              >
                {scanHealth.isScannable ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                )}
                <div>
                  <div className="font-bold">
                    Scan Test:{" "}
                    {scanHealth.isScannable
                      ? `Optically Verified (${scanHealth.contrastRatio}:1 Contrast)`
                      : `Low Contrast (${scanHealth.contrastRatio}:1)`}
                  </div>
                  {scanHealth.decodedUrl && (
                    <div className="text-[11px] font-mono text-emerald-300 mt-0.5">
                      Decoded Payload: {scanHealth.decodedUrl}
                    </div>
                  )}
                  <div className="text-[11px] opacity-80 mt-0.5">
                    {scanHealth.recommendation}
                  </div>
                </div>
              </div>
            )}

            {/* Download SVG & PNG Buttons */}
            <div className="grid grid-cols-2 gap-3 w-full pt-2">
              <button
                type="button"
                onClick={downloadSvg}
                className="py-3 px-4 rounded-xl bg-gold text-forest-950 font-bold text-xs uppercase tracking-wider hover:bg-gold-300 transition flex items-center justify-center gap-2"
              >
                <Download className="w-4 h-4" />
                <span>Download SVG</span>
              </button>
              <button
                type="button"
                onClick={downloadPng}
                className="py-3 px-4 rounded-xl bg-forest-800 border border-gold/40 text-cream font-bold text-xs uppercase tracking-wider hover:border-gold transition flex items-center justify-center gap-2"
              >
                <QrCode className="w-4 h-4 text-gold" />
                <span>Download PNG</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

