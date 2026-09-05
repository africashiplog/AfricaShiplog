import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/guard";
import { vehicleInputSchema } from "@/lib/validation/vehicle";
import { updateVehicle, archiveVehicle, VehicleServiceError } from "@/services/vehicle-service";
import { writeAuditLog } from "@/lib/audit";

interface Params {
  params: Promise<{ id: string }>;
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const auth = await requireAuth("vehicles.manage");
  if (auth instanceof NextResponse) return auth;
  const { user } = auth;

  const { id } = await params;
  const body = await req.json().catch(() => null);
  const parsed = vehicleInputSchema.partial().safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_input", message: parsed.error.issues[0]?.message ?? "بيانات غير صالحة" }, { status: 400 });
  }
  try {
    const vehicle = await updateVehicle(id, parsed.data);
    await writeAuditLog({ userId: user.id, action: "VEHICLE_UPDATE", entityType: "Vehicle", entityId: id });
    return NextResponse.json({ vehicle });
  } catch (e) {
    if (e instanceof VehicleServiceError) return NextResponse.json({ error: "vehicle_error", message: e.message }, { status: e.status });
    throw e;
  }
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const auth = await requireAuth("vehicles.manage");
  if (auth instanceof NextResponse) return auth;
  const { user } = auth;

  const { id } = await params;
  try {
    await archiveVehicle(id);
    await writeAuditLog({ userId: user.id, action: "VEHICLE_ARCHIVE", entityType: "Vehicle", entityId: id });
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof VehicleServiceError) return NextResponse.json({ error: "vehicle_error", message: e.message }, { status: e.status });
    throw e;
  }
}
