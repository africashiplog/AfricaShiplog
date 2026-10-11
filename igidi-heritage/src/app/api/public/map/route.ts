import { NextResponse, type NextRequest } from "next/server";
import type { LocationPrecision, VerificationStatus } from "@prisma/client";
import { getMapFeatures } from "@/services/public";

const PRECISIONS = ["EXACT", "APPROXIMATE", "AREA", "UNKNOWN", "CONFIRMED"];
const VERIFS = ["DOCUMENTED", "MULTI_SOURCE", "ORAL", "DISPUTED", "UNVERIFIED"];

/** Public, read-only: published cemeteries for the map (GeoJSON-like list). */
export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const precision = sp.get("precision") ?? "";
  const verification = sp.get("verification") ?? "";
  const features = await getMapFeatures({
    q: sp.get("q")?.slice(0, 200) || undefined,
    regionId: sp.get("region")?.slice(0, 64) || undefined,
    periodId: sp.get("period")?.slice(0, 64) || undefined,
    precision: PRECISIONS.includes(precision) ? (precision as LocationPrecision | "CONFIRMED") : undefined,
    verification: VERIFS.includes(verification) ? (verification as VerificationStatus) : undefined,
  });
  return NextResponse.json({ features }, { headers: { "Cache-Control": "no-store" } });
}
