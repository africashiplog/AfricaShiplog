import { NextResponse, type NextRequest } from "next/server";
import type { MediaKind } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requireApiUser } from "@/lib/auth/guard";
import { recordRevision } from "@/lib/revisions";
import { MAX_UPLOAD_BYTES, sniffFileType, storeFile } from "@/services/storage";

const KINDS: MediaKind[] = ["PHOTO", "OLD_MAP", "GEO_DOCUMENT", "DOCUMENT", "MANUSCRIPT", "PAGE_SCAN", "AUDIO", "OTHER"];
const TARGETS = ["cemeteryId", "personId", "sourceId", "oralAccountId"] as const;

/** Upload a file (multipart). The real type is checked from the bytes, not the name. */
export async function POST(req: NextRequest) {
  const user = await requireApiUser("content.edit");
  if (user instanceof NextResponse) return user;
  const origin = req.headers.get("origin");
  if (origin && new URL(origin).host !== req.headers.get("host")) {
    return NextResponse.json({ error: "bad_origin" }, { status: 403 });
  }
  const length = Number(req.headers.get("content-length") ?? "0");
  if (length > MAX_UPLOAD_BYTES + 64 * 1024) return NextResponse.json({ error: "الملف أكبر من الحد المسموح" }, { status: 413 });

  const fd = await req.formData();
  const file = fd.get("file");
  if (!(file instanceof File)) return NextResponse.json({ error: "لم يُرفع ملف" }, { status: 400 });
  if (file.size > MAX_UPLOAD_BYTES) return NextResponse.json({ error: "الملف أكبر من الحد المسموح" }, { status: 413 });
  const buf = Buffer.from(await file.arrayBuffer());
  const type = sniffFileType(buf);
  if (!type) {
    return NextResponse.json({ error: "نوع الملف غير مسموح. المسموح: JPG, PNG, WEBP, GIF, TIFF, PDF, MP3, OGG, WAV, M4A" }, { status: 415 });
  }
  const target: Record<string, string> = {};
  for (const t of TARGETS) {
    const v = fd.get(t);
    if (typeof v === "string" && v) target[t] = v.slice(0, 64);
  }
  const kindRaw = String(fd.get("kind") ?? "PHOTO");
  const kind = (KINDS as string[]).includes(kindRaw) ? (kindRaw as MediaKind) : "OTHER";
  const text = (k: string, max: number) => {
    const v = fd.get(k);
    return typeof v === "string" && v.trim() ? v.trim().slice(0, max) : null;
  };
  const rights = text("rights", 2000);
  const isPublic = fd.get("isPublic") === "on" && !!rights;

  const { storedName, sha256 } = await storeFile(buf, type);
  const media = await prisma.$transaction(async (tx) => {
    const m = await tx.mediaFile.create({
      data: {
        kind, storedName, sha256, mimeType: type.mime, sizeBytes: buf.length,
        originalName: file.name.replace(/[\\/\0]/g, "_").slice(0, 200) || `file.${type.ext}`,
        title: text("title", 500), caption: text("caption", 5000), credit: text("credit", 500), rights, isPublic,
        uploadedById: user.id, ...target,
      },
    });
    await recordRevision(tx, { entityType: "MediaFile", entityId: m.id, action: "CREATE", userId: user.id, after: m });
    return m;
  });
  const duplicate = await prisma.mediaFile.count({ where: { sha256, NOT: { id: media.id } } });
  return NextResponse.json({ id: media.id, duplicate: duplicate > 0 });
}
