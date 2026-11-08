import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { logAuditEvent, requireAdminApi } from "@/lib/auth";

const pricingSchema = z.object({
  currency: z.string().default("USD"),
  currencySymbol: z.string().default("$"),
  baseUnitCostMatte: z.number().min(0),
  baseUnitCostGloss: z.number().min(0),
  baseUnitCostSoftTouch: z.number().min(0),
  baseUnitCostTextured: z.number().min(0),
  roundedCornerSurcharge: z.number().min(0),
  doubleSidedMultiplier: z.number().min(1),
  setupFee: z.number().min(0),
  bulkDiscount100: z.number().min(0).max(0.9),
  bulkDiscount500: z.number().min(0).max(0.9),
  bulkDiscount1000: z.number().min(0).max(0.9),
});

const providerSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, "Studio name is required"),
  contactPerson: z.string().optional().default(""),
  phone: z.string().optional().default(""),
  email: z.string().optional().default(""),
  address: z.string().optional().default(""),
  website: z.string().optional().default(""),
  notes: z.string().optional().default(""),
  isDefault: z.boolean().optional().default(false),
});

export async function GET(req: NextRequest) {
  const session = await requireAdminApi(req);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const pricing = await prisma.printPricingConfig.findUnique({
    where: { id: "hezlon-pricing-singleton" },
  });
  const providers = await prisma.printProvider.findMany({
    orderBy: [{ isDefault: "desc" }, { name: "asc" }],
  });
  const company = await prisma.companyProfile.findUnique({
    where: { id: "hezlon-singleton" },
    select: {
      defaultWidthMm: true,
      defaultHeightMm: true,
      defaultBleedMm: true,
      defaultSafeMarginMm: true,
    },
  });

  return NextResponse.json({ pricing, providers, defaults: company });
}

export async function PUT(req: NextRequest) {
  const session = await requireAdminApi(req);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();

    if (body.pricing) {
      const parsed = pricingSchema.safeParse(body.pricing);
      if (!parsed.success) {
        return NextResponse.json(
          { error: parsed.error.issues[0]?.message || "Invalid pricing config" },
          { status: 400 }
        );
      }

      const updatedPricing = await prisma.printPricingConfig.upsert({
        where: { id: "hezlon-pricing-singleton" },
        update: parsed.data,
        create: {
          id: "hezlon-pricing-singleton",
          ...parsed.data,
        },
      });

      if (body.defaults) {
        await prisma.companyProfile.update({
          where: { id: "hezlon-singleton" },
          data: {
            defaultWidthMm: Number(body.defaults.defaultWidthMm) || 90,
            defaultHeightMm: Number(body.defaults.defaultHeightMm) || 50,
            defaultBleedMm:
              body.defaults.defaultBleedMm !== undefined
                ? Number(body.defaults.defaultBleedMm)
                : 3,
            defaultSafeMarginMm:
              body.defaults.defaultSafeMarginMm !== undefined
                ? Number(body.defaults.defaultSafeMarginMm)
                : 5,
          },
        });
      }

      await logAuditEvent({
        action: "PRINT_PRICING_UPDATED",
        entityType: "PrintPricingConfig",
        entityId: "hezlon-pricing-singleton",
        summary: `Updated print pricing matrix and default dimensions`,
      });

      return NextResponse.json({ pricing: updatedPricing });
    }

    if (body.provider) {
      const parsed = providerSchema.safeParse(body.provider);
      if (!parsed.success) {
        return NextResponse.json(
          { error: parsed.error.issues[0]?.message || "Invalid provider data" },
          { status: 400 }
        );
      }
      const p = parsed.data;
      if (p.isDefault) {
        await prisma.printProvider.updateMany({
          data: { isDefault: false },
        });
      }

      const provider = p.id
        ? await prisma.printProvider.update({
            where: { id: p.id },
            data: {
              name: p.name,
              contactPerson: p.contactPerson,
              phone: p.phone,
              email: p.email,
              address: p.address,
              website: p.website,
              notes: p.notes,
              isDefault: p.isDefault,
            },
          })
        : await prisma.printProvider.create({
            data: {
              name: p.name,
              contactPerson: p.contactPerson,
              phone: p.phone,
              email: p.email,
              address: p.address,
              website: p.website,
              notes: p.notes,
              isDefault: p.isDefault,
            },
          });

      await logAuditEvent({
        action: "PRINT_PROVIDER_SAVED",
        entityType: "PrintProvider",
        entityId: provider.id,
        summary: `Saved external print studio: ${provider.name}`,
      });

      const providers = await prisma.printProvider.findMany({
        orderBy: [{ isDefault: "desc" }, { name: "asc" }],
      });

      return NextResponse.json({ provider, providers });
    }

    return NextResponse.json({ error: "No valid action" }, { status: 400 });
  } catch (error) {
    console.error("Print settings update error:", error);
    return NextResponse.json(
      { error: "Failed to save print settings" },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  const session = await requireAdminApi(req);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("providerId");
  if (!id) {
    return NextResponse.json({ error: "Provider ID required" }, { status: 400 });
  }

  await prisma.printProvider.delete({ where: { id } });
  const providers = await prisma.printProvider.findMany({
    orderBy: [{ isDefault: "desc" }, { name: "asc" }],
  });
  return NextResponse.json({ providers });
}

