"use client";

import React, { useEffect, useState, useRef } from "react";
import {
  Building2,
  Save,
  Plus,
  Trash2,
  ArrowUp,
  ArrowDown,
  Upload,
  CheckCircle2,
  Layers,
  Image as ImageIcon,
  Edit3,
} from "lucide-react";

interface ServiceItem {
  id: string;
  title: string;
  titleSw?: string;
  description: string;
  descriptionSw?: string;
  category: string;
  imageUrl: string;
  iconName: string;
  displayOrder: number;
  isPublished: boolean;
}

export default function CompanyInformationPage() {
  const [activeTab, setActiveTab] = useState<"INFO" | "SERVICES" | "MEDIA">(
    "INFO"
  );
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedBanner, setSavedBanner] = useState("");

  // Company Profile Fields
  const [companyName, setCompanyName] = useState("HEZLON Building Solutions");
  const [professionalTitle, setProfessionalTitle] = useState(
    "Aluminum & Glass Specialist"
  );
  const [phone, setPhone] = useState("0673 571 344");
  const [whatsapp, setWhatsapp] = useState("0673 571 344");
  const [email, setEmail] = useState("Casrycasry40@gmail.com");
  const [description, setDescription] = useState("");
  const [descriptionSw, setDescriptionSw] = useState("");
  const [location, setLocation] = useState("Dodoma, Tanzania.");
  const [serviceArea, setServiceArea] = useState(
    "Tanzania – Tunapokea kazi kutoka maeneo mbalimbali nchini."
  );
  const [instagram, setInstagram] = useState("");
  const [facebook, setFacebook] = useState("");
  const [website, setWebsite] = useState("");
  const [physicalAddress, setPhysicalAddress] = useState("");
  const [workingHours, setWorkingHours] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [ownerPhotoUrl, setOwnerPhotoUrl] = useState("");
  const [coverImageUrl, setCoverImageUrl] = useState("");
  const [galleryImages, setGalleryImages] = useState<string[]>([]);

  // Services State
  const [services, setServices] = useState<ServiceItem[]>([]);
  const [newTitle, setNewTitle] = useState("");
  const [newTitleSw, setNewTitleSw] = useState("");
  const [newCategory, setNewCategory] = useState(
    "Architectural Glazing & Aluminium"
  );
  const [newDesc, setNewDesc] = useState("");
  const [newImageUrl, setNewImageUrl] = useState("");
  const [editingService, setEditingService] = useState<ServiceItem | null>(
    null
  );

  const logoRef = useRef<HTMLInputElement>(null);
  const ownerRef = useRef<HTMLInputElement>(null);
  const coverRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);
  const serviceImgRef = useRef<HTMLInputElement>(null);

  const loadData = () => {
    setLoading(true);
    Promise.all([
      fetch("/api/admin/company").then((r) => r.json()),
      fetch("/api/admin/services").then((r) => r.json()),
    ])
      .then(([compRes, srvRes]) => {
        if (compRes.company) {
          const c = compRes.company;
          setCompanyName(c.companyName || "");
          setProfessionalTitle(c.professionalTitle || "");
          setPhone(c.phone || "");
          setWhatsapp(c.whatsapp || c.phone || "");
          setEmail(c.email || "");
          setDescription(c.description || "");
          setDescriptionSw(c.descriptionSw || "");
          setLocation(c.location || "Dodoma, Tanzania.");
          setServiceArea(
            c.serviceArea ||
              "Tanzania – Tunapokea kazi kutoka maeneo mbalimbali nchini."
          );
          setInstagram(c.instagram || "");
          setFacebook(c.facebook || "");
          setWebsite(c.website || "");
          setPhysicalAddress(c.physicalAddress || "");
          setWorkingHours(c.workingHours || "");
          setLogoUrl(c.logoUrl || "");
          setOwnerPhotoUrl(c.ownerPhotoUrl || "");
          setCoverImageUrl(c.coverImageUrl || "");
          setGalleryImages(c.galleryImages || []);
        }
        if (srvRes.services) {
          setServices(srvRes.services);
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSaveCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSavedBanner("");
    try {
      const res = await fetch("/api/admin/company", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyName,
          professionalTitle,
          phone,
          whatsapp,
          email,
          description,
          descriptionSw,
          location,
          serviceArea,
          instagram,
          facebook,
          website,
          physicalAddress,
          workingHours,
          logoUrl,
          ownerPhotoUrl,
          coverImageUrl,
          galleryImages,
        }),
      });
      if (res.ok) {
        setSavedBanner(
          "Company information saved! Live QR profile (/hezlon) updated automatically without changing your permanent QR code."
        );
      }
    } finally {
      setSaving(false);
    }
  };

  const uploadFile = async (
    file: File,
    purpose: string
  ): Promise<string | null> => {
    const fd = new FormData();
    fd.append("file", file);
    fd.append("purpose", purpose);
    const res = await fetch("/api/admin/upload", {
      method: "POST",
      body: fd,
    });
    const data = await res.json();
    return res.ok ? data.url || data.dataUrl : null;
  };

  const handleCreateService = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newDesc.trim()) return;
    const res = await fetch("/api/admin/services", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: newTitle,
        titleSw: newTitleSw,
        description: newDesc,
        descriptionSw: newTitleSw || newDesc,
        category: newCategory,
        imageUrl: newImageUrl,
        isPublished: true,
      }),
    });
    if (res.ok) {
      setNewTitle("");
      setNewTitleSw("");
      setNewDesc("");
      setNewImageUrl("");
      const srvRes = await fetch("/api/admin/services").then((r) => r.json());
      setServices(srvRes.services || []);
    }
  };

  const handleUpdateService = async (srv: ServiceItem) => {
    const res = await fetch("/api/admin/services", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(srv),
    });
    if (res.ok) {
      setEditingService(null);
      const srvRes = await fetch("/api/admin/services").then((r) => r.json());
      setServices(srvRes.services || []);
    }
  };

  const handleDeleteService = async (id: string) => {
    await fetch(`/api/admin/services?id=${id}`, { method: "DELETE" });
    setServices((prev) => prev.filter((s) => s.id !== id));
  };

  const handleMoveService = async (index: number, direction: -1 | 1) => {
    const targetIdx = index + direction;
    if (targetIdx < 0 || targetIdx >= services.length) return;
    const next = [...services];
    const temp = next[index];
    next[index] = next[targetIdx];
    next[targetIdx] = temp;
    setServices(next);

    await fetch("/api/admin/services", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderedIds: next.map((s) => s.id) }),
    });
  };

  if (loading) {
    return (
      <div className="p-12 text-center text-sm text-charcoal-500">
        Loading HEZLON Building Solutions company profile...
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="bg-white rounded-2xl p-6 border border-charcoal-100 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-serif font-bold text-forest-950 flex items-center gap-2.5">
            <Building2 className="w-6 h-6 text-gold-700" />
            <span>Company Information &amp; Services</span>
          </h1>
          <p className="text-xs text-charcoal-500 mt-1">
            Manage the single company profile for{" "}
            <strong>HEZLON Building Solutions</strong>. Any updates immediately
            reflect on your public QR digital profile.
          </p>
        </div>

        <div className="flex rounded-xl bg-cream p-1 border border-charcoal-200 text-xs font-bold">
          {[
            { id: "INFO", label: "Company Details" },
            { id: "SERVICES", label: `Services (${services.length})` },
            { id: "MEDIA", label: "Logo & Photographs" },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() =>
                setActiveTab(tab.id as "INFO" | "SERVICES" | "MEDIA")
              }
              className={`px-4 py-2 rounded-lg transition ${
                activeTab === tab.id
                  ? "bg-forest-900 text-gold shadow-sm"
                  : "text-charcoal-600 hover:text-forest-900"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {savedBanner && (
        <div className="p-4 rounded-xl bg-emerald-950 text-emerald-200 border border-emerald-500/40 text-xs flex items-center gap-2.5">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{savedBanner}</span>
        </div>
      )}

      {/* TAB 1: COMPANY DETAILS */}
      {activeTab === "INFO" && (
        <form
          onSubmit={handleSaveCompany}
          className="bg-white rounded-2xl p-6 border border-charcoal-100 shadow-sm space-y-6"
        >
          <div className="grid sm:grid-cols-2 gap-5">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-forest-900 mb-1.5">
                Company Name
              </label>
              <input
                type="text"
                required
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-charcoal-200 text-sm font-semibold"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-forest-900 mb-1.5">
                Professional Identity / Specialist Title
              </label>
              <input
                type="text"
                required
                value={professionalTitle}
                onChange={(e) => setProfessionalTitle(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-charcoal-200 text-sm font-semibold"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-forest-900 mb-1.5">
                Primary Phone Number
              </label>
              <input
                type="text"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-charcoal-200 text-sm font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-forest-900 mb-1.5">
                WhatsApp Number
              </label>
              <input
                type="text"
                value={whatsapp}
                onChange={(e) => setWhatsapp(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-charcoal-200 text-sm font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-forest-900 mb-1.5">
                Official Email Address
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-charcoal-200 text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-forest-900 mb-1.5">
                Company Website (Optional — Add when available)
              </label>
              <input
                type="text"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                placeholder="Leave blank if not yet added"
                className="w-full px-3.5 py-2.5 rounded-xl border border-charcoal-200 text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-forest-900 mb-1.5">
                Instagram Profile URL
              </label>
              <input
                type="url"
                value={instagram}
                onChange={(e) => setInstagram(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-charcoal-200 text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-forest-900 mb-1.5">
                Facebook Page URL
              </label>
              <input
                type="url"
                value={facebook}
                onChange={(e) => setFacebook(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-charcoal-200 text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-forest-900 mb-1.5">
                Company Location (Displayed on /hezlon)
              </label>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="Dodoma, Tanzania."
                className="w-full px-3.5 py-2.5 rounded-xl border border-charcoal-200 text-sm font-semibold"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-forest-900 mb-1.5">
                Service Area (English &amp; Kiswahili)
              </label>
              <input
                type="text"
                value={serviceArea}
                onChange={(e) => setServiceArea(e.target.value)}
                placeholder="Tanzania – Tunapokea kazi kutoka maeneo mbalimbali nchini."
                className="w-full px-3.5 py-2.5 rounded-xl border border-charcoal-200 text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-forest-900 mb-1.5">
                Physical Location / Showroom Address (Optional)
              </label>
              <input
                type="text"
                value={physicalAddress}
                onChange={(e) => setPhysicalAddress(e.target.value)}
                placeholder="Add physical address when ready"
                className="w-full px-3.5 py-2.5 rounded-xl border border-charcoal-200 text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-forest-900 mb-1.5">
                Working Hours (Optional)
              </label>
              <input
                type="text"
                value={workingHours}
                onChange={(e) => setWorkingHours(e.target.value)}
                placeholder="e.g., Mon–Sat: 8:00 AM – 6:00 PM"
                className="w-full px-3.5 py-2.5 rounded-xl border border-charcoal-200 text-sm"
              />
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-5">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-forest-900 mb-1.5">
                About Us — English Description
              </label>
              <textarea
                rows={4}
                required
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-charcoal-200 text-sm leading-relaxed"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-forest-900 mb-1.5">
                Kuhusu Sisi — Kiswahili Description
              </label>
              <textarea
                rows={4}
                value={descriptionSw}
                onChange={(e) => setDescriptionSw(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-charcoal-200 text-sm leading-relaxed"
              />
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-3 rounded-xl bg-forest-900 text-gold font-bold text-xs uppercase tracking-wider hover:bg-forest-800 transition flex items-center gap-2 shadow-sm"
            >
              <Save className="w-4 h-4" />
              <span>
                {saving ? "Saving Changes..." : "Save Company Information"}
              </span>
            </button>
          </div>
        </form>
      )}

      {/* TAB 2: COMPANY SERVICES MANAGEMENT */}
      {activeTab === "SERVICES" && (
        <div className="grid lg:grid-cols-12 gap-6 items-start">
          {/* Add New Service Form */}
          <form
            onSubmit={handleCreateService}
            className="lg:col-span-4 bg-white rounded-2xl p-6 border border-charcoal-100 shadow-sm space-y-4"
          >
            <h2 className="text-base font-serif font-bold text-forest-950 flex items-center gap-2">
              <Plus className="w-4 h-4 text-gold-700" />
              <span>Add HEZLON Service</span>
            </h2>

            <div>
              <label className="block text-xs font-bold uppercase text-charcoal-600 mb-1">
                Service Title (English)
              </label>
              <input
                type="text"
                required
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="e.g., Aluminium Doors and Windows"
                className="w-full px-3 py-2 rounded-xl border border-charcoal-200 text-xs font-semibold"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase text-charcoal-600 mb-1">
                Kiswahili Translation (Huduma)
              </label>
              <input
                type="text"
                value={newTitleSw}
                onChange={(e) => setNewTitleSw(e.target.value)}
                placeholder="e.g., Milango na madirisha ya Aluminium na UPVC."
                className="w-full px-3 py-2 rounded-xl border border-charcoal-200 text-xs font-semibold"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase text-charcoal-600 mb-1">
                Category
              </label>
              <input
                type="text"
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-charcoal-200 text-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase text-charcoal-600 mb-1">
                Description
              </label>
              <textarea
                rows={3}
                required
                value={newDesc}
                onChange={(e) => setNewDesc(e.target.value)}
                placeholder="Describe workmanship and applications..."
                className="w-full px-3 py-2 rounded-xl border border-charcoal-200 text-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase text-charcoal-600 mb-1">
                Service Photograph (Optional)
              </label>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => serviceImgRef.current?.click()}
                  className="px-3 py-2 rounded-xl border border-charcoal-200 text-xs font-semibold flex items-center gap-1.5 hover:bg-cream"
                >
                  <Upload className="w-3.5 h-3.5 text-gold-700" />
                  <span>Upload Image</span>
                </button>
                {newImageUrl && (
                  <span className="text-[11px] text-emerald-700 font-semibold">
                    Image attached ✓
                  </span>
                )}
              </div>
              <input
                ref={serviceImgRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={async (e) => {
                  const f = e.target.files?.[0];
                  if (f) {
                    const url = await uploadFile(f, "service");
                    if (url) setNewImageUrl(url);
                  }
                }}
              />
            </div>

            <button
              type="submit"
              className="w-full py-2.5 rounded-xl bg-forest-900 text-gold font-bold text-xs uppercase tracking-wider hover:bg-forest-800 transition"
            >
              + Add Service to Profile
            </button>
          </form>

          {/* Existing Services List with Reordering & Editing */}
          <div className="lg:col-span-8 bg-white rounded-2xl p-6 border border-charcoal-100 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-serif font-bold text-forest-950 flex items-center gap-2">
                  <Layers className="w-4 h-4 text-gold-700" />
                  <span>Published Services ({services.length})</span>
                </h2>
                <p className="text-xs text-charcoal-500">
                  Use arrows to reorder display sequence on the public QR
                  profile (/hezlon).
                </p>
              </div>
            </div>

            <div className="space-y-3">
              {services.map((srv, idx) => (
                <div
                  key={srv.id}
                  className="p-4 rounded-xl border border-charcoal-100 bg-cream/40 flex flex-col gap-3"
                >
                  {editingService?.id === srv.id ? (
                    <div className="space-y-3">
                      <div className="grid sm:grid-cols-2 gap-2">
                        <input
                          type="text"
                          value={editingService.title}
                          onChange={(e) =>
                            setEditingService({
                              ...editingService,
                              title: e.target.value,
                            })
                          }
                          placeholder="English Title"
                          className="px-3 py-1.5 rounded-lg border text-xs font-bold"
                        />
                        <input
                          type="text"
                          value={editingService.titleSw || ""}
                          onChange={(e) =>
                            setEditingService({
                              ...editingService,
                              titleSw: e.target.value,
                            })
                          }
                          placeholder="Kiswahili Translation"
                          className="px-3 py-1.5 rounded-lg border text-xs font-semibold"
                        />
                      </div>
                      <textarea
                        rows={2}
                        value={editingService.description}
                        onChange={(e) =>
                          setEditingService({
                            ...editingService,
                            description: e.target.value,
                          })
                        }
                        className="w-full px-3 py-1.5 rounded-lg border text-xs"
                      />
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => setEditingService(null)}
                          className="px-3 py-1.5 rounded-lg border text-xs"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={() => handleUpdateService(editingService)}
                          className="px-4 py-1.5 rounded-lg bg-forest-900 text-gold text-xs font-bold"
                        >
                          Save Service
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-3">
                        {srv.imageUrl && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={srv.imageUrl}
                            alt={srv.title}
                            className="w-14 h-14 rounded-lg object-cover border border-gold/40 shrink-0"
                          />
                        )}
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-mono font-bold text-gold-700">
                              #{idx + 1}
                            </span>
                            <h3 className="text-sm font-serif font-bold text-forest-950">
                              {srv.title}
                            </h3>
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-forest-100 text-forest-800 font-semibold">
                              {srv.category}
                            </span>
                          </div>
                          {srv.titleSw && (
                            <p className="text-xs font-semibold text-gold-700 mt-0.5">
                              SW: {srv.titleSw}
                            </p>
                          )}
                          <p className="text-xs text-charcoal-600 mt-1">
                            {srv.description}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleMoveService(idx, -1)}
                          disabled={idx === 0}
                          className="p-1.5 rounded-lg border border-charcoal-200 hover:bg-white disabled:opacity-30"
                        >
                          <ArrowUp className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleMoveService(idx, 1)}
                          disabled={idx === services.length - 1}
                          className="p-1.5 rounded-lg border border-charcoal-200 hover:bg-white disabled:opacity-30"
                        >
                          <ArrowDown className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingService(srv)}
                          className="p-1.5 rounded-lg border border-charcoal-200 hover:bg-white text-forest-900"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteService(srv.id)}
                          className="p-1.5 rounded-lg border border-rose-200 hover:bg-rose-50 text-rose-600"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: LOGO, OWNER PHOTO, COVER & PROJECT GALLERY */}
      {activeTab === "MEDIA" && (
        <div className="bg-white rounded-2xl p-6 border border-charcoal-100 shadow-sm space-y-6">
          <div className="grid sm:grid-cols-3 gap-6">
            {/* Company Logo */}
            <div className="p-5 rounded-2xl border border-charcoal-100 bg-cream/40 flex flex-col items-center text-center space-y-3">
              <div className="text-xs font-bold uppercase tracking-wider text-forest-950">
                Official Company Logo
              </div>
              <div className="w-28 h-28 rounded-2xl bg-forest-950 border-2 border-gold flex items-center justify-center overflow-hidden">
                {logoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={logoUrl}
                    alt="Logo"
                    className="w-full h-full object-contain p-2 bg-white"
                  />
                ) : (
                  <span className="font-serif font-bold text-3xl text-gold">
                    H
                  </span>
                )}
              </div>
              <button
                type="button"
                onClick={() => logoRef.current?.click()}
                className="px-4 py-2 rounded-xl bg-forest-900 text-gold text-xs font-bold flex items-center gap-1.5"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Upload Logo</span>
              </button>
              <input
                ref={logoRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={async (e) => {
                  const f = e.target.files?.[0];
                  if (f) {
                    const u = await uploadFile(f, "logo");
                    if (u) setLogoUrl(u);
                  }
                }}
              />
            </div>

            {/* Owner / Specialist Photo */}
            <div className="p-5 rounded-2xl border border-charcoal-100 bg-cream/40 flex flex-col items-center text-center space-y-3">
              <div className="text-xs font-bold uppercase tracking-wider text-forest-950">
                Owner / Specialist Portrait
              </div>
              <div className="w-28 h-28 rounded-full bg-forest-950 border-2 border-gold flex items-center justify-center overflow-hidden">
                {ownerPhotoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={ownerPhotoUrl}
                    alt="Owner"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <ImageIcon className="w-8 h-8 text-gold/60" />
                )}
              </div>
              <button
                type="button"
                onClick={() => ownerRef.current?.click()}
                className="px-4 py-2 rounded-xl bg-forest-900 text-gold text-xs font-bold flex items-center gap-1.5"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Upload Portrait</span>
              </button>
              <input
                ref={ownerRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={async (e) => {
                  const f = e.target.files?.[0];
                  if (f) {
                    const u = await uploadFile(f, "owner");
                    if (u) setOwnerPhotoUrl(u);
                  }
                }}
              />
            </div>

            {/* Cover Banner */}
            <div className="p-5 rounded-2xl border border-charcoal-100 bg-cream/40 flex flex-col items-center text-center space-y-3">
              <div className="text-xs font-bold uppercase tracking-wider text-forest-950">
                Digital Profile Cover Image
              </div>
              <div className="w-full h-28 rounded-xl bg-forest-950 border border-gold/40 flex items-center justify-center overflow-hidden">
                {coverImageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={coverImageUrl}
                    alt="Cover"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-xs text-gold/70 font-serif">
                    Architectural Grid Default
                  </span>
                )}
              </div>
              <button
                type="button"
                onClick={() => coverRef.current?.click()}
                className="px-4 py-2 rounded-xl bg-forest-900 text-gold text-xs font-bold flex items-center gap-1.5"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Upload Cover</span>
              </button>
              <input
                ref={coverRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={async (e) => {
                  const f = e.target.files?.[0];
                  if (f) {
                    const u = await uploadFile(f, "cover");
                    if (u) setCoverImageUrl(u);
                  }
                }}
              />
            </div>
          </div>

          {/* Project Gallery */}
          <div className="pt-4 border-t border-charcoal-100 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-serif font-bold text-forest-950">
                  Company Project Photographs
                </h3>
                <p className="text-xs text-charcoal-500">
                  Showcase completed aluminium doors, windows, partitions, and
                  balustrades on your digital QR profile.
                </p>
              </div>
              <button
                type="button"
                onClick={() => galleryRef.current?.click()}
                className="px-4 py-2 rounded-xl border border-forest-900 text-forest-900 text-xs font-bold flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Project Photo</span>
              </button>
              <input
                ref={galleryRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={async (e) => {
                  const f = e.target.files?.[0];
                  if (f) {
                    const u = await uploadFile(f, "gallery");
                    if (u) setGalleryImages((prev) => [...prev, u]);
                  }
                }}
              />
            </div>

            {galleryImages.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {galleryImages.map((img, i) => (
                  <div
                    key={i}
                    className="relative aspect-[4/3] rounded-xl overflow-hidden border border-charcoal-200 group"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={img}
                      alt={`Project ${i + 1}`}
                      className="w-full h-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setGalleryImages((prev) =>
                          prev.filter((_, idx) => idx !== i)
                        )
                      }
                      className="absolute top-2 right-2 p-1.5 rounded-lg bg-rose-600 text-white opacity-0 group-hover:opacity-100 transition"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="button"
              onClick={handleSaveCompany}
              disabled={saving}
              className="px-6 py-3 rounded-xl bg-forest-900 text-gold font-bold text-xs uppercase tracking-wider flex items-center gap-2"
            >
              <Save className="w-4 h-4" />
              <span>Save Media Assets to Profile</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

