import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import {
  checkRateLimit,
  createSessionToken,
  logAuditEvent,
  SESSION_COOKIE_NAME,
} from "@/lib/auth";

const loginSchema = z.object({
  email: z.string().email("Please enter a valid administrator email"),
  password: z.string().min(4, "Password is required"),
});

export async function POST(req: NextRequest) {
  try {
    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "127.0.0.1";
    const rate = checkRateLimit(`login:${ip}`, 10, 60_000);
    if (!rate.allowed) {
      return NextResponse.json(
        { error: "Too many login attempts. Please wait a minute and try again." },
        { status: 429 }
      );
    }

    const body = await req.json();
    const parsed = loginSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Invalid login input" },
        { status: 400 }
      );
    }

    const { email, password } = parsed.data;

    // Find admin user (case-insensitive lookup)
    const admin = await prisma.adminUser.findFirst({
      where: {
        email: {
          equals: email.trim(),
        },
      },
    }) || await prisma.adminUser.findFirst();

    if (!admin || admin.email.toLowerCase() !== email.trim().toLowerCase()) {
      await logAuditEvent({
        action: "LOGIN_FAILED",
        entityType: "AdminUser",
        summary: `Failed login attempt for email: ${email}`,
        ipAddress: ip,
      });
      return NextResponse.json(
        { error: "Invalid administrator credentials." },
        { status: 401 }
      );
    }

    const valid = await bcrypt.compare(password, admin.passwordHash);
    if (!valid) {
      await logAuditEvent({
        action: "LOGIN_FAILED",
        entityType: "AdminUser",
        entityId: admin.id,
        summary: `Invalid password entered for ${admin.email}`,
        ipAddress: ip,
      });
      return NextResponse.json(
        { error: "Invalid administrator credentials." },
        { status: 401 }
      );
    }

    await prisma.adminUser.update({
      where: { id: admin.id },
      data: { lastLoginAt: new Date() },
    });

    const token = await createSessionToken({
      userId: admin.id,
      email: admin.email,
      name: admin.name,
      role: admin.role,
    });

    await logAuditEvent({
      action: "ADMIN_LOGIN",
      entityType: "AdminUser",
      entityId: admin.id,
      summary: `Administrator ${admin.email} logged in successfully`,
      ipAddress: ip,
    });

    const response = NextResponse.json({
      success: true,
      user: {
        id: admin.id,
        email: admin.email,
        name: admin.name,
        role: admin.role,
      },
    });

    response.cookies.set(SESSION_COOKIE_NAME, token, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });

    return response;
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json(
      { error: "Internal server error during login" },
      { status: 500 }
    );
  }
}

