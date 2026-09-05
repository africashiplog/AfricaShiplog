import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/guard";
import { listTemplates } from "@/services/whatsapp-service";

export async function GET() {
  const auth = await requireAuth("whatsapp.manage");
  if (auth instanceof NextResponse) return auth;

  const templates = await listTemplates();
  return NextResponse.json({ templates });
}
