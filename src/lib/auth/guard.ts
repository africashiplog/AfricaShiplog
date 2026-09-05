import { NextResponse } from "next/server";
import { getCurrentUser, userHasPermission, type CurrentUser } from "./current-user";

/**
 * Route-handler guard. Usage:
 *
 *   const auth = await requireAuth("tickets.create");
 *   if (auth instanceof NextResponse) return auth;
 *   const { user } = auth;
 *
 * Returns a ready-to-return 401/403 NextResponse on failure, or `{ user }` on success —
 * this is where permissions are actually enforced, not just in the UI.
 */
export async function requireAuth(
  permissionCode?: string
): Promise<{ user: CurrentUser } | NextResponse> {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json(
      { error: "unauthorized", message: "الرجاء تسجيل الدخول للمتابعة" },
      { status: 401 }
    );
  }
  if (permissionCode && !userHasPermission(user, permissionCode)) {
    return NextResponse.json(
      { error: "forbidden", message: "غير مصرح لك بتنفيذ هذا الإجراء" },
      { status: 403 }
    );
  }
  return { user };
}
