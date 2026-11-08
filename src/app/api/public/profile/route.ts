import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const company = await prisma.companyProfile.findUnique({
    where: { id: "hezlon-singleton" },
  });
  const digitalProfile = await prisma.digitalProfile.findUnique({
    where: { id: "hezlon-digital-profile" },
  });
  const services = await prisma.companyService.findMany({
    where: { isPublished: true },
    orderBy: [{ displayOrder: "asc" }, { createdAt: "asc" }],
  });

  if (!company || (digitalProfile && !digitalProfile.isPublished)) {
    return NextResponse.json(
      { published: false, error: "Profile is currently unpublished" },
      { status: 404 }
    );
  }

  return NextResponse.json({
    published: true,
    company: {
      ...company,
      galleryImages: JSON.parse(company.galleryImagesJson || "[]"),
    },
    digitalProfile,
    services,
  });
}

