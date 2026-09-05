import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/guard";
import { customerInputSchema } from "@/lib/validation/customer";
import { getCustomerProfile, updateCustomer, archiveCustomer, CustomerServiceError } from "@/services/customer-service";
import { writeAuditLog } from "@/lib/audit";

interface Params {
  params: Promise<{ id: string }>;
}

export async function GET(_req: NextRequest, { params }: Params) {
  const auth = await requireAuth("customers.view");
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;
  const profile = await getCustomerProfile(id);
  if (!profile) return NextResponse.json({ error: "not_found", message: "العميل غير موجود" }, { status: 404 });
  return NextResponse.json(profile);
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const auth = await requireAuth("customers.edit");
  if (auth instanceof NextResponse) return auth;
  const { user } = auth;

  const { id } = await params;
  const body = await req.json().catch(() => null);
  const parsed = customerInputSchema.partial().safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid_input", message: parsed.error.issues[0]?.message ?? "بيانات غير صالحة" },
      { status: 400 }
    );
  }

  try {
    const customer = await updateCustomer(id, parsed.data);
    await writeAuditLog({ userId: user.id, action: "CUSTOMER_UPDATE", entityType: "Customer", entityId: id, newData: customer });
    return NextResponse.json({ customer });
  } catch (e) {
    if (e instanceof CustomerServiceError) {
      return NextResponse.json({ error: "customer_error", message: e.message }, { status: e.status });
    }
    throw e;
  }
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const auth = await requireAuth("customers.edit");
  if (auth instanceof NextResponse) return auth;
  const { user } = auth;

  const { id } = await params;
  try {
    await archiveCustomer(id);
    await writeAuditLog({ userId: user.id, action: "CUSTOMER_ARCHIVE", entityType: "Customer", entityId: id });
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof CustomerServiceError) {
      return NextResponse.json({ error: "customer_error", message: e.message }, { status: e.status });
    }
    throw e;
  }
}
