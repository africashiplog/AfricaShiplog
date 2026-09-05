import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/guard";
import { userCanAccessBranch } from "@/lib/auth/current-user";
import { parcelStatusUpdateSchema } from "@/lib/validation/parcel";
import { updateParcelStatus, ParcelServiceError } from "@/services/parcel-service";
import { writeAuditLog } from "@/lib/audit";

interface Params {
  params: Promise<{ id: string }>;
}

export async function POST(req: NextRequest, { params }: Params) {
  const auth = await requireAuth("parcels.edit");
  if (auth instanceof NextResponse) return auth;
  const { user } = auth;

  const { id } = await params;
  const body = await req.json().catch(() => null);
  const parsed = parcelStatusUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_input", message: parsed.error.issues[0]?.message ?? "بيانات غير صالحة" }, { status: 400 });
  }

  const branchId = user.branchId ?? req.nextUrl.searchParams.get("branchId");
  if (!branchId) return NextResponse.json({ error: "invalid_input", message: "يجب تحديد الفرع" }, { status: 400 });
  if (!userCanAccessBranch(user, branchId)) {
    return NextResponse.json({ error: "forbidden", message: "غير مصرح لك بالتحديث من هذا الفرع" }, { status: 403 });
  }

  try {
    const parcel = await updateParcelStatus(id, parsed.data.status, parsed.data.note ?? null, user.id, branchId);
    await writeAuditLog({ userId: user.id, action: "PARCEL_STATUS_CHANGE", entityType: "Parcel", entityId: id, branchId, newData: { status: parsed.data.status } });
    return NextResponse.json({ parcel });
  } catch (e) {
    if (e instanceof ParcelServiceError) return NextResponse.json({ error: "parcel_error", message: e.message }, { status: e.status });
    throw e;
  }
}
