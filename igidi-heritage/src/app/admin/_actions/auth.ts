"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { refresh } from "next/cache";
import type { UserRole } from "@prisma/client";
import { prisma } from "@/lib/db";
import { createSession, destroySession, getCurrentUser, revokeAllSessions } from "@/lib/auth/session";
import { hashPassword, verifyPassword, passwordPolicyError } from "@/lib/auth/password";
import { requireActionUser } from "@/lib/auth/guard";
import { checkRateLimit } from "@/lib/rate-limit";
import { runAction, str, bool, oneOf, ValidationError, type ActionResult } from "@/lib/forms";
import { recordRevision } from "@/lib/revisions";

const DUMMY_HASH = "$2b$12$.yyZfgoFTirJcC.bHgyBK.rv6KoxJulMp76eVBJ0Td/y7UHykNlyG";

export async function loginAction(_: ActionResult, fd: FormData): Promise<ActionResult> {
  const email = (str(fd, "email", 300) ?? "").toLowerCase();
  const password = (fd.get("password") as string | null) ?? "";
  const h = await headers();
  const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
  if (!checkRateLimit(`login:${ip}`, 10, 15 * 60 * 1000) || !checkRateLimit(`login:${email}`, 8, 15 * 60 * 1000)) {
    return { ok: false, message: "محاولات كثيرة. حاول بعد 15 دقيقة.", at: Date.now() };
  }
  const user = email ? await prisma.user.findUnique({ where: { email } }) : null;
  // Constant-ish time: always run one bcrypt comparison
  const valid = await verifyPassword(password, user?.passwordHash ?? DUMMY_HASH);
  if (!user || !valid || !user.isActive) {
    return { ok: false, message: "البريد الإلكتروني أو كلمة المرور غير صحيحة", at: Date.now() };
  }
  await createSession(user.id);
  await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
  const next = str(fd, "next", 300);
  redirect(user.mustChangePassword ? "/admin/account?force=1" : next && next.startsWith("/admin") ? next : "/admin");
}

export async function logoutAction() {
  await destroySession();
  redirect("/login");
}

export async function changePasswordAction(_: ActionResult, fd: FormData): Promise<ActionResult> {
  return runAction(async () => {
    const me = await getCurrentUser();
    if (!me) throw new ValidationError({}, "انتهت الجلسة");
    const current = (fd.get("current") as string) ?? "";
    const next = (fd.get("next") as string) ?? "";
    const confirm = (fd.get("confirm") as string) ?? "";
    const user = await prisma.user.findUniqueOrThrow({ where: { id: me.id } });
    if (!(await verifyPassword(current, user.passwordHash))) throw new ValidationError({ current: "كلمة المرور الحالية غير صحيحة" });
    const policy = passwordPolicyError(next);
    if (policy) throw new ValidationError({ next: policy });
    if (next !== confirm) throw new ValidationError({ confirm: "التأكيد لا يطابق كلمة المرور الجديدة" });
    await prisma.user.update({ where: { id: me.id }, data: { passwordHash: await hashPassword(next), mustChangePassword: false } });
    await revokeAllSessions(me.id);
    await createSession(me.id);
    return { message: "تم تغيير كلمة المرور ✓ (أُنهيت الجلسات الأخرى)" };
  });
}

const ROLES: UserRole[] = ["ADMIN", "REVIEWER", "EDITOR", "VIEWER"];

export async function saveUserAction(_: ActionResult, fd: FormData): Promise<ActionResult> {
  return runAction(async () => {
    const admin = await requireActionUser("users.manage");
    const id = str(fd, "id", 64);
    const email = (str(fd, "email", 300) ?? "").toLowerCase();
    const name = str(fd, "name", 300);
    const role = oneOf(fd, "role", ROLES, "EDITOR");
    const isActive = id ? bool(fd, "isActive") : true;
    const password = (fd.get("password") as string | null) ?? "";
    const errors: Record<string, string> = {};
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.email = "بريد إلكتروني غير صالح";
    if (!name) errors.name = "الاسم مطلوب";
    if (!id || password) {
      const p = passwordPolicyError(password);
      if (p) errors.password = p;
    }
    if (Object.keys(errors).length) throw new ValidationError(errors);
    if (id === admin.id && (role !== "ADMIN" || !isActive)) {
      throw new ValidationError({}, "لا يمكنك سحب صلاحية الإدارة من حسابك أو تعطيله");
    }
    await prisma.$transaction(async (tx) => {
      if (id) {
        const before = await tx.user.findUniqueOrThrow({ where: { id } });
        const after = await tx.user.update({
          where: { id },
          data: {
            email, name: name!, role, isActive,
            ...(password ? { passwordHash: await hashPassword(password), mustChangePassword: true } : {}),
          },
        });
        if (!isActive || password || before.role !== role) {
          await tx.session.updateMany({ where: { userId: id, revokedAt: null }, data: { revokedAt: new Date() } });
        }
        const { passwordHash: _a, ...b } = before;
        const { passwordHash: _b, ...a } = after;
        void _a; void _b;
        await recordRevision(tx, { entityType: "User", entityId: id, action: "UPDATE", userId: admin.id, before: b, after: a });
      } else {
        const created = await tx.user.create({
          data: { email, name: name!, role, passwordHash: await hashPassword(password), mustChangePassword: true },
        });
        const { passwordHash: _c, ...a } = created;
        void _c;
        await recordRevision(tx, { entityType: "User", entityId: created.id, action: "CREATE", userId: admin.id, after: a });
      }
    });
    refresh();
    return { message: "حُفظ المستخدم ✓" };
  });
}
