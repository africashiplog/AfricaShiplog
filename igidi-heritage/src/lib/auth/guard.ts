import { redirect } from "next/navigation";
import { NextResponse } from "next/server";
import { getCurrentUser, type SessionUser } from "./session";
import { can, type Capability } from "./permissions";

export class AuthError extends Error {
  constructor(public status: 401 | 403, message: string) {
    super(message);
  }
}

/** For server components/pages: redirects to login (or shows 403 page) on failure. */
export async function requirePageUser(capability: Capability = "admin.view"): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.mustChangePassword) redirect("/admin/account?force=1");
  if (!can(user.role, capability)) redirect("/admin?denied=1");
  return user;
}

/** For server actions: throws AuthError (caught by the action wrapper). */
export async function requireActionUser(capability: Capability): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) throw new AuthError(401, "انتهت الجلسة، الرجاء تسجيل الدخول من جديد");
  if (!can(user.role, capability)) throw new AuthError(403, "ليست لديك صلاحية لتنفيذ هذا الإجراء");
  return user;
}

/** For route handlers: returns a ready 401/403 response on failure. */
export async function requireApiUser(capability: Capability): Promise<SessionUser | NextResponse> {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!can(user.role, capability)) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  return user;
}
