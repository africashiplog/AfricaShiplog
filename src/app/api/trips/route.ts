import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/guard";
import { tripInputSchema } from "@/lib/validation/trip";
import { listTrips, createTrip, TripServiceError } from "@/services/trip-service";
import { writeAuditLog } from "@/lib/audit";

export async function GET(req: NextRequest) {
  const auth = await requireAuth("trips.view");
  if (auth instanceof NextResponse) return auth;

  const branchId = req.nextUrl.searchParams.get("branchId") || undefined;
  const status = req.nextUrl.searchParams.get("status") || undefined;
  const trips = await listTrips({ branchId, status });
  return NextResponse.json({ trips });
}

export async function POST(req: NextRequest) {
  const auth = await requireAuth("trips.create");
  if (auth instanceof NextResponse) return auth;
  const { user } = auth;

  const body = await req.json().catch(() => null);
  const parsed = tripInputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_input", message: parsed.error.issues[0]?.message ?? "بيانات غير صالحة" }, { status: 400 });
  }

  try {
    const trip = await createTrip(parsed.data);
    await writeAuditLog({ userId: user.id, action: "TRIP_CREATE", entityType: "Trip", entityId: trip.id, branchId: trip.originBranchId });
    return NextResponse.json({ trip }, { status: 201 });
  } catch (e) {
    if (e instanceof TripServiceError) return NextResponse.json({ error: "trip_error", message: e.message }, { status: e.status });
    throw e;
  }
}
