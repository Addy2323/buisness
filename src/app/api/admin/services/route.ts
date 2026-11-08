import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { logAuditEvent, requireAdminApi } from "@/lib/auth";

const createServiceSchema = z.object({
  title: z.string().min(1, "Service title is required"),
  titleSw: z.string().optional().default(""),
  description: z.string().min(1, "Service description is required"),
  descriptionSw: z.string().optional().default(""),
  category: z.string().optional().default("Architectural Glazing & Aluminium"),
  imageUrl: z.string().optional().default(""),
  iconName: z.string().optional().default("Building2"),
  isPublished: z.boolean().optional().default(true),
});

const updateServiceSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1).optional(),
  titleSw: z.string().optional(),
  description: z.string().optional(),
  descriptionSw: z.string().optional(),
  category: z.string().optional(),
  imageUrl: z.string().optional(),
  iconName: z.string().optional(),
  displayOrder: z.number().int().optional(),
  isPublished: z.boolean().optional(),
});

export async function GET(req: NextRequest) {
  const session = await requireAdminApi(req);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const services = await prisma.companyService.findMany({
    orderBy: [{ displayOrder: "asc" }, { createdAt: "asc" }],
  });

  return NextResponse.json({ services });
}

export async function POST(req: NextRequest) {
  const session = await requireAdminApi(req);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();

    // Check if this is a bulk reorder operation
    if (Array.isArray(body.orderedIds)) {
      const orderedIds: string[] = body.orderedIds;
      await Promise.all(
        orderedIds.map((id, idx) =>
          prisma.companyService.update({
            where: { id },
            data: { displayOrder: idx + 1 },
          })
        )
      );
      const services = await prisma.companyService.findMany({
        orderBy: [{ displayOrder: "asc" }],
      });
      return NextResponse.json({ services });
    }

    const parsed = createServiceSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Invalid service input" },
        { status: 400 }
      );
    }

    const count = await prisma.companyService.count();
    const service = await prisma.companyService.create({
      data: {
        ...parsed.data,
        displayOrder: count + 1,
      },
    });

    await logAuditEvent({
      action: "SERVICE_CREATED",
      entityType: "CompanyService",
      entityId: service.id,
      summary: `Created company service: ${service.title}`,
    });

    return NextResponse.json({ service }, { status: 201 });
  } catch (error) {
    console.error("Create service error:", error);
    return NextResponse.json(
      { error: "Failed to create service" },
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
    const parsed = updateServiceSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Invalid update payload" },
        { status: 400 }
      );
    }

    const { id, ...updateData } = parsed.data;
    const service = await prisma.companyService.update({
      where: { id },
      data: updateData,
    });

    await logAuditEvent({
      action: "SERVICE_UPDATED",
      entityType: "CompanyService",
      entityId: service.id,
      summary: `Updated company service: ${service.title}`,
    });

    return NextResponse.json({ service });
  } catch (error) {
    console.error("Update service error:", error);
    return NextResponse.json(
      { error: "Failed to update service" },
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
        { error: "Service ID is required" },
        { status: 400 }
      );
    }

    const deleted = await prisma.companyService.delete({
      where: { id },
    });

    await logAuditEvent({
      action: "SERVICE_DELETED",
      entityType: "CompanyService",
      entityId: id,
      summary: `Deleted company service: ${deleted.title}`,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete service error:", error);
    return NextResponse.json(
      { error: "Failed to delete service" },
      { status: 500 }
    );
  }
}

