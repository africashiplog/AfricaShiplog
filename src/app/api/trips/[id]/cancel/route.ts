import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/guard";
import { cancelTrip, TripServiceError } from "@/services/trip-service";
import { writeAuditLog } from "@/lib/audit";

interface Params {
  params: Promise<{ id: string }>;
}

export async function POST(_req: NextRequest, { params }: Params) {
  const auth = await requireAuth("trips.cancel");
  if (auth instanceof NextResponse) return auth;
  const { user } = auth;

  const { id } = await params;
  try {
    const trip = await cancelTrip(id);
    await writeAuditLog({ userId: user.id, action: "TRIP_CANCEL", entityType: "Trip", entityId: id });
    return NextResponse.json({ trip });
  } catch (e) {
    if (e instanceof TripServiceError) return NextResponse.json({ error: "trip_error", message: e.message }, { status: e.status });
    throw e;
  }
}
