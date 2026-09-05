import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/guard";
import { updateRoleSchema } from "@/lib/validation/role";
import { getRole, updateRole, deleteRole, RoleServiceError } from "@/services/role-service";
import { writeAuditLog } from "@/lib/audit";

interface Params {
  params: Promise<{ id: string }>;
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const auth = await requireAuth("roles.manage");
  if (auth instanceof NextResponse) return auth;
  const { user } = auth;

  const { id } = await params;
  const body = await req.json().catch(() => null);
  const parsed = updateRoleSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid_input", message: parsed.error.issues[0]?.message ?? "بيانات غير صالحة" },
      { status: 400 }
    );
  }

  try {
    const before = await getRole(id);
    const role = await updateRole(id, parsed.data);
    await writeAuditLog({
      userId: user.id,
      action: "ROLE_UPDATE",
      entityType: "Role",
      entityId: id,
      previousData: before ? { permissionIds: before.permissions.map((p) => p.permissionId) } : undefined,
      newData: { permissionIds: role.permissions.map((p) => p.permissionId) },
    });
    return NextResponse.json({
      role: {
        id: role.id,
        code: role.code,
        name: role.name,
        nameAr: role.nameAr,
        isSystem: role.isSystem,
        permissionIds: role.permissions.map((p) => p.permissionId),
      },
    });
  } catch (e) {
    if (e instanceof RoleServiceError) {
      return NextResponse.json({ error: "role_error", message: e.message }, { status: e.status });
    }
    throw e;
  }
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const auth = await requireAuth("roles.manage");
  if (auth instanceof NextResponse) return auth;
  const { user } = auth;

  const { id } = await params;
  try {
    await deleteRole(id);
    await writeAuditLog({ userId: user.id, action: "ROLE_DELETE", entityType: "Role", entityId: id });
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof RoleServiceError) {
      return NextResponse.json({ error: "role_error", message: e.message }, { status: e.status });
    }
    throw e;
  }
}
