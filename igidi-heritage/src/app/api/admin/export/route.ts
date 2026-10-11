import { NextResponse, type NextRequest } from "next/server";
import { requireApiUser } from "@/lib/auth/guard";
import { prisma } from "@/lib/db";
import { EXPORT_ENTITIES, exportCsv, fullBackup, importTemplate, type ExportEntity } from "@/services/data-transfer";

/**
 * GET /api/admin/export?format=json            -> full JSON backup
 * GET /api/admin/export?format=csv&entity=...  -> one table as CSV (UTF-8 BOM)
 * GET /api/admin/export?template=cemeteries     -> empty import template
 */
export async function GET(req: NextRequest) {
  const user = await requireApiUser("data.export");
  if (user instanceof NextResponse) return user;
  const sp = req.nextUrl.searchParams;
  const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");

  const template = sp.get("template");
  if (template === "cemeteries" || template === "people") {
    return new NextResponse(importTemplate(template), {
      headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="template-${template}.csv"` },
    });
  }

  if (sp.get("format") === "csv") {
    const entity = sp.get("entity") as ExportEntity;
    if (!EXPORT_ENTITIES.includes(entity)) return NextResponse.json({ error: "unknown entity" }, { status: 400 });
    const csv = await exportCsv(entity);
    return new NextResponse(csv, {
      headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="igidi-${entity}-${stamp}.csv"` },
    });
  }

  const backup = await fullBackup();
  await prisma.revision.create({
    data: { entityType: "System", entityId: "backup", action: "UPDATE", userId: user.id, summary: "تنزيل نسخة احتياطية كاملة (JSON)" },
  });
  return new NextResponse(JSON.stringify(backup, null, 2), {
    headers: { "Content-Type": "application/json; charset=utf-8", "Content-Disposition": `attachment; filename="igidi-backup-${stamp}.json"` },
  });
}
