import { NextRequest, NextResponse } from "next/server";
import { getAdminSession, logAuditEvent, SESSION_COOKIE_NAME } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const session = await getAdminSession();
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "127.0.0.1";

  if (session) {
    await logAuditEvent({
      action: "ADMIN_LOGOUT",
      entityType: "AdminUser",
      entityId: session.userId,
      summary: `Administrator ${session.email} logged out`,
      ipAddress: ip,
    });
  }

  const response = NextResponse.json({ success: true });
  response.cookies.set(SESSION_COOKIE_NAME, "", {
    httpOnly: true,
    path: "/",
    maxAge: 0,
  });

  return response;
}

