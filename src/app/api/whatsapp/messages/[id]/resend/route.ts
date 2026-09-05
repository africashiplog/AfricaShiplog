import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/guard";
import { resendMessage, WhatsAppServiceError } from "@/services/whatsapp-service";
import { writeAuditLog } from "@/lib/audit";

interface Params {
  params: Promise<{ id: string }>;
}

export async function POST(_req: NextRequest, { params }: Params) {
  const auth = await requireAuth("whatsapp.manage");
  if (auth instanceof NextResponse) return auth;
  const { user } = auth;

  const { id } = await params;
  try {
    const message = await resendMessage(id);
    await writeAuditLog({ userId: user.id, action: "WHATSAPP_MESSAGE_RESEND", entityType: "WhatsAppMessage", entityId: id });
    return NextResponse.json({ message });
  } catch (e) {
    if (e instanceof WhatsAppServiceError) return NextResponse.json({ error: "whatsapp_error", message: e.message }, { status: e.status });
    throw e;
  }
}
