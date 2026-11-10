import sharp from 'sharp';
import fs from 'fs/promises';
import path from 'path';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('=== UPDATING HEZLON PROFILE IMAGES AND FRONT CARD TEMPLATES ===');

  const profilePath = path.join(process.cwd(), 'public', 'uploads', 'profile.jpeg');
  const templatesDir = path.join(process.cwd(), 'public', 'uploads', 'templates');

  // Verify profile.jpeg exists
  await fs.access(profilePath);
  const profileMeta = await sharp(profilePath).metadata();
  console.log(`✔ Found profile.jpeg: ${profileMeta.width}x${profileMeta.height} (${profileMeta.format})`);

  // -------------------------------------------------------------
  // 1. GENERATE HIGH-RESOLUTION STANDALONE PORTRAITS
  // -------------------------------------------------------------

  // A. High-Res Square Executive Headshot (800x800)
  // Centered on head: x=512, y=490, size=780
  const headshotSquare = await sharp(profilePath)
    .extract({ left: 122, top: 100, width: 780, height: 780 })
    .resize(800, 800, { fit: 'cover' })
    .png({ quality: 100 })
    .toBuffer();

  const squarePath = path.join(templatesDir, 'hezlon-owner-portrait.png');
  await fs.writeFile(squarePath, headshotSquare);
  console.log(`✔ Updated: ${squarePath} (800x800)`);

  // B. High-Res Circular Medallion Headshot (800x800 with antialiased alpha)
  const circleMaskSvg = `
    <svg width="800" height="800" viewBox="0 0 800 800" xmlns="http://www.w3.org/2000/svg">
      <circle cx="400" cy="400" r="396" fill="#ffffff" />
    </svg>
  `;
  const circleMask = await sharp(Buffer.from(circleMaskSvg)).toColourspace('b-w').toBuffer();

  const circleHeadshot = await sharp(headshotSquare)
    .ensureAlpha()
    .composite([{ input: circleMask, blend: 'dest-in' }])
    .png({ quality: 100 })
    .toBuffer();

  const circlePath = path.join(templatesDir, 'hezlon-owner-portrait-circle.png');
  await fs.writeFile(circlePath, circleHeadshot);
  console.log(`✔ Updated: ${circlePath} (800x800 with alpha)`);

  // C. High-Res Transparent Cutout (hezlon-owner-portrait-cutout.png)
  // Use the verified test-cutout.png from scripts/test-cutout.png
  const cutoutScriptPath = path.join(process.cwd(), 'scripts', 'test-cutout.png');
  const cutoutBuffer = await fs.readFile(cutoutScriptPath);
  const cutoutPath = path.join(templatesDir, 'hezlon-owner-portrait-cutout.png');
  await fs.writeFile(cutoutPath, cutoutBuffer);
  console.log(`✔ Updated: ${cutoutPath} (1024x1280 transparent cutout)`);

  // -------------------------------------------------------------
  // 2. RE-COMPOSITE SIGNATURE FRONT CARD TEMPLATES (1800x1000)
  // -------------------------------------------------------------

  // A. HEZLON Executive Portrait & Showcase (hezlon-card-showcase-front.png)
  console.log('Generating hezlon-card-showcase-front.png...');
  await compositeRibbonCard(
    path.join(templatesDir, 'hezlon-card-showcase-front.png'),
    cutoutBuffer,
    { r: 245, g: 245, b: 243 }
  );

  // B. HEZLON Imperial Portrait & Glass Villa (hezlon-card-imperial-front.png)
  console.log('Generating hezlon-card-imperial-front.png...');
  await compositeRibbonCard(
    path.join(templatesDir, 'hezlon-card-imperial-front.png'),
    cutoutBuffer,
    { r: 242, g: 241, b: 239 }
  );

  // C. HEZLON Royal Medallion & Architectural Collage (hezlon-card-royal-front.png)
  console.log('Generating hezlon-card-royal-front.png...');
  await compositeEllipseMedallion(
    path.join(templatesDir, 'hezlon-card-royal-front.png'),
    profilePath,
    { cx: 918, cy: 498, rx: 224, ry: 294 }
  );

  // D. HEZLON Chevron Medallion & Service Matrix (hezlon-card-chevron-front.png)
  console.log('Generating hezlon-card-chevron-front.png...');
  await compositeEllipseMedallion(
    path.join(templatesDir, 'hezlon-card-chevron-front.png'),
    profilePath,
    { cx: 911, cy: 498, rx: 221, ry: 294 }
  );

  // -------------------------------------------------------------
  // 3. UPDATE DATABASE RECORDS
  // -------------------------------------------------------------
  console.log('Updating CompanyProfile and BusinessCardDesigns in database...');
  await prisma.companyProfile.update({
    where: { id: 'hezlon-singleton' },
    data: {
      ownerPhotoUrl: '/uploads/templates/hezlon-owner-portrait.png',
    },
  });
  console.log('✔ Updated CompanyProfile.ownerPhotoUrl = /uploads/templates/hezlon-owner-portrait.png');

  console.log('=== ALL PROFILE ASSETS UPDATED SUCCESSFULLY ===');
}

