import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/guard";
import { customerInputSchema } from "@/lib/validation/customer";
import { listCustomers, createCustomer, CustomerServiceError } from "@/services/customer-service";
import { writeAuditLog } from "@/lib/audit";

export async function GET(req: NextRequest) {
  const auth = await requireAuth("customers.view");
  if (auth instanceof NextResponse) return auth;

  const search = req.nextUrl.searchParams.get("q")?.trim() || undefined;
  const customers = await listCustomers(search);
  return NextResponse.json({ customers });
}

export async function POST(req: NextRequest) {
  const auth = await requireAuth("customers.create");
  if (auth instanceof NextResponse) return auth;
  const { user } = auth;

  const body = await req.json().catch(() => null);
  const parsed = customerInputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid_input", message: parsed.error.issues[0]?.message ?? "بيانات غير صالحة" },
      { status: 400 }
    );
  }

  try {
    const customer = await createCustomer(parsed.data);
    await writeAuditLog({ userId: user.id, action: "CUSTOMER_CREATE", entityType: "Customer", entityId: customer.id, newData: customer });
    return NextResponse.json({ customer }, { status: 201 });
  } catch (e) {
    if (e instanceof CustomerServiceError) {
      return NextResponse.json({ error: "customer_error", message: e.message }, { status: e.status });
    }
    throw e;
  }
}
