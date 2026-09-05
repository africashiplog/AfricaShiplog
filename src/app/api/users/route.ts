import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/guard";
import { createUserSchema } from "@/lib/validation/user";
import { listUsers, createUser, UserServiceError } from "@/services/user-service";
import { writeAuditLog } from "@/lib/audit";

export async function GET() {
  const auth = await requireAuth("users.view");
  if (auth instanceof NextResponse) return auth;

  const users = await listUsers();
  return NextResponse.json({
    users: users.map((u) => ({
      id: u.id,
      email: u.email,
      fullName: u.fullName,
      fullNameAr: u.fullNameAr,
      phone: u.phone,
      isActive: u.isActive,
      branch: u.branch,
      roles: u.roles.map((r) => r.role),
      lastLoginAt: u.lastLoginAt,
    })),
  });
}

export async function POST(req: NextRequest) {
  const auth = await requireAuth("users.manage");
  if (auth instanceof NextResponse) return auth;
  const { user: actor } = auth;

  const body = await req.json().catch(() => null);
  const parsed = createUserSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid_input", message: parsed.error.issues[0]?.message ?? "بيانات غير صالحة" },
      { status: 400 }
    );
  }

  try {
    const { user, tempPassword } = await createUser(parsed.data);
    await writeAuditLog({
      userId: actor.id,
      action: "USER_CREATE",
      entityType: "User",
      entityId: user.id,
      branchId: user.branchId,
      newData: { email: user.email, roles: user.roles.map((r) => r.role.code) },
    });
    return NextResponse.json(
      {
        user: {
          id: user.id,
          email: user.email,
          fullName: user.fullName,
          fullNameAr: user.fullNameAr,
          branch: user.branch,
          roles: user.roles.map((r) => r.role),
          isActive: user.isActive,
        },
        tempPassword,
      },
      { status: 201 }
    );
  } catch (e) {
    if (e instanceof UserServiceError) {
      return NextResponse.json({ error: "user_error", message: e.message }, { status: e.status });
    }
    throw e;
  }
}
