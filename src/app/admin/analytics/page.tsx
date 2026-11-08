"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  BarChart3,
  Smartphone,
  Globe,
  Calendar,
  Users,
  QrCode,
  ExternalLink,
  RefreshCw,
} from "lucide-react";

interface AnalyticsData {
  summary: {
    totalScans: number;
    uniqueVisitors: number;
    dailyScans: number;
    weeklyScans: number;
    monthlyScans: number;
  };
  dailySeries: {
    date: string;
    label: string;
    scans: number;
    unique: number;
  }[];
  devices: {
    device: string;
    count: number;
    percentage: number;
  }[];
  geography: {
    country: string;
    count: number;
    percentage: number;
  }[];
  recentScans: {
    id: string;
    deviceCategory: string;
    osName: string;
    browserName: string;
    country: string;
    referrer: string;
    isUniqueDaily: boolean;
    scannedAt: string;
  }[];
}

export default function QrAnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  const loadAnalytics = () => {
    setLoading(true);
    fetch("/api/admin/analytics")
      .then((r) => r.json())
      .then((res) => {
        setData(res);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  useEffect(() => {
    loadAnalytics();
  }, []);

  if (loading) {
    return (
      <div className="p-12 text-center text-sm text-charcoal-500">
        Loading HEZLON QR scan telemetry...
      </div>
    );
  }

  const summary = data?.summary || {
    totalScans: 0,
    uniqueVisitors: 0,
    dailyScans: 0,
    weeklyScans: 0,
    monthlyScans: 0,
  };

  const maxDayScans = Math.max(
    1,
    ...(data?.dailySeries?.map((d) => d.scans) || [1])
  );

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="bg-white rounded-2xl p-6 border border-charcoal-100 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-serif font-bold text-forest-950 flex items-center gap-2.5">
            <BarChart3 className="w-6 h-6 text-gold-700" />
            <span>QR Code Scan Analytics</span>
          </h1>
          <p className="text-xs text-charcoal-500 mt-1">
            Real-time, privacy-respecting scan analytics for the permanent
            HEZLON digital profile (<span className="font-mono">/hezlon</span>
            ). Rapid page refreshes are automatically deduplicated.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={loadAnalytics}
            className="px-3.5 py-2 rounded-xl border border-charcoal-200 text-xs font-semibold hover:bg-cream flex items-center gap-1.5"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Refresh</span>
          </button>
          <Link
            href="/hezlon"
            target="_blank"
            className="px-4 py-2 rounded-xl bg-forest-900 text-gold text-xs font-bold uppercase tracking-wider flex items-center gap-1.5"
          >
            <QrCode className="w-3.5 h-3.5" />
            <span>Visit /hezlon</span>
            <ExternalLink className="w-3 h-3" />
          </Link>
        </div>
      </div>

      {/* Summary Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-white rounded-2xl p-5 border border-charcoal-100 shadow-sm">
          <div className="text-xs font-bold uppercase tracking-wider text-charcoal-500">
            Total QR Scans
          </div>
          <div className="text-3xl font-serif font-bold text-forest-950 mt-2">
            {summary.totalScans}
          </div>
          <div className="text-[11px] text-charcoal-500 mt-1">
            All-time verified scans
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-charcoal-100 shadow-sm">
          <div className="text-xs font-bold uppercase tracking-wider text-charcoal-500 flex items-center justify-between">
            <span>Unique Visitors</span>
            <Users className="w-4 h-4 text-gold-700" />
          </div>
          <div className="text-3xl font-serif font-bold text-forest-950 mt-2">
            {summary.uniqueVisitors}
          </div>
          <div className="text-[11px] text-charcoal-500 mt-1">
            Deduplicated visitor hashes
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-charcoal-100 shadow-sm">
          <div className="text-xs font-bold uppercase tracking-wider text-charcoal-500 flex items-center justify-between">
            <span>Today&apos;s Scans</span>
            <Calendar className="w-4 h-4 text-emerald-700" />
          </div>
          <div className="text-3xl font-serif font-bold text-forest-950 mt-2">
            {summary.dailyScans}
          </div>
          <div className="text-[11px] text-charcoal-500 mt-1">
            Current 24-hour window
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-charcoal-100 shadow-sm">
          <div className="text-xs font-bold uppercase tracking-wider text-charcoal-500">
            Weekly Scans
          </div>
          <div className="text-3xl font-serif font-bold text-forest-950 mt-2">
            {summary.weeklyScans}
          </div>
          <div className="text-[11px] text-charcoal-500 mt-1">Last 7 days</div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-charcoal-100 shadow-sm">
          <div className="text-xs font-bold uppercase tracking-wider text-charcoal-500">
            Monthly Scans
          </div>
          <div className="text-3xl font-serif font-bold text-forest-950 mt-2">
            {summary.monthlyScans}
          </div>
          <div className="text-[11px] text-charcoal-500 mt-1">Last 30 days</div>
        </div>
      </div>

      {/* 14-Day Daily Scan Chart & Device / Geography Breakdown */}
      <div className="grid lg:grid-cols-12 gap-6">
        <div className="lg:col-span-7 bg-white rounded-2xl p-6 border border-charcoal-100 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-serif font-bold text-forest-950">
                14-Day Scan Activity
              </h2>
              <p className="text-xs text-charcoal-500">
                Daily QR scan volume for HEZLON Building Solutions
              </p>
            </div>
          </div>

          <div className="h-52 flex items-end gap-2 pt-6 border-b border-charcoal-100 pb-2">
            {(data?.dailySeries || []).map((day) => {
              const heightPct = Math.max(
                6,
                Math.round((day.scans / maxDayScans) * 100)
              );
              return (
                <div
                  key={day.date}
                  className="flex-1 flex flex-col items-center gap-1.5 group"
                >
                  <span className="text-[10px] font-mono font-bold text-forest-900">
                    {day.scans > 0 ? day.scans : ""}
                  </span>
                  <div
                    style={{ height: `${heightPct}%` }}
                    className={`w-full rounded-t-lg transition-all ${
                      day.scans > 0
                        ? "bg-gradient-to-t from-forest-900 to-gold"
                        : "bg-cream-200"
                    }`}
                  />
                  <span className="text-[9px] text-charcoal-500 rotate-[-30deg] origin-top-left mt-1 whitespace-nowrap">
                    {day.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Device Category & Geographical Distribution */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white rounded-2xl p-6 border border-charcoal-100 shadow-sm space-y-3">
            <h3 className="text-sm font-serif font-bold text-forest-950 flex items-center gap-2">
              <Smartphone className="w-4 h-4 text-gold-700" />
              <span>Device Category Breakdown</span>
            </h3>
            <div className="space-y-2.5">
              {(data?.devices || []).map((d) => (
                <div key={d.device} className="space-y-1 text-xs">
                  <div className="flex items-center justify-between font-semibold">
                    <span>{d.device}</span>
                    <span className="font-mono">
                      {d.count} ({d.percentage}%)
                    </span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-cream overflow-hidden">
                    <div
                      style={{ width: `${Math.max(4, d.percentage)}%` }}
                      className="h-full bg-forest-900 rounded-full"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-2xl p-6 border border-charcoal-100 shadow-sm space-y-3">
            <h3 className="text-sm font-serif font-bold text-forest-950 flex items-center gap-2">
              <Globe className="w-4 h-4 text-gold-700" />
              <span>Approximate Geographical Distribution</span>
            </h3>
            {!data?.geography || data.geography.length === 0 ? (
              <p className="text-xs text-charcoal-500">
                No regional scan data recorded yet. Open{" "}
                <Link href="/hezlon" className="text-forest-800 underline">
                  /hezlon
                </Link>{" "}
                to record your first scan event.
              </p>
            ) : (
              <div className="space-y-2">
                {data.geography.map((g) => (
                  <div
                    key={g.country}
                    className="flex items-center justify-between text-xs p-2 rounded-lg bg-cream/50"
                  >
                    <span className="font-semibold text-forest-950">
                      {g.country}
                    </span>
                    <span className="font-mono text-charcoal-600">
                      {g.count} scans ({g.percentage}%)
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Recent Scan Events Log */}
      <div className="bg-white rounded-2xl p-6 border border-charcoal-100 shadow-sm space-y-4">
        <h2 className="text-base font-serif font-bold text-forest-950">
          Recent Verified QR Scan Events
        </h2>

        {!data?.recentScans || data.recentScans.length === 0 ? (
          <div className="p-8 rounded-xl border border-dashed border-charcoal-200 text-center text-xs text-charcoal-500">
            No QR scans have been recorded yet. Visit{" "}
            <Link
              href="/hezlon"
              target="_blank"
              className="font-bold text-forest-900 underline"
            >
              /hezlon
            </Link>{" "}
            to test a real scan event.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-charcoal-100 text-charcoal-500 uppercase text-[10px]">
                  <th className="py-2.5 px-3">Timestamp</th>
                  <th className="py-2.5 px-3">Device Category</th>
                  <th className="py-2.5 px-3">OS / Browser</th>
                  <th className="py-2.5 px-3">Region</th>
                  <th className="py-2.5 px-3">Source</th>
                  <th className="py-2.5 px-3">Visitor Type</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-charcoal-100">
                {data.recentScans.map((s) => (
                  <tr key={s.id} className="hover:bg-cream/40">
                    <td className="py-2.5 px-3 font-mono">
                      {new Date(s.scannedAt).toLocaleString()}
                    </td>
                    <td className="py-2.5 px-3 font-bold text-forest-900">
                      {s.deviceCategory}
                    </td>
                    <td className="py-2.5 px-3">
                      {s.osName} • {s.browserName}
                    </td>
                    <td className="py-2.5 px-3">{s.country}</td>
                    <td className="py-2.5 px-3 font-mono text-[11px]">
                      {s.referrer}
                    </td>
                    <td className="py-2.5 px-3">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          s.isUniqueDaily
                            ? "bg-emerald-100 text-emerald-800"
                            : "bg-cream text-charcoal-600"
                        }`}
                      >
                        {s.isUniqueDaily ? "Unique Daily" : "Repeat Visit"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

