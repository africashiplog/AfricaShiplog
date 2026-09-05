import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/guard";
import { cancelTicketSchema } from "@/lib/validation/ticket";
import { cancelTicket, TicketServiceError } from "@/services/ticket-service";
import { writeAuditLog } from "@/lib/audit";

interface Params {
  params: Promise<{ id: string }>;
}

export async function POST(req: NextRequest, { params }: Params) {
  const auth = await requireAuth("tickets.cancel");
  if (auth instanceof NextResponse) return auth;
  const { user } = auth;

  const { id } = await params;
  const body = await req.json().catch(() => null);
  const parsed = cancelTicketSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_input", message: parsed.error.issues[0]?.message ?? "بيانات غير صالحة" }, { status: 400 });
  }
  try {
    const ticket = await cancelTicket(id, parsed.data.reason);
    await writeAuditLog({ userId: user.id, action: "TICKET_CANCEL", entityType: "Ticket", entityId: id, newData: { reason: parsed.data.reason } });
    return NextResponse.json({ ticket });
  } catch (e) {
    if (e instanceof TicketServiceError) return NextResponse.json({ error: "ticket_error", message: e.message }, { status: e.status });
    throw e;
  }
}
