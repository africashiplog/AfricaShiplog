import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/guard";
import { vehicleInputSchema } from "@/lib/validation/vehicle";
import { listVehicles, createVehicle, VehicleServiceError } from "@/services/vehicle-service";
import { writeAuditLog } from "@/lib/audit";

export async function GET() {
  const auth = await requireAuth("vehicles.manage");
  if (auth instanceof NextResponse) return auth;
  const vehicles = await listVehicles();
  return NextResponse.json({ vehicles });
}

export async function POST(req: NextRequest) {
  const auth = await requireAuth("vehicles.manage");
  if (auth instanceof NextResponse) return auth;
  const { user } = auth;

  const body = await req.json().catch(() => null);
  const parsed = vehicleInputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_input", message: parsed.error.issues[0]?.message ?? "بيانات غير صالحة" }, { status: 400 });
  }
  try {
    const vehicle = await createVehicle(parsed.data);
    await writeAuditLog({ userId: user.id, action: "VEHICLE_CREATE", entityType: "Vehicle", entityId: vehicle.id });
    return NextResponse.json({ vehicle }, { status: 201 });
  } catch (e) {
    if (e instanceof VehicleServiceError) return NextResponse.json({ error: "vehicle_error", message: e.message }, { status: e.status });
    throw e;
  }
}
