import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { toCsv, parseCsv, rowsToObjects } from "@/lib/csv";
import { ALL_CEMETERY_FIELDS, ALL_PERSON_FIELDS, YEAR_RANGES, type FieldSpec } from "@/lib/field-specs";
import { recordRevision } from "@/lib/revisions";
import { normalizeArabic } from "@/lib/arabic";
import type { SessionUser } from "@/lib/auth/session";
import { createCemetery, createPerson } from "./entities";
import { refreshCemeterySearch, refreshPersonSearch } from "./records";

// ---------------------------------------------------------------------------
// Export
// ---------------------------------------------------------------------------

export const EXPORT_ENTITIES = ["cemeteries", "people", "burials", "relations", "locations", "sources", "citations", "regions", "periods", "families"] as const;
export type ExportEntity = (typeof EXPORT_ENTITIES)[number];

/** Full JSON backup of all research data (users without password hashes; sessions excluded). */
export async function fullBackup() {
  const [
    regions, periods, families, cemeteries, cemeteryNames, locations, people, personNames, burials,
    relations, works, events, oralAccounts, sources, citations, media, revisions, users, settings,
  ] = await Promise.all([
    prisma.region.findMany(), prisma.historicalPeriod.findMany(), prisma.family.findMany(),
    prisma.cemetery.findMany({ include: { periods: { select: { id: true } } } }), prisma.cemeteryName.findMany(), prisma.location.findMany(),
    prisma.person.findMany({ include: { periods: { select: { id: true } } } }), prisma.personName.findMany(), prisma.burial.findMany(),
    prisma.personRelation.findMany(), prisma.work.findMany(), prisma.historicalEvent.findMany(), prisma.oralAccount.findMany(),
    prisma.source.findMany(), prisma.citation.findMany(), prisma.mediaFile.findMany(), prisma.revision.findMany({ orderBy: { createdAt: "asc" } }),
    prisma.user.findMany({ select: { id: true, email: true, name: true, role: true, isActive: true, createdAt: true } }),
    prisma.siteSetting.findMany(),
  ]);
  return {
    format: "igidi-heritage-backup",
    version: 1,
    exportedAt: new Date().toISOString(),
    note: "Media binaries are not embedded; back up the UPLOAD_DIR folder alongside this file (see docs/BACKUP.md).",
    data: {
      regions, periods, families, cemeteries, cemeteryNames, locations, people, personNames, burials,
      relations, works, events, oralAccounts, sources, citations, media, revisions, users, settings,
    },
  };
}

