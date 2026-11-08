import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminApi } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const session = await requireAdminApi(req);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const startOfMonth = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const allScans = await prisma.qRScan.findMany({
    orderBy: { scannedAt: "desc" },
  });

  const totalScans = allScans.length;
  const uniqueVisitors = new Set(allScans.map((s) => s.visitorHash)).size;

  const dailyScans = allScans.filter((s) => s.scannedAt >= startOfDay).length;
  const weeklyScans = allScans.filter((s) => s.scannedAt >= startOfWeek).length;
  const monthlyScans = allScans.filter(
    (s) => s.scannedAt >= startOfMonth
  ).length;

  // Build 14-day daily chart series
  const dailySeries: { date: string; label: string; scans: number; unique: number }[] = [];
  for (let i = 13; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
    const nextD = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate() - i + 1
    );
    const dayScans = allScans.filter(
      (s) => s.scannedAt >= d && s.scannedAt < nextD
    );
    const dateKey = d.toISOString().slice(0, 10);
    const label = d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
    dailySeries.push({
      date: dateKey,
      label,
      scans: dayScans.length,
      unique: new Set(dayScans.map((x) => x.visitorHash)).size,
    });
  }

  // Device breakdown
  const deviceCounts: Record<string, number> = {
    MOBILE: 0,
    DESKTOP: 0,
    TABLET: 0,
  };
  const countryCounts: Record<string, number> = {};
  const osCounts: Record<string, number> = {};

  for (const scan of allScans) {
    const dev = scan.deviceCategory || "MOBILE";
    deviceCounts[dev] = (deviceCounts[dev] || 0) + 1;

    const country = scan.country || "Direct / Local";
    countryCounts[country] = (countryCounts[country] || 0) + 1;

    const os = scan.osName || "Unknown";
    osCounts[os] = (osCounts[os] || 0) + 1;
  }

  const geography = Object.entries(countryCounts)
    .map(([country, count]) => ({
      country,
      count,
      percentage: totalScans > 0 ? Math.round((count / totalScans) * 100) : 0,
    }))
    .sort((a, b) => b.count - a.count);

  const devices = Object.entries(deviceCounts).map(([device, count]) => ({
    device,
    count,
    percentage: totalScans > 0 ? Math.round((count / totalScans) * 100) : 0,
  }));

  return NextResponse.json({
    summary: {
      totalScans,
      uniqueVisitors,
      dailyScans,
      weeklyScans,
      monthlyScans,
    },
    dailySeries,
    devices,
    geography,
    recentScans: allScans.slice(0, 20),
  });
}

