import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/guard";

export async function GET() {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;
  const { user } = auth;

  return NextResponse.json({
    id: user.id,
    email: user.email,
    fullName: user.fullName,
    fullNameAr: user.fullNameAr,
    branchId: user.branchId,
    mustChangePassword: user.mustChangePassword,
    roleCodes: user.roleCodes,
    permissions: Array.from(user.permissions),
  });
}
