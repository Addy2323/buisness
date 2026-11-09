import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminApi } from "@/lib/auth";
import { resolveQrDestinationUrl } from "@/lib/qr-destination";

/**
 * Lightweight endpoint used by the on-screen card renderers to get the exact
 * URL the permanent QR must encode (same value the PDF export uses).
 */
export async function GET(req: NextRequest) {
  const session = await requireAdminApi(req);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const qrConfig = await prisma.qRCode.findUnique({
    where: { id: "hezlon-permanent-qr" },
  });

  const destinationUrl = resolveQrDestinationUrl(
    req.headers,
    qrConfig?.customBaseDomain,
    qrConfig?.slug
  );

  return NextResponse.json({ destinationUrl });
}

