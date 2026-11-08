"use client";

import React, { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  ShieldCheck,
  Lock,
  Mail,
  KeyRound,
  ArrowRight,
  AlertCircle,
  CheckCircle2,
  Eye,
  EyeOff,
  QrCode,
} from "lucide-react";

function LoginFormContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectPath = searchParams.get("redirect") || "/admin";

  const [mode, setMode] = useState<"LOGIN" | "RECOVER">("LOGIN");
  const [email, setEmail] = useState("Casrycasry40@gmail.com");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // Recovery state
  const [recoveryPin, setRecoveryPin] = useState("");
  const [newPassword, setNewPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccessMsg("");

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Invalid administrator credentials");
        setLoading(false);
        return;
      }

      router.push(redirectPath);
      router.refresh();
    } catch {
      setError("Network error while signing in. Please try again.");
      setLoading(false);
    }
  };

  const handleRecover = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccessMsg("");

    try {
      const res = await fetch("/api/auth/recover", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          recoveryPin,
          newPassword,
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to reset password");
        setLoading(false);
        return;
      }

      setSuccessMsg(
        data.message || "Password reset successfully! You can now sign in."
      );
      setPassword(newPassword);
      setMode("LOGIN");
      setLoading(false);
    } catch {
      setError("Network error during password recovery.");
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md bg-forest-900/95 border border-gold/30 rounded-2xl shadow-2xl p-8 backdrop-blur-md">
      {/* Crest Header */}
      <div className="flex flex-col items-center text-center mb-7">
        <div className="w-14 h-14 rounded-xl bg-forest-800 border-2 border-gold flex items-center justify-center font-serif font-bold text-2xl text-gold shadow-gold-glow mb-3">
          H
        </div>
        <div className="text-[11px] uppercase tracking-[0.25em] text-gold font-semibold">
          HEZLON BUSINESS CARD STUDIO
        </div>
        <h1 className="text-2xl font-serif font-bold text-cream mt-1">
          {mode === "LOGIN"
            ? "Administrator Sign In"
            : "Owner Password Recovery"}
        </h1>
        <p className="text-xs text-cream/65 mt-1">
          Dedicated Single-Company Portal • HEZLON Building Solutions
        </p>
      </div>

      {error && (
        <div className="mb-5 p-3.5 rounded-xl bg-rose-950/80 border border-rose-500/40 text-rose-200 text-xs flex items-start gap-2.5">
          <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {successMsg && (
        <div className="mb-5 p-3.5 rounded-xl bg-emerald-950/80 border border-emerald-500/40 text-emerald-200 text-xs flex items-start gap-2.5">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
          <span>{successMsg}</span>
        </div>
      )}

      {mode === "LOGIN" ? (
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-gold mb-1.5">
              Authorized Administrator Email
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-gold/70 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Casrycasry40@gmail.com"
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-forest-950/90 border border-gold/25 text-cream text-sm focus:outline-none focus:border-gold"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-semibold uppercase tracking-wider text-gold">
                Password
              </label>
              <button
                type="button"
                onClick={() => {
                  setMode("RECOVER");
                  setError("");
                  setSuccessMsg("");
                }}
                className="text-[11px] text-gold/80 hover:text-gold underline"
              >
                Forgot password?
              </button>
            </div>
            <div className="relative">
              <Lock className="w-4 h-4 text-gold/70 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type={showPassword ? "text" : "password"}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter administrator password"
                className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-forest-950/90 border border-gold/25 text-cream text-sm focus:outline-none focus:border-gold"
              />
              <button
                type="button"
                onClick={() => setShowPassword((s) => !s)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-cream/60 hover:text-gold"
              >
                {showPassword ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl bg-gold text-forest-950 font-bold text-xs uppercase tracking-widest hover:bg-gold-300 transition flex items-center justify-center gap-2 shadow-gold-glow disabled:opacity-50"
          >
            <ShieldCheck className="w-4 h-4" />
            <span>{loading ? "Verifying Access..." : "Sign In to Studio"}</span>
            <ArrowRight className="w-4 h-4" />
          </button>

          <div className="pt-3 border-t border-gold/15 flex items-center justify-between text-[11px] text-cream/60">
            <span>Single-owner system (No public signup)</span>
            <button
              type="button"
              onClick={() => {
                setEmail("Casrycasry40@gmail.com");
                setPassword("HezlonAdmin!2026");
              }}
              className="text-gold hover:underline font-mono"
            >
              Fill Default Credentials
            </button>
          </div>
        </form>
      ) : (
        <form onSubmit={handleRecover} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-gold mb-1.5">
              Administrator Email
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-forest-950/90 border border-gold/25 text-cream text-sm focus:outline-none focus:border-gold"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-gold mb-1.5">
              Security Recovery PIN (Default: 2026)
            </label>
            <div className="relative">
              <KeyRound className="w-4 h-4 text-gold/70 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="password"
                required
                value={recoveryPin}
                onChange={(e) => setRecoveryPin(e.target.value)}
                placeholder="Enter 4-digit owner PIN"
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-forest-950/90 border border-gold/25 text-cream text-sm focus:outline-none focus:border-gold"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-gold mb-1.5">
              New Administrator Password (min 8 chars)
            </label>
            <input
              type="password"
              required
              minLength={8}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Enter new strong password"
              className="w-full px-3.5 py-2.5 rounded-xl bg-forest-950/90 border border-gold/25 text-cream text-sm focus:outline-none focus:border-gold"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl bg-gold text-forest-950 font-bold text-xs uppercase tracking-widest hover:bg-gold-300 transition flex items-center justify-center gap-2"
          >
            <span>{loading ? "Resetting..." : "Reset Owner Password"}</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setMode("LOGIN");
              setError("");
            }}
            className="w-full py-2 text-xs text-cream/70 hover:text-gold text-center"
          >
            ← Back to Administrator Sign In
          </button>
        </form>
      )}
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-forest-950 text-cream flex flex-col justify-between p-6 relative overflow-hidden">
      <div
        className="pointer-events-none absolute inset-0 opacity-10"
        style={{
          backgroundImage:
            "linear-gradient(to right, #C9A96E 1px, transparent 1px), linear-gradient(to bottom, #C9A96E 1px, transparent 1px)",
          backgroundSize: "56px 56px",
        }}
      />

      <div className="relative z-10 flex items-center justify-between max-w-6xl w-full mx-auto">
        <Link
          href="/"
          className="text-xs font-semibold tracking-wider uppercase text-gold hover:underline"
        >
          ← HEZLON Portal Home
        </Link>
        <Link
          href="/hezlon"
          className="flex items-center gap-1.5 text-xs text-cream/80 hover:text-gold"
        >
          <QrCode className="w-3.5 h-3.5 text-gold" />
          <span>Public Digital Profile</span>
        </Link>
      </div>

      <div className="relative z-10 flex items-center justify-center my-auto py-8">
        <Suspense
          fallback={
            <div className="text-gold text-sm font-serif">
              Loading HEZLON Security Gateway...
            </div>
          }
        >
          <LoginFormContent />
        </Suspense>
      </div>

      <div className="relative z-10 text-center text-[11px] text-cream/50">
        HEZLON Building Solutions • Restricted Single-Administrator Environment
      </div>
    </div>
  );
}

