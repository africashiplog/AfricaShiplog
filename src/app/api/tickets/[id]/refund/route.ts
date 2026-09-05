import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/guard";
import { refundTicketSchema } from "@/lib/validation/ticket";
import { refundTicket, TicketServiceError } from "@/services/ticket-service";
import { writeAuditLog } from "@/lib/audit";

interface Params {
  params: Promise<{ id: string }>;
}

export async function POST(req: NextRequest, { params }: Params) {
  const auth = await requireAuth("tickets.refund");
  if (auth instanceof NextResponse) return auth;
  const { user } = auth;

  const { id } = await params;
  const body = await req.json().catch(() => null);
  const parsed = refundTicketSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_input", message: parsed.error.issues[0]?.message ?? "بيانات غير صالحة" }, { status: 400 });
  }
  try {
    const ticket = await refundTicket(id, parsed.data.reason, user.id);
    await writeAuditLog({ userId: user.id, action: "TICKET_REFUND", entityType: "Ticket", entityId: id, newData: { reason: parsed.data.reason } });
    return NextResponse.json({ ticket });
  } catch (e) {
    if (e instanceof TicketServiceError) return NextResponse.json({ error: "ticket_error", message: e.message }, { status: e.status });
    throw e;
  }
}
