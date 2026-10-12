import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { recordRevision } from "@/lib/revisions";
import { ValidationError } from "@/lib/forms";
import { CEMETERY_SECTIONS, PERSON_SECTIONS, sectionByKey } from "@/lib/field-specs";
import type { SessionUser } from "@/lib/auth/session";
import {
  parseSection,
  refreshCemeterySearch,
  refreshPersonSearch,
  uniqueSlug,
  findSimilarCemeteries,
  findSimilarPeople,
  personDisplayName,
} from "./records";

export type Duplicate = { id: string; label: string; href: string };

// ---------------------------------------------------------------------------
// Cemeteries
// ---------------------------------------------------------------------------

export async function createCemetery(
  input: { canonicalName: string; localName?: string | null; regionId?: string | null; locality?: string | null; summary?: string | null },
  user: SessionUser,
  opts: { confirmDuplicate: boolean; action?: "CREATE" | "IMPORT" }
): Promise<{ id: string } | { duplicates: Duplicate[] }> {
  if (!input.canonicalName?.trim()) throw new ValidationError({ canonicalName: "الاسم المعتمد مطلوب" });
  if (!opts.confirmDuplicate) {
    const dups = await findSimilarCemeteries(input.canonicalName);
    if (dups.length) return { duplicates: dups };
  }
  const slug = await uniqueSlug("cemetery", input.canonicalName);
  return prisma.$transaction(async (tx) => {
    const c = await tx.cemetery.create({
      data: {
        slug,
        canonicalName: input.canonicalName.trim(),
        localName: input.localName ?? null,
        regionId: input.regionId || null,
        locality: input.locality ?? null,
        summary: input.summary ?? null,
        createdById: user.id,
        updatedById: user.id,
      },
    });
    await refreshCemeterySearch(tx, c.id);
    await recordRevision(tx, { entityType: "Cemetery", entityId: c.id, action: opts.action ?? "CREATE", userId: user.id, after: c });
    return { id: c.id };
  });
}

export async function updateCemeterySection(id: string, sectionKey: string, fd: FormData, version: number, user: SessionUser) {
  const section = sectionByKey(CEMETERY_SECTIONS, sectionKey);
  if (!section) throw new ValidationError({}, "قسم غير معروف");
  const { data, periodIds, errors } = parseSection(fd, section.fields);
  if (Object.keys(errors).length) throw new ValidationError(errors);

  await prisma.$transaction(async (tx) => {
    const before = await tx.cemetery.findUniqueOrThrow({ where: { id }, include: { periods: { select: { id: true } } } });
    if (before.version !== version) {
      throw new Error("CONFLICT:عدّل مستخدم آخر هذا السجل منذ فتحك للصفحة. أعد تحميل الصفحة ثم أعد إدخال تعديلاتك.");
    }
    const update: Prisma.CemeteryUpdateInput = { ...(data as Prisma.CemeteryUpdateInput), version: { increment: 1 }, updatedById: user.id };
    if ("regionId" in data) {
      delete (update as Record<string, unknown>).regionId;
      update.region = data.regionId ? { connect: { id: data.regionId as string } } : { disconnect: true };
    }
    if (periodIds) update.periods = { set: periodIds.map((pid) => ({ id: pid })) };
    if ("canonicalName" in data && data.canonicalName !== before.canonicalName) {
      update.slug = await uniqueSlug("cemetery", data.canonicalName as string, id);
    }
    const after = await tx.cemetery.update({ where: { id }, data: update, include: { periods: { select: { id: true } } } });
    await refreshCemeterySearch(tx, id);
    await recordRevision(tx, {
      entityType: "Cemetery", entityId: id, action: "UPDATE", userId: user.id,
      before: { ...before, periods: before.periods.map((p) => p.id) },
      after: { ...after, periods: after.periods.map((p) => p.id) },
      summary: `تعديل قسم «${section.title}»`,
    });
  });
}

// ---------------------------------------------------------------------------
// People
// ---------------------------------------------------------------------------

export async function createPerson(
  input: { fullName?: string | null; commonName?: string | null; nasab?: string | null; familyId?: string | null; summary?: string | null },
  user: SessionUser,
  opts: { confirmDuplicate: boolean; action?: "CREATE" | "IMPORT" }
): Promise<{ id: string } | { duplicates: Duplicate[] }> {
  const label = input.fullName?.trim() || input.commonName?.trim();
  if (!label) throw new ValidationError({ fullName: "أدخل الاسم الكامل أو الاسم الشائع" });
  if (!opts.confirmDuplicate) {
    const dups = await findSimilarPeople(label);
    if (dups.length) return { duplicates: dups };
  }
  const slug = await uniqueSlug("person", label);
  return prisma.$transaction(async (tx) => {
    const p = await tx.person.create({
      data: {
        slug,
        fullName: input.fullName?.trim() || null,
        commonName: input.commonName?.trim() || null,
        nasab: input.nasab ?? null,
        familyId: input.familyId || null,
        summary: input.summary ?? null,
        createdById: user.id,
        updatedById: user.id,
      },
    });
    await refreshPersonSearch(tx, p.id);
    await recordRevision(tx, { entityType: "Person", entityId: p.id, action: opts.action ?? "CREATE", userId: user.id, after: p });
    return { id: p.id };
  });
}

