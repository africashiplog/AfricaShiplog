import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { prisma } from "@/lib/db";
import { verifyPassword } from "@/lib/auth/password";
import { createSession } from "@/lib/auth/session";
import { loginSchema } from "@/lib/validation/auth";
import { writeAuditLog } from "@/lib/audit";
import { checkRateLimit } from "@/lib/rate-limit";

export async function POST(req: NextRequest) {
  const h = await headers();
  const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? h.get("x-real-ip") ?? "unknown";

  if (!checkRateLimit(`login:${ip}`, 10, 60_000)) {
    return NextResponse.json(
      { error: "rate_limited", message: "محاولات كثيرة جدًا، حاول لاحقًا" },
      { status: 429 }
    );
  }

  const body = await req.json().catch(() => null);
  const parsed = loginSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid_input", message: "بيانات الدخول غير صالحة" },
      { status: 400 }
    );
  }

  const { email, password } = parsed.data;
  const user = await prisma.user.findUnique({ where: { email, deletedAt: null } });
  const genericError = NextResponse.json(
    { error: "invalid_credentials", message: "البريد الإلكتروني أو كلمة المرور غير صحيحة" },
    { status: 401 }
  );

  if (!user) return genericError;
  if (!user.isActive) {
    return NextResponse.json(
      { error: "account_disabled", message: "هذا الحساب معطل. يرجى مراجعة الإدارة" },
      { status: 403 }
    );
  }

  const validPassword = await verifyPassword(password, user.passwordHash);
  if (!validPassword) return genericError;

  await createSession(user.id);
  await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
  await writeAuditLog({ userId: user.id, action: "LOGIN", entityType: "User", entityId: user.id, branchId: user.branchId });

  return NextResponse.json({
    user: {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      fullNameAr: user.fullNameAr,
      mustChangePassword: user.mustChangePassword,
    },
  });
}