export async function exportCsv(entity: ExportEntity): Promise<string> {
  switch (entity) {
    case "cemeteries": {
      const rows = await prisma.cemetery.findMany({ include: { region: true, periods: true, names: true }, orderBy: { canonicalName: "asc" } });
      const headers = ["id", "slug", "status", ...ALL_CEMETERY_FIELDS.filter((f) => f.kind !== "periods" && f.kind !== "region").map((f) => f.name), "region", "periods", "alternativeNames", "createdAt", "updatedAt"];
      return toCsv(headers, rows.map((c) => ({
        ...c, region: c.region?.name, periods: c.periods.map((p) => p.name).join(" | "),
        alternativeNames: c.names.map((n) => n.name).join(" | "),
        createdAt: c.createdAt.toISOString(), updatedAt: c.updatedAt.toISOString(),
      })));
    }
    case "people": {
      const rows = await prisma.person.findMany({ include: { family: true, periods: true, names: true }, orderBy: { fullName: "asc" } });
      const headers = ["id", "slug", "status", ...ALL_PERSON_FIELDS.filter((f) => !["periods", "family"].includes(f.kind)).map((f) => f.name), "family", "periods", "alternativeNames", "createdAt", "updatedAt"];
      return toCsv(headers, rows.map((p) => ({
        ...p, family: p.family?.name, periods: p.periods.map((x) => x.name).join(" | "),
        alternativeNames: p.names.map((n) => n.name).join(" | "),
        createdAt: p.createdAt.toISOString(), updatedAt: p.updatedAt.toISOString(),
      })));
    }
    case "burials": {
      const rows = await prisma.burial.findMany({ include: { person: true, cemetery: true } });
      return toCsv(["id", "personId", "person", "cemeteryId", "cemetery", "relation", "verification", "burialDateText", "graveDescription", "note"],
        rows.map((b) => ({ ...b, person: b.person.commonName ?? b.person.fullName, cemetery: b.cemetery.canonicalName })));
    }
    case "relations": {
      const rows = await prisma.personRelation.findMany({ include: { from: true, to: true } });
      return toCsv(["id", "fromId", "from", "type", "toId", "to", "kinLabel", "verification", "note"],
        rows.map((r) => ({ ...r, from: r.from.commonName ?? r.from.fullName, to: r.to.commonName ?? r.to.fullName })));
    }
    case "locations": {
      const rows = await prisma.location.findMany({ include: { cemetery: true } });
      return toCsv(["id", "cemeteryId", "cemetery", "isPrimary", "latitude", "longitude", "precision", "radiusMeters", "method", "verification", "sourceNote", "description"],
        rows.map((l) => ({ ...l, cemetery: l.cemetery.canonicalName, latitude: l.latitude?.toString(), longitude: l.longitude?.toString() })));
    }
    case "sources": {
      const rows = await prisma.source.findMany({ orderBy: { title: "asc" } });
      return toCsv(["id", "type", "title", "author", "editor", "publisher", "publicationPlace", "year", "edition", "volumes", "url", "isPrimary", "description", "reliabilityNotes", "rightsNotes"], rows);
    }
    case "citations": {
      const rows = await prisma.citation.findMany({ include: { source: true } });
      return toCsv(["id", "sourceId", "source", "volume", "pages", "field", "quote", "summary", "note", "cemeteryId", "personId", "burialId", "relationId", "locationId", "workId", "eventId", "oralAccountId"],
        rows.map((c) => ({ ...c, source: c.source.title })));
    }
    case "regions":
      return toCsv(["id", "name", "altNames", "kind", "parentId", "description"], (await prisma.region.findMany()).map((r) => ({ ...r, altNames: r.altNames.join(" | ") })));
    case "periods":
      return toCsv(["id", "name", "startYearHijri", "endYearHijri", "startYearGregorian", "endYearGregorian", "sortOrder", "description"], await prisma.historicalPeriod.findMany());
    case "families":
      return toCsv(["id", "name", "altNames", "parentId", "description"], (await prisma.family.findMany()).map((r) => ({ ...r, altNames: r.altNames.join(" | ") })));
  }
}

// ---------------------------------------------------------------------------
// Import (cemeteries / people) — always as DRAFT, never overwriting
// ---------------------------------------------------------------------------

export interface ImportReport {
  total: number;
  created: Array<{ row: number; id: string; label: string }>;
  duplicates: Array<{ row: number; label: string; matches: string[] }>;
  errors: Array<{ row: number; message: string }>;
  dryRun: boolean;
}

/** Column headers may be the field key (canonicalName) or its Arabic label. */
function headerMap(fields: FieldSpec[]): Map<string, string> {
  const m = new Map<string, string>();
  for (const f of fields) {
    m.set(normalizeArabic(f.name), f.name);
    m.set(normalizeArabic(f.label), f.name);
  }
  // Friendly aliases
  const aliases: Record<string, string> = {
    "الاسم": "canonicalName", "اسم المدفن": "canonicalName", "name": "canonicalName",
    "المنطقة": "region", "region": "region", "الفترة": "periods", "periods": "periods",
    "الأسماء البديلة": "alternativeNames", "alternativenames": "alternativeNames",
    "الأسرة": "family", "family": "family", "latitude": "latitude", "longitude": "longitude",
    "خط العرض": "latitude", "خط الطول": "longitude", "دقة الموقع": "precision", "precision": "precision",
  };
  for (const [k, v] of Object.entries(aliases)) m.set(normalizeArabic(k), v);
  return m;
}

export async function parseUpload(file: File): Promise<Array<Record<string, unknown>>> {
  const name = file.name.toLowerCase();
  const buf = Buffer.from(await file.arrayBuffer());
  if (name.endsWith(".json")) {
    const parsed = JSON.parse(buf.toString("utf8"));
    if (Array.isArray(parsed)) return parsed;
    if (parsed && typeof parsed === "object" && Array.isArray(parsed.rows)) return parsed.rows;
    throw new Error("ملف JSON يجب أن يحتوي على مصفوفة سجلات");
  }
  if (name.endsWith(".xlsx")) {
    const ExcelJS = (await import("exceljs")).default;
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(buf as unknown as ArrayBuffer);
    const ws = wb.worksheets[0];
    if (!ws) return [];
    const rows: string[][] = [];
    ws.eachRow({ includeEmpty: false }, (row) => {
      const values = (row.values as unknown[]).slice(1).map((v) => {
        if (v == null) return "";
        if (typeof v === "object" && v !== null && "text" in v) return String((v as { text: unknown }).text);
        if (typeof v === "object" && v !== null && "result" in v) return String((v as { result: unknown }).result ?? "");
        return String(v);
      });
      rows.push(values);
    });
    return rowsToObjects(rows);
  }
  if (name.endsWith(".csv") || name.endsWith(".txt")) return rowsToObjects(parseCsv(buf.toString("utf8")));
  throw new Error("صيغة غير مدعومة. استخدم CSV أو JSON أو XLSX");
}

