"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Palette,
  FolderKanban,
  Sparkles,
  Building2,
  QrCode,
  BarChart3,
  Printer,
  Sliders,
  UserCog,
  LogOut,
  ExternalLink,
  Menu,
  X,
  ShieldCheck,
} from "lucide-react";

const NAV_ITEMS = [
  {
    label: "Overview",
    href: "/admin",
    icon: LayoutDashboard,
    exact: true,
  },
  {
    label: "Create Business Card",
    href: "/admin/studio",
    icon: Palette,
    highlight: true,
  },
  {
    label: "My Designs",
    href: "/admin/designs",
    icon: FolderKanban,
  },
  {
    label: "Design Templates",
    href: "/admin/templates",
    icon: Sparkles,
  },
  {
    label: "Company Information",
    href: "/admin/company",
    icon: Building2,
  },
  {
    label: "Digital QR Profile",
    href: "/admin/qr-profile",
    icon: QrCode,
  },
  {
    label: "QR Analytics",
    href: "/admin/analytics",
    icon: BarChart3,
  },
  {
    label: "Print Orders",
    href: "/admin/orders",
    icon: Printer,
  },
  {
    label: "Print Settings",
    href: "/admin/print-settings",
    icon: Sliders,
  },
  {
    label: "Account Settings",
    href: "/admin/account",
    icon: UserCog,
  },
];

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  };

  return (
    <div className="min-h-screen bg-cream text-charcoal flex">
      {/* Desktop Luxury Forest Sidebar */}
      <aside className="hidden lg:flex w-64 bg-forest-950 text-cream border-r border-gold/25 flex-col justify-between shrink-0 select-none">
        <div>
          {/* Brand Crest */}
          <div className="p-5 border-b border-gold/20 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-forest-800 border-2 border-gold flex items-center justify-center font-serif font-bold text-xl text-gold shadow-gold-glow shrink-0">
              H
            </div>
            <div className="min-w-0">
              <div className="text-[10px] font-bold uppercase tracking-[0.22em] text-gold">
                HEZLON STUDIO
              </div>
              <div className="text-xs font-serif font-semibold text-cream truncate">
                HEZLON Building Solutions
              </div>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="p-3 space-y-1">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive = item.exact
                ? pathname === item.href
                : pathname.startsWith(item.href);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-medium transition ${
                    isActive
                      ? "bg-gold text-forest-950 font-bold shadow-gold-glow"
                      : item.highlight
                      ? "bg-forest-900/90 text-gold border border-gold/30 hover:bg-forest-800"
                      : "text-cream/80 hover:bg-forest-900 hover:text-cream"
                  }`}
                >
                  <Icon
                    className={`w-4 h-4 shrink-0 ${
                      isActive ? "text-forest-950" : "text-gold"
                    }`}
                  />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Bottom Status & Logout */}
        <div className="p-4 border-t border-gold/20 space-y-3 bg-forest-950">
          <Link
            href="/hezlon"
            target="_blank"
            className="w-full px-3.5 py-2.5 rounded-xl bg-forest-900 border border-gold/30 text-xs font-semibold text-gold hover:bg-forest-800 transition flex items-center justify-between"
          >
            <span className="flex items-center gap-2">
              <QrCode className="w-4 h-4" />
              <span>Live QR Profile (/hezlon)</span>
            </span>
            <ExternalLink className="w-3.5 h-3.5" />
          </Link>

          <div className="flex items-center justify-between px-1 text-[11px] text-cream/65">
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>Single Owner Admin</span>
            </span>
            <button
              type="button"
              onClick={handleLogout}
              className="flex items-center gap-1 text-rose-300 hover:text-rose-200 font-semibold"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Logout</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Bar */}
        <header className="h-15 bg-white border-b border-charcoal-100 px-6 py-3 flex items-center justify-between sticky top-0 z-30">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setMobileMenuOpen((v) => !v)}
              className="lg:hidden p-2 rounded-lg bg-forest-950 text-gold"
            >
              {mobileMenuOpen ? (
                <X className="w-5 h-5" />
              ) : (
                <Menu className="w-5 h-5" />
              )}
            </button>
            <div>
              <div className="text-xs font-bold uppercase tracking-wider text-forest-800">
                HEZLON BUILDING SOLUTIONS — BUSINESS CARD &amp; PRINT MANAGEMENT
              </div>
              <div className="text-[11px] text-charcoal-500">
                Aluminum &amp; Glass Specialist • 0673 571 344 •
                Casrycasry40@gmail.com
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/admin/studio"
              className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-forest-900 text-gold border border-gold/40 text-xs font-semibold hover:bg-forest-800 transition"
            >
              <Palette className="w-3.5 h-3.5" />
              <span>Open Design Studio</span>
            </Link>
            <Link
              href="/hezlon"
              target="_blank"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cream-200 text-forest-900 border border-gold/40 text-xs font-semibold hover:bg-gold/20 transition"
            >
              <QrCode className="w-3.5 h-3.5 text-forest-800" />
              <span>Public Profile</span>
              <ExternalLink className="w-3 h-3" />
            </Link>
          </div>
        </header>

        {/* Mobile Drawer */}
        {mobileMenuOpen && (
          <div className="lg:hidden bg-forest-950 text-cream border-b border-gold/30 p-4 space-y-1">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium text-cream hover:bg-forest-800"
                >
                  <Icon className="w-4 h-4 text-gold" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
            <button
              type="button"
              onClick={handleLogout}
              className="w-full text-left flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-semibold text-rose-300"
            >
              <LogOut className="w-4 h-4" />
              <span>Logout</span>
            </button>
          </div>
        )}

        {/* Page Body */}
        <main className="flex-1 p-6 overflow-x-hidden">{children}</main>
      </div>
    </div>
  );
}

