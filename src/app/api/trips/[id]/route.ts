import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/guard";
import { tripUpdateSchema } from "@/lib/validation/trip";
import { getTrip, updateTrip, TripServiceError } from "@/services/trip-service";
import { writeAuditLog } from "@/lib/audit";

interface Params {
  params: Promise<{ id: string }>;
}

export async function GET(_req: NextRequest, { params }: Params) {
  const auth = await requireAuth("trips.view");
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;
  const trip = await getTrip(id);
  if (!trip) return NextResponse.json({ error: "not_found", message: "الرحلة غير موجودة" }, { status: 404 });
  return NextResponse.json({ trip });
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const auth = await requireAuth("trips.edit");
  if (auth instanceof NextResponse) return auth;
  const { user } = auth;

  const { id } = await params;
  const body = await req.json().catch(() => null);
  const parsed = tripUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_input", message: parsed.error.issues[0]?.message ?? "بيانات غير صالحة" }, { status: 400 });
  }
  try {
    const trip = await updateTrip(id, parsed.data);
    await writeAuditLog({ userId: user.id, action: "TRIP_UPDATE", entityType: "Trip", entityId: id });
    return NextResponse.json({ trip });
  } catch (e) {
    if (e instanceof TripServiceError) return NextResponse.json({ error: "trip_error", message: e.message }, { status: e.status });
    throw e;
  }
}
