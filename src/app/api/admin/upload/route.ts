import { NextRequest, NextResponse } from "next/server";
import sharp from "sharp";
import path from "path";
import fs from "fs/promises";
import { logAuditEvent, requireAdminApi } from "@/lib/auth";

const ALLOWED_TYPES = ["image/png", "image/jpeg", "image/jpg", "image/webp", "image/svg+xml"];
const MAX_SIZE_BYTES = 10 * 1024 * 1024; // 10MB

export async function POST(req: NextRequest) {
  const session = await requireAdminApi(req);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const purpose = String(formData.get("purpose") || "asset");

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: "Invalid file type. Allowed: PNG, JPG, WEBP, SVG." },
        { status: 400 }
      );
    }

    if (file.size > MAX_SIZE_BYTES) {
      return NextResponse.json(
        { error: "File exceeds 10MB maximum size limit." },
        { status: 400 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    let processedBuffer: Buffer;
    let width = 800;
    let height = 800;

    if (file.type === "image/svg+xml") {
      processedBuffer = await sharp(buffer)
        .resize({ width: 1200, height: 1200, fit: "inside", withoutEnlargement: false })
        .png({ quality: 100 })
        .toBuffer();
      const meta = await sharp(processedBuffer).metadata();
      width = meta.width || 1200;
      height = meta.height || 1200;
    } else {
      const image = sharp(buffer);
      const metadata = await image.metadata();
      width = metadata.width || 800;
      height = metadata.height || 800;

      // Keep high resolution for print (up to 2400px) and convert to clean PNG for PDF-Lib compatibility
      processedBuffer = await image
        .resize({
          width: 2400,
          height: 2400,
          fit: "inside",
          withoutEnlargement: true,
        })
        .png({ compressionLevel: 8 })
        .toBuffer();
    }

    const uploadsDir = path.join(process.cwd(), "public", "uploads");
    await fs.mkdir(uploadsDir, { recursive: true });

    const safePrefix = purpose.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 24) || "asset";
    const filename = `hezlon-${safePrefix}-${Date.now()}.png`;
    const filePath = path.join(uploadsDir, filename);
    await fs.writeFile(filePath, processedBuffer);

    const dataUrl = `data:image/png;base64,${processedBuffer.toString("base64")}`;

    await logAuditEvent({
      action: "ASSET_UPLOADED",
      entityType: "MediaAsset",
      entityId: filename,
      summary: `Uploaded ${purpose} image (${width}x${height}px)`,
    });

    return NextResponse.json({
      url: `/uploads/${filename}`,
      dataUrl,
      width,
      height,
      filename,
    });
  } catch (error) {
    console.error("File upload error:", error);
    return NextResponse.json(
      { error: "Failed to validate or process uploaded image" },
      { status: 500 }
    );
  }
}

