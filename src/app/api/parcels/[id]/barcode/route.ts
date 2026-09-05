import { NextRequest, NextResponse } from "next/server";
import bwipjs from "bwip-js/node";
import { requireAuth } from "@/lib/auth/guard";
import { getParcel } from "@/services/parcel-service";

interface Params {
  params: Promise<{ id: string }>;
}

export async function GET(_req: NextRequest, { params }: Params) {
  const auth = await requireAuth("parcels.view");
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;
  const parcel = await getParcel(id);
  if (!parcel) return NextResponse.json({ error: "not_found", message: "الطرد غير موجود" }, { status: 404 });

  const png = await bwipjs.toBuffer({
    bcid: "code128",
    text: parcel.trackingNumber,
    scale: 3,
    height: 12,
    includetext: true,
    textxalign: "center",
  });

  return new NextResponse(new Uint8Array(png), {
    headers: { "Content-Type": "image/png", "Cache-Control": "private, max-age=3600" },
  });
}
