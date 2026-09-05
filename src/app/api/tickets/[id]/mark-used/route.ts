import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/guard";
import { markTicketUsed, TicketServiceError } from "@/services/ticket-service";
import { writeAuditLog } from "@/lib/audit";

interface Params {
  params: Promise<{ id: string }>;
}

export async function POST(_req: NextRequest, { params }: Params) {
  const auth = await requireAuth("tickets.edit");
  if (auth instanceof NextResponse) return auth;
  const { user } = auth;

  const { id } = await params;
  try {
    const ticket = await markTicketUsed(id);
    await writeAuditLog({ userId: user.id, action: "TICKET_MARK_USED", entityType: "Ticket", entityId: id });
    return NextResponse.json({ ticket });
  } catch (e) {
    if (e instanceof TicketServiceError) return NextResponse.json({ error: "ticket_error", message: e.message }, { status: e.status });
    throw e;
  }
}
