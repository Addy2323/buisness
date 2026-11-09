/**
 * Single source of truth for the permanent QR destination URL.
 *
 * Resolution order:
 *  1. Admin "Production Domain Override" (QRCode.customBaseDomain)
 *  2. NEXT_PUBLIC_APP_URL — only if it is NOT a localhost address
 *  3. The public host the request came in on (honours Nginx/proxy
 *     X-Forwarded-Host / X-Forwarded-Proto headers)
 *
 * This guarantees printed cards never encode a localhost URL that a
 * phone camera cannot open.
 */

function isLocalHost(value: string): boolean {
  return /(^|\/\/)(localhost|127\.0\.0\.1|0\.0\.0\.0)(:|\/|$)/i.test(value);
}

function normaliseBase(base: string): string {
  const trimmed = base.trim().replace(/\/+$/, "");
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
}

export function resolveQrDestinationUrl(
  headers: Headers,
  customBaseDomain: string | null | undefined,
  slug: string | null | undefined
): string {
  const cleanSlug = (slug || "hezlon").replace(/^\/+/, "");

  if (customBaseDomain && customBaseDomain.trim().length > 0) {
    return `${normaliseBase(customBaseDomain)}/${cleanSlug}`;
  }

  const envBase = process.env.NEXT_PUBLIC_APP_URL;
  if (envBase && envBase.trim().length > 0 && !isLocalHost(envBase)) {
    return `${normaliseBase(envBase)}/${cleanSlug}`;
  }

  const forwardedHost = headers.get("x-forwarded-host")?.split(",")[0]?.trim();
  const host = forwardedHost || headers.get("host") || "localhost:3000";
  const forwardedProto = headers
    .get("x-forwarded-proto")
    ?.split(",")[0]
    ?.trim();
  const proto = isLocalHost(host) ? "http" : forwardedProto || "https";
  return `${proto}://${host}/${cleanSlug}`;
}

