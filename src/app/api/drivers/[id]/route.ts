import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/guard";
import { driverInputSchema } from "@/lib/validation/driver";
import { updateDriver, archiveDriver, DriverServiceError } from "@/services/driver-service";
import { writeAuditLog } from "@/lib/audit";

interface Params {
  params: Promise<{ id: string }>;
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const auth = await requireAuth("drivers.manage");
  if (auth instanceof NextResponse) return auth;
  const { user } = auth;

  const { id } = await params;
  const body = await req.json().catch(() => null);
  const parsed = driverInputSchema.partial().safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_input", message: parsed.error.issues[0]?.message ?? "بيانات غير صالحة" }, { status: 400 });
  }
  try {
    const driver = await updateDriver(id, parsed.data);
    await writeAuditLog({ userId: user.id, action: "DRIVER_UPDATE", entityType: "Driver", entityId: id });
    return NextResponse.json({ driver });
  } catch (e) {
    if (e instanceof DriverServiceError) return NextResponse.json({ error: "driver_error", message: e.message }, { status: e.status });
    throw e;
  }
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const auth = await requireAuth("drivers.manage");
  if (auth instanceof NextResponse) return auth;
  const { user } = auth;

  const { id } = await params;
  try {
    await archiveDriver(id);
    await writeAuditLog({ userId: user.id, action: "DRIVER_ARCHIVE", entityType: "Driver", entityId: id });
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof DriverServiceError) return NextResponse.json({ error: "driver_error", message: e.message }, { status: e.status });
    throw e;
  }
}
