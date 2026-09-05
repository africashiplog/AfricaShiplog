import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/guard";
import { listPermissions } from "@/services/role-service";

export async function GET() {
  const auth = await requireAuth("roles.manage");
  if (auth instanceof NextResponse) return auth;

  const permissions = await listPermissions();
  return NextResponse.json({ permissions });
}
