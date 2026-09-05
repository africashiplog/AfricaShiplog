import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/guard";
import { cancelParcelSchema } from "@/lib/validation/parcel";
import { refundParcelShippingFee, ParcelServiceError } from "@/services/parcel-service";
import { writeAuditLog } from "@/lib/audit";

interface Params {
  params: Promise<{ id: string }>;
}

export async function POST(req: NextRequest, { params }: Params) {
  const auth = await requireAuth("parcels.cancel");
  if (auth instanceof NextResponse) return auth;
  const { user } = auth;

  const { id } = await params;
  const body = await req.json().catch(() => null);
  const parsed = cancelParcelSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_input", message: parsed.error.issues[0]?.message ?? "بيانات غير صالحة" }, { status: 400 });
  }

  try {
    const parcel = await refundParcelShippingFee(id, parsed.data.reason, user.id);
    await writeAuditLog({ userId: user.id, action: "PARCEL_SHIPPING_REFUND", entityType: "Parcel", entityId: id, newData: { reason: parsed.data.reason } });
    return NextResponse.json({ parcel });
  } catch (e) {
    if (e instanceof ParcelServiceError) return NextResponse.json({ error: "parcel_error", message: e.message }, { status: e.status });
    throw e;
  }
}
