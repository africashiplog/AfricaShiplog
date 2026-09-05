import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/guard";
import { userCanAccessBranch } from "@/lib/auth/current-user";
import { listRegistersForBranch } from "@/services/cash-register-service";

export async function GET(req: NextRequest) {
  const auth = await requireAuth("cash.view");
  if (auth instanceof NextResponse) return auth;
  const { user } = auth;

  const branchId = req.nextUrl.searchParams.get("branchId") ?? user.branchId;
  if (!branchId) {
    return NextResponse.json({ error: "invalid_input", message: "يجب تحديد الفرع" }, { status: 400 });
  }
  if (!userCanAccessBranch(user, branchId)) {
    return NextResponse.json({ error: "forbidden", message: "غير مصرح لك بالوصول لهذا الفرع" }, { status: 403 });
  }

  const registers = await listRegistersForBranch(branchId);
  return NextResponse.json({
    registers: registers.map((r) => ({
      id: r.id,
      code: r.code,
      name: r.name,
      openSession: r.sessions[0] ?? null,
    })),
  });
}
