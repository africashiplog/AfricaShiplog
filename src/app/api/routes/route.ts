import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/guard";
import { routeInputSchema } from "@/lib/validation/route";
import { listRoutes, createRoute, RouteServiceError } from "@/services/route-service";
import { writeAuditLog } from "@/lib/audit";

export async function GET() {
  const auth = await requireAuth("routes.view");
  if (auth instanceof NextResponse) return auth;

  const routes = await listRoutes(true);
  return NextResponse.json({ routes });
}

export async function POST(req: NextRequest) {
  const auth = await requireAuth("routes.manage");
  if (auth instanceof NextResponse) return auth;
  const { user } = auth;

  const body = await req.json().catch(() => null);
  const parsed = routeInputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_input", message: parsed.error.issues[0]?.message ?? "بيانات غير صالحة" }, { status: 400 });
  }

  try {
    const route = await createRoute(parsed.data);
    await writeAuditLog({ userId: user.id, action: "ROUTE_CREATE", entityType: "Route", entityId: route.id });
    return NextResponse.json({ route }, { status: 201 });
  } catch (e) {
    if (e instanceof RouteServiceError) return NextResponse.json({ error: "route_error", message: e.message }, { status: e.status });
    throw e;
  }
}
