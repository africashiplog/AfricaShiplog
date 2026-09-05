import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/guard";
import { driverInputSchema } from "@/lib/validation/driver";
import { listDrivers, createDriver, DriverServiceError } from "@/services/driver-service";
import { writeAuditLog } from "@/lib/audit";

export async function GET() {
  const auth = await requireAuth("drivers.manage");
  if (auth instanceof NextResponse) return auth;
  const drivers = await listDrivers();
  return NextResponse.json({ drivers });
}

export async function POST(req: NextRequest) {
  const auth = await requireAuth("drivers.manage");
  if (auth instanceof NextResponse) return auth;
  const { user } = auth;

  const body = await req.json().catch(() => null);
  const parsed = driverInputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_input", message: parsed.error.issues[0]?.message ?? "بيانات غير صالحة" }, { status: 400 });
  }
  try {
    const driver = await createDriver(parsed.data);
    await writeAuditLog({ userId: user.id, action: "DRIVER_CREATE", entityType: "Driver", entityId: driver.id });
    return NextResponse.json({ driver }, { status: 201 });
  } catch (e) {
    if (e instanceof DriverServiceError) return NextResponse.json({ error: "driver_error", message: e.message }, { status: e.status });
    throw e;
  }
}
