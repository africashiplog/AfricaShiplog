import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/guard";
import { branchInputSchema } from "@/lib/validation/branch";
import { listBranches, createBranch, BranchServiceError } from "@/services/branch-service";
import { writeAuditLog } from "@/lib/audit";

export async function GET() {
  const auth = await requireAuth("branches.view");
  if (auth instanceof NextResponse) return auth;

  const branches = await listBranches(true);
  return NextResponse.json({ branches });
}

export async function POST(req: NextRequest) {
  const auth = await requireAuth("branches.manage");
  if (auth instanceof NextResponse) return auth;
  const { user } = auth;

  const body = await req.json().catch(() => null);
  const parsed = branchInputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid_input", message: parsed.error.issues[0]?.message ?? "بيانات غير صالحة" },
      { status: 400 }
    );
  }

  try {
    const branch = await createBranch(parsed.data);
    await writeAuditLog({
      userId: user.id,
      action: "BRANCH_CREATE",
      entityType: "Branch",
      entityId: branch.id,
      branchId: branch.id,
      newData: branch,
    });
    return NextResponse.json({ branch }, { status: 201 });
  } catch (e) {
    if (e instanceof BranchServiceError) {
      return NextResponse.json({ error: "branch_error", message: e.message }, { status: e.status });
    }
    throw e;
  }
}
