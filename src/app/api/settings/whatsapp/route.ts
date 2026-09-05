import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/guard";
import { whatsappSettingsSchema } from "@/lib/validation/whatsapp";
import { getPublicSettings, updateSettings } from "@/services/whatsapp-service";
import { writeAuditLog } from "@/lib/audit";

export async function GET() {
  const auth = await requireAuth("whatsapp.manage");
  if (auth instanceof NextResponse) return auth;

  const settings = await getPublicSettings();
  return NextResponse.json({ settings });
}

export async function PATCH(req: NextRequest) {
  const auth = await requireAuth("whatsapp.manage");
  if (auth instanceof NextResponse) return auth;
  const { user } = auth;

  const body = await req.json().catch(() => null);
  const parsed = whatsappSettingsSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_input", message: "بيانات غير صالحة" }, { status: 400 });
  }

  const settings = await updateSettings(parsed.data, user.id);
  await writeAuditLog({
    userId: user.id,
    action: "WHATSAPP_SETTINGS_UPDATE",
    entityType: "WhatsAppSettings",
    entityId: "singleton",
    newData: { phoneNumberId: parsed.data.phoneNumberId, businessAccountId: parsed.data.businessAccountId, accessTokenChanged: !!parsed.data.accessToken },
  });
  return NextResponse.json({ settings });
}
