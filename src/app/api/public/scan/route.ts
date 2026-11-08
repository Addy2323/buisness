import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { checkRateLimit } from "@/lib/auth";

function parseUserAgent(ua: string): {
  deviceCategory: "MOBILE" | "TABLET" | "DESKTOP";
  osName: string;
  browserName: string;
} {
  const lower = ua.toLowerCase();
  const isTablet = /ipad|tablet|playbook|silk/i.test(lower);
  const isMobile =
    !isTablet &&
    /mobile|iphone|ipod|android|blackberry|iemobile|opera mini/i.test(lower);

  const deviceCategory = isTablet
    ? "TABLET"
    : isMobile
    ? "MOBILE"
    : "DESKTOP";

  let osName = "Other OS";
  if (lower.includes("iphone") || lower.includes("ipad")) osName = "iOS";
  else if (lower.includes("android")) osName = "Android";
  else if (lower.includes("windows")) osName = "Windows";
  else if (lower.includes("mac os")) osName = "macOS";
  else if (lower.includes("linux")) osName = "Linux";

  let browserName = "Browser";
  if (lower.includes("edg/")) browserName = "Edge";
  else if (lower.includes("chrome/")) browserName = "Chrome";
  else if (lower.includes("safari/") && !lower.includes("chrome"))
    browserName = "Safari";
  else if (lower.includes("firefox/")) browserName = "Firefox";

  return { deviceCategory, osName, browserName };
}

export async function POST(req: NextRequest) {
  try {
    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "127.0.0.1";
    const rate = checkRateLimit(`scan:${ip}`, 20, 60_000);
    if (!rate.allowed) {
      return NextResponse.json({ recorded: false, reason: "rate_limited" });
    }

    const ua = req.headers.get("user-agent") || "Unknown";
    const dayKey = new Date().toISOString().slice(0, 10);
    const visitorHash = crypto
      .createHash("sha256")
      .update(`${ip}::${ua}::${dayKey}::hezlon-privacy-salt`)
      .digest("hex")
      .slice(0, 24);

    // Avoid counting page refreshes within 30 minutes as a new scan
    const thirtyMinsAgo = new Date(Date.now() - 30 * 60 * 1000);
    const recentDuplicate = await prisma.qRScan.findFirst({
      where: {
        visitorHash,
        scannedAt: { gte: thirtyMinsAgo },
      },
    });

    if (recentDuplicate) {
      return NextResponse.json({
        recorded: false,
        deduplicated: true,
      });
    }

    // Check if this visitor already scanned earlier today
    const startOfToday = new Date(dayKey);
    const existingToday = await prisma.qRScan.findFirst({
      where: {
        visitorHash,
        scannedAt: { gte: startOfToday },
      },
    });

    const { deviceCategory, osName, browserName } = parseUserAgent(ua);
    const country =
      req.headers.get("x-vercel-ip-country") ||
      req.headers.get("cf-ipcountry") ||
      "Direct / Regional";
    const city = req.headers.get("x-vercel-ip-city") || "Verified Scan";

    let bodyRef = "QR_CODE";
    try {
      const body = await req.json();
      if (body.referrer) bodyRef = String(body.referrer).slice(0, 100);
    } catch {
      // ignore empty body
    }

    await prisma.qRScan.create({
      data: {
        qrCodeId: "hezlon-permanent-qr",
        visitorHash,
        deviceCategory,
        osName,
        browserName,
        country,
        city,
        referrer: bodyRef,
        isUniqueDaily: !existingToday,
      },
    });

    return NextResponse.json({
      recorded: true,
      isUniqueDaily: !existingToday,
    });
  } catch (error) {
    console.error("Record QR scan error:", error);
    return NextResponse.json({ recorded: false }, { status: 500 });
  }
}