export async function updatePersonSection(id: string, sectionKey: string, fd: FormData, version: number, user: SessionUser) {
  const section = sectionByKey(PERSON_SECTIONS, sectionKey);
  if (!section) throw new ValidationError({}, "قسم غير معروف");
  const { data, periodIds, errors } = parseSection(fd, section.fields);
  if (Object.keys(errors).length) throw new ValidationError(errors);

  await prisma.$transaction(async (tx) => {
    const before = await tx.person.findUniqueOrThrow({ where: { id }, include: { periods: { select: { id: true } } } });
    if (before.version !== version) {
      throw new Error("CONFLICT:عدّل مستخدم آخر هذا السجل منذ فتحك للصفحة. أعد تحميل الصفحة ثم أعد إدخال تعديلاتك.");
    }
    const merged = { ...before, ...data };
    if (sectionKey === "identity" && !merged.fullName && !merged.commonName) {
      throw new ValidationError({ fullName: "أدخل الاسم الكامل أو الاسم الشائع" });
    }
    if (before.status === "PUBLISHED" && merged.isContemporary && !merged.publicationConsent) {
      throw new ValidationError({ publicationConsent: "السجل منشور: لا يمكن وسمه معاصرًا دون توثيق الموافقة. ألغِ النشر أولًا أو وثّق الموافقة." });
    }
    const update: Prisma.PersonUpdateInput = { ...(data as Prisma.PersonUpdateInput), version: { increment: 1 }, updatedById: user.id };
    if ("familyId" in data) {
      delete (update as Record<string, unknown>).familyId;
      update.family = data.familyId ? { connect: { id: data.familyId as string } } : { disconnect: true };
    }
    if (periodIds) update.periods = { set: periodIds.map((pid) => ({ id: pid })) };
    const newLabel = personDisplayName(merged);
    if (newLabel !== personDisplayName(before)) update.slug = await uniqueSlug("person", newLabel, id);

    const after = await tx.person.update({ where: { id }, data: update, include: { periods: { select: { id: true } } } });
    await refreshPersonSearch(tx, id);
    await recordRevision(tx, {
      entityType: "Person", entityId: id, action: "UPDATE", userId: user.id,
      before: { ...before, periods: before.periods.map((p) => p.id) },
      after: { ...after, periods: after.periods.map((p) => p.id) },
      summary: `تعديل قسم «${section.title}»`,
    });
  });
}

// ---------------------------------------------------------------------------
// Restore a previous snapshot (scalar fields only; links are separate records)
// ---------------------------------------------------------------------------

const CEMETERY_RESTORABLE = CEMETERY_SECTIONS.flatMap((s) => s.fields).filter((f) => f.kind !== "periods").map((f) => f.name);
const PERSON_RESTORABLE = PERSON_SECTIONS.flatMap((s) => s.fields).filter((f) => f.kind !== "periods").map((f) => f.name);

export async function restoreRevision(revisionId: string, user: SessionUser) {
  const rev = await prisma.revision.findUniqueOrThrow({ where: { id: revisionId } });
  const snap = (rev.snapshot ?? {}) as Record<string, unknown>;
  if (rev.entityType !== "Cemetery" && rev.entityType !== "Person") {
    throw new ValidationError({}, "الاسترجاع متاح لسجلات المدافن والأشخاص فقط");
  }
  const fields = rev.entityType === "Cemetery" ? CEMETERY_RESTORABLE : PERSON_RESTORABLE;
  const data: Record<string, unknown> = {};
  for (const f of fields) data[f] = snap[f] ?? (f === "isContemporary" ? false : null);
  if (rev.entityType === "Cemetery" && !data.canonicalName) throw new ValidationError({}, "النسخة لا تحتوي على اسم معتمد");

  await prisma.$transaction(async (tx) => {
    if (rev.entityType === "Cemetery") {
      const before = await tx.cemetery.findUniqueOrThrow({ where: { id: rev.entityId } });
      const after = await tx.cemetery.update({
        where: { id: rev.entityId },
        data: { ...(data as Prisma.CemeteryUncheckedUpdateInput), version: { increment: 1 }, updatedById: user.id },
      });
      await refreshCemeterySearch(tx, rev.entityId);
      await recordRevision(tx, { entityType: "Cemetery", entityId: rev.entityId, action: "RESTORE", userId: user.id, before, after, summary: `استرجاع نسخة ${rev.createdAt.toISOString()}` });
    } else {
      const before = await tx.person.findUniqueOrThrow({ where: { id: rev.entityId } });
      const after = await tx.person.update({
        where: { id: rev.entityId },
        data: { ...(data as Prisma.PersonUncheckedUpdateInput), version: { increment: 1 }, updatedById: user.id },
      });
      await refreshPersonSearch(tx, rev.entityId);
      await recordRevision(tx, { entityType: "Person", entityId: rev.entityId, action: "RESTORE", userId: user.id, before, after, summary: `استرجاع نسخة ${rev.createdAt.toISOString()}` });
    }
  });
  return rev;
}
