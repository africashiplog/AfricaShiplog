import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/guard";
import { createRoleSchema } from "@/lib/validation/role";
import { listRoles, createRole, RoleServiceError } from "@/services/role-service";
import { writeAuditLog } from "@/lib/audit";

export async function GET() {
  const auth = await requireAuth("roles.manage");
  if (auth instanceof NextResponse) return auth;

  const roles = await listRoles();
  return NextResponse.json({
    roles: roles.map((r) => ({
      id: r.id,
      code: r.code,
      name: r.name,
      nameAr: r.nameAr,
      description: r.description,
      isSystem: r.isSystem,
      userCount: r._count.users,
      permissionIds: r.permissions.map((p) => p.permissionId),
    })),
  });
}

export async function POST(req: NextRequest) {
  const auth = await requireAuth("roles.manage");
  if (auth instanceof NextResponse) return auth;
  const { user } = auth;

  const body = await req.json().catch(() => null);
  const parsed = createRoleSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid_input", message: parsed.error.issues[0]?.message ?? "بيانات غير صالحة" },
      { status: 400 }
    );
  }

  try {
    const role = await createRole(parsed.data);
    await writeAuditLog({ userId: user.id, action: "ROLE_CREATE", entityType: "Role", entityId: role.id, newData: { code: role.code } });
    return NextResponse.json(
      {
        role: {
          id: role.id,
          code: role.code,
          name: role.name,
          nameAr: role.nameAr,
          isSystem: role.isSystem,
          permissionIds: role.permissions.map((p) => p.permissionId),
        },
      },
      { status: 201 }
    );
  } catch (e) {
    if (e instanceof RoleServiceError) {
      return NextResponse.json({ error: "role_error", message: e.message }, { status: e.status });
    }
    throw e;
  }
}
