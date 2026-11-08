"use client";

import React, { useEffect, useState } from "react";
import {
  UserCog,
  ShieldCheck,
  Save,
  KeyRound,
  CheckCircle2,
  AlertCircle,
  History,
} from "lucide-react";

interface AuditLogEntry {
  id: string;
  action: string;
  entityType: string;
  summary: string;
  ipAddress: string;
  createdAt: string;
}

export default function AccountSettingsPage() {
  const [name, setName] = useState("HEZLON Administrator");
  const [email, setEmail] = useState("Casrycasry40@gmail.com");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newRecoveryPin, setNewRecoveryPin] = useState("");
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const loadAccount = () => {
    setLoading(true);
    fetch("/api/admin/account")
      .then((r) => r.json())
      .then((res) => {
        if (res.admin) {
          setName(res.admin.name || "HEZLON Administrator");
          setEmail(res.admin.email || "Casrycasry40@gmail.com");
        }
        setAuditLogs(res.auditLogs || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  useEffect(() => {
    loadAccount();
  }, []);

  const handleSaveAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage("");
    setError("");

    try {
      const payload: Record<string, string> = {
        name,
        email,
      };
      if (newPassword.trim()) {
        payload.currentPassword = currentPassword;
        payload.newPassword = newPassword.trim();
      }
      if (newRecoveryPin.trim()) {
        payload.newRecoveryPin = newRecoveryPin.trim();
      }

      const res = await fetch("/api/admin/account", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to update account settings");
      } else {
        setMessage(
          data.message || "Administrator credentials updated successfully!"
        );
        setCurrentPassword("");
        setNewPassword("");
        setNewRecoveryPin("");
        loadAccount();
      }
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="p-12 text-center text-sm text-charcoal-500">
        Loading Administrator Account &amp; Security Audit Logs...
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="bg-white rounded-2xl p-6 border border-charcoal-100 shadow-sm">
        <h1 className="text-2xl font-serif font-bold text-forest-950 flex items-center gap-2.5">
          <UserCog className="w-6 h-6 text-gold-700" />
          <span>Administrator Account &amp; Security Audit</span>
        </h1>
        <p className="text-xs text-charcoal-500 mt-1">
          Dedicated Single-Owner Account for{" "}
          <strong>HEZLON Building Solutions</strong>. Public registration and
          multi-tenant accounts are permanently disabled.
        </p>
      </div>

      {message && (
        <div className="p-4 rounded-xl bg-emerald-950 text-emerald-200 border border-emerald-500/40 text-xs flex items-center gap-2.5">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{message}</span>
        </div>
      )}

      {error && (
        <div className="p-4 rounded-xl bg-rose-950 text-rose-200 border border-rose-500/40 text-xs flex items-center gap-2.5">
          <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div className="grid lg:grid-cols-12 gap-6 items-start">
        {/* Left: Credentials & Password Form */}
        <form
          onSubmit={handleSaveAccount}
          className="lg:col-span-6 bg-white rounded-2xl p-6 border border-charcoal-100 shadow-sm space-y-5"
        >
          <div className="flex items-center gap-2 text-base font-serif font-bold text-forest-950">
            <ShieldCheck className="w-5 h-5 text-gold-700" />
            <span>Authorized Owner Credentials</span>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase text-forest-900 mb-1">
              Administrator Display Name
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-charcoal-200 text-xs font-semibold"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase text-forest-900 mb-1">
              Authorized Login Email
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-charcoal-200 text-xs font-mono"
            />
          </div>

          <hr className="border-charcoal-100" />

          <div className="flex items-center gap-2 text-sm font-serif font-bold text-forest-950">
            <KeyRound className="w-4 h-4 text-gold-700" />
            <span>Change Password &amp; Recovery PIN (Optional)</span>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase text-charcoal-600 mb-1">
              Current Password (Required if setting a new password)
            </label>
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder="Enter current password"
              className="w-full px-3.5 py-2 rounded-xl border border-charcoal-200 text-xs"
            />
          </div>

          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold uppercase text-charcoal-600 mb-1">
                New Password (min 8 chars)
              </label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Leave blank to keep current"
                className="w-full px-3.5 py-2 rounded-xl border border-charcoal-200 text-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase text-charcoal-600 mb-1">
                New Security Recovery PIN
              </label>
              <input
                type="password"
                value={newRecoveryPin}
                onChange={(e) => setNewRecoveryPin(e.target.value)}
                placeholder="Default: 2026"
                className="w-full px-3.5 py-2 rounded-xl border border-charcoal-200 text-xs font-mono"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={saving}
            className="w-full py-3 rounded-xl bg-forest-900 text-gold font-bold text-xs uppercase tracking-wider hover:bg-forest-800 transition flex items-center justify-center gap-2"
          >
            <Save className="w-4 h-4" />
            <span>
              {saving ? "Saving Security Settings..." : "Update Owner Account"}
            </span>
          </button>
        </form>

        {/* Right: Security Audit Trail */}
        <div className="lg:col-span-6 bg-white rounded-2xl p-6 border border-charcoal-100 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-serif font-bold text-forest-950 flex items-center gap-2">
              <History className="w-4 h-4 text-gold-700" />
              <span>Security &amp; Administrative Audit Log</span>
            </h2>
            <span className="text-[11px] font-mono text-charcoal-500">
              Last {auditLogs.length} events
            </span>
          </div>

          <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
            {auditLogs.length === 0 ? (
              <div className="p-6 text-center text-xs text-charcoal-500">
                No audit events recorded yet.
              </div>
            ) : (
              auditLogs.map((log) => (
                <div
                  key={log.id}
                  className="p-3 rounded-xl border border-charcoal-100 bg-cream/40 text-xs flex items-start justify-between gap-3"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded bg-forest-900 text-gold font-mono text-[10px] font-bold">
                        {log.action}
                      </span>
                      <span className="text-[10px] text-charcoal-500 font-mono">
                        {log.entityType}
                      </span>
                    </div>
                    <div className="text-charcoal-800 font-medium mt-1">
                      {log.summary}
                    </div>
                  </div>
                  <div className="text-right text-[10px] text-charcoal-400 font-mono shrink-0">
                    <div>{new Date(log.createdAt).toLocaleDateString()}</div>
                    <div>
                      {new Date(log.createdAt).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

