"use client";

import React, { useEffect, useState } from "react";
import {
  Instagram,
  Facebook,
  MapPin,
  CheckCircle2,
  Building2,
  Sparkles,
  ShieldCheck,
  ExternalLink,
  Layers,
  Award,
  Lightbulb,
  HeartHandshake,
  Globe2,
  ArrowDownRight,
  Compass,
} from "lucide-react";

type LanguageMode = "BILINGUAL" | "EN" | "SW";

interface PublicService {
  id: string;
  title: string;
  titleSw?: string;
  description: string;
  descriptionSw?: string;
  category: string;
  imageUrl: string;
  iconName: string;
}

interface PublicProfileData {
  published: boolean;
  company: {
    companyName: string;
    professionalTitle: string;
    phone: string;
    whatsapp: string;
    email: string;
    description: string;
    descriptionSw?: string;
    location?: string;
    serviceArea?: string;
    instagram: string;
    facebook: string;
    logoUrl: string;
    ownerPhotoUrl: string;
    coverImageUrl: string;
    galleryImages: string[];
  };
  digitalProfile: {
    slug: string;
    isPublished: boolean;
    headline: string;
    showServices: boolean;
    showGallery: boolean;
    showSocialLinks: boolean;
    showLocation: boolean;
  };
  services: PublicService[];
}

const DEFAULT_ABOUT_EN =
  "HEZLON Building Solutions provides professional aluminium, glass, interior fitting and general building improvement services. We focus on quality workmanship, creativity, reliability and customer satisfaction.";

const DEFAULT_ABOUT_SW =
  "HEZLON Building Solutions inatoa huduma za kitaalamu za aluminium, vioo, mapambo ya ndani na maboresho mbalimbali ya majengo. Tunazingatia ubora wa kazi, ubunifu, uaminifu na kuridhika kwa wateja.";

const FALLBACK_SERVICES: PublicService[] = [
  {
    id: "hezlon-srv-1",
    title: "Aluminium Doors and Windows",
    titleSw: "Milango na madirisha ya Aluminium na UPVC.",
    description:
      "Precision-crafted aluminium and UPVC door and window systems engineered for durability, natural light, and modern architecture.",
    descriptionSw: "Milango na madirisha ya Aluminium na UPVC.",
    category: "Aluminium & UPVC",
    imageUrl: "/uploads/services/service-1-doors-windows.png",
    iconName: "DoorOpen",
  },
  {
    id: "hezlon-srv-2",
    title: "Glass Installation",
    titleSw: "Ufungaji wa vioo.",
    description:
      "Professional architectural glass fitting, structural glazing, and toughened safety glass installations for residential and commercial buildings.",
    descriptionSw: "Ufungaji wa vioo.",
    category: "Architectural Glazing",
    imageUrl: "/uploads/services/service-2-glass-installation.png",
    iconName: "Sparkles",
  },
  {
    id: "hezlon-srv-3",
    title: "Office and Home Partitions",
    titleSw: "Partition za ofisi na majumbani.",
    description:
      "Sleek acoustic glass and aluminium frame room dividers designed for modern executive offices and refined home interiors.",
    descriptionSw: "Partition za ofisi na majumbani.",
    category: "Interior Partitions",
    imageUrl: "/uploads/services/service-3-partitions.png",
    iconName: "Columns",
  },
  {
    id: "hezlon-srv-4",
    title: "Glass Balustrades",
    titleSw: "Mabaraza na kingo za vioo.",
    description:
      "Frameless and architectural stainless/aluminium-mounted glass railings for staircases, balconies, and terraces.",
    descriptionSw: "Mabaraza na kingo za vioo.",
    category: "Balustrades & Railings",
    imageUrl: "/uploads/services/service-4-balustrades.png",
    iconName: "ShieldCheck",
  },
  {
    id: "hezlon-srv-5",
    title: "Decorative and Frosted Stickers",
    titleSw: "Sticker za mapambo na vioo visivyoona ndani.",
    description:
      "Custom sandblasted, geometric frosted privacy films, and decorative glass stickers for offices, conference rooms, and homes.",
    descriptionSw: "Sticker za mapambo na vioo visivyoona ndani.",
    category: "Privacy & Decorative Film",
    imageUrl: "/uploads/services/service-5-frosted-stickers.png",
    iconName: "Layers",
  },
  {
    id: "hezlon-srv-6",
    title: "Curtains and Interior Solutions",
    titleSw: "Mapazia na mapambo ya ndani.",
    description:
      "Tailored floor-to-ceiling drapery, blinds, and cohesive interior finishing solutions for contemporary spaces.",
    descriptionSw: "Mapazia na mapambo ya ndani.",
    category: "Interior Solutions",
    imageUrl: "/uploads/services/service-6-curtains-interior.png",
    iconName: "Blinds",
  },
  {
    id: "hezlon-srv-7",
    title: "General Building Solutions",
    titleSw: "Huduma mbalimbali za ujenzi.",
    description:
      "Comprehensive building improvements, facade upgrades, and structural finishing delivered with dependable craftsmanship.",
    descriptionSw: "Huduma mbalimbali za ujenzi.",
    category: "Building Improvements",
    imageUrl: "/uploads/services/service-7-general-building.png",
    iconName: "Building2",
  },
];

