import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { NextRequest } from "next/server";
import { prisma } from "./prisma";

export const SESSION_COOKIE_NAME = "hezlon_admin_session";

function getJwtSecretKey(): Uint8Array {
  const secret =
    process.env.JWT_SECRET ||
    "hezlon-building-solutions-ultra-secure-jwt-secret-key-2026";
  return new TextEncoder().encode(secret);
}

export interface SessionPayload {
  userId: string;
  email: string;
  name: string;
  role: string;
}

export async function createSessionToken(payload: SessionPayload): Promise<string> {
  return await new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(getJwtSecretKey());
}

export async function verifySessionToken(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getJwtSecretKey());
    if (!payload.userId || !payload.email) return null;
    return {
      userId: String(payload.userId),
      email: String(payload.email),
      name: String(payload.name || "HEZLON Administrator"),
      role: String(payload.role || "OWNER_ADMIN"),
    };
  } catch {
    return null;
  }
}

export async function getAdminSession(): Promise<SessionPayload | null> {
  try {
    const cookieStore = cookies();
    const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
    if (!token) return null;
    return await verifySessionToken(token);
  } catch {
    return null;
  }
}

export async function requireAdminApi(req?: NextRequest): Promise<SessionPayload | null> {
  if (req) {
    const token = req.cookies.get(SESSION_COOKIE_NAME)?.value;
    if (token) {
      return await verifySessionToken(token);
    }
  }
  return await getAdminSession();
}

// Simple rate limiter per IP + key
const rateLimitStore = new Map<string, { count: number; resetAt: number }>();

export function checkRateLimit(
  identifier: string,
  maxRequests = 15,
  windowMs = 60_000
): { allowed: boolean; remaining: number } {
  const now = Date.now();
  const entry = rateLimitStore.get(identifier);

  if (!entry || now > entry.resetAt) {
    rateLimitStore.set(identifier, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: maxRequests - 1 };
  }

  if (entry.count >= maxRequests) {
    return { allowed: false, remaining: 0 };
  }

  entry.count += 1;
  return { allowed: true, remaining: maxRequests - entry.count };
}

export async function logAuditEvent(params: {
  action: string;
  entityType: string;
  entityId?: string;
  summary: string;
  ipAddress?: string;
}) {
  try {
    await prisma.auditLog.create({
      data: {
        action: params.action,
        entityType: params.entityType,
        entityId: params.entityId || "",
        summary: params.summary,
        ipAddress: params.ipAddress || "127.0.0.1",
      },
    });
  } catch (err) {
    console.error("Audit log error:", err);
  }
}

