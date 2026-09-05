import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/guard";
import { listMessages } from "@/services/whatsapp-service";

export async function GET(req: NextRequest) {
  const auth = await requireAuth("whatsapp.manage");
  if (auth instanceof NextResponse) return auth;

  const parcelId = req.nextUrl.searchParams.get("parcelId") || undefined;
  const messages = await listMessages({ parcelId });
  return NextResponse.json({ messages });
}
