import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/guard";
import { updateTemplateSchema } from "@/lib/validation/whatsapp";
import { updateTemplate } from "@/services/whatsapp-service";
import { writeAuditLog } from "@/lib/audit";

interface Params {
  params: Promise<{ id: string }>;
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const auth = await requireAuth("whatsapp.manage");
  if (auth instanceof NextResponse) return auth;
  const { user } = auth;

  const { id } = await params;
  const body = await req.json().catch(() => null);
  const parsed = updateTemplateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_input", message: parsed.error.issues[0]?.message ?? "بيانات غير صالحة" }, { status: 400 });
  }

  const template = await updateTemplate(id, parsed.data.bodyAr);
  await writeAuditLog({ userId: user.id, action: "WHATSAPP_TEMPLATE_UPDATE", entityType: "NotificationTemplate", entityId: id });
  return NextResponse.json({ template });
}