const COMMITMENTS = [
  {
    en: "Quality",
    sw: "Ubora",
    descEn:
      "Architectural-grade aluminium profiles, safety glass, and meticulous finishing on every installation.",
    descSw:
      "Viwango vya juu vya ufundi wa aluminium, vioo imara na umaliziaji bora katika kila mradi.",
    icon: Award,
  },
  {
    en: "Creativity",
    sw: "Ubunifu",
    descEn:
      "Modern designs tailored to elevate natural light, spatial flow, and visual appeal.",
    descSw:
      "Muundo wa kisasa unaoongeza mwanga, mvuto na mpangilio mzuri wa jengo lako.",
    icon: Lightbulb,
  },
  {
    en: "Reliability",
    sw: "Uaminifu",
    descEn:
      "Dependable project execution, honest timelines, and durable building solutions.",
    descSw:
      "Utekelezaji wa kazi kwa wakati, uaminifu wa hali ya juu na suluhisho zinazodumu.",
    icon: ShieldCheck,
  },
  {
    en: "Customer Satisfaction",
    sw: "Kuridhika kwa Mteja",
    descEn:
      "Dedicated to exceeding client expectations across residential and commercial projects.",
    descSw:
      "Tunahakikisha kila mteja anaridhika kikamilifu na huduma zetu za ujenzi na mapambo.",
    icon: HeartHandshake,
  },
];