/** Composites the owner cutout behind the gold diagonal ribbon for showcase and imperial cards */
async function compositeRibbonCard(
  cardFilePath: string,
  cutoutBuffer: Buffer,
  bgRgb: { r: number; g: number; b: number }
) {
  const card = await sharp(cardFilePath).raw().toBuffer({ resolveWithObject: true });
  const w = card.info.width;
  const h = card.info.height;

  // Prepare cutout sized to card
  const targetH = 780;
  const targetW = 624;

  const cutoutResized = await sharp(cutoutBuffer)
    .resize(targetW, targetH, { fit: 'contain' })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const pw = cutoutResized.info.width;
  const ph = cutoutResized.info.height;

  // Soft bottom fade
  const pData = Buffer.from(cutoutResized.data);
  for (let py = ph - 60; py < ph; py++) {
    const fade = Math.max(0, (ph - 1 - py) / 60);
    const alphaFade = fade * fade * (3 - 2 * fade);
    for (let px = 0; px < pw; px++) {
      const idx = (py * pw + px) * 4 + 3;
      pData[idx] = Math.round(pData[idx] * alphaFade);
    }
  }

  const outData = Buffer.from(card.data);

  // Ribbon boundary: x=708 from y=0..480, then slope to 1000 at y=1000
  const ribbonX: number[] = [];
  for (let y = 0; y < h; y++) {
    let rx = 708;
    if (y > 480) {
      rx = Math.round(708 + (y - 480) * 0.56);
    }
    ribbonX.push(rx);
  }

  // Clear old placeholder man pixels
  for (let y = 30; y < 860; y++) {
    const rx = ribbonX[y];
    for (let x = rx + 6; x < 1200; x++) {
      const idx = (y * w + x) * card.info.channels;
      outData[idx] = bgRgb.r;
      outData[idx + 1] = bgRgb.g;
      outData[idx + 2] = bgRgb.b;
    }
  }

  // Composite new portrait
  const targetX = 595;
  const targetY = 70;

  for (let py = 0; py < ph; py++) {
    const cy = targetY + py;
    if (cy >= h || cy < 0) continue;
    const rx = ribbonX[cy];

    for (let px = 0; px < pw; px++) {
      const cx = targetX + px;
      if (cx >= w || cx < 0) continue;

      if (cx <= rx) continue;

      const pIdx = (py * pw + px) * 4;
      const alpha = pData[pIdx + 3] / 255;
      if (alpha <= 0) continue;

      const cIdx = (cy * w + cx) * card.info.channels;

      let ribbonAlpha = 1.0;
      if (cx - rx < 3) {
        ribbonAlpha = (cx - rx) / 3;
      }
      const effectiveAlpha = alpha * ribbonAlpha;

      outData[cIdx] = Math.round(pData[pIdx] * effectiveAlpha + outData[cIdx] * (1 - effectiveAlpha));
      outData[cIdx + 1] = Math.round(pData[pIdx + 1] * effectiveAlpha + outData[cIdx + 1] * (1 - effectiveAlpha));
      outData[cIdx + 2] = Math.round(pData[pIdx + 2] * effectiveAlpha + outData[cIdx + 2] * (1 - effectiveAlpha));
    }
  }

  const resultBuf = await sharp(outData, { raw: { width: w, height: h, channels: card.info.channels } })
    .png({ quality: 100, compressionLevel: 8 })
    .toBuffer();

  await fs.writeFile(cardFilePath, resultBuf);
  console.log(`✔ Saved: ${cardFilePath}`);
}

/** Composites the owner portrait inside the luxury gold ellipse medallion for royal and chevron cards */
async function compositeEllipseMedallion(
  cardFilePath: string,
  profilePath: string,
  ellipse: { cx: number; cy: number; rx: number; ry: number }
) {
  const card = await sharp(cardFilePath).raw().toBuffer({ resolveWithObject: true });
  const w = card.info.width;
  const h = card.info.height;

  const { cx, cy, rx, ry } = ellipse;

  // Prepare bust crop from profile.jpeg:
  const portraitCrop = await sharp(profilePath)
    .extract({ left: 72, top: 80, width: 880, height: 1150 })
    .resize(rx * 2, ry * 2, { fit: 'cover' })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const pw = portraitCrop.info.width;
  const ph = portraitCrop.info.height;

  const outData = Buffer.from(card.data);
  const left = cx - rx;
  const top = cy - ry;

  for (let py = 0; py < ph; py++) {
    const cardY = top + py;
    if (cardY < 0 || cardY >= h) continue;

    const dy = (cardY - cy) / ry;
    const dy2 = dy * dy;

    for (let px = 0; px < pw; px++) {
      const cardX = left + px;
      if (cardX < 0 || cardX >= w) continue;

      const dx = (cardX - cx) / rx;
      const dist2 = dx * dx + dy2;

      if (dist2 <= 1.0) {
        let alpha = 1.0;
        const dist = Math.sqrt(dist2);
        if (dist > 0.98) {
          alpha = (1.0 - dist) / 0.02;
        }

        const pIdx = (py * pw + px) * 4;
        const cIdx = (cardY * w + cardX) * card.info.channels;

        outData[cIdx] = Math.round(portraitCrop.data[pIdx] * alpha + outData[cIdx] * (1 - alpha));
        outData[cIdx + 1] = Math.round(portraitCrop.data[pIdx + 1] * alpha + outData[cIdx + 1] * (1 - alpha));
        outData[cIdx + 2] = Math.round(portraitCrop.data[pIdx + 2] * alpha + outData[cIdx + 2] * (1 - alpha));
      }
    }
  }

  const resultBuf = await sharp(outData, { raw: { width: w, height: h, channels: card.info.channels } })
    .png({ quality: 100, compressionLevel: 8 })
    .toBuffer();

  await fs.writeFile(cardFilePath, resultBuf);
  console.log(`✔ Saved: ${cardFilePath}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
