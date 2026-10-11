import { NextResponse, type NextRequest } from "next/server";
import { requireApiUser } from "@/lib/auth/guard";
import { importRecords, parseUpload } from "@/services/data-transfer";

/** POST multipart: file (csv/json/xlsx), entity (cemeteries|people), dryRun, allowDuplicates */
export async function POST(req: NextRequest) {
  const user = await requireApiUser("data.import");
  if (user instanceof NextResponse) return user;
  const origin = req.headers.get("origin");
  if (origin && new URL(origin).host !== req.headers.get("host")) return NextResponse.json({ error: "bad_origin" }, { status: 403 });

  const fd = await req.formData();
  const file = fd.get("file");
  const entity = fd.get("entity");
  if (!(file instanceof File)) return NextResponse.json({ error: "لم يُرفع ملف" }, { status: 400 });
  if (file.size > 10 * 1024 * 1024) return NextResponse.json({ error: "الحد الأقصى لحجم ملف الاستيراد 10 ميغابايت" }, { status: 413 });
  if (entity !== "cemeteries" && entity !== "people") return NextResponse.json({ error: "نوع السجلات غير معروف" }, { status: 400 });
  let rows: Array<Record<string, unknown>>;
  try {
    rows = await parseUpload(file);
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "تعذّرت قراءة الملف" }, { status: 400 });
  }
  const report = await importRecords(entity, rows, user, {
    dryRun: fd.get("dryRun") === "1",
    allowDuplicates: fd.get("allowDuplicates") === "1",
  });
  return NextResponse.json(report);
}
