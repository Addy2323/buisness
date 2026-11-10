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

function parseJsonWithFallback<T>(raw: any, fallback: T): T {
  if (!raw) return fallback;
  if (typeof raw === "object") return raw as T;
  try {
    const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
    return (parsed ?? fallback) as T;
  } catch {
    return fallback;
  }
}

export async function GET(req: NextRequest) {
  const session = await requireAdminApi(req);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const searchParams = req.nextUrl.searchParams;
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

    const defaultTpl = HEZLON_TEMPLATES[0];
    let spec: CardPrintSpec;

    if (orderId) {
      const order = await prisma.printOrder.findUnique({
        where: { id: orderId },
        include: { design: true },
      });
      if (!order) {
        return NextResponse.json({ error: "Print order not found" }, { status: 404 });
      }
      const snapshot = parseJsonWithFallback<any>(order.designSnapshotJson, {});
      const d = order.design;
      spec = {
        designName: order.designNameSnapshot || "HEZLON Business Card",
        widthMm: Number(order.widthMm) || 90,
        heightMm: Number(order.heightMm) || 50,
        bleedMm: order.bleedMm !== undefined && order.bleedMm !== null ? Number(order.bleedMm) : 3,
        safeMarginMm: order.safeMarginMm !== undefined && order.safeMarginMm !== null ? Number(order.safeMarginMm) : 5,
        isDoubleSided: order.isDoubleSided !== false,
        paperFinish: order.paperFinish || "MATTE",
        cornerStyle: order.cornerStyle || "SQUARE",
        frontBg: snapshot.frontBg || parseJsonWithFallback(d?.frontBgJson, defaultTpl.frontBg),
        backBg: snapshot.backBg || parseJsonWithFallback(d?.backBgJson, defaultTpl.backBg),
        frontElements: snapshot.frontElements || parseJsonWithFallback(d?.frontElementsJson, defaultTpl.frontElements),
        backElements: snapshot.backElements || parseJsonWithFallback(d?.backElementsJson, defaultTpl.backElements),
        qrDestinationUrl,
      };
    } else {
      let d = designId
        ? await prisma.businessCardDesign.findUnique({ where: { id: designId } })
        : await prisma.businessCardDesign.findFirst();

      if (d) {
        spec = {
          designName: d.name || defaultTpl.name,
          widthMm: Number(d.widthMm) || 90,
          heightMm: Number(d.heightMm) || 50,
          bleedMm: d.bleedMm !== undefined && d.bleedMm !== null ? Number(d.bleedMm) : 3,
          safeMarginMm: d.safeMarginMm !== undefined && d.safeMarginMm !== null ? Number(d.safeMarginMm) : 5,
          isDoubleSided: d.isDoubleSided !== false,
          paperFinish: d.paperFinish || "MATTE",
          cornerStyle: d.cornerStyle || "SQUARE",
          frontBg: parseJsonWithFallback(d.frontBgJson, defaultTpl.frontBg),
          backBg: parseJsonWithFallback(d.backBgJson, defaultTpl.backBg),
          frontElements: parseJsonWithFallback(d.frontElementsJson, defaultTpl.frontElements),
          backElements: parseJsonWithFallback(d.backElementsJson, defaultTpl.backElements),
          qrDestinationUrl,
        };
      } else {
        spec = {
          designName: defaultTpl.name,
          widthMm: 90,
          heightMm: 50,
          bleedMm: 3,
          safeMarginMm: 5,
          isDoubleSided: true,
          paperFinish: defaultTpl.paperFinish,
          cornerStyle: defaultTpl.cornerStyle,
          frontBg: defaultTpl.frontBg,
          backBg: defaultTpl.backBg,
          frontElements: defaultTpl.frontElements,
          backElements: defaultTpl.backElements,
          qrDestinationUrl,
        };
      }
    }

    const cleanFileName = (spec.designName || "hezlon-card")
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
      {
        error: "Failed to generate print document",
        details: error instanceof Error ? error.message : String(error),
      },
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

    const defaultTpl = HEZLON_TEMPLATES[0];
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
      const snapshot = parseJsonWithFallback<any>(order.designSnapshotJson, {});
      const d = order.design;
      spec = {
        designName: order.designNameSnapshot || defaultTpl.name,
        widthMm: Number(order.widthMm) || 90,
        heightMm: Number(order.heightMm) || 50,
        bleedMm: order.bleedMm !== undefined && order.bleedMm !== null ? Number(order.bleedMm) : 3,
        safeMarginMm: order.safeMarginMm !== undefined && order.safeMarginMm !== null ? Number(order.safeMarginMm) : 5,
        isDoubleSided: order.isDoubleSided !== false,
        paperFinish: order.paperFinish || "MATTE",
        cornerStyle: order.cornerStyle || "SQUARE",
        frontBg: snapshot.frontBg || parseJsonWithFallback(d?.frontBgJson, defaultTpl.frontBg),
        backBg: snapshot.backBg || parseJsonWithFallback(d?.backBgJson, defaultTpl.backBg),
        frontElements: snapshot.frontElements || parseJsonWithFallback(d?.frontElementsJson, defaultTpl.frontElements),
        backElements: snapshot.backElements || parseJsonWithFallback(d?.backElementsJson, defaultTpl.backElements),
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
        designName: d.name || defaultTpl.name,
        widthMm: Number(d.widthMm) || 90,
        heightMm: Number(d.heightMm) || 50,
        bleedMm: d.bleedMm !== undefined && d.bleedMm !== null ? Number(d.bleedMm) : 3,
        safeMarginMm: d.safeMarginMm !== undefined && d.safeMarginMm !== null ? Number(d.safeMarginMm) : 5,
        isDoubleSided: d.isDoubleSided !== false,
        paperFinish: d.paperFinish || "MATTE",
        cornerStyle: d.cornerStyle || "SQUARE",
        frontBg: parseJsonWithFallback(d.frontBgJson, defaultTpl.frontBg),
        backBg: parseJsonWithFallback(d.backBgJson, defaultTpl.backBg),
        frontElements: parseJsonWithFallback(d.frontElementsJson, defaultTpl.frontElements),
        backElements: parseJsonWithFallback(d.backElementsJson, defaultTpl.backElements),
        qrDestinationUrl,
      };
    } else {
      spec = {
        designName: body.designName || defaultTpl.name,
        widthMm: Number(body.widthMm) || 90,
        heightMm: Number(body.heightMm) || 50,
        bleedMm: body.bleedMm !== undefined && body.bleedMm !== null ? Number(body.bleedMm) : 3,
        safeMarginMm: body.safeMarginMm !== undefined && body.safeMarginMm !== null ? Number(body.safeMarginMm) : 5,
        isDoubleSided: body.isDoubleSided !== false,
        paperFinish: body.paperFinish || "MATTE",
        cornerStyle: body.cornerStyle || "SQUARE",
        frontBg: body.frontBg || defaultTpl.frontBg,
        backBg: body.backBg || defaultTpl.backBg,
        frontElements: Array.isArray(body.frontElements) ? body.frontElements : defaultTpl.frontElements,
        backElements: Array.isArray(body.backElements) ? body.backElements : defaultTpl.backElements,
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
      {
        error: "Failed to generate print-ready production file",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

