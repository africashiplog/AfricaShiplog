import type { Prisma, RecordStatus } from "@prisma/client";
import { prisma } from "@/lib/db";
import { buildSearchText, normalizeArabic, slugify } from "@/lib/arabic";
import { recordRevision } from "@/lib/revisions";
import { int, str, bool, ids, ValidationError } from "@/lib/forms";
import { YEAR_RANGES, type FieldSpec } from "@/lib/field-specs";
import type { SessionUser } from "@/lib/auth/session";
import { can } from "@/lib/auth/permissions";

export type EntityKind = "cemetery" | "person";

/** Parses the fields of one form section. Returns scalar data + the period ids if that section contains them. */
export function parseSection(fd: FormData, fields: FieldSpec[]) {
  const errors: Record<string, string> = {};
  const data: Record<string, unknown> = {};
  let periodIds: string[] | undefined;
  for (const f of fields) {
    switch (f.kind) {
      case "text":
        data[f.name] = str(fd, f.name, 500);
        break;
      case "textarea":
        data[f.name] = str(fd, f.name, 50000);
        break;
      case "hijri":
        data[f.name] = int(fd, f.name, errors, YEAR_RANGES.hijri);
        break;
      case "gregorian":
        data[f.name] = int(fd, f.name, errors, YEAR_RANGES.gregorian);
        break;
      case "region":
      case "family":
        data[f.name] = str(fd, f.name, 64);
        break;
      case "gender": {
        const g = str(fd, f.name, 2);
        data[f.name] = g === "M" || g === "F" ? g : null;
        break;
      }
      case "checkbox":
        data[f.name] = bool(fd, f.name);
        break;
      case "periods":
        periodIds = ids(fd, f.name);
        break;
    }
    if (f.required && (data[f.name] == null || data[f.name] === "")) errors[f.name] = "هذا الحقل مطلوب";
  }
  return { data, periodIds, errors };
}

export async function uniqueSlug(kind: EntityKind, base: string, excludeId?: string): Promise<string> {
  const root = slugify(base);
  for (let i = 1; i < 500; i++) {
    const candidate = i === 1 ? root : `${root}-${i}`;
    const existing =
      kind === "cemetery"
        ? await prisma.cemetery.findUnique({ where: { slug: candidate }, select: { id: true } })
        : await prisma.person.findUnique({ where: { slug: candidate }, select: { id: true } });
    if (!existing || existing.id === excludeId) return candidate;
  }
  return `${root}-${Date.now()}`;
}

export async function refreshCemeterySearch(tx: Prisma.TransactionClient, id: string) {
  const c = await tx.cemetery.findUnique({ where: { id }, include: { names: true, region: true } });
  if (!c) return;
  const searchText = buildSearchText([
    c.canonicalName, c.localName, c.locality, c.adminArea,
    c.region?.name, ...(c.region?.altNames ?? []),
    ...c.names.map((n) => n.name),
  ]);
  await tx.cemetery.update({ where: { id }, data: { searchText } });
  for (const n of c.names) {
    const normalized = normalizeArabic(n.name);
    if (normalized !== n.normalized) await tx.cemeteryName.update({ where: { id: n.id }, data: { normalized } });
  }
}

export async function refreshPersonSearch(tx: Prisma.TransactionClient, id: string) {
  const p = await tx.person.findUnique({ where: { id }, include: { names: true, family: true } });
  if (!p) return;
  const searchText = buildSearchText([
    p.fullName, p.commonName, p.titles, p.nasab,
    p.family?.name, ...(p.family?.altNames ?? []),
    ...p.names.map((n) => n.name),
  ]);
  await tx.person.update({ where: { id }, data: { searchText } });
  for (const n of p.names) {
    const normalized = normalizeArabic(n.name);
    if (normalized !== n.normalized) await tx.personName.update({ where: { id: n.id }, data: { normalized } });
  }
}

export function personDisplayName(p: { fullName: string | null; commonName: string | null }): string {
  return p.commonName || p.fullName || "(بلا اسم)";
}

// ---------------------------------------------------------------------------
// Duplicate detection (Arabic-normalized, trigram word similarity)
// ---------------------------------------------------------------------------

