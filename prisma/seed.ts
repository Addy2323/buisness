import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { HEZLON_TEMPLATES } from "../src/lib/templates-catalog";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding HEZLON Business Card Studio database...");

  // 1. Seed single authorized administrator account
  const passwordHash = await bcrypt.hash("HezlonAdmin!2026", 12);
  const recoveryPinHash = await bcrypt.hash("2026", 10);

  await prisma.adminUser.upsert({
    where: { email: "Casrycasry40@gmail.com" },
    update: {},
    create: {
      email: "Casrycasry40@gmail.com",
      name: "HEZLON Administrator",
      role: "OWNER_ADMIN",
      passwordHash,
      recoveryPinHash,
    },
  });

  // 2. Seed single CompanyProfile for HEZLON Building Solutions
  const companyUpdateData = {
    companyName: "HEZLON Building Solutions",
    professionalTitle: "Aluminium & Glass Specialists",
    description:
      "HEZLON Building Solutions provides professional aluminium, glass, interior fitting and general building improvement services. We focus on quality workmanship, creativity, reliability and customer satisfaction.",
    descriptionSw:
      "HEZLON Building Solutions inatoa huduma za kitaalamu za aluminium, vioo, mapambo ya ndani na maboresho mbalimbali ya majengo. Tunazingatia ubora wa kazi, ubunifu, uaminifu na kuridhika kwa wateja.",
    location: "Dodoma, Tanzania.",
    serviceArea:
      "Tanzania – Tunapokea kazi kutoka maeneo mbalimbali nchini.",
    instagram:
      "https://www.instagram.com/hezlon_building_solution?cplk=MWJzNDZ2NG0xNmswZg==",
    facebook: "https://www.facebook.com/share/1CXYh7WkFm/",
  };

  const companyCreateData = {
    id: "hezlon-singleton",
    ...companyUpdateData,
    phone: "0673 571 344",
    whatsapp: "0673 571 344",
    email: "Casrycasry40@gmail.com",
    website: "",
    physicalAddress: "",
    workingHours: "",
    logoUrl: "",
    ownerPhotoUrl: "/uploads/templates/hezlon-owner-portrait.png",
    coverImageUrl: "",
    galleryImagesJson: "[]",
    defaultWidthMm: 90,
    defaultHeightMm: 50,
    defaultBleedMm: 3,
    defaultSafeMarginMm: 5,
  };

  await prisma.companyProfile.upsert({
    where: { id: "hezlon-singleton" },
    update: companyUpdateData,
    create: companyCreateData,
  });

  // 3. Seed DigitalProfile
  await prisma.digitalProfile.upsert({
    where: { id: "hezlon-digital-profile" },
    update: {},
    create: {
      id: "hezlon-digital-profile",
      slug: "hezlon",
      isPublished: true,
      headline: "Aluminium & Glass Specialists",
      themeMode: "FOREST_LUXURY",
      accentColor: "#C9A96E",
      primaryColor: "#0D2B22",
      showServices: true,
      showGallery: true,
      showSocialLinks: true,
      showWorkingHours: true,
      showLocation: true,
      enableVCard: true,
      enableWhatsApp: true,
    },
  });

  // 4. Seed Permanent QRCode config (clear 4-module quiet zone & unobstructed modules)
  await prisma.qRCode.upsert({
    where: { id: "hezlon-permanent-qr" },
    update: {
      marginModules: 4,
      includeCenterLogo: false,
      errorCorrectionLevel: "H",
    },
    create: {
      id: "hezlon-permanent-qr",
      slug: "hezlon",
      customBaseDomain: "",
      foregroundColor: "#0D2B22",
      backgroundColor: "#FFFFFF",
      accentFrameColor: "#C9A96E",
      errorCorrectionLevel: "H",
      marginModules: 4,
      sizePx: 1024,
      includeCenterLogo: false,
      centerLogoText: "H",
      centerLogoUrl: "",
      stylePreset: "CLASSIC_LUXURY",
      isActive: true,
    },
  });

  // 5. Seed Exact 7 Bilingual Company Services (English & Kiswahili)
  await prisma.companyService.deleteMany({});
  const initialServices = [
    {
      title: "Aluminium Doors and Windows",
      titleSw: "Milango na madirisha ya Aluminium na UPVC.",
      description:
        "Precision-engineered aluminium and UPVC door and window systems built for durability, weather resistance, and architectural elegance.",
      descriptionSw: "Milango na madirisha ya Aluminium na UPVC.",
      category: "Fenestration & Entryways",
      imageUrl: "/uploads/services/service-1-doors-windows.png",
      iconName: "DoorOpen",
      displayOrder: 1,
    },
    {
      title: "Glass Installation",
      titleSw: "Ufungaji wa vioo.",
      description:
        "Professional structural glazing, tempered safety glass, mirrors, and custom architectural glass installations for residential and commercial spaces.",
      descriptionSw: "Ufungaji wa vioo.",
      category: "Structural Glazing",
      imageUrl: "/uploads/services/service-2-glass-installation.png",
      iconName: "Sparkles",
      displayOrder: 2,
    },
    {
      title: "Office and Home Partitions",
      titleSw: "Partition za ofisi na majumbani.",
      description:
        "Modern aluminium-framed and frameless glass partitioning systems tailored for executive offices and residential interiors.",
      descriptionSw: "Partition za ofisi na majumbani.",
      category: "Interior Partitioning",
      imageUrl: "/uploads/services/service-3-partitions.png",
      iconName: "Columns",
      displayOrder: 3,
    },
    {
      title: "Glass Balustrades",
      titleSw: "Mabaraza na kingo za vioo.",
      description:
        "Frameless and architectural aluminium-supported safety glass balustrades for balconies, staircases, and terraces.",
      descriptionSw: "Mabaraza na kingo za vioo.",
      category: "Safety & Architectural",
      imageUrl: "/uploads/services/service-4-balustrades.png",
      iconName: "ShieldCheck",
      displayOrder: 4,
    },
    {
      title: "Decorative and Frosted Stickers",
      titleSw: "Sticker za mapambo na vioo visivyoona ndani.",
      description:
        "Custom decorative window films, frosted privacy glass stickers, and corporate branding graphics for offices and homes.",
      descriptionSw: "Sticker za mapambo na vioo visivyoona ndani.",
      category: "Privacy & Decorative Film",
      imageUrl: "/uploads/services/service-5-frosted-stickers.png",
      iconName: "Layers",
      displayOrder: 5,
    },
    {
      title: "Curtains and Interior Solutions",
      titleSw: "Mapazia na mapambo ya ndani.",
      description:
        "Bespoke curtains, modern blinds, drapery tracks, and interior fitting solutions crafted for refined living and working spaces.",
      descriptionSw: "Mapazia na mapambo ya ndani.",
      category: "Interior Solutions",
      imageUrl: "/uploads/services/service-6-curtains-interior.png",
      iconName: "Blinds",
      displayOrder: 6,
    },
    {
      title: "General Building Solutions",
      titleSw: "Huduma mbalimbali za ujenzi.",
      description:
        "Comprehensive building improvement, renovation, architectural metalwork, and custom construction solutions.",
      descriptionSw: "Huduma mbalimbali za ujenzi.",
      category: "Building Improvements",
      imageUrl: "/uploads/services/service-7-general-building.png",
      iconName: "Building2",
      displayOrder: 7,
    },
  ];

  for (const service of initialServices) {
    await prisma.companyService.create({ data: service });
  }

  // 6. Seed PrintPricingConfig & Default External PrintProvider
  await prisma.printPricingConfig.upsert({
    where: { id: "hezlon-pricing-singleton" },
    update: {},
    create: {
      id: "hezlon-pricing-singleton",
      currency: "USD",
      currencySymbol: "$",
      baseUnitCostMatte: 0.35,
      baseUnitCostGloss: 0.38,
      baseUnitCostSoftTouch: 0.48,
      baseUnitCostTextured: 0.55,
      roundedCornerSurcharge: 0.05,
      doubleSidedMultiplier: 1.25,
      setupFee: 15.0,
      bulkDiscount100: 0.05,
      bulkDiscount500: 0.15,
      bulkDiscount1000: 0.25,
    },
  });

  const existingProviders = await prisma.printProvider.count();
  if (existingProviders === 0) {
    await prisma.printProvider.createMany({
      data: [
        {
          name: "MasterCraft Litho & Foil Press",
          contactPerson: "Production Desk",
          phone: "+1 (555) 234-8900",
          email: "prepress@mastercraftpress.example",
          address: "Commercial Print District, Suite 400",
          notes: "Preferred external studio for 400gsm Soft-Touch & Textured stocks (3mm bleed required).",
          isDefault: true,
        },
        {
          name: "Precision Digital Print Studio",
          contactPerson: "Orders Team",
          phone: "+1 (555) 890-1234",
          email: "orders@precisiondigital.example",
          address: "Industrial Park Boulevard 18",
          notes: "Fast turnaround for short-run 50–100 card batches.",
          isDefault: false,
        },
      ],
    });
  }

  // 7. Seed 20 Distinct Premium Card Templates
  for (const tpl of HEZLON_TEMPLATES) {
    await prisma.cardTemplate.upsert({
      where: { slug: tpl.slug },
      update: {
        name: tpl.name,
        category: tpl.category,
        description: tpl.description,
        widthMm: tpl.widthMm,
        heightMm: tpl.heightMm,
        isDoubleSided: tpl.isDoubleSided,
        paperFinish: tpl.paperFinish,
        cornerStyle: tpl.cornerStyle,
        accentColor: tpl.accentColor,
        previewPaletteJson: JSON.stringify(tpl.previewPalette),
        isFeatured: tpl.isFeatured,
        frontBgJson: JSON.stringify(tpl.frontBg),
        backBgJson: JSON.stringify(tpl.backBg),
        frontElementsJson: JSON.stringify(tpl.frontElements),
        backElementsJson: JSON.stringify(tpl.backElements),
      },
      create: {
        slug: tpl.slug,
        name: tpl.name,
        category: tpl.category,
        description: tpl.description,
        widthMm: tpl.widthMm,
        heightMm: tpl.heightMm,
        isDoubleSided: tpl.isDoubleSided,
        paperFinish: tpl.paperFinish,
        cornerStyle: tpl.cornerStyle,
        accentColor: tpl.accentColor,
        previewPaletteJson: JSON.stringify(tpl.previewPalette),
        isFeatured: tpl.isFeatured,
        frontBgJson: JSON.stringify(tpl.frontBg),
        backBgJson: JSON.stringify(tpl.backBg),
        frontElementsJson: JSON.stringify(tpl.frontElements),
        backElementsJson: JSON.stringify(tpl.backElements),
      },
    });
  }

  // 8. Seed Top 4 Signature Saved BusinessCardDesigns
  const signatureDesigns = [
    { id: "hezlon-flagship-card-design", tpl: HEZLON_TEMPLATES[0] },
    { id: "hezlon-royal-wing-card-design", tpl: HEZLON_TEMPLATES[1] },
    { id: "hezlon-imperial-villa-card-design", tpl: HEZLON_TEMPLATES[2] },
    { id: "hezlon-showcase-card-design", tpl: HEZLON_TEMPLATES[3] },
  ];

  for (const item of signatureDesigns) {
    await prisma.businessCardDesign.upsert({
      where: { id: item.id },
      update: {
        name: item.tpl.name,
        widthMm: item.tpl.widthMm,
        heightMm: item.tpl.heightMm,
        isDoubleSided: item.tpl.isDoubleSided,
        paperFinish: item.tpl.paperFinish,
        cornerStyle: item.tpl.cornerStyle,
        frontBgJson: JSON.stringify(item.tpl.frontBg),
        backBgJson: JSON.stringify(item.tpl.backBg),
        frontElementsJson: JSON.stringify(item.tpl.frontElements),
        backElementsJson: JSON.stringify(item.tpl.backElements),
        status: "APPROVED",
        isFavorite: true,
      },
      create: {
        id: item.id,
        name: item.tpl.name,
        widthMm: item.tpl.widthMm,
        heightMm: item.tpl.heightMm,
        bleedMm: 3,
        safeMarginMm: 5,
        isDoubleSided: item.tpl.isDoubleSided,
        paperFinish: item.tpl.paperFinish,
        cornerStyle: item.tpl.cornerStyle,
        frontBgJson: JSON.stringify(item.tpl.frontBg),
        backBgJson: JSON.stringify(item.tpl.backBg),
        frontElementsJson: JSON.stringify(item.tpl.frontElements),
        backElementsJson: JSON.stringify(item.tpl.backElements),
        status: "APPROVED",
        isFavorite: true,
      },
    });
  }

  console.log(
    `Database seeded successfully: 1 AdminUser, 1 CompanyProfile, 7 Services, ${HEZLON_TEMPLATES.length} Distinct Templates, 4 Signature Saved Designs.`
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

