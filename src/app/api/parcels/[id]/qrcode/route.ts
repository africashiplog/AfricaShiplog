import { NextRequest, NextResponse } from "next/server";
import QRCode from "qrcode";
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

  const png = await QRCode.toBuffer(parcel.trackingNumber, { type: "png", width: 220, margin: 1 });

  return new NextResponse(new Uint8Array(png), {
    headers: { "Content-Type": "image/png", "Cache-Control": "private, max-age=3600" },
  });
}