export async function findSimilarCemeteries(name: string, excludeId?: string) {
  const q = normalizeArabic(name);
  if (!q) return [];
  const rows = await prisma.$queryRaw<Array<{ id: string; canonicalName: string; status: RecordStatus; score: number }>>`
    SELECT id, "canonicalName", status, word_similarity(${q}, "searchText") AS score
    FROM "Cemetery"
    WHERE (${q} <% "searchText" OR "searchText" LIKE ${"%" + q + "%"}) AND id <> ${excludeId ?? ""}
    ORDER BY score DESC LIMIT 5`;
  return rows.map((r) => ({ id: r.id, label: r.canonicalName, href: `/admin/cemeteries/${r.id}` }));
}

export async function findSimilarPeople(name: string, excludeId?: string) {
  const q = normalizeArabic(name);
  if (!q) return [];
  const rows = await prisma.$queryRaw<Array<{ id: string; fullName: string | null; commonName: string | null; score: number }>>`
    SELECT id, "fullName", "commonName", word_similarity(${q}, "searchText") AS score
    FROM "Person"
    WHERE (${q} <% "searchText" OR "searchText" LIKE ${"%" + q + "%"}) AND id <> ${excludeId ?? ""}
    ORDER BY score DESC LIMIT 5`;
  return rows.map((r) => ({ id: r.id, label: personDisplayName(r), href: `/admin/people/${r.id}` }));
}

// ---------------------------------------------------------------------------
// Workflow
// ---------------------------------------------------------------------------

const EDITOR_TRANSITIONS: Record<RecordStatus, RecordStatus[]> = {
  DRAFT: ["IN_REVIEW"],
  IN_REVIEW: ["DRAFT"],
  PUBLISHED: [],
  ARCHIVED: [],
};

export function assertTransition(user: SessionUser, from: RecordStatus, to: RecordStatus) {
  if (from === to) throw new ValidationError({}, "السجل في هذه الحالة بالفعل");
  if (can(user.role, "content.publish")) return;
  if (!can(user.role, "content.edit") || !EDITOR_TRANSITIONS[from].includes(to)) {
    throw new ValidationError({}, "لا تملك صلاحية هذا الانتقال. المحرر يرسل للمراجعة، والمراجع ينشر.");
  }
}

export async function setCemeteryStatus(id: string, to: RecordStatus, user: SessionUser, note?: string | null) {
  await prisma.$transaction(async (tx) => {
    const before = await tx.cemetery.findUniqueOrThrow({ where: { id } });
    assertTransition(user, before.status, to);
    const after = await tx.cemetery.update({
      where: { id },
      data: {
        status: to,
        version: { increment: 1 },
        updatedById: user.id,
        publishedAt: to === "PUBLISHED" ? (before.publishedAt ?? new Date()) : before.publishedAt,
      },
    });
    await recordRevision(tx, { entityType: "Cemetery", entityId: id, action: "STATUS_CHANGE", userId: user.id, before, after, summary: note ?? undefined });
  });
}

export async function setPersonStatus(id: string, to: RecordStatus, user: SessionUser, note?: string | null) {
  await prisma.$transaction(async (tx) => {
    const before = await tx.person.findUniqueOrThrow({ where: { id } });
    assertTransition(user, before.status, to);
    if (to === "PUBLISHED" && before.isContemporary && !before.publicationConsent) {
      throw new ValidationError({}, "هذا السجل لشخص معاصر: يجب توثيق موافقة النشر قبل نشره (قسم «ملاحظات وخصوصية»).");
    }
    if (to === "PUBLISHED" && !before.fullName && !before.commonName) {
      throw new ValidationError({}, "لا يمكن نشر سجل بلا اسم");
    }
    const after = await tx.person.update({
      where: { id },
      data: {
        status: to,
        version: { increment: 1 },
        updatedById: user.id,
        publishedAt: to === "PUBLISHED" ? (before.publishedAt ?? new Date()) : before.publishedAt,
      },
    });
    await recordRevision(tx, { entityType: "Person", entityId: id, action: "STATUS_CHANGE", userId: user.id, before, after, summary: note ?? undefined });
  });
}
