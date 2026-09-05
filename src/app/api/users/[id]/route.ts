import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/guard";
import { updateUserSchema } from "@/lib/validation/user";
import { getUser, updateUser, archiveUser, UserServiceError } from "@/services/user-service";
import { writeAuditLog } from "@/lib/audit";

interface Params {
  params: Promise<{ id: string }>;
}

function serialize(u: NonNullable<Awaited<ReturnType<typeof getUser>>>) {
  return {
    id: u.id,
    email: u.email,
    fullName: u.fullName,
    fullNameAr: u.fullNameAr,
    phone: u.phone,
    isActive: u.isActive,
    branch: u.branch,
    roles: u.roles.map((r) => r.role),
  };
}

export async function GET(_req: NextRequest, { params }: Params) {
  const auth = await requireAuth("users.view");
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;
  const user = await getUser(id);
  if (!user) return NextResponse.json({ error: "not_found", message: "المستخدم غير موجود" }, { status: 404 });
  return NextResponse.json({ user: serialize(user) });
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const auth = await requireAuth("users.manage");
  if (auth instanceof NextResponse) return auth;
  const { user: actor } = auth;

  const { id } = await params;
  const body = await req.json().catch(() => null);
  const parsed = updateUserSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid_input", message: parsed.error.issues[0]?.message ?? "بيانات غير صالحة" },
      { status: 400 }
    );
  }

  try {
    const before = await getUser(id);
    const user = await updateUser(id, parsed.data);
    await writeAuditLog({
      userId: actor.id,
      action: "USER_UPDATE",
      entityType: "User",
      entityId: id,
      branchId: user.branchId,
      previousData: before ? serialize(before) : undefined,
      newData: serialize(user),
    });
    return NextResponse.json({ user: serialize(user) });
  } catch (e) {
    if (e instanceof UserServiceError) {
      return NextResponse.json({ error: "user_error", message: e.message }, { status: e.status });
    }
    throw e;
  }
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const auth = await requireAuth("users.manage");
  if (auth instanceof NextResponse) return auth;
  const { user: actor } = auth;

  const { id } = await params;
  try {
    await archiveUser(id, actor.id);
    await writeAuditLog({ userId: actor.id, action: "USER_ARCHIVE", entityType: "User", entityId: id });
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof UserServiceError) {
      return NextResponse.json({ error: "user_error", message: e.message }, { status: e.status });
    }
    throw e;
  }
}
