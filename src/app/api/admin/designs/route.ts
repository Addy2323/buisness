import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { logAuditEvent, requireAdminApi } from "@/lib/auth";
import { validateCardForPrint } from "@/lib/print-engine";

const saveDesignSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, "Design name is required"),
  templateId: z.string().nullable().optional(),
  widthMm: z.number().min(40).max(150).default(90),
  heightMm: z.number().min(30).max(120).default(50),
  bleedMm: z.number().min(0).max(10).default(3),
  safeMarginMm: z.number().min(2).max(15).default(5),
  isDoubleSided: z.boolean().default(true),
  paperFinish: z.string().default("MATTE"),
  cornerStyle: z.string().default("SQUARE"),
  frontBg: z.any(),
  backBg: z.any(),
  frontElements: z.array(z.any()),
  backElements: z.array(z.any()),
  status: z.enum(["DRAFT", "APPROVED", "ARCHIVED"]).optional().default("DRAFT"),
  notes: z.string().optional().default(""),
  isFavorite: z.boolean().optional().default(false),
});

export async function GET(req: NextRequest) {
  const session = await requireAdminApi(req);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");

  if (id) {
    const design = await prisma.businessCardDesign.findUnique({
      where: { id },
    });
    if (!design) {
      return NextResponse.json({ error: "Design not found" }, { status: 404 });
    }
    return NextResponse.json({
      design: {
        ...design,
        frontBg: JSON.parse(design.frontBgJson || "{}"),
        backBg: JSON.parse(design.backBgJson || "{}"),
        frontElements: JSON.parse(design.frontElementsJson || "[]"),
        backElements: JSON.parse(design.backElementsJson || "[]"),
        lastValidation: JSON.parse(design.lastValidationJson || "{}"),
      },
    });
  }

  const designs = await prisma.businessCardDesign.findMany({
    orderBy: [{ updatedAt: "desc" }],
  });

  const formatted = designs.map((d) => ({
    ...d,
    frontBg: JSON.parse(d.frontBgJson || "{}"),
    backBg: JSON.parse(d.backBgJson || "{}"),
    frontElements: JSON.parse(d.frontElementsJson || "[]"),
    backElements: JSON.parse(d.backElementsJson || "[]"),
    lastValidation: JSON.parse(d.lastValidationJson || "{}"),
  }));

  return NextResponse.json({ designs: formatted });
}

