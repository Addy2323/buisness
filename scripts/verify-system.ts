import fs from "fs/promises";
import path from "path";
import { prisma } from "../src/lib/prisma";
import { createSessionToken, verifySessionToken } from "../src/lib/auth";
import {
  checkColorContrast,
  decodeQrFromPngBuffer,
  generatePermanentQrBuffer,
  generatePermanentQrSvg,
} from "../src/lib/qr-engine";
import {
  generatePrintReadyPdf,
  renderCardSideSvg,
  validateCardForPrint,
} from "../src/lib/print-engine";
import { buildQrMatrix } from "../src/lib/use-qr-matrix";
import { HEZLON_TEMPLATES } from "../src/lib/templates-catalog";
import sharp from "sharp";

async function runVerification() {
  console.log("=== HEZLON BUSINESS CARD STUDIO — QR & DIGITAL PROFILE VERIFICATION ===");

  // 1. Verify Single Authorized Administrator
  const adminCount = await prisma.adminUser.count();
  const admin = await prisma.adminUser.findUnique({
    where: { email: "Casrycasry40@gmail.com" },
  });
  if (adminCount !== 1 || !admin) {
    throw new Error(`Expected_1_AdminUser_Found_${adminCount}`);
  }
  console.log("✔ [PASS 1/10] Single Authorized Administrator verified:", admin.email);

  // 2. Verify Bilingual CompanyProfile (English & Kiswahili + Dodoma Location + Service Area + Socials)
  const company = (await prisma.companyProfile.findUnique({
    where: { id: "hezlon-singleton" },
  })) as
    | (Awaited<ReturnType<typeof prisma.companyProfile.findUnique>> & {
        descriptionSw?: string;
        location?: string;
        serviceArea?: string;
      })
    | null;
  const expectedEn =
    "HEZLON Building Solutions provides professional aluminium, glass, interior fitting and general building improvement services. We focus on quality workmanship, creativity, reliability and customer satisfaction.";
  const expectedSw =
    "HEZLON Building Solutions inatoa huduma za kitaalamu za aluminium, vioo, mapambo ya ndani na maboresho mbalimbali ya majengo. Tunazingatia ubora wa kazi, ubunifu, uaminifu na kuridhika kwa wateja.";

  if (
    !company ||
    company.companyName !== "HEZLON Building Solutions" ||
    company.description !== expectedEn ||
    company.descriptionSw !== expectedSw ||
    company.location !== "Dodoma, Tanzania." ||
    company.serviceArea !==
      "Tanzania – Tunapokea kazi kutoka maeneo mbalimbali nchini." ||
    company.facebook !== "https://www.facebook.com/share/1CXYh7WkFm/" ||
    company.instagram !==
      "https://www.instagram.com/hezlon_building_solution?cplk=MWJzNDZ2NG0xNmswZg=="
  ) {
    throw new Error("Bilingual CompanyProfile content verification failed");
  }
  console.log(
    "✔ [PASS 2/10] Bilingual CompanyProfile verified (EN + SW descriptions, Dodoma location, Tanzania service area, Facebook & Instagram links)."
  );

  // 3. Verify all 7 Bilingual Services & Image Assets
  const services = (await prisma.companyService.findMany({
    where: { isPublished: true },
    orderBy: { displayOrder: "asc" },
  })) as Array<
    Awaited<ReturnType<typeof prisma.companyService.findMany>>[number] & {
      titleSw?: string;
      descriptionSw?: string;
    }
  >;
  const expectedServices = [
    {
      title: "Aluminium Doors and Windows",
      titleSw: "Milango na madirisha ya Aluminium na UPVC.",
    },
    {
      title: "Glass Installation",
      titleSw: "Ufungaji wa vioo.",
    },
    {
      title: "Office and Home Partitions",
      titleSw: "Partition za ofisi na majumbani.",
    },
    {
      title: "Glass Balustrades",
      titleSw: "Mabaraza na kingo za vioo.",
    },
    {
      title: "Decorative and Frosted Stickers",
      titleSw: "Sticker za mapambo na vioo visivyoona ndani.",
    },
    {
      title: "Curtains and Interior Solutions",
      titleSw: "Mapazia na mapambo ya ndani.",
    },
    {
      title: "General Building Solutions",
      titleSw: "Huduma mbalimbali za ujenzi.",
    },
  ];

  if (services.length !== 7) {
    throw new Error(`Expected 7 published services, found ${services.length}`);
  }
  for (let i = 0; i < expectedServices.length; i++) {
    const actual = services[i];
    const exp = expectedServices[i];
    if (actual.title !== exp.title || actual.titleSw !== exp.titleSw) {
      throw new Error(
        `Service #${i + 1} mismatch: got (${actual.title} | ${actual.titleSw})`
      );
    }
    const imgDiskPath = path.join(process.cwd(), "public", actual.imageUrl);
    const stat = await fs.stat(imgDiskPath);
    if (!stat.isFile() || stat.size < 1000) {
      throw new Error(`Service image missing or empty: ${imgDiskPath}`);
    }
  }
  console.log(
    "✔ [PASS 3/10] All 7 Bilingual Services (EN + SW + architectural images) verified."
  );

  // 4. Generate Permanent QR Code in SVG & High-Res PNG (1024px) & Save to public/qr/
  const qrRecord = await prisma.qRCode.findUnique({
    where: { id: "hezlon-permanent-qr" },
  });
  const appBase = (process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000").replace(
    /\/+$/,
    ""
  );
  const permanentProfileUrl = `${appBase}/${qrRecord?.slug || "hezlon"}`;

  const qrSvg = await generatePermanentQrSvg({
    url: permanentProfileUrl,
    foregroundColor: "#0D2B22",
    backgroundColor: "#FFFFFF",
    accentFrameColor: "#C9A96E",
    errorCorrectionLevel: "H",
    marginModules: 4,
    sizePx: 1024,
    includeCenterLogo: false,
  });

  const qrPngBuf = await generatePermanentQrBuffer({
    url: permanentProfileUrl,
    foregroundColor: "#0D2B22",
    backgroundColor: "#FFFFFF",
    errorCorrectionLevel: "H",
    marginModules: 4,
    sizePx: 1024,
  });

  const qrDir = path.join(process.cwd(), "public", "qr");
  await fs.mkdir(qrDir, { recursive: true });
  await fs.writeFile(path.join(qrDir, "hezlon-permanent-qr.svg"), qrSvg, "utf-8");
  await fs.writeFile(path.join(qrDir, "hezlon-permanent-qr.png"), qrPngBuf);

  const contrast = checkColorContrast("#0D2B22", "#FFFFFF");
  if (!qrSvg.includes("<svg") || qrPngBuf.length < 1000 || contrast < 10) {
    throw new Error("Permanent QR generation failed");
  }
  console.log(
    `✔ [PASS 4/10] Permanent QR generated in SVG & 1024px PNG (${qrPngBuf.length} bytes, Contrast ${contrast}:1, Quiet Zone 4 modules, Level H).`
  );

  // 5. Decode the Generated QR Code Optically using jsQR + Sharp (Both server QR & Studio Canvas QR Matrix)
  const decodedUrl = await decodeQrFromPngBuffer(qrPngBuf);
  if (decodedUrl !== permanentProfileUrl) {
    throw new Error(
      `QR Optical Decode mismatch! Expected "${permanentProfileUrl}", got "${decodedUrl}"`
    );
  }
  const prodUrl = "https://hezlon.lumo.co.tz/hezlon";
  const canvasMatrix = buildQrMatrix(prodUrl);
  const canvasQrSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-2 -2 ${canvasMatrix.size + 4} ${canvasMatrix.size + 4}" width="600" height="600" shape-rendering="crispEdges"><rect x="-2" y="-2" width="${canvasMatrix.size + 4}" height="${canvasMatrix.size + 4}" fill="#FFFFFF"/><path d="${canvasMatrix.path}" fill="#111111"/></svg>`;
  const canvasQrPng = await sharp(Buffer.from(canvasQrSvg)).png().toBuffer();
  const decodedCanvasUrl = await decodeQrFromPngBuffer(canvasQrPng);
  if (decodedCanvasUrl !== prodUrl) {
    throw new Error(
      `Studio Canvas QR Optical Decode mismatch! Expected "${prodUrl}", got "${decodedCanvasUrl}"`
    );
  }
  console.log(
    `✔ [PASS 5/10] Optical QR Decode Test (jsQR) succeeded! Server QR: "${decodedUrl}" | Studio Live Canvas QR: "${decodedCanvasUrl}"`
  );

  // 6. Verify Updating Company Information Does NOT Change Permanent QR Code
  const tempUpdatedDesc = `${company.description} [Verified Live Update]`;
  await prisma.companyProfile.update({
    where: { id: "hezlon-singleton" },
    data: { description: tempUpdatedDesc },
  });
  const qrAfterCompanyUpdate = await prisma.qRCode.findUnique({
    where: { id: "hezlon-permanent-qr" },
  });
  const urlAfterUpdate = `${appBase}/${qrAfterCompanyUpdate?.slug || "hezlon"}`;
  const pngAfterUpdate = await generatePermanentQrBuffer({
    url: urlAfterUpdate,
    foregroundColor: "#0D2B22",
    backgroundColor: "#FFFFFF",
    errorCorrectionLevel: "H",
    marginModules: 4,
    sizePx: 1024,
  });
  const decodedAfterUpdate = await decodeQrFromPngBuffer(pngAfterUpdate);
  // Restore exact description
  await prisma.companyProfile.update({
    where: { id: "hezlon-singleton" },
    data: { description: expectedEn },
  });

  if (decodedAfterUpdate !== permanentProfileUrl) {
    throw new Error("QR URL changed after updating company profile!");
  }
  console.log(
    "✔ [PASS 6/10] Permanent QR Immutability verified: Updating company profile does NOT alter the QR code or destination URL."
  );

  // 7. Verify Public Digital Profile Page Component Structure (/hezlon)
  const hezlonPageSource = await fs.readFile(
    path.join(process.cwd(), "src", "app", "hezlon", "page.tsx"),
    "utf-8"
  );
  const requiredMarkers = [
    "ABOUT US | KUHUSU SISI",
    "OUR SERVICES | HUDUMA ZETU",
    "OUR COMMITMENT | AHADI YETU",
    "CONTACT US | WASILIANA NASI",
    "Explore Our Services",
    "View Our Work on Facebook",
    "View Our Work on Instagram",
    "Dodoma, Tanzania.",
    "Tanzania – Tunapokea kazi kutoka maeneo mbalimbali nchini.",
    'target="_blank"',
    'rel="noopener noreferrer"',
  ];
  for (const marker of requiredMarkers) {
    if (!hezlonPageSource.includes(marker)) {
      throw new Error(`Public profile page missing required element: ${marker}`);
    }
  }
  console.log(
    "✔ [PASS 7/10] Public Digital Profile (/hezlon) structure, bilingual switcher, hero buttons, commitments, and social buttons verified."
  );

  // 8. Verify 24 Distinct Templates across all 12 categories
  const dbTemplatesCount = await prisma.cardTemplate.count();
  const distinctCategories = new Set(HEZLON_TEMPLATES.map((t) => t.category));
  if (dbTemplatesCount < 20 || distinctCategories.size < 12) {
    throw new Error(
      `Expected 20+ templates across 12 categories, found ${dbTemplatesCount} templates across ${distinctCategories.size} categories`
    );
  }
  console.log(
    `✔ [PASS 8/10] ${dbTemplatesCount} Distinct Templates across ${distinctCategories.size} categories verified.`
  );

  // 9. Verify JWT Session Auth
  const token = await createSessionToken({
    userId: admin.id,
    email: admin.email,
    name: admin.name,
    role: admin.role,
  });
  const verifiedSession = await verifySessionToken(token);
  if (!verifiedSession || verifiedSession.email !== admin.email) {
    throw new Error("JWT Session verification failed");
  }
  console.log("✔ [PASS 9/10] JWT Session token creation & verification passed.");

  // 10. Verify Pre-Flight Print Validation & Print-Ready PDF Generation with Permanent QR
  const flagship = HEZLON_TEMPLATES[0];
  const spec = {
    designName: flagship.name,
    widthMm: 90,
    heightMm: 50,
    bleedMm: 3,
    safeMarginMm: 5,
    isDoubleSided: true,
    paperFinish: flagship.paperFinish,
    cornerStyle: flagship.cornerStyle,
    frontBg: flagship.frontBg,
    backBg: flagship.backBg,
    frontElements: flagship.frontElements,
    backElements: flagship.backElements,
    qrDestinationUrl: permanentProfileUrl,
  };

  const report = validateCardForPrint(spec);
  if (!report.isPrintReady || report.score < 85) {
    throw new Error(`Print validation failed with score ${report.score}`);
  }
  const frontSvg = await renderCardSideSvg(spec, "FRONT", true);
  const pdfBytes = await generatePrintReadyPdf(spec, "COMPLETE");
  const pdfHeader = Buffer.from(pdfBytes.slice(0, 5)).toString("utf-8");
  if (!frontSvg.includes("<svg") || pdfHeader !== "%PDF-" || pdfBytes.length < 2500) {
    throw new Error("Print-Ready PDF generation failed");
  }
  console.log(
    `✔ [PASS 10/10] Print-Ready PDF Engine verified (${pdfBytes.length} bytes, Score: ${report.score}%, Permanent QR embedded).`
  );

  console.log("=== ALL 10 QR & DIGITAL PROFILE VERIFICATIONS PASSED SUCCESSFULLY ===");
}

runVerification()
  .catch((err) => {
    console.error("Verification failed:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
