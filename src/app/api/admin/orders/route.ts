import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { logAuditEvent, requireAdminApi } from "@/lib/auth";

const VALID_STATUSES = [
  "DRAFT",
  "PENDING_APPROVAL",
  "APPROVED",
  "SENT_TO_PRINTER",
  "IN_PRINTING",
  "READY_FOR_COLLECTION",
  "DISPATCHED",
  "DELIVERED",
  "CANCELLED",
] as const;

const createOrderSchema = z.object({
  designId: z.string().min(1, "Please select a business card design"),
  widthMm: z.number().min(40).max(150).default(90),
  heightMm: z.number().min(30).max(120).default(50),
  bleedMm: z.number().min(0).max(10).default(3),
  safeMarginMm: z.number().min(2).max(15).default(5),
  quantity: z.number().int().min(10, "Minimum quantity is 10 cards").max(50000),
  paperFinish: z.enum(["MATTE", "GLOSS", "SOFT_TOUCH", "TEXTURED"]),
  paperWeightGsm: z.number().int().default(400),
  cornerStyle: z.enum(["SQUARE", "ROUNDED"]),
  isDoubleSided: z.boolean().default(true),
  printProviderId: z.string().optional().nullable(),
  deliveryMethod: z.enum(["COLLECTION", "DELIVERY"]).default("COLLECTION"),
  deliveryNotes: z.string().optional().default(""),
  productionNotes: z.string().optional().default(""),
  status: z.enum(VALID_STATUSES).optional().default("APPROVED"),
});

export async function GET(req: NextRequest) {
  const session = await requireAdminApi(req);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const orders = await prisma.printOrder.findMany({
    include: {
      design: {
        select: {
          id: true,
          name: true,
          status: true,
        },
      },
      printProvider: true,
      items: true,
    },
    orderBy: { createdAt: "desc" },
  });

  const pricing = await prisma.printPricingConfig.findUnique({
    where: { id: "hezlon-pricing-singleton" },
  });

  const providers = await prisma.printProvider.findMany({
    orderBy: [{ isDefault: "desc" }, { name: "asc" }],
  });

  return NextResponse.json({ orders, pricing, providers });
}