export default function HezlonDigitalProfilePage() {
  const [data, setData] = useState<PublicProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [lang, setLang] = useState<LanguageMode>("BILINGUAL");

  useEffect(() => {
    fetch("/api/public/profile")
      .then((r) => r.json())
      .then((res) => {
        setData(res);
        setLoading(false);
      })
      .catch(() => setLoading(false));

    fetch("/api/public/scan", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        referrer:
          typeof document !== "undefined" && document.referrer
            ? document.referrer
            : "QR_SCAN_DIRECT",
      }),
    }).catch(() => {});
  }, []);

  const scrollToSection = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-forest-950 text-cream flex flex-col items-center justify-center p-6">
        <div className="w-16 h-16 rounded-2xl bg-forest-900 border-2 border-gold flex items-center justify-center font-serif font-bold text-3xl text-gold animate-pulse mb-4 shadow-gold-glow">
          H
        </div>
        <div className="text-xs uppercase tracking-[0.28em] text-gold font-semibold">
          HEZLON BUILDING SOLUTIONS
        </div>
        <div className="text-[11px] text-cream/60 mt-1">
          Aluminium &amp; Glass Specialists
        </div>
      </div>
    );
  }

  if (data && data.published === false) {
    return (
      <div className="min-h-screen bg-forest-950 text-cream flex flex-col items-center justify-center p-6 text-center">
        <div className="w-14 h-14 rounded-2xl bg-forest-900 border border-gold/40 flex items-center justify-center font-serif font-bold text-xl text-gold mb-4">
          H
        </div>
        <h1 className="text-2xl font-serif font-bold text-cream">
          Digital Profile Currently Private
        </h1>
        <p className="text-sm text-cream/70 max-w-sm mt-2">
          The HEZLON Building Solutions administrator has temporarily paused
          public profile visibility.
        </p>
      </div>
    );
  }

  const companyName =
    data?.company?.companyName || "HEZLON Building Solutions";
  const professionalTitle =
    data?.company?.professionalTitle || "Aluminium & Glass Specialists";
  const aboutEn = data?.company?.description || DEFAULT_ABOUT_EN;
  const aboutSw = data?.company?.descriptionSw || DEFAULT_ABOUT_SW;
  const locationText = data?.company?.location || "Dodoma, Tanzania.";
  const serviceAreaText =
    data?.company?.serviceArea ||
    "Tanzania – Tunapokea kazi kutoka maeneo mbalimbali nchini.";
  const facebookUrl =
    data?.company?.facebook || "https://www.facebook.com/share/1CXYh7WkFm/";
  const instagramUrl =
    data?.company?.instagram ||
    "https://www.instagram.com/hezlon_building_solution?cplk=MWJzNDZ2NG0xNmswZg==";
  const servicesList =
    data?.services && data.services.length > 0
      ? data.services
      : FALLBACK_SERVICES;

  const showEn = lang === "BILINGUAL" || lang === "EN";
  const showSw = lang === "BILINGUAL" || lang === "SW";
  const currentYear = new Date().getFullYear();

  return (
    <div className="min-h-screen w-full overflow-x-hidden bg-cream text-forest-950 selection:bg-gold selection:text-forest-950">
      {/* ================================================================= */}
      {/* 1. HEADER                                                         */}
      {/* ================================================================= */}
      <header className="sticky top-0 z-50 bg-forest-950/95 backdrop-blur-md border-b border-gold/25 text-cream">
        <div className="max-w-7xl mx-auto px-3.5 sm:px-6 lg:px-8 py-2.5 sm:py-0 sm:h-20 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5 sm:gap-4">
          {/* Top Row on Mobile: Brand Logo & Company Name */}
          <div className="flex items-center justify-between gap-2 min-w-0">
            <a
              href="#top"
              className="flex items-center gap-2.5 sm:gap-3.5 group focus:outline-none min-w-0"
            >
              {data?.company?.logoUrl ? (
                <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-xl bg-white border border-gold p-1 flex items-center justify-center shrink-0">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={data.company.logoUrl}
                    alt={companyName}
                    className="w-full h-full object-contain"
                  />
                </div>
              ) : (
                <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-xl bg-forest-900 border-2 border-gold flex items-center justify-center font-serif font-bold text-lg sm:text-xl text-gold shadow-gold-glow shrink-0 group-hover:scale-105 transition">
                  H
                </div>
              )}
              <div className="min-w-0">
                <div className="font-serif font-bold text-sm sm:text-lg tracking-wide text-cream leading-tight truncate">
                  {companyName}
                </div>
                <div className="text-[10px] sm:text-[11px] uppercase tracking-[0.12em] sm:tracking-[0.2em] text-gold font-medium truncate mt-0.5">
                  {professionalTitle}
                </div>
              </div>
            </a>
          </div>

          {/* Navigation Links (Desktop) */}
          <nav className="hidden md:flex items-center gap-7 text-xs font-semibold uppercase tracking-widest text-cream/85 shrink-0">
            <button
              type="button"
              onClick={() => scrollToSection("about")}
              className="hover:text-gold transition"
            >
              {lang === "SW" ? "Kuhusu Sisi" : "About Us"}
            </button>
            <button
              type="button"
              onClick={() => scrollToSection("services")}
              className="hover:text-gold transition"
            >
              {lang === "SW" ? "Huduma Zetu" : "Our Services"}
            </button>
            <button
              type="button"
              onClick={() => scrollToSection("commitment")}
              className="hover:text-gold transition"
            >
              {lang === "SW" ? "Ahadi Yetu" : "Our Commitment"}
            </button>
            <button
              type="button"
              onClick={() => scrollToSection("contact")}
              className="hover:text-gold transition"
            >
              {lang === "SW" ? "Wasiliana Nasi" : "Contact Us"}
            </button>
          </nav>

          {/* Language Selector (Full-width 3-col pill on mobile, inline pill on desktop) */}
          <div
            className="grid grid-cols-3 sm:inline-flex items-center rounded-xl bg-forest-900 p-1 border border-gold/30 w-full sm:w-auto shrink-0"
            role="group"
            aria-label="Language Selector"
          >
            <Globe2 className="w-3.5 h-3.5 text-gold ml-2 mr-1 hidden sm:inline shrink-0" />
            {(
              [
                { id: "BILINGUAL", label: "EN | SW" },
                { id: "EN", label: "English" },
                { id: "SW", label: "Kiswahili" },
              ] as { id: LanguageMode; label: string }[]
            ).map((option) => (
              <button
                key={option.id}
                type="button"
                onClick={() => setLang(option.id)}
                className={`px-2 sm:px-2.5 py-1.5 rounded-lg text-[10px] sm:text-[11px] font-bold tracking-wider uppercase whitespace-nowrap text-center transition ${
                  lang === option.id
                    ? "bg-gold text-forest-950 shadow-sm"
                    : "text-cream/80 hover:text-gold"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* ================================================================= */}
      {/* 2. HERO SECTION                                                   */}
      {/* ================================================================= */}
      <section
        id="top"
        className="relative bg-forest-950 text-cream overflow-hidden border-b-2 border-gold/40"
      >
        {/* Subtle Architectural Grid Pattern */}
        <div
          className="absolute inset-0 opacity-10 pointer-events-none"
          style={{
            backgroundImage:
              "linear-gradient(to right, #C9A96E 1px, transparent 1px), linear-gradient(to bottom, #C9A96E 1px, transparent 1px)",
            backgroundSize: "48px 48px",
          }}
        />
        <div className="absolute -top-24 -right-24 w-96 h-96 rounded-full bg-gold/10 blur-3xl pointer-events-none" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-20 lg:py-24 relative z-10">
          <div className="grid lg:grid-cols-12 gap-8 sm:gap-10 lg:gap-12 items-center">
            {/* Hero Text Column */}
            <div className="lg:col-span-7 space-y-5 sm:space-y-6">
              <div className="inline-flex items-center gap-2 px-3 sm:px-3.5 py-1.5 rounded-full bg-forest-900/90 border border-gold/40 text-gold text-[10px] sm:text-xs font-semibold uppercase tracking-[0.12em] sm:tracking-[0.2em] max-w-full">
                <Sparkles className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">Official Digital Company Profile</span>
              </div>

              <div className="space-y-1.5 sm:space-y-2">
                <h1 className="text-3xl sm:text-5xl lg:text-6xl font-serif font-bold text-cream tracking-tight leading-[1.15]">
                  {companyName}
                </h1>
                <p className="text-base sm:text-2xl font-serif text-gold font-medium">
                  {professionalTitle}
                </p>
              </div>

              {/* Short Bilingual Intro */}
              <div className="space-y-3 max-w-2xl">
                {showEn && (
                  <p className="text-sm sm:text-base text-cream/90 leading-relaxed">
                    Professional aluminium, glass, interior fitting and general
                    building improvement specialists delivering modern spaces
                    and lasting architectural solutions across Tanzania.
                  </p>
                )}
                {showSw && (
                  <p className="text-sm sm:text-base text-gold-200/90 leading-relaxed italic border-l-2 border-gold/50 pl-3.5">
                    Wataalamu wa milango na madirisha ya aluminium, ufungaji wa
                    vioo, partition za ofisi na majumbani, mapazia na maboresho
                    ya majengo kwa ubora wa hali ya juu nchini Tanzania.
                  </p>
                )}
              </div>

              {/* Functional Hero Action Buttons */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4 pt-1 sm:pt-2">
                <button
                  type="button"
                  onClick={() => scrollToSection("services")}
                  className="px-6 py-3.5 rounded-xl bg-gold text-forest-950 font-bold text-xs sm:text-sm uppercase tracking-wider hover:bg-gold-300 transition shadow-gold-glow flex items-center justify-center gap-2"
                >
                  <span>
                    {lang === "SW"
                      ? "Tazama Huduma Zetu"
                      : "Explore Our Services"}
                  </span>
                  <ArrowDownRight className="w-4 h-4 shrink-0" />
                </button>

                <button
                  type="button"
                  onClick={() => scrollToSection("contact")}
                  className="px-6 py-3.5 rounded-xl bg-forest-900 border border-gold/50 text-cream font-bold text-xs sm:text-sm uppercase tracking-wider hover:bg-forest-800 hover:border-gold transition flex items-center justify-center gap-2"
                >
                  <span>{lang === "SW" ? "Wasiliana Nasi" : "Contact Us"}</span>
                </button>
              </div>

              {/* Location & Nationwide Badge */}
              <div className="pt-1 sm:pt-2 flex flex-col sm:flex-row sm:flex-wrap items-start sm:items-center gap-2.5 sm:gap-4 text-xs text-cream/80">
                <span className="inline-flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-gold shrink-0" />
                  <span>{locationText}</span>
                </span>
                <span className="hidden sm:inline text-gold/40">•</span>
                <span className="inline-flex items-start sm:items-center gap-2">
                  <Compass className="w-4 h-4 text-gold shrink-0 mt-0.5 sm:mt-0" />
                  <span className="leading-snug">{serviceAreaText}</span>
                </span>
              </div>
            </div>

            {/* Hero Visual Showcase Column */}
            <div className="lg:col-span-5">
              <div className="relative rounded-2xl sm:rounded-3xl overflow-hidden border-2 border-gold/40 shadow-2xl bg-forest-900">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={
                    data?.company?.coverImageUrl ||
                    "/uploads/services/service-1-doors-windows.png"
                  }
                  alt="HEZLON Building Solutions Architectural Aluminium and Glass"
                  className="w-full h-64 sm:h-96 object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-forest-950 via-forest-950/20 to-transparent" />
                <div className="absolute bottom-3 left-3 right-3 sm:bottom-4 sm:left-4 sm:right-4 p-3.5 sm:p-4 rounded-2xl bg-forest-950/90 backdrop-blur-md border border-gold/30 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    {data?.company?.ownerPhotoUrl ? (
                      <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full border-2 border-gold overflow-hidden shrink-0 shadow-md bg-forest-900">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={data.company.ownerPhotoUrl}
                          alt="HEZLON Executive Specialist"
                          className="w-full h-full object-cover"
                        />
                      </div>
                    ) : null}
                    <div className="min-w-0">
                      <div className="text-[10px] uppercase tracking-[0.16em] sm:tracking-[0.2em] text-gold font-bold">
                        HEZLON WORKMANSHIP
                      </div>
                      <div className="text-xs sm:text-sm font-serif font-bold text-cream mt-0.5 truncate">
                        Quality • Creativity • Reliability
                      </div>
                    </div>
                  </div>
                  <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gold/15 border border-gold/40 flex items-center justify-center text-gold shrink-0">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ================================================================= */}
      {/* 3. ABOUT US | KUHUSU SISI                                         */}
      {/* ================================================================= */}
      <section
        id="about"
        className="py-12 sm:py-20 bg-white border-b border-charcoal-100 scroll-mt-28 sm:scroll-mt-20"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mx-auto text-center mb-8 sm:mb-12">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-forest-950 text-gold text-[10px] sm:text-[11px] font-bold uppercase tracking-[0.14em] sm:tracking-[0.2em] mb-3">
              <Building2 className="w-3.5 h-3.5 shrink-0" />
              <span>ABOUT US | KUHUSU SISI</span>
            </div>
            <h2 className="text-2xl sm:text-4xl font-serif font-bold text-forest-950">
              {lang === "EN"
                ? "About HEZLON Building Solutions"
                : lang === "SW"
                ? "Kuhusu HEZLON Building Solutions"
                : "About Us • Kuhusu Sisi"}
            </h2>
          </div>

          <div
            className={`grid gap-5 sm:gap-6 ${
              lang === "BILINGUAL"
                ? "md:grid-cols-2"
                : "max-w-3xl mx-auto grid-cols-1"
            }`}
          >
            {showEn && (
              <div className="p-5 sm:p-8 rounded-2xl sm:rounded-3xl bg-cream/70 border border-gold/40 shadow-sm flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between gap-2 mb-4 pb-3 border-b border-gold/25">
                    <span className="text-[11px] sm:text-xs font-bold uppercase tracking-[0.14em] sm:tracking-[0.2em] text-forest-900">
                      ABOUT US (ENGLISH)
                    </span>
                    <span className="px-2.5 py-0.5 rounded-full bg-forest-950 text-gold text-[10px] font-bold uppercase tracking-wider shrink-0">
                      EN
                    </span>
                  </div>
                  <p className="text-sm sm:text-lg text-forest-950 leading-relaxed font-normal">
                    {aboutEn}
                  </p>
                </div>
                <div className="mt-5 sm:mt-6 pt-4 border-t border-gold/20 text-xs font-semibold text-forest-800 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-gold-700 shrink-0" />
                  <span>
                    HEZLON Building Solutions — Aluminium &amp; Glass
                    Specialists
                  </span>
                </div>
              </div>
            )}

            {showSw && (
              <div className="p-5 sm:p-8 rounded-2xl sm:rounded-3xl bg-forest-950 text-cream border border-gold/40 shadow-luxury flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between gap-2 mb-4 pb-3 border-b border-gold/25">
                    <span className="text-[11px] sm:text-xs font-bold uppercase tracking-[0.14em] sm:tracking-[0.2em] text-gold">
                      KUHUSU SISI (KISWAHILI)
                    </span>
                    <span className="px-2.5 py-0.5 rounded-full bg-gold text-forest-950 text-[10px] font-bold uppercase tracking-wider shrink-0">
                      SW
                    </span>
                  </div>
                  <p className="text-sm sm:text-lg text-cream/95 leading-relaxed font-normal">
                    {aboutSw}
                  </p>
                </div>
                <div className="mt-5 sm:mt-6 pt-4 border-t border-gold/20 text-xs font-semibold text-gold flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-gold shrink-0" />
                  <span>
                    HEZLON Building Solutions — Wataalamu wa Aluminium na Vioo
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ================================================================= */}
      {/* 4. OUR SERVICES | HUDUMA ZETU                                     */}
      {/* ================================================================= */}
      <section
        id="services"
        className="py-12 sm:py-20 bg-cream border-b border-charcoal-200 scroll-mt-28 sm:scroll-mt-20"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mx-auto text-center mb-8 sm:mb-12">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-forest-950 text-gold text-[10px] sm:text-[11px] font-bold uppercase tracking-[0.14em] sm:tracking-[0.2em] mb-3">
              <Layers className="w-3.5 h-3.5 shrink-0" />
              <span>OUR SERVICES | HUDUMA ZETU</span>
            </div>
            <h2 className="text-2xl sm:text-4xl font-serif font-bold text-forest-950">
              {lang === "EN"
                ? "Our Specialist Services"
                : lang === "SW"
                ? "Huduma Zetu za Kitaalamu"
                : "Our Services • Huduma Zetu"}
            </h2>
            <p className="text-xs sm:text-sm text-charcoal-600 mt-2">
              {lang === "SW"
                ? "Tunatoa huduma kamili za aluminium, vioo na maboresho ya majengo kwa ubora wa hali ya juu."
                : "Comprehensive aluminium, glass, interior fitting, and building improvement solutions."}
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-7">
            {servicesList.map((srv, index) => {
              const swTranslation =
                srv.titleSw || srv.descriptionSw || srv.description;
              return (
                <div
                  key={srv.id}
                  className="group bg-white rounded-2xl sm:rounded-3xl overflow-hidden border border-charcoal-200/80 hover:border-gold shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col"
                >
                  {/* Service Image */}
                  <div className="relative h-48 sm:h-52 bg-forest-950 overflow-hidden border-b border-gold/30">
                    {srv.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={srv.imageUrl}
                        alt={srv.title}
                        loading="lazy"
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gold">
                        <Building2 className="w-12 h-12 opacity-50" />
                      </div>
                    )}
                    <div className="absolute top-3 left-3 px-2.5 py-1 rounded-full bg-forest-950/90 border border-gold/40 text-gold text-[11px] font-mono font-bold">
                      0{index + 1}
                    </div>
                  </div>

                  {/* Card Body */}
                  <div className="p-5 sm:p-6 flex-1 flex flex-col justify-between space-y-4">
                    <div className="space-y-2.5">
                      {showEn && (
                        <div>
                          <div className="text-[10px] font-bold uppercase tracking-widest text-charcoal-400">
                            English
                          </div>
                          <h3 className="text-base sm:text-lg font-serif font-bold text-forest-950 leading-snug">
                            {srv.title}
                          </h3>
                        </div>
                      )}

                      {showSw && (
                        <div
                          className={
                            showEn
                              ? "pt-2.5 border-t border-charcoal-100"
                              : ""
                          }
                        >
                          <div className="text-[10px] font-bold uppercase tracking-widest text-gold-700">
                            Kiswahili
                          </div>
                          <p className="text-sm font-semibold text-forest-900 leading-relaxed">
                            {swTranslation}
                          </p>
                        </div>
                      )}

                      {showEn &&
                        srv.description &&
                        srv.description !== swTranslation && (
                          <p className="text-xs text-charcoal-600 leading-relaxed pt-1">
                            {srv.description}
                          </p>
                        )}
                    </div>

                    <div className="pt-3 border-t border-charcoal-100 flex items-center justify-between gap-2 text-[11px] font-semibold text-forest-800">
                      <span className="truncate">HEZLON Building Solutions</span>
                      <span className="text-gold-700 shrink-0">✓ Verified Service</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ================================================================= */}
      {/* 5. OUR COMMITMENT | AHADI YETU                                    */}
      {/* ================================================================= */}
      <section
        id="commitment"
        className="py-12 sm:py-20 bg-forest-950 text-cream border-b border-gold/30 scroll-mt-28 sm:scroll-mt-20"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mx-auto text-center mb-8 sm:mb-12">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-forest-900 border border-gold/40 text-gold text-[10px] sm:text-[11px] font-bold uppercase tracking-[0.14em] sm:tracking-[0.2em] mb-3">
              <Award className="w-3.5 h-3.5 shrink-0" />
              <span>OUR COMMITMENT | AHADI YETU</span>
            </div>
            <h2 className="text-2xl sm:text-4xl font-serif font-bold text-cream">
              {lang === "EN"
                ? "Our Core Commitments"
                : lang === "SW"
                ? "Ahadi Yetu kwa Wateja"
                : "Our Commitment • Ahadi Yetu"}
            </h2>
            <p className="text-xs sm:text-sm text-cream/75 mt-2">
              {lang === "SW"
                ? "Nguzo nne zinazoongoza kila kazi tunayofanya katika HEZLON Building Solutions."
                : "The four pillars guiding every project at HEZLON Building Solutions."}
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5 sm:gap-6">
            {COMMITMENTS.map((item) => {
              const IconComponent = item.icon;
              return (
                <div
                  key={item.en}
                  className="p-5 sm:p-6 rounded-2xl sm:rounded-3xl bg-forest-900/90 border border-gold/30 hover:border-gold transition flex flex-col justify-between space-y-4 shadow-luxury"
                >
                  <div className="space-y-4">
                    <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-gold/15 border border-gold/40 text-gold flex items-center justify-center shrink-0">
                      <IconComponent className="w-5 h-5 sm:w-6 sm:h-6" />
                    </div>

                    {showEn && (
                      <div>
                        <div className="text-[10px] uppercase tracking-widest text-cream/50 font-bold">
                          English
                        </div>
                        <h3 className="text-lg sm:text-xl font-serif font-bold text-cream mt-0.5">
                          {item.en}
                        </h3>
                        <p className="text-xs text-cream/75 mt-1.5 leading-relaxed">
                          {item.descEn}
                        </p>
                      </div>
                    )}

                    {showSw && (
                      <div
                        className={
                          showEn ? "pt-3 border-t border-gold/20" : ""
                        }
                      >
                        <div className="text-[10px] uppercase tracking-widest text-gold font-bold">
                          Kiswahili
                        </div>
                        <div className="text-base sm:text-lg font-serif font-bold text-gold mt-0.5">
                          {item.sw}
                        </div>
                        <p className="text-xs text-cream/80 mt-1.5 leading-relaxed">
                          {item.descSw}
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="pt-2 flex items-center gap-1.5 text-[11px] text-gold font-semibold">
                    <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                    <span>HEZLON Standard</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ================================================================= */}
      {/* 6. CONTACT US | WASILIANA NASI                                    */}
      {/* ================================================================= */}
      <section
        id="contact"
        className="py-12 sm:py-20 bg-white scroll-mt-28 sm:scroll-mt-20"
      >
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="rounded-2xl sm:rounded-3xl bg-forest-950 text-cream p-5 sm:p-12 border-2 border-gold/40 shadow-2xl relative overflow-hidden">
            <div className="max-w-2xl mx-auto text-center space-y-2.5 sm:space-y-3 mb-7 sm:mb-10">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-forest-900 border border-gold/40 text-gold text-[10px] sm:text-[11px] font-bold uppercase tracking-[0.14em] sm:tracking-[0.2em]">
                <MapPin className="w-3.5 h-3.5 shrink-0" />
                <span>CONTACT US | WASILIANA NASI</span>
              </div>
              <h2 className="text-2xl sm:text-4xl font-serif font-bold text-cream">
                {lang === "EN"
                  ? "Connect With HEZLON Building Solutions"
                  : lang === "SW"
                  ? "Wasiliana na HEZLON Building Solutions"
                  : "Contact Us • Wasiliana Nasi"}
              </h2>
            </div>

            {/* Location & Service Area Cards */}
            <div className="grid sm:grid-cols-2 gap-4 sm:gap-5 mb-7 sm:mb-10">
              <div className="p-4 sm:p-6 rounded-2xl bg-forest-900/90 border border-gold/30 flex items-start gap-3.5 sm:gap-4">
                <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-gold/15 border border-gold/40 text-gold flex items-center justify-center shrink-0">
                  <MapPin className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <div className="text-[11px] sm:text-xs font-bold uppercase tracking-widest text-gold">
                    {lang === "SW" ? "Mahali Tulipo" : "Location"}
                  </div>
                  <div className="text-base sm:text-lg font-serif font-bold text-cream mt-0.5 sm:mt-1">
                    {locationText}
                  </div>
                </div>
              </div>

              <div className="p-4 sm:p-6 rounded-2xl bg-forest-900/90 border border-gold/30 flex items-start gap-3.5 sm:gap-4">
                <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-gold/15 border border-gold/40 text-gold flex items-center justify-center shrink-0">
                  <Compass className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <div className="text-[11px] sm:text-xs font-bold uppercase tracking-widest text-gold">
                    {lang === "SW" ? "Eneo la Huduma" : "Service Area"}
                  </div>
                  <div className="text-xs sm:text-base font-semibold text-cream mt-0.5 sm:mt-1 leading-relaxed">
                    {serviceAreaText}
                  </div>
                </div>
              </div>
            </div>

            {/* Social Media Destination Buttons */}
            <div className="space-y-4">
              <div className="text-center text-[11px] sm:text-xs font-bold uppercase tracking-[0.14em] sm:tracking-[0.2em] text-gold">
                {lang === "SW"
                  ? "Mitandao ya Kijamii • Social Media"
                  : "Official Social Media Portfolio"}
              </div>

              <div className="grid sm:grid-cols-2 gap-3.5 sm:gap-4">
                <a
                  href={facebookUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="py-3.5 sm:py-4 px-4 sm:px-6 rounded-2xl bg-gold text-forest-950 font-bold text-xs sm:text-sm uppercase tracking-wider hover:bg-gold-300 transition shadow-gold-glow flex items-center justify-center gap-2.5 sm:gap-3 text-center"
                >
                  <Facebook className="w-4 h-4 sm:w-5 sm:h-5 shrink-0" />
                  <span>View Our Work on Facebook</span>
                  <ExternalLink className="w-4 h-4 shrink-0" />
                </a>

                <a
                  href={instagramUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="py-3.5 sm:py-4 px-4 sm:px-6 rounded-2xl bg-forest-900 border-2 border-gold text-cream font-bold text-xs sm:text-sm uppercase tracking-wider hover:bg-gold hover:text-forest-950 transition flex items-center justify-center gap-2.5 sm:gap-3 text-center"
                >
                  <Instagram className="w-4 h-4 sm:w-5 sm:h-5 shrink-0" />
                  <span>View Our Work on Instagram</span>
                  <ExternalLink className="w-4 h-4 shrink-0" />
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ================================================================= */}
      {/* 7. FOOTER                                                         */}
      {/* ================================================================= */}
      <footer className="bg-forest-950 text-cream border-t border-gold/30 py-10 sm:py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-5 sm:gap-6">
          <div className="flex items-center gap-3 text-left">
            <div className="w-10 h-10 rounded-xl bg-forest-900 border border-gold flex items-center justify-center font-serif font-bold text-lg text-gold shrink-0">
              H
            </div>
            <div>
              <div className="font-serif font-bold text-sm sm:text-base text-cream">
                {companyName}
              </div>
              <div className="text-xs text-gold">{professionalTitle}</div>
            </div>
          </div>

          <div className="flex items-center gap-3 sm:gap-4">
            <a
              href={facebookUrl}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="View Our Work on Facebook"
              className="px-3.5 py-2 rounded-xl bg-forest-900 border border-gold/30 text-xs font-semibold text-cream hover:border-gold hover:text-gold transition flex items-center gap-2"
            >
              <Facebook className="w-4 h-4 text-gold shrink-0" />
              <span>Facebook</span>
            </a>
            <a
              href={instagramUrl}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="View Our Work on Instagram"
              className="px-3.5 py-2 rounded-xl bg-forest-900 border border-gold/30 text-xs font-semibold text-cream hover:border-gold hover:text-gold transition flex items-center gap-2"
            >
              <Instagram className="w-4 h-4 text-gold shrink-0" />
              <span>Instagram</span>
            </a>
          </div>

          <div className="text-xs text-cream/60 text-center sm:text-right">
            © {currentYear} {companyName}. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}
