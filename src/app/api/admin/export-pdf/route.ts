import { NextRequest, NextResponse } from "next/server";
import sharp from "sharp";
import { prisma } from "@/lib/prisma";
import { logAuditEvent, requireAdminApi } from "@/lib/auth";
import {
  CardPrintSpec,
  generatePrintReadyPdf,
  renderCardSideSvg,
  validateCardForPrint,
} from "@/lib/print-engine";

export async function POST(req: NextRequest) {
  const session = await requireAdminApi(req);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const format:
      | "VALIDATE_ONLY"
      | "PDF_COMPLETE"
      | "PDF_FRONT"
      | "PDF_BACK"
      | "PNG_FRONT"
      | "PNG_BACK"
      | "SVG_FRONT"
      | "SVG_BACK" = body.format || "PDF_COMPLETE";

    const qrConfig = await prisma.qRCode.findUnique({
      where: { id: "hezlon-permanent-qr" },
    });

    const host = req.headers.get("host") || "localhost:3000";
    const proto = host.includes("localhost") ? "http" : "https";
    const baseDomain =
      qrConfig?.customBaseDomain?.trim() ||
      process.env.NEXT_PUBLIC_APP_URL ||
      `${proto}://${host}`;
    const qrDestinationUrl = `${baseDomain.replace(/\/+$/, "")}/${
      qrConfig?.slug || "hezlon"
    }`;

    let spec: CardPrintSpec;

    if (body.orderId) {
      const order = await prisma.printOrder.findUnique({
        where: { id: String(body.orderId) },
        include: { design: true },
      });
      if (!order) {
        return NextResponse.json(
          { error: "Print order not found" },
          { status: 404 }
        );
      }
      const snapshot = JSON.parse(order.designSnapshotJson || "{}");
      const d = order.design;
      spec = {
        designName: order.designNameSnapshot,
        widthMm: order.widthMm,
        heightMm: order.heightMm,
        bleedMm: order.bleedMm,
        safeMarginMm: order.safeMarginMm,
        isDoubleSided: order.isDoubleSided,
        paperFinish: order.paperFinish,
        cornerStyle: order.cornerStyle,
        frontBg:
          snapshot.frontBg || (d ? JSON.parse(d.frontBgJson) : { type: "solid", primaryColor: "#0D2B22" }),
        backBg:
          snapshot.backBg || (d ? JSON.parse(d.backBgJson) : { type: "solid", primaryColor: "#F8F5EE" }),
        frontElements:
          snapshot.frontElements || (d ? JSON.parse(d.frontElementsJson) : []),
        backElements:
          snapshot.backElements || (d ? JSON.parse(d.backElementsJson) : []),
        qrDestinationUrl,
      };
    } else if (body.designId && !body.frontElements) {
      const d = await prisma.businessCardDesign.findUnique({
        where: { id: String(body.designId) },
      });
      if (!d) {
        return NextResponse.json(
          { error: "Business card design not found" },
          { status: 404 }
        );
      }
      spec = {
        designName: d.name,
        widthMm: d.widthMm,
        heightMm: d.heightMm,
        bleedMm: d.bleedMm,
        safeMarginMm: d.safeMarginMm,
        isDoubleSided: d.isDoubleSided,
        paperFinish: d.paperFinish,
        cornerStyle: d.cornerStyle,
        frontBg: JSON.parse(d.frontBgJson),
        backBg: JSON.parse(d.backBgJson),
        frontElements: JSON.parse(d.frontElementsJson),
        backElements: JSON.parse(d.backElementsJson),
        qrDestinationUrl,
      };
    } else {
      spec = {
        designName: body.designName || "HEZLON Business Card",
        widthMm: Number(body.widthMm) || 90,
        heightMm: Number(body.heightMm) || 50,
        bleedMm: body.bleedMm !== undefined ? Number(body.bleedMm) : 3,
        safeMarginMm:
          body.safeMarginMm !== undefined ? Number(body.safeMarginMm) : 5,
        isDoubleSided: body.isDoubleSided !== false,
        paperFinish: body.paperFinish || "MATTE",
        cornerStyle: body.cornerStyle || "SQUARE",
        frontBg: body.frontBg || { type: "solid", primaryColor: "#0D2B22" },
        backBg: body.backBg || { type: "solid", primaryColor: "#F8F5EE" },
        frontElements: body.frontElements || [],
        backElements: body.backElements || [],
        qrDestinationUrl,
      };
    }

    const validation = validateCardForPrint(spec);

    if (format === "VALIDATE_ONLY") {
      return NextResponse.json({ validation });
    }

    const cleanFileName = spec.designName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");

    if (format === "SVG_FRONT" || format === "SVG_BACK") {
      const side = format === "SVG_FRONT" ? "FRONT" : "BACK";
      const svg = await renderCardSideSvg(spec, side, Boolean(body.includeBleed));
      return new NextResponse(svg, {
        status: 200,
        headers: {
          "Content-Type": "image/svg+xml",
          "Content-Disposition": `attachment; filename="${cleanFileName}-${side.toLowerCase()}.svg"`,
        },
      });
    }

    if (format === "PNG_FRONT" || format === "PNG_BACK") {
      const side = format === "PNG_FRONT" ? "FRONT" : "BACK";
      const svg = await renderCardSideSvg(spec, side, Boolean(body.includeBleed));
      const pngBuffer = await sharp(Buffer.from(svg))
        .resize({ width: 2126 }) // ~600 DPI for 90mm card
        .png({ compressionLevel: 8 })
        .toBuffer();

      return new NextResponse(new Uint8Array(pngBuffer), {
        status: 200,
        headers: {
          "Content-Type": "image/png",
          "Content-Disposition": `attachment; filename="${cleanFileName}-${side.toLowerCase()}-600dpi.png"`,
        },
      });
    }

    // PDF Exports
    const pdfMode =
      format === "PDF_FRONT"
        ? "FRONT"
        : format === "PDF_BACK"
        ? "BACK"
        : "COMPLETE";

    const pdfBytes = await generatePrintReadyPdf(spec, pdfMode);

    await logAuditEvent({
      action: "PRODUCTION_PDF_EXPORTED",
      entityType: "BusinessCardDesign",
      entityId: body.designId || body.orderId || "live-export",
      summary: `Exported ${pdfMode} Print-Ready PDF for "${spec.designName}" (${spec.widthMm}x${spec.heightMm}mm, ${spec.bleedMm}mm bleed)`,
    });

    return new NextResponse(Buffer.from(pdfBytes), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${cleanFileName}-print-ready-${pdfMode.toLowerCase()}.pdf"`,
      },
    });
  } catch (error) {
    console.error("Print export error:", error);
    return NextResponse.json(
      { error: "Failed to generate print-ready production file" },
      { status: 500 }
    );
  }
}

