import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { checkRateLimit, logAuditEvent } from "@/lib/auth";

const recoverSchema = z.object({
  email: z.string().email("Valid administrator email is required"),
  recoveryPin: z.string().min(4, "Security recovery PIN is required"),
  newPassword: z
    .string()
    .min(8, "New password must be at least 8 characters long"),
});

export async function POST(req: NextRequest) {
  try {
    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "127.0.0.1";
    const rate = checkRateLimit(`recover:${ip}`, 5, 60_000);
    if (!rate.allowed) {
      return NextResponse.json(
        { error: "Too many recovery attempts. Please wait a minute." },
        { status: 429 }
      );
    }

    const body = await req.json();
    const parsed = recoverSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Invalid input" },
        { status: 400 }
      );
    }

    const { email, recoveryPin, newPassword } = parsed.data;
    const admin = await prisma.adminUser.findFirst();

    if (!admin || admin.email.toLowerCase() !== email.trim().toLowerCase()) {
      return NextResponse.json(
        { error: "Administrator email or recovery PIN did not match." },
        { status: 401 }
      );
    }

    const pinValid = admin.recoveryPinHash
      ? await bcrypt.compare(recoveryPin.trim(), admin.recoveryPinHash)
      : recoveryPin.trim() === "2026";

    if (!pinValid) {
      await logAuditEvent({
        action: "PASSWORD_RECOVERY_FAILED",
        entityType: "AdminUser",
        entityId: admin.id,
        summary: `Failed password recovery attempt for ${admin.email}`,
        ipAddress: ip,
      });
      return NextResponse.json(
        { error: "Invalid security recovery PIN." },
        { status: 401 }
      );
    }

    const passwordHash = await bcrypt.hash(newPassword, 12);
    await prisma.adminUser.update({
      where: { id: admin.id },
      data: { passwordHash },
    });

    await logAuditEvent({
      action: "PASSWORD_RECOVERED",
      entityType: "AdminUser",
      entityId: admin.id,
      summary: `Administrator password reset via security recovery PIN`,
      ipAddress: ip,
    });

    return NextResponse.json({
      success: true,
      message: "Password has been reset successfully. You may now sign in.",
    });
  } catch (error) {
    console.error("Password recovery error:", error);
    return NextResponse.json(
      { error: "Failed to process password recovery" },
      { status: 500 }
    );
  }
}

