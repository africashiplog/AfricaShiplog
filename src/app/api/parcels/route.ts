import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/guard";
import { userCanAccessBranch } from "@/lib/auth/current-user";
import { createParcelSchema } from "@/lib/validation/parcel";
import { listParcels, createParcel, ParcelServiceError } from "@/services/parcel-service";
import { writeAuditLog } from "@/lib/audit";

export async function GET(req: NextRequest) {
  const auth = await requireAuth("parcels.view");
  if (auth instanceof NextResponse) return auth;
  const { user } = auth;

  const trackingNumber = req.nextUrl.searchParams.get("trackingNumber") || undefined;
  const search = req.nextUrl.searchParams.get("q") || undefined;
  const status = req.nextUrl.searchParams.get("status") || undefined;
  const requestedBranchId = req.nextUrl.searchParams.get("branchId") || undefined;
  if (requestedBranchId && !userCanAccessBranch(user, requestedBranchId)) {
    return NextResponse.json({ error: "forbidden", message: "غير مصرح لك بالوصول لهذا الفرع" }, { status: 403 });
  }
  const branchId = requestedBranchId || user.branchId || undefined;

  const parcels = await listParcels({ branchId, status, trackingNumber, search });
  return NextResponse.json({ parcels });
}

export async function POST(req: NextRequest) {
  const auth = await requireAuth("parcels.create");
  if (auth instanceof NextResponse) return auth;
  const { user } = auth;

  const body = await req.json().catch(() => null);
  const parsed = createParcelSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_input", message: parsed.error.issues[0]?.message ?? "بيانات غير صالحة" }, { status: 400 });
  }

  const branchId = user.branchId ?? req.nextUrl.searchParams.get("branchId");
  if (!branchId) return NextResponse.json({ error: "invalid_input", message: "يجب تحديد فرع الاستلام" }, { status: 400 });
  if (!userCanAccessBranch(user, branchId)) {
    return NextResponse.json({ error: "forbidden", message: "غير مصرح لك بالاستلام من هذا الفرع" }, { status: 403 });
  }

  try {
    const parcel = await createParcel(parsed.data, { employeeId: user.id, originBranchId: branchId });
    await writeAuditLog({
      userId: user.id,
      action: "PARCEL_CREATE",
      entityType: "Parcel",
      entityId: parcel.id,
      branchId,
      newData: { trackingNumber: parcel.trackingNumber },
    });
    return NextResponse.json({ parcel }, { status: 201 });
  } catch (e) {
    if (e instanceof ParcelServiceError) return NextResponse.json({ error: "parcel_error", message: e.message }, { status: e.status });
    throw e;
  }
}
