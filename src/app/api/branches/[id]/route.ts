import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/guard";
import { branchInputSchema } from "@/lib/validation/branch";
import { getBranch, updateBranch, archiveBranch, BranchServiceError } from "@/services/branch-service";
import { writeAuditLog } from "@/lib/audit";

interface Params {
  params: Promise<{ id: string }>;
}

export async function GET(_req: NextRequest, { params }: Params) {
  const auth = await requireAuth("branches.view");
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;
  const branch = await getBranch(id);
  if (!branch) return NextResponse.json({ error: "not_found", message: "الفرع غير موجود" }, { status: 404 });
  return NextResponse.json({ branch });
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const auth = await requireAuth("branches.manage");
  if (auth instanceof NextResponse) return auth;
  const { user } = auth;

  const { id } = await params;
  const body = await req.json().catch(() => null);
  const parsed = branchInputSchema.partial().safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid_input", message: parsed.error.issues[0]?.message ?? "بيانات غير صالحة" },
      { status: 400 }
    );
  }

  try {
    const before = await getBranch(id);
    const branch = await updateBranch(id, parsed.data);
    await writeAuditLog({
      userId: user.id,
      action: "BRANCH_UPDATE",
      entityType: "Branch",
      entityId: id,
      branchId: id,
      previousData: before,
      newData: branch,
    });
    return NextResponse.json({ branch });
  } catch (e) {
    if (e instanceof BranchServiceError) {
      return NextResponse.json({ error: "branch_error", message: e.message }, { status: e.status });
    }
    throw e;
  }
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const auth = await requireAuth("branches.manage");
  if (auth instanceof NextResponse) return auth;
  const { user } = auth;

  const { id } = await params;
  try {
    const branch = await archiveBranch(id);
    await writeAuditLog({
      userId: user.id,
      action: "BRANCH_ARCHIVE",
      entityType: "Branch",
      entityId: id,
      branchId: id,
    });
    return NextResponse.json({ branch });
  } catch (e) {
    if (e instanceof BranchServiceError) {
      return NextResponse.json({ error: "branch_error", message: e.message }, { status: e.status });
    }
    throw e;
  }
}