export async function POST(req: NextRequest) {
  const session = await requireAdminApi(req);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();

    // Support duplicate existing design action
    if (body.duplicateFromId) {
      const source = await prisma.businessCardDesign.findUnique({
        where: { id: String(body.duplicateFromId) },
      });
      if (!source) {
        return NextResponse.json(
          { error: "Source design not found" },
          { status: 404 }
        );
      }
      const duplicated = await prisma.businessCardDesign.create({
        data: {
          name: `${source.name} (Copy)`,
          templateId: source.templateId,
          widthMm: source.widthMm,
          heightMm: source.heightMm,
          bleedMm: source.bleedMm,
          safeMarginMm: source.safeMarginMm,
          isDoubleSided: source.isDoubleSided,
          paperFinish: source.paperFinish,
          cornerStyle: source.cornerStyle,
          frontBgJson: source.frontBgJson,
          backBgJson: source.backBgJson,
          frontElementsJson: source.frontElementsJson,
          backElementsJson: source.backElementsJson,
          status: "DRAFT",
          notes: source.notes,
          lastValidationJson: source.lastValidationJson,
        },
      });

      await logAuditEvent({
        action: "DESIGN_DUPLICATED",
        entityType: "BusinessCardDesign",
        entityId: duplicated.id,
        summary: `Duplicated design "${source.name}" -> "${duplicated.name}"`,
      });

      return NextResponse.json(
        {
          design: {
            ...duplicated,
            frontBg: JSON.parse(duplicated.frontBgJson),
            backBg: JSON.parse(duplicated.backBgJson),
            frontElements: JSON.parse(duplicated.frontElementsJson),
            backElements: JSON.parse(duplicated.backElementsJson),
          },
        },
        { status: 201 }
      );
    }

    const parsed = saveDesignSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Invalid design payload" },
        { status: 400 }
      );
    }

    const d = parsed.data;
    const validationReport = validateCardForPrint({
      designName: d.name,
      widthMm: d.widthMm,
      heightMm: d.heightMm,
      bleedMm: d.bleedMm,
      safeMarginMm: d.safeMarginMm,
      isDoubleSided: d.isDoubleSided,
      paperFinish: d.paperFinish,
      cornerStyle: d.cornerStyle,
      frontBg: d.frontBg,
      backBg: d.backBg,
      frontElements: d.frontElements,
      backElements: d.backElements,
      qrDestinationUrl: `${
        process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
      }/hezlon`,
    });

    const created = await prisma.businessCardDesign.create({
      data: {
        name: d.name,
        templateId: d.templateId || null,
        widthMm: d.widthMm,
        heightMm: d.heightMm,
        bleedMm: d.bleedMm,
        safeMarginMm: d.safeMarginMm,
        isDoubleSided: d.isDoubleSided,
        paperFinish: d.paperFinish,
        cornerStyle: d.cornerStyle,
        frontBgJson: JSON.stringify(d.frontBg),
        backBgJson: JSON.stringify(d.backBg),
        frontElementsJson: JSON.stringify(d.frontElements),
        backElementsJson: JSON.stringify(d.backElements),
        status: d.status,
        notes: d.notes,
        isFavorite: d.isFavorite,
        lastValidationJson: JSON.stringify(validationReport),
      },
    });

    await logAuditEvent({
      action: "DESIGN_CREATED",
      entityType: "BusinessCardDesign",
      entityId: created.id,
      summary: `Created business card design: ${created.name}`,
    });

    return NextResponse.json(
      {
        design: {
          ...created,
          frontBg: d.frontBg,
          backBg: d.backBg,
          frontElements: d.frontElements,
          backElements: d.backElements,
          lastValidation: validationReport,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Create design error:", error);
    return NextResponse.json(
      { error: "Failed to save business card design" },
      { status: 500 }
    );
  }
}

export async function PUT(req: NextRequest) {
  const session = await requireAdminApi(req);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const parsed = saveDesignSchema.safeParse(body);
    if (!parsed.success || !parsed.data.id) {
      return NextResponse.json(
        { error: "Valid design ID and payload required" },
        { status: 400 }
      );
    }

    const d = parsed.data;
    const validationReport = validateCardForPrint({
      designName: d.name,
      widthMm: d.widthMm,
      heightMm: d.heightMm,
      bleedMm: d.bleedMm,
      safeMarginMm: d.safeMarginMm,
      isDoubleSided: d.isDoubleSided,
      paperFinish: d.paperFinish,
      cornerStyle: d.cornerStyle,
      frontBg: d.frontBg,
      backBg: d.backBg,
      frontElements: d.frontElements,
      backElements: d.backElements,
      qrDestinationUrl: `${
        process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
      }/hezlon`,
    });

    const updated = await prisma.businessCardDesign.update({
      where: { id: d.id },
      data: {
        name: d.name,
        widthMm: d.widthMm,
        heightMm: d.heightMm,
        bleedMm: d.bleedMm,
        safeMarginMm: d.safeMarginMm,
        isDoubleSided: d.isDoubleSided,
        paperFinish: d.paperFinish,
        cornerStyle: d.cornerStyle,
        frontBgJson: JSON.stringify(d.frontBg),
        backBgJson: JSON.stringify(d.backBg),
        frontElementsJson: JSON.stringify(d.frontElements),
        backElementsJson: JSON.stringify(d.backElements),
        status: d.status,
        notes: d.notes,
        isFavorite: d.isFavorite,
        lastValidationJson: JSON.stringify(validationReport),
      },
    });

    if (!body.isAutosave) {
      await logAuditEvent({
        action: "DESIGN_UPDATED",
        entityType: "BusinessCardDesign",
        entityId: updated.id,
        summary: `Saved changes to business card design: ${updated.name}`,
      });
    }

    return NextResponse.json({
      design: {
        ...updated,
        frontBg: d.frontBg,
        backBg: d.backBg,
        frontElements: d.frontElements,
        backElements: d.backElements,
        lastValidation: validationReport,
      },
    });
  } catch (error) {
    console.error("Update design error:", error);
    return NextResponse.json(
      { error: "Failed to update business card design" },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  const session = await requireAdminApi(req);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json(
        { error: "Design ID is required" },
        { status: 400 }
      );
    }

    const deleted = await prisma.businessCardDesign.delete({
      where: { id },
    });

    await logAuditEvent({
      action: "DESIGN_DELETED",
      entityType: "BusinessCardDesign",
      entityId: id,
      summary: `Deleted business card design: ${deleted.name}`,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete design error:", error);
    return NextResponse.json(
      { error: "Failed to delete design" },
      { status: 500 }
    );
  }
}

