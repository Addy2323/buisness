import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import {
  createSessionToken,
  logAuditEvent,
  requireAdminApi,
  SESSION_COOKIE_NAME,
} from "@/lib/auth";

const accountUpdateSchema = z.object({
  name: z.string().min(2).optional(),
  email: z.string().email().optional(),
  currentPassword: z.string().optional(),
  newPassword: z.string().min(8).optional(),
  newRecoveryPin: z.string().min(4).max(12).optional(),
});

export async function GET(req: NextRequest) {
  const session = await requireAdminApi(req);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = await prisma.adminUser.findFirst({
    where: { id: session.userId },
  }) || await prisma.adminUser.findFirst();

  const auditLogs = await prisma.auditLog.findMany({
    orderBy: { createdAt: "desc" },
    take: 25,
  });

  return NextResponse.json({
    admin: admin
      ? {
          id: admin.id,
          email: admin.email,
          name: admin.name,
          role: admin.role,
          lastLoginAt: admin.lastLoginAt,
        }
      : null,
    auditLogs,
  });
}

export async function PUT(req: NextRequest) {
  const session = await requireAdminApi(req);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const parsed = accountUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Invalid input" },
        { status: 400 }
      );
    }

    const admin =
      (await prisma.adminUser.findFirst({ where: { id: session.userId } })) ||
      (await prisma.adminUser.findFirst());

    if (!admin) {
      return NextResponse.json({ error: "Admin not found" }, { status: 404 });
    }

    const updateData: Record<string, string> = {};

    if (parsed.data.name) {
      updateData.name = parsed.data.name.trim();
    }
    if (parsed.data.email) {
      updateData.email = parsed.data.email.trim();
    }

    if (parsed.data.newPassword) {
      if (!parsed.data.currentPassword) {
        return NextResponse.json(
          { error: "Current password is required to set a new password" },
          { status: 400 }
        );
      }
      const matches = await bcrypt.compare(
        parsed.data.currentPassword,
        admin.passwordHash
      );
      if (!matches) {
        return NextResponse.json(
          { error: "Current password is incorrect" },
          { status: 401 }
        );
      }
      updateData.passwordHash = await bcrypt.hash(parsed.data.newPassword, 12);
    }

    if (parsed.data.newRecoveryPin) {
      updateData.recoveryPinHash = await bcrypt.hash(
        parsed.data.newRecoveryPin.trim(),
        10
      );
    }

    const updated = await prisma.adminUser.update({
      where: { id: admin.id },
      data: updateData,
    });

    await logAuditEvent({
      action: "ADMIN_ACCOUNT_UPDATED",
      entityType: "AdminUser",
      entityId: updated.id,
      summary: `Updated administrator account settings (${updated.email})`,
    });

    const newToken = await createSessionToken({
      userId: updated.id,
      email: updated.email,
      name: updated.name,
      role: updated.role,
    });

    const response = NextResponse.json({
      admin: {
        id: updated.id,
        email: updated.email,
        name: updated.name,
        role: updated.role,
      },
      message: "Administrator account updated successfully",
    });

    response.cookies.set(SESSION_COOKIE_NAME, newToken, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    });

    return response;
  } catch (error) {
    console.error("Update account error:", error);
    return NextResponse.json(
      { error: "Failed to update account settings" },
      { status: 500 }
    );
  }
}

