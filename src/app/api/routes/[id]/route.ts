import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/guard";
import { routeInputSchema } from "@/lib/validation/route";
import { updateRoute, archiveRoute, RouteServiceError } from "@/services/route-service";
import { writeAuditLog } from "@/lib/audit";

interface Params {
  params: Promise<{ id: string }>;
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const auth = await requireAuth("routes.manage");
  if (auth instanceof NextResponse) return auth;
  const { user } = auth;

  const { id } = await params;
  const body = await req.json().catch(() => null);
  const parsed = routeInputSchema.partial().safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_input", message: parsed.error.issues[0]?.message ?? "بيانات غير صالحة" }, { status: 400 });
  }

  try {
    const route = await updateRoute(id, parsed.data);
    await writeAuditLog({ userId: user.id, action: "ROUTE_UPDATE", entityType: "Route", entityId: id });
    return NextResponse.json({ route });
  } catch (e) {
    if (e instanceof RouteServiceError) return NextResponse.json({ error: "route_error", message: e.message }, { status: e.status });
    throw e;
  }
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const auth = await requireAuth("routes.manage");
  if (auth instanceof NextResponse) return auth;
  const { user } = auth;

  const { id } = await params;
  try {
    await archiveRoute(id);
    await writeAuditLog({ userId: user.id, action: "ROUTE_ARCHIVE", entityType: "Route", entityId: id });
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof RouteServiceError) return NextResponse.json({ error: "route_error", message: e.message }, { status: e.status });
    throw e;
  }
}
