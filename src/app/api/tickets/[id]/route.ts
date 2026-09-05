import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/guard";
import { getTicket } from "@/services/ticket-service";

interface Params {
  params: Promise<{ id: string }>;
}

export async function GET(_req: NextRequest, { params }: Params) {
  const auth = await requireAuth("tickets.view");
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;
  const ticket = await getTicket(id);
  if (!ticket) return NextResponse.json({ error: "not_found", message: "التذكرة غير موجودة" }, { status: 404 });
  return NextResponse.json({ ticket });
}
