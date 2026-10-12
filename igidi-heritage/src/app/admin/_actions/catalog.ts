"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import type { SourceType } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requireActionUser } from "@/lib/auth/guard";
import { runAction, str, int, bool, oneOf, ValidationError, type ActionResult } from "@/lib/forms";
import { recordRevision } from "@/lib/revisions";
import { buildSearchText } from "@/lib/arabic";
import { YEAR_RANGES } from "@/lib/field-specs";
import { refreshCemeterySearch, refreshPersonSearch } from "@/services/records";

const SOURCE_TYPES: SourceType[] = ["BOOK", "MANUSCRIPT", "ARTICLE", "THESIS", "ARCHIVE_DOCUMENT", "MAP", "ORAL_INTERVIEW", "FIELD_SURVEY", "WEBSITE", "OTHER"];

function altNames(fd: FormData): string[] {
  return (str(fd, "altNames", 5000) ?? "")
    .split(/[\n،,]/)
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 50);
}

// ---------------------------------------------------------------------------
// Sources
// ---------------------------------------------------------------------------

export async function saveSourceAction(_: ActionResult, fd: FormData): Promise<ActionResult> {
  let createdId: string | null = null;
  const res = await runAction(async () => {
    const user = await requireActionUser("content.edit");
    const id = str(fd, "id", 64);
    const title = str(fd, "title", 1000);
    if (!title) throw new ValidationError({ title: "عنوان المصدر مطلوب" });
    const url = str(fd, "url", 2000);
    if (url && !/^https?:\/\//i.test(url)) throw new ValidationError({ url: "الرابط يجب أن يبدأ بـ http:// أو https://" });
    const data = {
      type: oneOf(fd, "type", SOURCE_TYPES, "BOOK"),
      title,
      author: str(fd, "author", 1000),
      editor: str(fd, "editor", 1000),
      publisher: str(fd, "publisher", 1000),
      publicationPlace: str(fd, "publicationPlace", 500),
      year: str(fd, "year", 100),
      edition: str(fd, "edition", 200),
      volumes: str(fd, "volumes", 200),
      url,
      description: str(fd, "description", 20000),
      reliabilityNotes: str(fd, "reliabilityNotes", 20000),
      rightsNotes: str(fd, "rightsNotes", 5000),
      isPrimary: bool(fd, "isPrimary"),
    };
    const searchText = buildSearchText([data.title, data.author, data.editor, data.publisher]);
    await prisma.$transaction(async (tx) => {
      if (id) {
        const before = await tx.source.findUniqueOrThrow({ where: { id } });
        const after = await tx.source.update({ where: { id }, data: { ...data, searchText } });
        await recordRevision(tx, { entityType: "Source", entityId: id, action: "UPDATE", userId: user.id, before, after });
      } else {
        const after = await tx.source.create({ data: { ...data, searchText } });
        createdId = after.id;
        await recordRevision(tx, { entityType: "Source", entityId: after.id, action: "CREATE", userId: user.id, after });
      }
    });
    if (id) refresh();
    return { message: "حُفظ المصدر ✓" };
  });
  if (res.ok && createdId) redirect(`/admin/sources/${createdId}?created=1`);
  return res;
}

export async function deleteSourceAction(_: ActionResult, fd: FormData): Promise<ActionResult> {
  const res = await runAction(async () => {
    const user = await requireActionUser("content.delete");
    const id = str(fd, "id", 64)!;
    const used = await prisma.citation.count({ where: { sourceId: id } });
    if (used) throw new ValidationError({}, `لا يمكن حذف مصدر مستشهد به في ${used} موضع. احذف الاستشهادات أولًا.`);
    await prisma.$transaction(async (tx) => {
      const before = await tx.source.delete({ where: { id } });
      await recordRevision(tx, { entityType: "Source", entityId: id, action: "DELETE", userId: user.id, before });
    });
  });
  if (res.ok) redirect("/admin/sources");
  return res;
}

// ---------------------------------------------------------------------------
// Regions / periods / families
// ---------------------------------------------------------------------------

export async function saveRegionAction(_: ActionResult, fd: FormData): Promise<ActionResult> {
  return runAction(async () => {
    const user = await requireActionUser("content.edit");
    const id = str(fd, "id", 64);
    const name = str(fd, "name", 300);
    if (!name) throw new ValidationError({ name: "اسم المنطقة مطلوب" });
    const parentId = str(fd, "parentId", 64);
    if (id && parentId === id) throw new ValidationError({ parentId: "لا يمكن أن تكون المنطقة تابعة لنفسها" });
    const names = altNames(fd);
    const data = { name, altNames: names, kind: str(fd, "kind", 100), description: str(fd, "description", 10000), parentId, searchText: buildSearchText([name, ...names]) };
    await prisma.$transaction(async (tx) => {
      if (id) {
        const before = await tx.region.findUniqueOrThrow({ where: { id } });
        const after = await tx.region.update({ where: { id }, data });
        await recordRevision(tx, { entityType: "Region", entityId: id, action: "UPDATE", userId: user.id, before, after });
        const linked = await tx.cemetery.findMany({ where: { regionId: id }, select: { id: true } });
        for (const c of linked) await refreshCemeterySearch(tx, c.id);
      } else {
        const after = await tx.region.create({ data });
        await recordRevision(tx, { entityType: "Region", entityId: after.id, action: "CREATE", userId: user.id, after });
      }
    });
    refresh();
    return { message: "حُفظت المنطقة ✓" };
  });
}

export async function savePeriodAction(_: ActionResult, fd: FormData): Promise<ActionResult> {
  return runAction(async () => {
    const user = await requireActionUser("content.edit");
    const id = str(fd, "id", 64);
    const errors: Record<string, string> = {};
    const name = str(fd, "name", 300);
    if (!name) errors.name = "اسم الفترة مطلوب";
    const data = {
      name: name ?? "",
      description: str(fd, "description", 10000),
      startYearHijri: int(fd, "startYearHijri", errors, YEAR_RANGES.hijri),
      endYearHijri: int(fd, "endYearHijri", errors, YEAR_RANGES.hijri),
      startYearGregorian: int(fd, "startYearGregorian", errors, YEAR_RANGES.gregorian),
      endYearGregorian: int(fd, "endYearGregorian", errors, YEAR_RANGES.gregorian),
      sortOrder: int(fd, "sortOrder", errors, { min: -10000, max: 10000 }) ?? 0,
      searchText: buildSearchText([name]),
    };
    if (data.startYearHijri && data.endYearHijri && data.startYearHijri > data.endYearHijri) errors.endYearHijri = "سنة النهاية قبل سنة البداية";
    if (data.startYearGregorian && data.endYearGregorian && data.startYearGregorian > data.endYearGregorian) errors.endYearGregorian = "سنة النهاية قبل سنة البداية";
    if (Object.keys(errors).length) throw new ValidationError(errors);
    await prisma.$transaction(async (tx) => {
      if (id) {
        const before = await tx.historicalPeriod.findUniqueOrThrow({ where: { id } });
        const after = await tx.historicalPeriod.update({ where: { id }, data });
        await recordRevision(tx, { entityType: "HistoricalPeriod", entityId: id, action: "UPDATE", userId: user.id, before, after });
      } else {
        const after = await tx.historicalPeriod.create({ data });
        await recordRevision(tx, { entityType: "HistoricalPeriod", entityId: after.id, action: "CREATE", userId: user.id, after });
      }
    });
    refresh();
    return { message: "حُفظت الفترة ✓" };
  });
}

export async function saveFamilyAction(_: ActionResult, fd: FormData): Promise<ActionResult> {
  return runAction(async () => {
    const user = await requireActionUser("content.edit");
    const id = str(fd, "id", 64);
    const name = str(fd, "name", 300);
    if (!name) throw new ValidationError({ name: "اسم الأسرة مطلوب" });
    const parentId = str(fd, "parentId", 64);
    if (id && parentId === id) throw new ValidationError({ parentId: "لا يمكن أن تكون الأسرة فرعًا من نفسها" });
    const names = altNames(fd);
    const data = { name, altNames: names, description: str(fd, "description", 20000), parentId, searchText: buildSearchText([name, ...names]) };
    await prisma.$transaction(async (tx) => {
      if (id) {
        const before = await tx.family.findUniqueOrThrow({ where: { id } });
        const after = await tx.family.update({ where: { id }, data });
        await recordRevision(tx, { entityType: "Family", entityId: id, action: "UPDATE", userId: user.id, before, after });
        const members = await tx.person.findMany({ where: { familyId: id }, select: { id: true } });
        for (const m of members) await refreshPersonSearch(tx, m.id);
      } else {
        const after = await tx.family.create({ data });
        await recordRevision(tx, { entityType: "Family", entityId: after.id, action: "CREATE", userId: user.id, after });
      }
    });
    refresh();
    return { message: "حُفظت الأسرة ✓" };
  });
}

export async function deleteTaxonomyAction(_: ActionResult, fd: FormData): Promise<ActionResult> {
  return runAction(async () => {
    const user = await requireActionUser("content.publish");
    const id = str(fd, "id", 64)!;
    const kind = str(fd, "kind", 20);
    await prisma.$transaction(async (tx) => {
      if (kind === "region") {
        const before = await tx.region.delete({ where: { id } });
        await recordRevision(tx, { entityType: "Region", entityId: id, action: "DELETE", userId: user.id, before });
      } else if (kind === "period") {
        const before = await tx.historicalPeriod.delete({ where: { id } });
        await recordRevision(tx, { entityType: "HistoricalPeriod", entityId: id, action: "DELETE", userId: user.id, before });
      } else if (kind === "family") {
        const before = await tx.family.delete({ where: { id } });
        await recordRevision(tx, { entityType: "Family", entityId: id, action: "DELETE", userId: user.id, before });
      } else throw new ValidationError({}, "نوع غير معروف");
    });
    refresh();
    return { message: "حُذف" };
  });
}

// ---------------------------------------------------------------------------
// Media metadata (uploads go through /api/admin/media)
// ---------------------------------------------------------------------------

export async function updateMediaAction(_: ActionResult, fd: FormData): Promise<ActionResult> {
  return runAction(async () => {
    const user = await requireActionUser("content.edit");
    const id = str(fd, "id", 64)!;
    const isPublic = bool(fd, "isPublic");
    const rights = str(fd, "rights", 2000);
    if (isPublic && !rights) throw new ValidationError({ rights: "حدّد حقوق النشر قبل جعل الملف عامًا" });
    await prisma.$transaction(async (tx) => {
      const before = await tx.mediaFile.findUniqueOrThrow({ where: { id } });
      const after = await tx.mediaFile.update({
        where: { id },
        data: { title: str(fd, "title", 500), caption: str(fd, "caption", 5000), credit: str(fd, "credit", 500), rights, isPublic },
      });
      await recordRevision(tx, { entityType: "MediaFile", entityId: id, action: "UPDATE", userId: user.id, before, after });
    });
    refresh();
    return { message: "حُفظت بيانات الملف ✓" };
  });
}

export async function deleteMediaAction(_: ActionResult, fd: FormData): Promise<ActionResult> {
  return runAction(async () => {
    const user = await requireActionUser("content.publish");
    const id = str(fd, "id", 64)!;
    const { deleteStoredFile } = await import("@/services/storage");
    await prisma.$transaction(async (tx) => {
      const before = await tx.mediaFile.delete({ where: { id } });
      await recordRevision(tx, { entityType: "MediaFile", entityId: id, action: "DELETE", userId: user.id, before });
      await deleteStoredFile(before.storedName);
    });
    refresh();
    return { message: "حُذف الملف" };
  });
}
