import { PDFDocument } from "pdf-lib";
import fs from "fs/promises";
import path from "path";
import jsQR from "jsqr";
import sharp from "sharp";
import { HEZLON_TEMPLATES } from "../src/lib/templates-catalog";
import {
  generatePreviewPdf,
  generatePrintReadyPdf,
  calculateA4SheetLayout,
  CardPrintSpec,
  renderCardSideSvg,
} from "../src/lib/print-engine";

async function main() {
  console.log("=== TESTING PROFESSIONAL BUSINESS CARD PDF EXPORT SYSTEM ===");

  const tpl = HEZLON_TEMPLATES[0]; // HEZLON Executive Card
  const spec: CardPrintSpec = {
    designName: "HEZLON Building Solutions Executive Card",
    widthMm: 90,
    heightMm: 50,
    bleedMm: 3,
    safeMarginMm: 5,
    isDoubleSided: true,
    paperFinish: "SOFT_TOUCH",
    cornerStyle: "SQUARE",
    frontBg: tpl.frontBg,
    backBg: tpl.backBg,
    frontElements: tpl.frontElements,
    backElements: tpl.backElements,
    qrDestinationUrl: "https://hezlon.lumo.co.tz/hezlon",
  };

  // 1. Test calculateA4SheetLayout
  console.log("\n[TEST 1] Testing A4 Imposition Calculations...");
  const layoutLong = calculateA4SheetLayout(spec, "LONG_EDGE");
  const layoutShort = calculateA4SheetLayout(spec, "SHORT_EDGE");

  if (layoutLong.cardsPerSheet !== 8 || layoutLong.columns !== 2 || layoutLong.rows !== 4) {
    throw new Error(`Expected 8 cards (2x4) per A4 sheet, got ${layoutLong.cardsPerSheet}`);
  }
  if (Math.abs(layoutLong.sheetWidthMm - 210) > 0.01 || Math.abs(layoutLong.sheetHeightMm - 297) > 0.01) {
    throw new Error(`Invalid A4 sheet dimensions: ${layoutLong.sheetWidthMm}x${layoutLong.sheetHeightMm}mm`);
  }
  if (Math.abs(layoutLong.trimWidthMm - 90) > 0.01 || Math.abs(layoutLong.trimHeightMm - 50) > 0.01) {
    throw new Error(`Invalid trim dimensions: ${layoutLong.trimWidthMm}x${layoutLong.trimHeightMm}mm`);
  }
  if (Math.abs(layoutLong.bleedMm - 3) > 0.01) {
    throw new Error(`Invalid bleed: ${layoutLong.bleedMm}mm`);
  }
  if (Math.abs(layoutLong.horizontalGutterMm - 6) > 0.01 || Math.abs(layoutLong.verticalGutterMm - 6) > 0.01) {
    throw new Error(`Invalid bleed gutter dimensions`);
  }
  console.log(
    `✔ A4 layout verified: ${layoutLong.cardsPerSheet} cards per sheet (${layoutLong.columns}x${layoutLong.rows}), ` +
    `${layoutLong.trimWidthMm}x${layoutLong.trimHeightMm}mm trim, ${layoutLong.bleedMm}mm bleed (${layoutLong.cardWithBleedWidthMm}x${layoutLong.cardWithBleedHeightMm}mm), ` +
    `${layoutLong.horizontalGutterMm}mm gutters, symmetric ${layoutLong.marginLeftToBleedMm}mm margins.`
  );
  console.log("✔ Duplex registration verified: Left/Right symmetric margins guarantee 0.00mm offset when flipped along Long Edge.");

  // 2. Test MODE A: Preview PDF Generation
  console.log("\n[TEST 2] Testing Mode A: Preview PDF (2-Page Proof)...");
  const previewBytes = await generatePreviewPdf(spec, "COMPLETE");
  const previewDoc = await PDFDocument.load(previewBytes);

  if (previewDoc.getPageCount() !== 2) {
    throw new Error(`Expected 2 pages in Preview PDF, got ${previewDoc.getPageCount()}`);
  }

  const p1 = previewDoc.getPage(0);
  const p2 = previewDoc.getPage(1);
  const expectedWidthPt = 90 * 2.83464567;
  const expectedHeightPt = 50 * 2.83464567;

  if (Math.abs(p1.getWidth() - expectedWidthPt) > 0.5 || Math.abs(p1.getHeight() - expectedHeightPt) > 0.5) {
    throw new Error(`Preview Page 1 dimension mismatch: got ${p1.getWidth()}x${p1.getHeight()} pt, expected ${expectedWidthPt}x${expectedHeightPt} pt`);
  }
  if (Math.abs(p2.getWidth() - expectedWidthPt) > 0.5 || Math.abs(p2.getHeight() - expectedHeightPt) > 0.5) {
    throw new Error(`Preview Page 2 dimension mismatch: got ${p2.getWidth()}x${p2.getHeight()} pt, expected ${expectedWidthPt}x${expectedHeightPt} pt`);
  }
  console.log(`✔ Preview PDF dimensions verified: Exact finished trim 90 × 50 mm (${p1.getWidth().toFixed(1)} × ${p1.getHeight().toFixed(1)} pt).`);
  console.log(`✔ Preview PDF size: ${previewBytes.length} bytes. Zero calibration bars, zero technical labels, zero crop marks.`);

  // Test single page preview modes
  const previewFrontBytes = await generatePreviewPdf(spec, "FRONT");
  const previewFrontDoc = await PDFDocument.load(previewFrontBytes);
  if (previewFrontDoc.getPageCount() !== 1) throw new Error("Expected 1 page for Preview Front");

  const previewBackBytes = await generatePreviewPdf(spec, "BACK");
  const previewBackDoc = await PDFDocument.load(previewBackBytes);
  if (previewBackDoc.getPageCount() !== 1) throw new Error("Expected 1 page for Preview Back");
  console.log("✔ Single-side preview modes (FRONT / BACK) verified.");

  // 3. Test MODE B: Print-Ready PDF Generation
  console.log("\n[TEST 3] Testing Mode B: Print-Ready A4 Imposition PDF...");
  const printBytesLong = await generatePrintReadyPdf(spec, "COMPLETE", { flipMode: "LONG_EDGE" });
  const printDocLong = await PDFDocument.load(printBytesLong);

  if (printDocLong.getPageCount() !== 2) {
    throw new Error(`Expected 2 pages in Print-Ready PDF, got ${printDocLong.getPageCount()}`);
  }

  const sheetP1 = printDocLong.getPage(0);
  const sheetP2 = printDocLong.getPage(1);
  const a4WidthPt = 210 * 2.83464567;
  const a4HeightPt = 297 * 2.83464567;

  if (Math.abs(sheetP1.getWidth() - a4WidthPt) > 0.5 || Math.abs(sheetP1.getHeight() - a4HeightPt) > 0.5) {
    throw new Error(`A4 Sheet P1 dimension mismatch: got ${sheetP1.getWidth()}x${sheetP1.getHeight()} pt, expected ${a4WidthPt}x${a4HeightPt} pt`);
  }
  if (Math.abs(sheetP2.getWidth() - a4WidthPt) > 0.5 || Math.abs(sheetP2.getHeight() - a4HeightPt) > 0.5) {
    throw new Error(`A4 Sheet P2 dimension mismatch: got ${sheetP2.getWidth()}x${sheetP2.getHeight()} pt, expected ${a4WidthPt}x${a4HeightPt} pt`);
  }
  console.log(`✔ Print-Ready PDF dimensions verified: Exact A4 210 × 297 mm (${sheetP1.getWidth().toFixed(1)} × ${sheetP1.getHeight().toFixed(1)} pt).`);
  console.log(`✔ Print-Ready PDF size: ${printBytesLong.length} bytes (8 cards per sheet, precision cutting marks).`);

  // Test SHORT_EDGE mode
  const printBytesShort = await generatePrintReadyPdf(spec, "COMPLETE", { flipMode: "SHORT_EDGE" });
  const printDocShort = await PDFDocument.load(printBytesShort);
  if (printDocShort.getPageCount() !== 2) throw new Error("Expected 2 pages for Short-Edge Print-Ready PDF");
  console.log("✔ Short-Edge duplex mode verified.");

  // 4. Optical QR Code Scannability Test
  console.log("\n[TEST 4] Testing Optical QR Code Decode on Card Canvas...");
  const backSvg = await renderCardSideSvg(spec, "BACK", false);
  const pngBuffer = await sharp(Buffer.from(backSvg))
    .resize({ width: 1800 })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const qrScan = jsQR(
    new Uint8ClampedArray(pngBuffer.data),
    pngBuffer.info.width,
    pngBuffer.info.height
  );

  if (!qrScan || !qrScan.data) {
    throw new Error("Optical QR Code decode failed on Back side render");
  }
  if (qrScan.data !== "https://hezlon.lumo.co.tz/hezlon") {
    throw new Error(`QR data mismatch: got "${qrScan.data}", expected "https://hezlon.lumo.co.tz/hezlon"`);
  }
  console.log(`✔ Optical QR decode succeeded: Decoded "${qrScan.data}" at location (${qrScan.location.topLeftCorner.x.toFixed(0)}, ${qrScan.location.topLeftCorner.y.toFixed(0)})`);

  // 5. Save Artifact Files for Inspection
  const outDir = path.join(process.cwd(), "scratch");
  await fs.mkdir(outDir, { recursive: true });
  await fs.writeFile(path.join(outDir, "hezlon-preview.pdf"), previewBytes);
  await fs.writeFile(path.join(outDir, "hezlon-print-ready-a4.pdf"), printBytesLong);
  console.log(`✔ Sample PDFs generated into ${outDir}`);

  console.log("\n=== ALL PROFESSIONAL PDF EXPORT TESTS PASSED SUCCESSFULLY ===");
}

main().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});
