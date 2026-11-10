import { NextRequest, NextResponse } from "next/server";
import sharp from "sharp";
import { prisma } from "@/lib/prisma";
import { logAuditEvent, requireAdminApi } from "@/lib/auth";
import { resolveQrDestinationUrl } from "@/lib/qr-destination";
import { HEZLON_TEMPLATES } from "@/lib/templates-catalog";
import {
  CardPrintSpec,
  DuplexFlipMode,
  calculateA4SheetLayout,
  generatePreviewPdf,
  generatePrintReadyPdf,
  renderCardSideSvg,
  validateCardForPrint,
} from "@/lib/print-engine";

export async function GET(req: NextRequest) {
  const session = await requireAdminApi(req);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const designId = searchParams.get("designId");
    const orderId = searchParams.get("orderId");
    const format = (searchParams.get("format") || "PDF_PRINT_READY") as
      | "PDF_PREVIEW"
      | "PDF_PREVIEW_FRONT"
      | "PDF_PREVIEW_BACK"
      | "PDF_PRINT_READY"
      | "PDF_COMPLETE"
      | "PDF_FRONT"
      | "PDF_BACK"
      | "PNG_FRONT"
      | "PNG_BACK"
      | "SVG_FRONT"
      | "SVG_BACK";

    const flipMode: DuplexFlipMode =
      searchParams.get("flipMode") === "SHORT_EDGE" ? "SHORT_EDGE" : "LONG_EDGE";
    const dispositionType: "inline" | "attachment" =
      searchParams.get("disposition") === "inline" ? "inline" : "attachment";

    const qrConfig = await prisma.qRCode.findUnique({
      where: { id: "hezlon-permanent-qr" },
    });

    const qrDestinationUrl = resolveQrDestinationUrl(
      req.headers,
      qrConfig?.customBaseDomain,
      qrConfig?.slug
    );

    let spec: CardPrintSpec;

    if (orderId) {
      const order = await prisma.printOrder.findUnique({
        where: { id: orderId },
        include: { design: true },
      });
      if (!order) {
        return NextResponse.json({ error: "Print order not found" }, { status: 404 });
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
        frontBg: snapshot.frontBg || (d ? JSON.parse(d.frontBgJson) : { type: "solid", primaryColor: "#0D2B22" }),
        backBg: snapshot.backBg || (d ? JSON.parse(d.backBgJson) : { type: "solid", primaryColor: "#F8F5EE" }),
        frontElements: snapshot.frontElements || (d ? JSON.parse(d.frontElementsJson) : []),
        backElements: snapshot.backElements || (d ? JSON.parse(d.backElementsJson) : []),
        qrDestinationUrl,
      };
    } else {
      let d = designId
        ? await prisma.businessCardDesign.findUnique({ where: { id: designId } })
        : await prisma.businessCardDesign.findFirst();

      if (d) {
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
        const tpl = HEZLON_TEMPLATES[0];
        spec = {
          designName: tpl.name,
          widthMm: 90,
          heightMm: 50,
          bleedMm: 3,
          safeMarginMm: 5,
          isDoubleSided: true,
          paperFinish: tpl.paperFinish,
          cornerStyle: tpl.cornerStyle,
          frontBg: tpl.frontBg,
          backBg: tpl.backBg,
          frontElements: tpl.frontElements,
          backElements: tpl.backElements,
          qrDestinationUrl,
        };
      }
    }

    const cleanFileName = spec.designName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");

    const isPreviewFormat =
      format === "PDF_PREVIEW" ||
      format === "PDF_PREVIEW_FRONT" ||
      format === "PDF_PREVIEW_BACK";

    if (isPreviewFormat) {
      const previewMode =
        format === "PDF_PREVIEW_FRONT"
          ? "FRONT"
          : format === "PDF_PREVIEW_BACK"
          ? "BACK"
          : "COMPLETE";

      const pdfBytes = await generatePreviewPdf(spec, previewMode);
      return new NextResponse(Buffer.from(pdfBytes), {
        status: 200,
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `${dispositionType}; filename="${cleanFileName}-preview-${previewMode.toLowerCase()}.pdf"`,
          "Content-Length": String(pdfBytes.byteLength),
          "Cache-Control": "no-store, no-cache, must-revalidate",
        },
      });
    }

    const printMode =
      format === "PDF_FRONT"
        ? "FRONT"
        : format === "PDF_BACK"
        ? "BACK"
        : "COMPLETE";

    const pdfBytes = await generatePrintReadyPdf(spec, printMode, { flipMode });
    return new NextResponse(Buffer.from(pdfBytes), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `${dispositionType}; filename="${cleanFileName}-print-ready-a4-${printMode.toLowerCase()}.pdf"`,
        "Content-Length": String(pdfBytes.byteLength),
        "Cache-Control": "no-store, no-cache, must-revalidate",
      },
    });
  } catch (error) {
    console.error("GET Print export error:", error);
    return NextResponse.json(
      { error: "Failed to generate print document" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  const session = await requireAdminApi(req);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const format:
      | "VALIDATE_ONLY"
      | "PDF_PREVIEW"
      | "PDF_PREVIEW_FRONT"
      | "PDF_PREVIEW_BACK"
      | "PDF_PRINT_READY"
      | "PDF_COMPLETE"
      | "PDF_FRONT"
      | "PDF_BACK"
      | "PNG_FRONT"
      | "PNG_BACK"
      | "SVG_FRONT"
      | "SVG_BACK" = body.format || "PDF_PREVIEW";

    const flipMode: DuplexFlipMode =
      body.flipMode === "SHORT_EDGE" ? "SHORT_EDGE" : "LONG_EDGE";
    const dispositionType: "inline" | "attachment" =
      body.disposition === "inline" ? "inline" : "attachment";

    const qrConfig = await prisma.qRCode.findUnique({
      where: { id: "hezlon-permanent-qr" },
    });

    const qrDestinationUrl = resolveQrDestinationUrl(
      req.headers,
      qrConfig?.customBaseDomain,
      qrConfig?.slug
    );

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
    const layout = calculateA4SheetLayout(spec, flipMode);

    if (format === "VALIDATE_ONLY") {
      return NextResponse.json({ validation, layout });
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
          "Content-Disposition": `${dispositionType}; filename="${cleanFileName}-${side.toLowerCase()}.svg"`,
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
          "Content-Disposition": `${dispositionType}; filename="${cleanFileName}-${side.toLowerCase()}-600dpi.png"`,
        },
      });
    }

    // PDF EXPORTS: MODE A (Clean 2-page Preview) vs MODE B (A4 8-Up Print-Ready Imposition)
    const isPreviewFormat =
      format === "PDF_PREVIEW" ||
      format === "PDF_PREVIEW_FRONT" ||
      format === "PDF_PREVIEW_BACK";

    if (isPreviewFormat) {
      const previewMode =
        format === "PDF_PREVIEW_FRONT"
          ? "FRONT"
          : format === "PDF_PREVIEW_BACK"
          ? "BACK"
          : "COMPLETE";

      const pdfBytes = await generatePreviewPdf(spec, previewMode);

      await logAuditEvent({
        action: "PREVIEW_PDF_EXPORTED",
        entityType: "BusinessCardDesign",
        entityId: body.designId || body.orderId || "live-export",
        summary: `Exported ${previewMode} Clean Preview PDF for "${spec.designName}" (${spec.widthMm}x${spec.heightMm}mm trim)`,
      });

      return new NextResponse(Buffer.from(pdfBytes), {
        status: 200,
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `${dispositionType}; filename="${cleanFileName}-preview-${previewMode.toLowerCase()}.pdf"`,
          "Content-Length": String(pdfBytes.byteLength),
          "Cache-Control": "no-store, no-cache, must-revalidate",
        },
      });
    }

    // MODE B: Print-Ready Imposition on A4 Sheet
    const printMode =
      format === "PDF_FRONT"
        ? "FRONT"
        : format === "PDF_BACK"
        ? "BACK"
        : "COMPLETE";

    const pdfBytes = await generatePrintReadyPdf(spec, printMode, { flipMode });

    await logAuditEvent({
      action: "PRODUCTION_PDF_EXPORTED",
      entityType: "BusinessCardDesign",
      entityId: body.designId || body.orderId || "live-export",
      summary: `Exported ${printMode} A4 Print-Ready PDF for "${spec.designName}" (${layout.cardsPerSheet} cards/sheet, ${flipMode} duplex)`,
    });

    return new NextResponse(Buffer.from(pdfBytes), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `${dispositionType}; filename="${cleanFileName}-print-ready-a4-${printMode.toLowerCase()}.pdf"`,
        "Content-Length": String(pdfBytes.byteLength),
        "Cache-Control": "no-store, no-cache, must-revalidate",
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

