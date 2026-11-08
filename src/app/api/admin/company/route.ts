import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { logAuditEvent, requireAdminApi } from "@/lib/auth";

const companyUpdateSchema = z.object({
  companyName: z.string().min(1, "Company name is required"),
  professionalTitle: z.string().min(1, "Professional identity is required"),
  phone: z.string().min(1, "Phone number is required"),
  whatsapp: z.string().optional().default(""),
  email: z.string().email("Valid email address is required"),
  description: z.string().min(1, "Business description is required"),
  descriptionSw: z.string().optional().default(""),
  location: z.string().optional().default("Dodoma, Tanzania."),
  serviceArea: z
    .string()
    .optional()
    .default("Tanzania – Tunapokea kazi kutoka maeneo mbalimbali nchini."),
  instagram: z.string().optional().default(""),
  facebook: z.string().optional().default(""),
  website: z.string().optional().default(""),
  physicalAddress: z.string().optional().default(""),
  workingHours: z.string().optional().default(""),
  logoUrl: z.string().optional().default(""),
  ownerPhotoUrl: z.string().optional().default(""),
  coverImageUrl: z.string().optional().default(""),
  galleryImages: z.array(z.string()).optional().default([]),
  defaultWidthMm: z.number().min(40).max(150).optional().default(90),
  defaultHeightMm: z.number().min(30).max(120).optional().default(50),
  defaultBleedMm: z.number().min(0).max(10).optional().default(3),
  defaultSafeMarginMm: z.number().min(2).max(15).optional().default(5),
  notifyOnQrScan: z.boolean().optional().default(true),
  notifyOnPrintOrder: z.boolean().optional().default(true),
  // Digital Profile fields
  digitalProfile: z
    .object({
      slug: z.string().min(2).optional(),
      isPublished: z.boolean().optional(),
      headline: z.string().optional(),
      themeMode: z.string().optional(),
      accentColor: z.string().optional(),
      primaryColor: z.string().optional(),
      showServices: z.boolean().optional(),
      showGallery: z.boolean().optional(),
      showSocialLinks: z.boolean().optional(),
      showWorkingHours: z.boolean().optional(),
      showLocation: z.boolean().optional(),
      enableVCard: z.boolean().optional(),
      enableWhatsApp: z.boolean().optional(),
    })
    .optional(),
});

export async function GET(req: NextRequest) {
  const session = await requireAdminApi(req);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const company = await prisma.companyProfile.findUnique({
    where: { id: "hezlon-singleton" },
  });
  const digitalProfile = await prisma.digitalProfile.findUnique({
    where: { id: "hezlon-digital-profile" },
  });
  const qrConfig = await prisma.qRCode.findUnique({
    where: { id: "hezlon-permanent-qr" },
  });

  return NextResponse.json({
    company: company
      ? {
          ...company,
          galleryImages: JSON.parse(company.galleryImagesJson || "[]"),
        }
      : null,
    digitalProfile,
    qrConfig,
  });
}

export async function PUT(req: NextRequest) {
  const session = await requireAdminApi(req);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const parsed = companyUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          error:
            parsed.error.issues[0]?.message || "Invalid company information",
        },
        { status: 400 }
      );
    }

    const data = parsed.data;
    const companyUpdatePayload = {
      companyName: data.companyName,
      professionalTitle: data.professionalTitle,
      phone: data.phone,
      whatsapp: data.whatsapp || data.phone,
      email: data.email,
      description: data.description,
      descriptionSw: data.descriptionSw,
      location: data.location,
      serviceArea: data.serviceArea,
      instagram: data.instagram,
      facebook: data.facebook,
      website: data.website,
      physicalAddress: data.physicalAddress,
      workingHours: data.workingHours,
      logoUrl: data.logoUrl,
      ownerPhotoUrl: data.ownerPhotoUrl,
      coverImageUrl: data.coverImageUrl,
      galleryImagesJson: JSON.stringify(data.galleryImages || []),
      defaultWidthMm: data.defaultWidthMm,
      defaultHeightMm: data.defaultHeightMm,
      defaultBleedMm: data.defaultBleedMm,
      defaultSafeMarginMm: data.defaultSafeMarginMm,
      notifyOnQrScan: data.notifyOnQrScan,
      notifyOnPrintOrder: data.notifyOnPrintOrder,
    };
    const companyCreatePayload = {
      id: "hezlon-singleton",
      ...companyUpdatePayload,
    };

    const updatedCompany = await prisma.companyProfile.upsert({
      where: { id: "hezlon-singleton" },
      update: companyUpdatePayload,
      create: companyCreatePayload,
    });

    let updatedDigital = await prisma.digitalProfile.findUnique({
      where: { id: "hezlon-digital-profile" },
    });

    if (data.digitalProfile) {
      updatedDigital = await prisma.digitalProfile.upsert({
        where: { id: "hezlon-digital-profile" },
        update: {
          ...(data.digitalProfile.isPublished !== undefined && {
            isPublished: data.digitalProfile.isPublished,
          }),
          ...(data.digitalProfile.headline !== undefined && {
            headline: data.digitalProfile.headline,
          }),
          ...(data.digitalProfile.themeMode !== undefined && {
            themeMode: data.digitalProfile.themeMode,
          }),
          ...(data.digitalProfile.accentColor !== undefined && {
            accentColor: data.digitalProfile.accentColor,
          }),
          ...(data.digitalProfile.primaryColor !== undefined && {
            primaryColor: data.digitalProfile.primaryColor,
          }),
          ...(data.digitalProfile.showServices !== undefined && {
            showServices: data.digitalProfile.showServices,
          }),
          ...(data.digitalProfile.showGallery !== undefined && {
            showGallery: data.digitalProfile.showGallery,
          }),
          ...(data.digitalProfile.showSocialLinks !== undefined && {
            showSocialLinks: data.digitalProfile.showSocialLinks,
          }),
          ...(data.digitalProfile.showWorkingHours !== undefined && {
            showWorkingHours: data.digitalProfile.showWorkingHours,
          }),
          ...(data.digitalProfile.showLocation !== undefined && {
            showLocation: data.digitalProfile.showLocation,
          }),
          ...(data.digitalProfile.enableVCard !== undefined && {
            enableVCard: data.digitalProfile.enableVCard,
          }),
          ...(data.digitalProfile.enableWhatsApp !== undefined && {
            enableWhatsApp: data.digitalProfile.enableWhatsApp,
          }),
        },
        create: {
          id: "hezlon-digital-profile",
          slug: "hezlon",
          isPublished: data.digitalProfile.isPublished ?? true,
        },
      });
    }

    await logAuditEvent({
      action: "COMPANY_PROFILE_UPDATED",
      entityType: "CompanyProfile",
      entityId: "hezlon-singleton",
      summary: `Updated company profile for ${data.companyName}`,
    });

    return NextResponse.json({
      company: {
        ...updatedCompany,
        galleryImages: JSON.parse(updatedCompany.galleryImagesJson || "[]"),
      },
      digitalProfile: updatedDigital,
    });
  } catch (error) {
    console.error("Update company error:", error);
    return NextResponse.json(
      { error: "Failed to update company profile" },
      { status: 500 }
    );
  }
}

