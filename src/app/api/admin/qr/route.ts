import { NextRequest, NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { logAuditEvent, requireAdminApi } from "@/lib/auth";
import {
  checkColorContrast,
  decodeQrFromPngBuffer,
  generatePermanentQrBuffer,
  generatePermanentQrDataUrl,
  generatePermanentQrSvg,
} from "@/lib/qr-engine";

const qrUpdateSchema = z.object({
  slug: z.string().min(2).max(40).optional(),
  customBaseDomain: z.string().optional(),
  foregroundColor: z.string().min(4).max(9).optional(),
  backgroundColor: z.string().min(4).max(9).optional(),
  accentFrameColor: z.string().min(4).max(9).optional(),
  errorCorrectionLevel: z.enum(["L", "M", "Q", "H"]).optional(),
  marginModules: z.number().int().min(1).max(6).optional(),
  sizePx: z.number().int().min(256).max(2048).optional(),
  includeCenterLogo: z.boolean().optional(),
  centerLogoText: z.string().max(3).optional(),
  stylePreset: z.string().optional(),
});

function buildPermanentDestinationUrl(
  req: NextRequest,
  customBaseDomain: string,
  slug: string
): string {
  const cleanSlug = (slug || "hezlon").replace(/^\/+/, "");
  if (customBaseDomain && customBaseDomain.trim().length > 0) {
    const base = customBaseDomain.trim().replace(/\/+$/, "");
    const withProtocol = base.startsWith("http") ? base : `https://${base}`;
    return `${withProtocol}/${cleanSlug}`;
  }
  const envBase = process.env.NEXT_PUBLIC_APP_URL;
  if (envBase && !envBase.includes("localhost")) {
    return `${envBase.replace(/\/+$/, "")}/${cleanSlug}`;
  }
  const host = req.headers.get("host") || "localhost:3000";
  const proto = host.includes("localhost") ? "http" : "https";
  return `${proto}://${host}/${cleanSlug}`;
}

async function persistPublicQrAssets(svg: string, pngBuffer: Buffer) {
  try {
    const qrDir = path.join(process.cwd(), "public", "qr");
    await fs.mkdir(qrDir, { recursive: true });
    await fs.writeFile(path.join(qrDir, "hezlon-permanent-qr.svg"), svg, "utf-8");
    await fs.writeFile(path.join(qrDir, "hezlon-permanent-qr.png"), pngBuffer);
  } catch {
    // non-fatal if filesystem is read-only
  }
}

export async function GET(req: NextRequest) {
  const session = await requireAdminApi(req);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let qrConfig = await prisma.qRCode.findUnique({
    where: { id: "hezlon-permanent-qr" },
  });

  if (!qrConfig) {
    qrConfig = await prisma.qRCode.create({
      data: {
        id: "hezlon-permanent-qr",
        slug: "hezlon",
        marginModules: 4,
        includeCenterLogo: false,
      },
    });
  }

  const destinationUrl = buildPermanentDestinationUrl(
    req,
    qrConfig.customBaseDomain,
    qrConfig.slug
  );

  const svg = await generatePermanentQrSvg({
    url: destinationUrl,
    foregroundColor: qrConfig.foregroundColor,
    backgroundColor: qrConfig.backgroundColor,
    accentFrameColor: qrConfig.accentFrameColor,
    errorCorrectionLevel: qrConfig.errorCorrectionLevel as "L" | "M" | "Q" | "H",
    marginModules: qrConfig.marginModules,
    sizePx: qrConfig.sizePx,
    includeCenterLogo: qrConfig.includeCenterLogo,
    centerLogoText: qrConfig.centerLogoText,
  });

  const pngBuffer = await generatePermanentQrBuffer({
    url: destinationUrl,
    foregroundColor: qrConfig.foregroundColor,
    backgroundColor: qrConfig.backgroundColor,
    errorCorrectionLevel: qrConfig.errorCorrectionLevel as "L" | "M" | "Q" | "H",
    marginModules: qrConfig.marginModules,
    sizePx: qrConfig.sizePx,
  });

  const pngDataUrl = await generatePermanentQrDataUrl({
    url: destinationUrl,
    foregroundColor: qrConfig.foregroundColor,
    backgroundColor: qrConfig.backgroundColor,
    errorCorrectionLevel: qrConfig.errorCorrectionLevel as "L" | "M" | "Q" | "H",
    marginModules: qrConfig.marginModules,
    sizePx: qrConfig.sizePx,
  });

  await persistPublicQrAssets(svg, pngBuffer);

  const decodedUrl = await decodeQrFromPngBuffer(pngBuffer);
  const verifiedDecode = decodedUrl === destinationUrl;

  const contrastRatio = checkColorContrast(
    qrConfig.foregroundColor,
    qrConfig.backgroundColor
  );

  return NextResponse.json({
    qrConfig,
    destinationUrl,
    svg,
    pngDataUrl,
    scanHealth: {
      isScannable: contrastRatio >= 3.5 && verifiedDecode,
      verifiedDecode,
      decodedUrl,
      contrastRatio,
      errorCorrectionLevel: qrConfig.errorCorrectionLevel,
      recommendation:
        contrastRatio >= 4.5 && verifiedDecode
          ? `Optically decoded & verified (${decodedUrl}) — ${contrastRatio}:1 contrast with Level ${qrConfig.errorCorrectionLevel} error correction for all 100+ printed cards.`
          : contrastRatio >= 3.5
          ? "Acceptable contrast, though darker foreground is recommended for glossy finishes."
          : "Warning: Low color contrast may prevent smartphone cameras from scanning.",
    },
  });
}

export async function PUT(req: NextRequest) {
  const session = await requireAdminApi(req);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const parsed = qrUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Invalid QR settings" },
        { status: 400 }
      );
    }

    const updated = await prisma.qRCode.upsert({
      where: { id: "hezlon-permanent-qr" },
      update: {
        ...parsed.data,
        lastTestedAt: new Date(),
      },
      create: {
        id: "hezlon-permanent-qr",
        slug: parsed.data.slug || "hezlon",
        ...parsed.data,
      },
    });

    if (parsed.data.slug) {
      await prisma.digitalProfile.updateMany({
        data: { slug: parsed.data.slug },
      });
    }

    const destinationUrl = buildPermanentDestinationUrl(
      req,
      updated.customBaseDomain,
      updated.slug
    );

    const svg = await generatePermanentQrSvg({
      url: destinationUrl,
      foregroundColor: updated.foregroundColor,
      backgroundColor: updated.backgroundColor,
      accentFrameColor: updated.accentFrameColor,
      errorCorrectionLevel: updated.errorCorrectionLevel as "L" | "M" | "Q" | "H",
      marginModules: updated.marginModules,
      sizePx: updated.sizePx,
      includeCenterLogo: updated.includeCenterLogo,
      centerLogoText: updated.centerLogoText,
    });

    const pngBuffer = await generatePermanentQrBuffer({
      url: destinationUrl,
      foregroundColor: updated.foregroundColor,
      backgroundColor: updated.backgroundColor,
      errorCorrectionLevel: updated.errorCorrectionLevel as "L" | "M" | "Q" | "H",
      marginModules: updated.marginModules,
      sizePx: updated.sizePx,
    });

    const pngDataUrl = await generatePermanentQrDataUrl({
      url: destinationUrl,
      foregroundColor: updated.foregroundColor,
      backgroundColor: updated.backgroundColor,
      errorCorrectionLevel: updated.errorCorrectionLevel as "L" | "M" | "Q" | "H",
      marginModules: updated.marginModules,
      sizePx: updated.sizePx,
    });

    await persistPublicQrAssets(svg, pngBuffer);

    const decodedUrl = await decodeQrFromPngBuffer(pngBuffer);
    const verifiedDecode = decodedUrl === destinationUrl;

    const contrastRatio = checkColorContrast(
      updated.foregroundColor,
      updated.backgroundColor
    );

    await logAuditEvent({
      action: "QR_CONFIG_UPDATED",
      entityType: "QRCode",
      entityId: updated.id,
      summary: `Updated permanent QR code configuration (${destinationUrl})`,
    });

    return NextResponse.json({
      qrConfig: updated,
      destinationUrl,
      svg,
      pngDataUrl,
      scanHealth: {
        isScannable: contrastRatio >= 3.5 && verifiedDecode,
        verifiedDecode,
        decodedUrl,
        contrastRatio,
        errorCorrectionLevel: updated.errorCorrectionLevel,
        recommendation:
          contrastRatio >= 4.5 && verifiedDecode
            ? `Optically decoded & verified (${decodedUrl}) — ${contrastRatio}:1 contrast with Level ${updated.errorCorrectionLevel} error correction for all 100+ printed cards.`
            : "Contrast or decode check warning.",
      },
    });
  } catch (error) {
    console.error("Update QR error:", error);
    return NextResponse.json(
      { error: "Failed to update QR configuration" },
      { status: 500 }
    );
  }
}
