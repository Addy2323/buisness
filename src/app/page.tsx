import Link from "next/link";
import {
  ShieldCheck,
  QrCode,
  Printer,
  Layers,
  ArrowRight,
  Sparkles,
  Building2,
  Phone,
  Mail,
} from "lucide-react";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-forest-950 text-cream flex flex-col justify-between relative overflow-hidden">
      {/* Subtle architectural mullion grid background */}
      <div
        className="pointer-events-none absolute inset-0 opacity-10"
        style={{
          backgroundImage:
            "linear-gradient(to right, #C9A96E 1px, transparent 1px), linear-gradient(to bottom, #C9A96E 1px, transparent 1px)",
          backgroundSize: "64px 64px",
        }}
      />

      {/* Top Header */}
      <header className="relative z-10 border-b border-gold/20 bg-forest-950/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-lg bg-forest-800 border border-gold flex items-center justify-center font-serif font-bold text-xl text-gold shadow-gold-glow">
              H
            </div>
            <div>
              <div className="text-xs uppercase tracking-[0.25em] text-gold font-semibold">
                HEZLON CARD STUDIO
              </div>
              <div className="text-sm font-serif text-cream/90">
                HEZLON Building Solutions • Aluminum &amp; Glass Specialist
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/hezlon"
              className="px-4 py-2 rounded-lg border border-gold/35 text-xs font-medium tracking-wider uppercase text-gold hover:bg-gold/10 transition flex items-center gap-2"
            >
              <QrCode className="w-4 h-4" />
              <span>Public Digital Profile</span>
            </Link>
            <Link
              href="/admin"
              className="px-5 py-2 rounded-lg bg-gold text-forest-950 text-xs font-bold tracking-wider uppercase hover:bg-gold-300 transition flex items-center gap-2 shadow-gold-glow"
            >
              <ShieldCheck className="w-4 h-4" />
              <span>Administrator Studio</span>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Hero */}
      <main className="relative z-10 max-w-7xl mx-auto px-6 py-16 grid lg:grid-cols-12 gap-12 items-center flex-1">
        <div className="lg:col-span-7 space-y-6">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-forest-800/90 border border-gold/35 text-gold text-xs font-medium tracking-wider uppercase">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Single-Company Executive Design &amp; Print System</span>
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-serif font-bold tracking-tight text-cream leading-[1.12]">
            HEZLON{" "}
            <span className="text-gold italic font-normal">
              Business Card Studio
            </span>
          </h1>

          <p className="text-base sm:text-lg text-cream/80 max-w-2xl leading-relaxed">
            Exclusively engineered for{" "}
            <strong className="text-white font-semibold">
              HEZLON Building Solutions
            </strong>
            . Design bespoke architectural business cards, inspect realistic 3D
            paper finishes, manage your permanent QR digital profile, and export
            CMYK-ready production PDFs with 3&nbsp;mm bleed and crop marks.
          </p>

          <div className="flex flex-wrap gap-4 pt-2">
            <Link
              href="/admin"
              className="px-7 py-3.5 rounded-xl bg-gold text-forest-950 font-bold text-sm tracking-wider uppercase hover:bg-gold-300 transition flex items-center gap-2.5 shadow-gold-glow"
            >
              <span>Enter Administrator Dashboard</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="/hezlon"
              className="px-6 py-3.5 rounded-xl bg-forest-900 border border-gold/35 text-cream font-semibold text-sm hover:border-gold transition flex items-center gap-2"
            >
              <QrCode className="w-4 h-4 text-gold" />
              <span>View Live QR Digital Profile (/hezlon)</span>
            </Link>
          </div>

          <div className="grid sm:grid-cols-3 gap-4 pt-6 border-t border-gold/15">
            <div className="p-4 rounded-xl bg-forest-900/60 border border-gold/15">
              <Layers className="w-5 h-5 text-gold mb-2" />
              <div className="text-sm font-semibold text-cream">
                20 Architectural Templates
              </div>
              <p className="text-xs text-cream/65 mt-1">
                Tailored for aluminium doors, windows, glass installation &amp;
                commercial partitions.
              </p>
            </div>
            <div className="p-4 rounded-xl bg-forest-900/60 border border-gold/15">
              <QrCode className="w-5 h-5 text-gold mb-2" />
              <div className="text-sm font-semibold text-cream">
                Permanent QR Routing
              </div>
              <p className="text-xs text-cream/65 mt-1">
                Update phone numbers, services, or photos anytime without
                reprinting physical cards.
              </p>
            </div>
            <div className="p-4 rounded-xl bg-forest-900/60 border border-gold/15">
              <Printer className="w-5 h-5 text-gold mb-2" />
              <div className="text-sm font-semibold text-cream">
                Print-Ready PDF Engine
              </div>
              <p className="text-xs text-cream/65 mt-1">
                90×50&nbsp;mm &amp; 85×55&nbsp;mm exports with 3&nbsp;mm bleed,
                safe margins &amp; crop marks.
              </p>
            </div>
          </div>
        </div>

        {/* Right Showcase Card Mockup */}
        <div className="lg:col-span-5 flex flex-col items-center">
          <div className="w-full max-w-md space-y-5">
            {/* Front Card Mockup */}
            <div className="aspect-[90/50] w-full rounded-lg bg-forest-900 border border-gold/40 p-6 relative shadow-2xl flex flex-col items-center justify-center text-center overflow-hidden">
              <div className="absolute inset-3 border border-gold/45 pointer-events-none" />
              <div className="absolute inset-4 border border-gold/20 pointer-events-none" />
              <div className="w-11 h-11 rounded-full bg-forest-800 border border-gold flex items-center justify-center font-serif font-bold text-lg text-gold mb-3">
                H
              </div>
              <div className="font-serif font-bold tracking-[0.18em] text-base sm:text-lg text-cream uppercase">
                HEZLON BUILDING SOLUTIONS
              </div>
              <div className="w-16 h-[1px] bg-gold my-2" />
              <div className="font-serif italic text-gold text-xs sm:text-sm tracking-wider">
                Aluminum &amp; Glass Specialist
              </div>
              <span className="absolute top-2 right-2.5 text-[9px] font-mono text-gold/60">
                FRONT • 90×50mm
              </span>
            </div>

            {/* Back Card Mockup */}
            <div className="aspect-[90/50] w-full rounded-lg bg-cream text-charcoal border border-gold/40 relative shadow-2xl overflow-hidden flex flex-col justify-between">
              <div className="bg-forest-900 px-5 py-2.5 flex items-center justify-between">
                <span className="font-serif font-bold text-[11px] tracking-[0.16em] text-gold uppercase">
                  HEZLON BUILDING SOLUTIONS
                </span>
                <span className="text-[9px] font-mono text-cream/60">
                  BACK • 3mm BLEED
                </span>
              </div>
              <div className="p-5 flex items-center justify-between gap-4 flex-1">
                <div className="space-y-1.5 text-left">
                  <div className="font-serif font-bold text-sm text-forest-900">
                    Aluminum &amp; Glass Specialist
                  </div>
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-charcoal">
                    <Phone className="w-3.5 h-3.5 text-gold-700" />
                    <span>0673 571 344</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-charcoal-600">
                    <Mail className="w-3.5 h-3.5 text-gold-700" />
                    <span>Casrycasry40@gmail.com</span>
                  </div>
                  <div className="text-[10px] font-medium text-forest-700 pt-1">
                    Doors • Windows • Glass • Partitions • Balustrades
                  </div>
                </div>
                <div className="w-20 h-20 bg-white border border-gold p-1.5 rounded flex flex-col items-center justify-center shrink-0">
                  <QrCode className="w-14 h-14 text-forest-900" />
                  <span className="text-[7px] font-bold tracking-widest text-gold-700 mt-0.5">
                    /HEZLON
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 border-t border-gold/15 bg-forest-950/90 py-4 px-6">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between text-xs text-cream/60 gap-2">
          <div className="flex items-center gap-2">
            <Building2 className="w-4 h-4 text-gold" />
            <span>
              Exclusively licensed for{" "}
              <strong className="text-cream">HEZLON Building Solutions</strong>{" "}
              • Single-Company System
            </span>
          </div>
          <div>
            One Company Profile • One Authorized Administrator • Permanent QR
            Architecture
          </div>
        </div>
      </footer>
    </div>
  );
}

