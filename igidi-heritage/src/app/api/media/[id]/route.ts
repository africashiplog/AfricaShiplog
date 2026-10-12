import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/session";
import { readStoredFile } from "@/services/storage";

/**
 * Serves an uploaded file. Public visitors only get files that are marked
 * public (rights cleared) AND attached to a published record (or to a source).
 * Staff can see everything. Files are served with nosniff + attachment for
 * non-images so nothing uploaded can execute in the site's origin.
 */
export async function GET(req: NextRequest, ctx: RouteContext<"/api/media/[id]">) {
  const { id } = await ctx.params;
  const media = await prisma.mediaFile.findUnique({
    where: { id },
    include: { cemetery: { select: { status: true } }, person: { select: { status: true, isContemporary: true, publicationConsent: true } }, oralAccount: { select: { isPublic: true } } },
  });
  if (!media) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const user = await getCurrentUser();
  if (!user) {
    const personVisible = media.person && media.person.status === "PUBLISHED" && (!media.person.isContemporary || media.person.publicationConsent);
    const attachedVisible =
      (media.cemetery && media.cemetery.status === "PUBLISHED") ||
      personVisible ||
      (media.oralAccount && media.oralAccount.isPublic) ||
      (media.sourceId && !media.cemeteryId && !media.personId);
    if (!media.isPublic || !attachedVisible) return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  let buf: Buffer;
  try {
    buf = await readStoredFile(media.storedName);
  } catch {
    return NextResponse.json({ error: "file_missing" }, { status: 404 });
  }
  const inline = media.mimeType.startsWith("image/") || media.mimeType.startsWith("audio/") || media.mimeType === "application/pdf";
  const download = req.nextUrl.searchParams.get("download") === "1";
  return new NextResponse(new Uint8Array(buf), {
    headers: {
      "Content-Type": media.mimeType,
      "Content-Length": String(buf.length),
      "Content-Disposition": `${inline && !download ? "inline" : "attachment"}; filename*=UTF-8''${encodeURIComponent(media.originalName)}`,
      "X-Content-Type-Options": "nosniff",
      "Cache-Control": user ? "private, no-store" : "public, max-age=3600",
      "Content-Security-Policy": "default-src 'none'; img-src 'self'; media-src 'self'; style-src 'unsafe-inline'; sandbox",
    },
  });
}