function cleanRow(raw: Record<string, unknown>, fields: FieldSpec[]) {
  const map = headerMap(fields);
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(raw)) {
    const key = map.get(normalizeArabic(k));
    if (!key || v == null) continue;
    const s = String(v).trim();
    if (s) out[key] = s.slice(0, 50000);
  }
  return out;
}

function scalarData(row: Record<string, string>, fields: FieldSpec[], errors: string[]) {
  const data: Record<string, unknown> = {};
  for (const f of fields) {
    const v = row[f.name];
    if (v == null) continue;
    if (f.kind === "text" || f.kind === "textarea") data[f.name] = v;
    else if (f.kind === "hijri" || f.kind === "gregorian") {
      const n = Number(v.replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x0660)));
      const range = YEAR_RANGES[f.kind];
      if (!Number.isInteger(n) || n < range.min || n > range.max) errors.push(`«${f.label}»: قيمة غير صالحة (${v})`);
      else data[f.name] = n;
    } else if (f.kind === "gender") data[f.name] = v === "F" || v === "أنثى" ? "F" : v === "M" || v === "ذكر" ? "M" : null;
    else if (f.kind === "checkbox") data[f.name] = ["1", "true", "نعم", "yes"].includes(v.toLowerCase());
  }
  return data;
}

async function findByName<T extends { id: string }>(model: "region" | "family" | "period", name: string): Promise<T | null> {
  const n = normalizeArabic(name);
  if (model === "region") return (await prisma.region.findFirst({ where: { searchText: { contains: n } } })) as T | null;
  if (model === "family") return (await prisma.family.findFirst({ where: { searchText: { contains: n } } })) as T | null;
  return (await prisma.historicalPeriod.findFirst({ where: { searchText: { contains: n } } })) as T | null;
}

