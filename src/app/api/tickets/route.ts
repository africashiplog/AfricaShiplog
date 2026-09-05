import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/guard";
import { userCanAccessBranch } from "@/lib/auth/current-user";
import { createTicketSchema } from "@/lib/validation/ticket";
import { listTickets, createTicket, TicketServiceError } from "@/services/ticket-service";
import { writeAuditLog } from "@/lib/audit";

export async function GET(req: NextRequest) {
  const auth = await requireAuth("tickets.view");
  if (auth instanceof NextResponse) return auth;
  const { user } = auth;

  const tripId = req.nextUrl.searchParams.get("tripId") || undefined;
  const branchId = req.nextUrl.searchParams.get("branchId") || user.branchId || undefined;
  const status = req.nextUrl.searchParams.get("status") || undefined;
  const tickets = await listTickets({ tripId, branchId, status });
  return NextResponse.json({ tickets });
}

export async function POST(req: NextRequest) {
  const auth = await requireAuth("tickets.create");
  if (auth instanceof NextResponse) return auth;
  const { user } = auth;

  const body = await req.json().catch(() => null);
  const parsed = createTicketSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_input", message: parsed.error.issues[0]?.message ?? "بيانات غير صالحة" }, { status: 400 });
  }

  const branchId = user.branchId ?? req.nextUrl.searchParams.get("branchId");
  if (!branchId) {
    return NextResponse.json({ error: "invalid_input", message: "يجب تحديد فرع البيع" }, { status: 400 });
  }
  if (!userCanAccessBranch(user, branchId)) {
    return NextResponse.json({ error: "forbidden", message: "غير مصرح لك بالبيع من هذا الفرع" }, { status: 403 });
  }

  try {
    const ticket = await createTicket({ ...parsed.data, employeeId: user.id, branchId });
    await writeAuditLog({
      userId: user.id,
      action: "TICKET_CREATE",
      entityType: "Ticket",
      entityId: ticket.id,
      branchId,
      newData: { ticketNumber: ticket.ticketNumber, totalPrice: ticket.totalPrice, amountPaid: ticket.amountPaid },
    });
    return NextResponse.json({ ticket }, { status: 201 });
  } catch (e) {
    if (e instanceof TicketServiceError) return NextResponse.json({ error: "ticket_error", message: e.message }, { status: e.status });
    throw e;
  }
}