export async function POST(req: NextRequest) {
  const session = await requireAdminApi(req);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const parsed = createOrderSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Invalid order data" },
        { status: 400 }
      );
    }

    const d = parsed.data;
    const design = await prisma.businessCardDesign.findUnique({
      where: { id: d.designId },
    });

    if (!design) {
      return NextResponse.json(
        { error: "Selected business card design was not found" },
        { status: 404 }
      );
    }

    const pricing = await prisma.printPricingConfig.findUnique({
      where: { id: "hezlon-pricing-singleton" },
    });

    const baseRate =
      d.paperFinish === "TEXTURED"
        ? pricing?.baseUnitCostTextured ?? 0.55
        : d.paperFinish === "SOFT_TOUCH"
        ? pricing?.baseUnitCostSoftTouch ?? 0.48
        : d.paperFinish === "GLOSS"
        ? pricing?.baseUnitCostGloss ?? 0.38
        : pricing?.baseUnitCostMatte ?? 0.35;

    const cornerExtra =
      d.cornerStyle === "ROUNDED" ? pricing?.roundedCornerSurcharge ?? 0.05 : 0;
    const sidedMult = d.isDoubleSided
      ? pricing?.doubleSidedMultiplier ?? 1.25
      : 1.0;

    const discount =
      d.quantity >= 1000
        ? pricing?.bulkDiscount1000 ?? 0.25
        : d.quantity >= 500
        ? pricing?.bulkDiscount500 ?? 0.15
        : d.quantity >= 100
        ? pricing?.bulkDiscount100 ?? 0.05
        : 0;

    const rawUnit = (baseRate + cornerExtra) * sidedMult * (1 - discount);
    const unitPrice = Number(rawUnit.toFixed(3));
    const setupFee = Number((pricing?.setupFee ?? 15.0).toFixed(2));
    const totalCost = Number((unitPrice * d.quantity + setupFee).toFixed(2));

    let providerNameSnapshot = "External Commercial Print Studio";
    if (d.printProviderId) {
      const prov = await prisma.printProvider.findUnique({
        where: { id: d.printProviderId },
      });
      if (prov) providerNameSnapshot = prov.name;
    }

    const orderRef = `HZL-PRT-${new Date().getFullYear()}-${String(
      Math.floor(1000 + Math.random() * 9000)
    )}`;

    const snapshotJson = JSON.stringify({
      frontBg: JSON.parse(design.frontBgJson || "{}"),
      backBg: JSON.parse(design.backBgJson || "{}"),
      frontElements: JSON.parse(design.frontElementsJson || "[]"),
      backElements: JSON.parse(design.backElementsJson || "[]"),
    });

    const order = await prisma.printOrder.create({
      data: {
        orderReference: orderRef,
        designId: design.id,
        designNameSnapshot: design.name,
        designSnapshotJson: snapshotJson,
        widthMm: d.widthMm,
        heightMm: d.heightMm,
        bleedMm: d.bleedMm,
        safeMarginMm: d.safeMarginMm,
        quantity: d.quantity,
        paperFinish: d.paperFinish,
        paperWeightGsm: d.paperWeightGsm,
        cornerStyle: d.cornerStyle,
        isDoubleSided: d.isDoubleSided,
        unitPrice,
        setupFee,
        totalCost,
        currency: pricing?.currency || "USD",
        printProviderId: d.printProviderId || null,
        providerNameSnapshot,
        status: d.status,
        deliveryMethod: d.deliveryMethod,
        deliveryNotes: d.deliveryNotes,
        productionNotes: d.productionNotes,
        approvedAt: d.status === "APPROVED" ? new Date() : null,
        items: {
          create: [
            {
              description: `${design.name} (${d.widthMm}×${d.heightMm}mm, ${d.paperWeightGsm}gsm ${d.paperFinish}, ${d.cornerStyle} corners)`,
              quantity: d.quantity,
              unitPrice,
              totalPrice: Number((unitPrice * d.quantity).toFixed(2)),
            },
          ],
        },
      },
      include: {
        items: true,
        printProvider: true,
      },
    });

    await logAuditEvent({
      action: "PRINT_ORDER_CREATED",
      entityType: "PrintOrder",
      entityId: order.id,
      summary: `Created print order ${order.orderReference} for ${d.quantity} copies of "${design.name}" ($${totalCost})`,
    });

    return NextResponse.json({ order }, { status: 201 });
  } catch (error) {
    console.error("Create print order error:", error);
    return NextResponse.json(
      { error: "Failed to create print order" },
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
    const { id, status, deliveryNotes, productionNotes, printProviderId } = body;

    if (!id) {
      return NextResponse.json(
        { error: "Order ID is required" },
        { status: 400 }
      );
    }

    const updateData: Record<string, unknown> = {};
    if (status && VALID_STATUSES.includes(status)) {
      updateData.status = status;
      if (status === "APPROVED") updateData.approvedAt = new Date();
      if (status === "SENT_TO_PRINTER") updateData.sentToPrinterAt = new Date();
      if (status === "DELIVERED") updateData.completedAt = new Date();
    }
    if (deliveryNotes !== undefined) updateData.deliveryNotes = deliveryNotes;
    if (productionNotes !== undefined)
      updateData.productionNotes = productionNotes;
    if (printProviderId !== undefined) {
      updateData.printProviderId = printProviderId || null;
      if (printProviderId) {
        const p = await prisma.printProvider.findUnique({
          where: { id: String(printProviderId) },
        });
        if (p) updateData.providerNameSnapshot = p.name;
      }
    }

    const updated = await prisma.printOrder.update({
      where: { id: String(id) },
      data: updateData,
      include: {
        items: true,
        printProvider: true,
      },
    });

    await logAuditEvent({
      action: "PRINT_ORDER_STATUS_UPDATED",
      entityType: "PrintOrder",
      entityId: updated.id,
      summary: `Updated print order ${updated.orderReference} status to ${updated.status}`,
    });

    return NextResponse.json({ order: updated });
  } catch (error) {
    console.error("Update print order error:", error);
    return NextResponse.json(
      { error: "Failed to update print order" },
      { status: 500 }
    );
  }
}

