import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminApi } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const session = await requireAdminApi(req);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [
    totalDesigns,
    recentDesigns,
    digitalProfile,
    companyProfile,
    totalQrScans,
    totalPrintOrders,
    pendingPrintOrders,
    recentOrders,
    servicesCount,
    templatesCount,
    recentAuditLogs,
  ] = await Promise.all([
    prisma.businessCardDesign.count(),
    prisma.businessCardDesign.findMany({
      orderBy: { updatedAt: "desc" },
      take: 6,
    }),
    prisma.digitalProfile.findUnique({
      where: { id: "hezlon-digital-profile" },
    }),
    prisma.companyProfile.findUnique({
      where: { id: "hezlon-singleton" },
    }),
    prisma.qRScan.count(),
    prisma.printOrder.count(),
    prisma.printOrder.count({
      where: {
        status: {
          in: [
            "DRAFT",
            "PENDING_APPROVAL",
            "APPROVED",
            "SENT_TO_PRINTER",
            "IN_PRINTING",
            "READY_FOR_COLLECTION",
            "DISPATCHED",
          ],
        },
      },
    }),
    prisma.printOrder.findMany({
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
    prisma.companyService.count({ where: { isPublished: true } }),
    prisma.cardTemplate.count(),
    prisma.auditLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 8,
    }),
  ]);

  return NextResponse.json({
    metrics: {
      totalDesigns,
      isProfilePublished: digitalProfile?.isPublished ?? true,
      profileSlug: digitalProfile?.slug ?? "hezlon",
      totalQrScans,
      totalPrintOrders,
      pendingPrintOrders,
      servicesCount,
      templatesCount,
    },
    companyProfile,
    digitalProfile,
    recentDesigns: recentDesigns.map((d) => ({
      ...d,
      frontBg: JSON.parse(d.frontBgJson || "{}"),
      backBg: JSON.parse(d.backBgJson || "{}"),
      frontElements: JSON.parse(d.frontElementsJson || "[]"),
      backElements: JSON.parse(d.backElementsJson || "[]"),
    })),
    recentOrders,
    recentAuditLogs,
  });
}

