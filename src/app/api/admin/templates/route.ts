import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminApi } from "@/lib/auth";
import {
  HEZLON_TEMPLATES,
  normalizeSignatureQrElements,
} from "@/lib/templates-catalog";

export async function GET(req: NextRequest) {
  const session = await requireAdminApi(req);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const dbTemplates = await prisma.cardTemplate.findMany({
    orderBy: [{ isFeatured: "desc" }, { name: "asc" }],
  });

  if (dbTemplates.length > 0) {
    const formatted = dbTemplates.map((t) => ({
      id: t.id,
      slug: t.slug,
      name: t.name,
      category: t.category,
      description: t.description,
      widthMm: t.widthMm,
      heightMm: t.heightMm,
      isDoubleSided: t.isDoubleSided,
      paperFinish: t.paperFinish,
      cornerStyle: t.cornerStyle,
      accentColor: t.accentColor,
      previewPalette: JSON.parse(t.previewPaletteJson || "[]"),
      isFeatured: t.isFeatured,
      frontBg: JSON.parse(t.frontBgJson),
      backBg: JSON.parse(t.backBgJson),
      frontElements: normalizeSignatureQrElements(
        JSON.parse(t.frontElementsJson)
      ),
      backElements: normalizeSignatureQrElements(
        JSON.parse(t.backElementsJson)
      ),
    }));
    return NextResponse.json({ templates: formatted });
  }

  return NextResponse.json({ templates: HEZLON_TEMPLATES });
}

