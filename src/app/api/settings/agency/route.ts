import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/guard";
import { agencySettingsSchema } from "@/lib/validation/agency-settings";
import { getAgencySettings, updateAgencySettings } from "@/services/agency-settings-service";
import { writeAuditLog } from "@/lib/audit";

export async function GET() {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;

  const settings = await getAgencySettings();
  return NextResponse.json({ settings });
}

export async function PATCH(req: NextRequest) {
  const auth = await requireAuth("settings.manage");
  if (auth instanceof NextResponse) return auth;
  const { user } = auth;

  const body = await req.json().catch(() => null);
  const parsed = agencySettingsSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_input", message: parsed.error.issues[0]?.message ?? "بيانات غير صالحة" }, { status: 400 });
  }

  const settings = await updateAgencySettings(parsed.data, user.id);
  await writeAuditLog({ userId: user.id, action: "AGENCY_SETTINGS_UPDATE", entityType: "SystemSetting", entityId: "agency", newData: settings });
  return NextResponse.json({ settings });
}