export async function importRecords(
  entity: "cemeteries" | "people",
  rawRows: Array<Record<string, unknown>>,
  user: SessionUser,
  opts: { dryRun: boolean; allowDuplicates: boolean }
): Promise<ImportReport> {
  const fields = entity === "cemeteries" ? ALL_CEMETERY_FIELDS : ALL_PERSON_FIELDS;
  const report: ImportReport = { total: rawRows.length, created: [], duplicates: [], errors: [], dryRun: opts.dryRun };
  if (rawRows.length > 5000) {
    report.errors.push({ row: 0, message: "الحد الأقصى 5000 سجل في الملف الواحد" });
    return report;
  }
  const extraFields = [...fields, { name: "region", label: "المنطقة", kind: "text" }, { name: "family", label: "الأسرة", kind: "text" }, { name: "periods", label: "الفترات", kind: "text" }, { name: "alternativeNames", label: "الأسماء البديلة", kind: "text" }, { name: "latitude", label: "خط العرض", kind: "text" }, { name: "longitude", label: "خط الطول", kind: "text" }, { name: "precision", label: "دقة الموقع", kind: "text" }] as FieldSpec[];

  for (let i = 0; i < rawRows.length; i++) {
    const rowNo = i + 2; // header is row 1
    const row = cleanRow(rawRows[i], extraFields);
    const errs: string[] = [];
    const data = scalarData(row, fields, errs);
    const label = entity === "cemeteries" ? (row.canonicalName ?? "") : (row.fullName ?? row.commonName ?? "");
    if (!label) errs.push(entity === "cemeteries" ? "الاسم المعتمد مفقود" : "الاسم مفقود");

    let regionId: string | null = null, familyId: string | null = null;
    const periodIds: string[] = [];
    if (row.region) {
      const r = await findByName("region", row.region);
      if (!r) errs.push(`المنطقة «${row.region}» غير موجودة — أنشئها أولًا`);
      else regionId = r.id;
    }
    if (row.family) {
      const f = await findByName("family", row.family);
      if (!f) errs.push(`الأسرة «${row.family}» غير موجودة — أنشئها أولًا`);
      else familyId = f.id;
    }
    for (const pn of (row.periods ?? "").split(/[|،,]/).map((s) => s.trim()).filter(Boolean)) {
      const p = await findByName("period", pn);
      if (!p) errs.push(`الفترة «${pn}» غير موجودة`);
      else periodIds.push(p.id);
    }
    let coords: { lat: number; lng: number } | null = null;
    if (row.latitude || row.longitude) {
      const lat = Number(row.latitude), lng = Number(row.longitude);
      if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) errs.push("إحداثيات غير صالحة");
      else coords = { lat, lng };
    }
    if (errs.length) {
      report.errors.push({ row: rowNo, message: errs.join("؛ ") });
      continue;
    }
    if (opts.dryRun) {
      const { findSimilarCemeteries, findSimilarPeople } = await import("./records");
      const d = entity === "cemeteries" ? await findSimilarCemeteries(label) : await findSimilarPeople(label);
      if (d.length && !opts.allowDuplicates) report.duplicates.push({ row: rowNo, label, matches: d.map((x) => x.label) });
      else report.created.push({ row: rowNo, id: "", label });
      continue;
    }
    try {
      const result =
        entity === "cemeteries"
          ? await createCemetery({ canonicalName: label, regionId }, user, { confirmDuplicate: opts.allowDuplicates, action: "IMPORT" })
          : await createPerson({ fullName: row.fullName ?? null, commonName: row.commonName ?? null, familyId }, user, { confirmDuplicate: opts.allowDuplicates, action: "IMPORT" });
      if ("duplicates" in result) {
        report.duplicates.push({ row: rowNo, label, matches: result.duplicates.map((d) => d.label) });
        continue;
      }
      await prisma.$transaction(async (tx) => {
        const alt = (row.alternativeNames ?? "").split("|").map((s) => s.trim()).filter(Boolean);
        if (entity === "cemeteries") {
          const before = await tx.cemetery.findUniqueOrThrow({ where: { id: result.id } });
          const after = await tx.cemetery.update({
            where: { id: result.id },
            data: { ...(data as Prisma.CemeteryUncheckedUpdateInput), periods: { set: periodIds.map((id) => ({ id })) } },
          });
          for (const n of alt) await tx.cemeteryName.create({ data: { cemeteryId: result.id, name: n, normalized: normalizeArabic(n) } });
          if (coords) {
            // Imported coordinates are never treated as confirmed until reviewed.
            await tx.location.create({
              data: { cemeteryId: result.id, isPrimary: true, latitude: coords.lat, longitude: coords.lng, precision: row.precision === "EXACT" ? "EXACT" : "APPROXIMATE", radiusMeters: row.precision === "EXACT" ? null : 1000, method: "ESTIMATE", verification: "UNVERIFIED", sourceNote: "مستورد من ملف — يحتاج مراجعة" },
            });
          }
          await refreshCemeterySearch(tx, result.id);
          await recordRevision(tx, { entityType: "Cemetery", entityId: result.id, action: "IMPORT", userId: user.id, before, after, summary: "استكمال الحقول من ملف الاستيراد" });
        } else {
          const before = await tx.person.findUniqueOrThrow({ where: { id: result.id } });
          const after = await tx.person.update({
            where: { id: result.id },
            data: { ...(data as Prisma.PersonUncheckedUpdateInput), periods: { set: periodIds.map((id) => ({ id })) } },
          });
          for (const n of alt) await tx.personName.create({ data: { personId: result.id, name: n, normalized: normalizeArabic(n) } });
          await refreshPersonSearch(tx, result.id);
          await recordRevision(tx, { entityType: "Person", entityId: result.id, action: "IMPORT", userId: user.id, before, after, summary: "استكمال الحقول من ملف الاستيراد" });
        }
      });
      report.created.push({ row: rowNo, id: result.id, label });
    } catch (e) {
      report.errors.push({ row: rowNo, message: e instanceof Error ? e.message : "خطأ غير معروف" });
    }
  }
  return report;
}

/** Template CSV with every importable column (keys + Arabic labels in a second header row is avoided: keys only). */
export function importTemplate(entity: "cemeteries" | "people"): string {
  const fields = entity === "cemeteries" ? ALL_CEMETERY_FIELDS : ALL_PERSON_FIELDS;
  const cols = fields.filter((f) => !["periods", "region", "family"].includes(f.kind)).map((f) => f.name);
  const extra = entity === "cemeteries" ? ["region", "periods", "alternativeNames", "latitude", "longitude", "precision"] : ["family", "periods", "alternativeNames"];
  return toCsv([...cols, ...extra], []);
}
