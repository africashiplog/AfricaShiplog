import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/guard";
import { testConnection, WhatsAppServiceError } from "@/services/whatsapp-service";
import { writeAuditLog } from "@/lib/audit";

export async function POST() {
  const auth = await requireAuth("whatsapp.manage");
  if (auth instanceof NextResponse) return auth;
  const { user } = auth;

  try {
    const result = await testConnection(user.id);
    await writeAuditLog({ userId: user.id, action: "WHATSAPP_TEST_CONNECTION", entityType: "WhatsAppSettings", entityId: "singleton", newData: result });
    return NextResponse.json(result);
  } catch (e) {
    if (e instanceof WhatsAppServiceError) return NextResponse.json({ error: "whatsapp_error", message: e.message }, { status: e.status });
    throw e;
  }
}
