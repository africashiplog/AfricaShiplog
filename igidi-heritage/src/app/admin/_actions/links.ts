"use server";

import { refresh } from "next/cache";
import type {
  BurialRelation,
  LocationMethod,
  LocationPrecision,
  NameKind,
  NameLanguage,
  PersonRelationType,
  Prisma,
  VerificationStatus,
} from "@prisma/client";
import { prisma } from "@/lib/db";
import { requireActionUser } from "@/lib/auth/guard";
import { runAction, str, int, decimal, bool, oneOf, ValidationError, type ActionResult } from "@/lib/forms";
import { recordRevision } from "@/lib/revisions";
import { normalizeArabic } from "@/lib/arabic";
import { refreshCemeterySearch, refreshPersonSearch } from "@/services/records";
import { CEMETERY_FIELDS, PERSON_FIELDS } from "@/lib/labels";
import { YEAR_RANGES } from "@/lib/field-specs";
import { validateLocationInput } from "@/lib/location-rules";

const VERIFICATIONS: VerificationStatus[] = ["DOCUMENTED", "MULTI_SOURCE", "ORAL", "DISPUTED", "UNVERIFIED"];
const LANGS: NameLanguage[] = ["AR", "HASSANIYA", "BERBER", "FR", "EN", "OTHER"];
const NAME_KINDS: NameKind[] = ["CANONICAL_VARIANT", "LOCAL", "HISTORICAL", "SPELLING_VARIANT", "TRANSLATION", "TRANSLITERATION", "NICKNAME"];
const PRECISIONS: LocationPrecision[] = ["EXACT", "APPROXIMATE", "AREA", "UNKNOWN"];
const METHODS: LocationMethod[] = ["FIELD_GPS", "SATELLITE", "OLD_MAP", "SOURCE_DESCRIPTION", "ORAL_DESCRIPTION", "ESTIMATE"];
const BURIAL_RELATIONS: BurialRelation[] = ["BURIED", "BURIED_PROBABLE", "BURIED_DISPUTED", "REINTERRED", "FOUNDER", "ASSOCIATED"];
const RELATION_TYPES: PersonRelationType[] = ["FATHER_OF", "MOTHER_OF", "SPOUSE_OF", "SIBLING_OF", "OTHER_KIN", "TEACHER_OF"];

function need(fd: FormData, name: string, label = "حقل مطلوب"): string {
  const v = str(fd, name, 64);
  if (!v) throw new ValidationError({ [name]: label });
  return v;
}

function verification(fd: FormData, name = "verification"): VerificationStatus {
  return oneOf(fd, name, VERIFICATIONS, "UNVERIFIED");
}

/** Touch the parent record so its version/updatedAt reflects linked-record edits too. */
async function touchParent(tx: Prisma.TransactionClient, p: { cemeteryId?: string | null; personId?: string | null }, userId: string) {
  if (p.cemeteryId) await tx.cemetery.update({ where: { id: p.cemeteryId }, data: { updatedById: userId, version: { increment: 1 } } });
  if (p.personId) await tx.person.update({ where: { id: p.personId }, data: { updatedById: userId, version: { increment: 1 } } });
}

// ---------------------------------------------------------------------------
// Alternative names
// ---------------------------------------------------------------------------

export async function addNameAction(_: ActionResult, fd: FormData): Promise<ActionResult> {
  return runAction(async () => {
    const user = await requireActionUser("content.edit");
    const name = str(fd, "name", 500);
    if (!name) throw new ValidationError({ name: "أدخل الاسم" });
    const base = {
      name,
      language: oneOf(fd, "language", LANGS, "AR"),
      kind: oneOf(fd, "kind", NAME_KINDS, "SPELLING_VARIANT"),
      note: str(fd, "note", 2000),
      normalized: normalizeArabic(name),
    };
    const cemeteryId = str(fd, "cemeteryId", 64);
    const personId = str(fd, "personId", 64);
    await prisma.$transaction(async (tx) => {
      if (cemeteryId) {
        const n = await tx.cemeteryName.create({ data: { ...base, cemeteryId } });
        await refreshCemeterySearch(tx, cemeteryId);
        await recordRevision(tx, { entityType: "CemeteryName", entityId: n.id, action: "CREATE", userId: user.id, after: n });
      } else if (personId) {
        const n = await tx.personName.create({ data: { ...base, personId } });
        await refreshPersonSearch(tx, personId);
        await recordRevision(tx, { entityType: "PersonName", entityId: n.id, action: "CREATE", userId: user.id, after: n });
      } else throw new ValidationError({}, "السجل غير محدد");
      await touchParent(tx, { cemeteryId, personId }, user.id);
    });
    refresh();
    return { message: "أُضيف الاسم ✓" };
  });
}

export async function deleteNameAction(_: ActionResult, fd: FormData): Promise<ActionResult> {
  return runAction(async () => {
    const user = await requireActionUser("content.edit");
    const id = need(fd, "id");
    await prisma.$transaction(async (tx) => {
      if (fd.get("owner") === "cemetery") {
        const n = await tx.cemeteryName.delete({ where: { id } });
        await refreshCemeterySearch(tx, n.cemeteryId);
        await recordRevision(tx, { entityType: "CemeteryName", entityId: id, action: "DELETE", userId: user.id, before: n });
        await touchParent(tx, { cemeteryId: n.cemeteryId }, user.id);
      } else {
        const n = await tx.personName.delete({ where: { id } });
        await refreshPersonSearch(tx, n.personId);
        await recordRevision(tx, { entityType: "PersonName", entityId: id, action: "DELETE", userId: user.id, before: n });
        await touchParent(tx, { personId: n.personId }, user.id);
      }
    });
    refresh();
    return { message: "حُذف الاسم" };
  });
}

// ---------------------------------------------------------------------------
// Locations
// ---------------------------------------------------------------------------

export async function saveLocationAction(_: ActionResult, fd: FormData): Promise<ActionResult> {
  return runAction(async () => {
    const user = await requireActionUser("content.edit");
    const cemeteryId = need(fd, "cemeteryId");
    const locationId = str(fd, "locationId", 64);
    const errors: Record<string, string> = {};
    const input = {
      latitude: decimal(fd, "latitude", errors, -90, 90),
      longitude: decimal(fd, "longitude", errors, -180, 180),
      precision: oneOf(fd, "precision", PRECISIONS, "UNKNOWN"),
      radiusMeters: int(fd, "radiusMeters", errors, { min: 1, max: 200000 }),
      method: str(fd, "method", 40) ? oneOf(fd, "method", METHODS, "ESTIMATE") : null,
      sourceNote: str(fd, "sourceNote", 5000),
      description: str(fd, "description", 5000),
      verification: verification(fd),
      recordedAt: str(fd, "recordedAt", 20) ? new Date(str(fd, "recordedAt", 20)!) : null,
      isPrimary: bool(fd, "isPrimary"),
    };
    if (input.recordedAt && Number.isNaN(input.recordedAt.getTime())) errors.recordedAt = "تاريخ غير صالح";
    Object.assign(errors, validateLocationInput(input));
    if (Object.keys(errors).length) throw new ValidationError(errors);

    await prisma.$transaction(async (tx) => {
      const count = await tx.location.count({ where: { cemeteryId } });
      const makePrimary = input.isPrimary || count === 0 || (locationId != null && count === 1);
      if (makePrimary) {
        await tx.location.updateMany({ where: { cemeteryId, isPrimary: true, NOT: locationId ? { id: locationId } : undefined }, data: { isPrimary: false } });
      }
      const data = { ...input, isPrimary: makePrimary };
      if (locationId) {
        const before = await tx.location.findFirstOrThrow({ where: { id: locationId, cemeteryId } });
        const after = await tx.location.update({ where: { id: locationId }, data });
        await recordRevision(tx, { entityType: "Location", entityId: locationId, action: "UPDATE", userId: user.id, before, after });
      } else {
        const after = await tx.location.create({ data: { ...data, cemeteryId } });
        await recordRevision(tx, { entityType: "Location", entityId: after.id, action: "CREATE", userId: user.id, after });
      }
      await touchParent(tx, { cemeteryId }, user.id);
    });
    refresh();
    return { message: "حُفظ الموقع ✓" };
  });
}

export async function deleteLocationAction(_: ActionResult, fd: FormData): Promise<ActionResult> {
  return runAction(async () => {
    const user = await requireActionUser("content.edit");
    const id = need(fd, "id");
    await prisma.$transaction(async (tx) => {
      const before = await tx.location.delete({ where: { id } });
      if (before.isPrimary) {
        const next = await tx.location.findFirst({ where: { cemeteryId: before.cemeteryId }, orderBy: { createdAt: "asc" } });
        if (next) await tx.location.update({ where: { id: next.id }, data: { isPrimary: true } });
      }
      await recordRevision(tx, { entityType: "Location", entityId: id, action: "DELETE", userId: user.id, before });
      await touchParent(tx, { cemeteryId: before.cemeteryId }, user.id);
    });
    refresh();
    return { message: "حُذف الموقع" };
  });
}

// ---------------------------------------------------------------------------
// Burials (person <-> cemetery)
// ---------------------------------------------------------------------------

export async function saveBurialAction(_: ActionResult, fd: FormData): Promise<ActionResult> {
  return runAction(async () => {
    const user = await requireActionUser("content.edit");
    const burialId = str(fd, "burialId", 64);
    const data = {
      relation: oneOf(fd, "relation", BURIAL_RELATIONS, "BURIED"),
      verification: verification(fd),
      burialDateText: str(fd, "burialDateText", 500),
      graveDescription: str(fd, "graveDescription", 5000),
      note: str(fd, "note", 5000),
    };
    await prisma.$transaction(async (tx) => {
      if (burialId) {
        const before = await tx.burial.findUniqueOrThrow({ where: { id: burialId } });
        const after = await tx.burial.update({ where: { id: burialId }, data });
        await recordRevision(tx, { entityType: "Burial", entityId: burialId, action: "UPDATE", userId: user.id, before, after });
        await touchParent(tx, before, user.id);
      } else {
        const personId = need(fd, "personId", "اختر الشخص");
        const cemeteryId = need(fd, "cemeteryId", "اختر المدفن");
        const after = await tx.burial.create({ data: { ...data, personId, cemeteryId } });
        await recordRevision(tx, { entityType: "Burial", entityId: after.id, action: "CREATE", userId: user.id, after });
        await touchParent(tx, { personId, cemeteryId }, user.id);
      }
    });
    refresh();
    return { message: "حُفظت العلاقة بالمدفن ✓" };
  });
}

export async function deleteBurialAction(_: ActionResult, fd: FormData): Promise<ActionResult> {
  return runAction(async () => {
    const user = await requireActionUser("content.edit");
    const id = need(fd, "id");
    await prisma.$transaction(async (tx) => {
      const before = await tx.burial.delete({ where: { id } });
      await recordRevision(tx, { entityType: "Burial", entityId: id, action: "DELETE", userId: user.id, before });
      await touchParent(tx, before, user.id);
    });
    refresh();
    return { message: "حُذفت العلاقة" };
  });
}

// ---------------------------------------------------------------------------
// Person relations (kinship + teacher/student)
// ---------------------------------------------------------------------------

export async function saveRelationAction(_: ActionResult, fd: FormData): Promise<ActionResult> {
  return runAction(async () => {
    const user = await requireActionUser("content.edit");
    const relationId = str(fd, "relationId", 64);
    const base = {
      verification: verification(fd),
      kinLabel: str(fd, "kinLabel", 200),
      note: str(fd, "note", 5000),
    };
    await prisma.$transaction(async (tx) => {
      if (relationId) {
        const before = await tx.personRelation.findUniqueOrThrow({ where: { id: relationId } });
        const after = await tx.personRelation.update({ where: { id: relationId }, data: base });
        await recordRevision(tx, { entityType: "PersonRelation", entityId: relationId, action: "UPDATE", userId: user.id, before, after });
        return;
      }
      // The form is filled from the perspective of the current person ("self"):
      // role describes what the OTHER person is to self.
      const selfId = need(fd, "selfId");
      const otherId = need(fd, "otherId", "اختر الشخص الآخر");
      if (selfId === otherId) throw new ValidationError({ otherId: "لا يمكن ربط الشخص بنفسه" });
      const role = str(fd, "role", 40);
      let fromId: string, toId: string, type: PersonRelationType;
      switch (role) {
        case "father": [fromId, toId, type] = [otherId, selfId, "FATHER_OF"]; break;
        case "mother": [fromId, toId, type] = [otherId, selfId, "MOTHER_OF"]; break;
        case "child": {
          const self = await tx.person.findUniqueOrThrow({ where: { id: selfId }, select: { gender: true } });
          const parentRole = str(fd, "parentRole", 10);
          const isMother = parentRole === "mother" || (parentRole !== "father" && self.gender === "F");
          [fromId, toId, type] = [selfId, otherId, isMother ? "MOTHER_OF" : "FATHER_OF"];
          break;
        }
        case "spouse": [fromId, toId, type] = [selfId, otherId, "SPOUSE_OF"]; break;
        case "sibling": [fromId, toId, type] = [selfId, otherId, "SIBLING_OF"]; break;
        case "kin": [fromId, toId, type] = [otherId, selfId, "OTHER_KIN"]; break;
        case "teacher": [fromId, toId, type] = [otherId, selfId, "TEACHER_OF"]; break;
        case "student": [fromId, toId, type] = [selfId, otherId, "TEACHER_OF"]; break;
        default: throw new ValidationError({ role: "اختر نوع العلاقة" });
      }
      if (!RELATION_TYPES.includes(type)) throw new ValidationError({ role: "نوع غير معروف" });
      if (type === "OTHER_KIN" && !base.kinLabel) throw new ValidationError({ kinLabel: "صف نوع القرابة (مثال: عم، خال، حفيد)" });
      // Symmetric relations: avoid storing the same pair twice in opposite directions
      if (type === "SPOUSE_OF" || type === "SIBLING_OF") {
        const reverse = await tx.personRelation.findFirst({ where: { fromId: toId, toId: fromId, type } });
        if (reverse) throw new ValidationError({}, "هذه العلاقة مسجلة بالفعل");
      }
      // A person has at most one recorded father and one recorded mother (disputes go in notes / DISPUTED)
      if (type === "FATHER_OF" || type === "MOTHER_OF") {
        const existing = await tx.personRelation.findFirst({ where: { toId, type } });
        if (existing) throw new ValidationError({}, type === "FATHER_OF" ? "للشخص أبٌ مسجل بالفعل. سجّل الخلاف في الملاحظات واضبط الحالة «مختلف فيها»." : "للشخص أمٌّ مسجلة بالفعل.");
        // Prevent obvious cycles: the child cannot be an ancestor of the parent.
        if (await isAncestor(tx, toId, fromId)) throw new ValidationError({}, "تؤدي هذه العلاقة إلى حلقة في شجرة النسب");
      }
      const after = await tx.personRelation.create({ data: { ...base, fromId, toId, type } });
      await recordRevision(tx, { entityType: "PersonRelation", entityId: after.id, action: "CREATE", userId: user.id, after });
    });
    refresh();
    return { message: "حُفظت العلاقة ✓" };
  });
}

async function isAncestor(tx: Prisma.TransactionClient, candidateAncestor: string, personId: string): Promise<boolean> {
  const seen = new Set<string>();
  let frontier = [personId];
  for (let depth = 0; depth < 60 && frontier.length; depth++) {
    const parents = await tx.personRelation.findMany({
      where: { toId: { in: frontier }, type: { in: ["FATHER_OF", "MOTHER_OF"] } },
      select: { fromId: true },
    });
    frontier = [];
    for (const p of parents) {
      if (p.fromId === candidateAncestor) return true;
      if (!seen.has(p.fromId)) {
        seen.add(p.fromId);
        frontier.push(p.fromId);
      }
    }
  }
  return false;
}

export async function deleteRelationAction(_: ActionResult, fd: FormData): Promise<ActionResult> {
  return runAction(async () => {
    const user = await requireActionUser("content.edit");
    const id = need(fd, "id");
    await prisma.$transaction(async (tx) => {
      const before = await tx.personRelation.delete({ where: { id } });
      await recordRevision(tx, { entityType: "PersonRelation", entityId: id, action: "DELETE", userId: user.id, before });
    });
    refresh();
    return { message: "حُذفت العلاقة" };
  });
}

// ---------------------------------------------------------------------------
// Works, events
// ---------------------------------------------------------------------------

export async function saveWorkAction(_: ActionResult, fd: FormData): Promise<ActionResult> {
  return runAction(async () => {
    const user = await requireActionUser("content.edit");
    const personId = need(fd, "personId");
    const title = str(fd, "title", 500);
    if (!title) throw new ValidationError({ title: "أدخل عنوان المؤلَّف" });
    const data = {
      title,
      subject: str(fd, "subject", 500),
      form: str(fd, "form", 200),
      state: str(fd, "state", 200),
      holdingNote: str(fd, "holdingNote", 2000),
      note: str(fd, "note", 5000),
    };
    await prisma.$transaction(async (tx) => {
      const after = await tx.work.create({ data: { ...data, personId } });
      await recordRevision(tx, { entityType: "Work", entityId: after.id, action: "CREATE", userId: user.id, after });
      await touchParent(tx, { personId }, user.id);
    });
    refresh();
    return { message: "أُضيف المؤلَّف ✓" };
  });
}

export async function saveEventAction(_: ActionResult, fd: FormData): Promise<ActionResult> {
  return runAction(async () => {
    const user = await requireActionUser("content.edit");
    const errors: Record<string, string> = {};
    const title = str(fd, "title", 500);
    if (!title) errors.title = "أدخل عنوان الحدث";
    const data = {
      title: title ?? "",
      dateText: str(fd, "dateText", 500),
      yearHijri: int(fd, "yearHijri", errors, YEAR_RANGES.hijri),
      yearGregorian: int(fd, "yearGregorian", errors, YEAR_RANGES.gregorian),
      description: str(fd, "description", 20000),
      verification: verification(fd),
      cemeteryId: str(fd, "cemeteryId", 64),
      personId: str(fd, "personId", 64),
    };
    if (!data.cemeteryId && !data.personId) errors.title = "الحدث غير مرتبط بسجل";
    if (Object.keys(errors).length) throw new ValidationError(errors);
    await prisma.$transaction(async (tx) => {
      const after = await tx.historicalEvent.create({ data });
      await recordRevision(tx, { entityType: "HistoricalEvent", entityId: after.id, action: "CREATE", userId: user.id, after });
      await touchParent(tx, data, user.id);
    });
    refresh();
    return { message: "أُضيف الحدث ✓" };
  });
}

export async function deleteSimpleAction(_: ActionResult, fd: FormData): Promise<ActionResult> {
  return runAction(async () => {
    const user = await requireActionUser("content.edit");
    const id = need(fd, "id");
    const kind = str(fd, "kind", 20);
    await prisma.$transaction(async (tx) => {
      if (kind === "work") {
        const before = await tx.work.delete({ where: { id } });
        await recordRevision(tx, { entityType: "Work", entityId: id, action: "DELETE", userId: user.id, before });
      } else if (kind === "event") {
        const before = await tx.historicalEvent.delete({ where: { id } });
        await recordRevision(tx, { entityType: "HistoricalEvent", entityId: id, action: "DELETE", userId: user.id, before });
      } else if (kind === "citation") {
        const before = await tx.citation.delete({ where: { id } });
        await recordRevision(tx, { entityType: "Citation", entityId: id, action: "DELETE", userId: user.id, before });
      } else throw new ValidationError({}, "نوع غير معروف");
    });
    refresh();
    return { message: "حُذف" };
  });
}

// ---------------------------------------------------------------------------
// Citations
// ---------------------------------------------------------------------------

const CITATION_TARGETS = ["cemeteryId", "personId", "burialId", "relationId", "locationId", "workId", "eventId", "oralAccountId"] as const;

export async function addCitationAction(_: ActionResult, fd: FormData): Promise<ActionResult> {
  return runAction(async () => {
    const user = await requireActionUser("content.edit");
    const sourceId = need(fd, "sourceId", "اختر المصدر");
    const target: Partial<Record<(typeof CITATION_TARGETS)[number], string>> = {};
    for (const t of CITATION_TARGETS) {
      const v = str(fd, t, 64);
      if (v) target[t] = v;
    }
    if (Object.keys(target).length !== 1) throw new ValidationError({}, "يجب أن يرتبط الاستشهاد بسجل واحد");
    const field = str(fd, "field", 40) ?? "general";
    const allowed = target.cemeteryId ? CEMETERY_FIELDS : target.personId ? PERSON_FIELDS : { general: "عام" };
    if (!(field in allowed)) throw new ValidationError({ field: "معلومة غير معروفة" });
    const pages = str(fd, "pages", 200);
    const quote = str(fd, "quote", 20000);
    const summary = str(fd, "summary", 20000);
    if (!pages && !quote && !summary) {
      throw new ValidationError({ pages: "أدخل رقم الصفحة أو نص الاقتباس أو ملخصه" });
    }
    await prisma.$transaction(async (tx) => {
      const after = await tx.citation.create({
        data: {
          sourceId, field, pages, quote, summary,
          volume: str(fd, "volume", 50),
          note: str(fd, "note", 5000),
          pageImageId: str(fd, "pageImageId", 64),
          ...target,
        },
      });
      await recordRevision(tx, { entityType: "Citation", entityId: after.id, action: "CREATE", userId: user.id, after });
    });
    refresh();
    return { message: "أُضيف الاستشهاد ✓" };
  });
}

/** Explicit documentation status for one claim of a cemetery/person (overrides the computed one). */
export async function setFieldStatusAction(_: ActionResult, fd: FormData): Promise<ActionResult> {
  return runAction(async () => {
    const user = await requireActionUser("content.edit");
    const field = need(fd, "field");
    const value = str(fd, "value", 20);
    const cemeteryId = str(fd, "cemeteryId", 64);
    const personId = str(fd, "personId", 64);
    if (value && !VERIFICATIONS.includes(value as VerificationStatus)) throw new ValidationError({}, "قيمة غير صالحة");
    await prisma.$transaction(async (tx) => {
      if (cemeteryId) {
        if (!(field in CEMETERY_FIELDS)) throw new ValidationError({}, "معلومة غير معروفة");
        const before = await tx.cemetery.findUniqueOrThrow({ where: { id: cemeteryId } });
        const fs = { ...((before.fieldStatus as Record<string, string>) ?? {}) };
        if (value) fs[field] = value; else delete fs[field];
        const after = await tx.cemetery.update({ where: { id: cemeteryId }, data: { fieldStatus: fs, version: { increment: 1 }, updatedById: user.id } });
        await recordRevision(tx, { entityType: "Cemetery", entityId: cemeteryId, action: "UPDATE", userId: user.id, before, after, summary: `حالة توثيق «${CEMETERY_FIELDS[field]}»` });
      } else if (personId) {
        if (!(field in PERSON_FIELDS)) throw new ValidationError({}, "معلومة غير معروفة");
        const before = await tx.person.findUniqueOrThrow({ where: { id: personId } });
        const fs = { ...((before.fieldStatus as Record<string, string>) ?? {}) };
        if (value) fs[field] = value; else delete fs[field];
        const after = await tx.person.update({ where: { id: personId }, data: { fieldStatus: fs, version: { increment: 1 }, updatedById: user.id } });
        await recordRevision(tx, { entityType: "Person", entityId: personId, action: "UPDATE", userId: user.id, before, after, summary: `حالة توثيق «${PERSON_FIELDS[field]}»` });
      }
    });
    refresh();
    return { message: "حُفظت حالة التوثيق ✓" };
  });
}

// ---------------------------------------------------------------------------
// Oral accounts
// ---------------------------------------------------------------------------

export async function saveOralAccountAction(_: ActionResult, fd: FormData): Promise<ActionResult> {
  return runAction(async () => {
    const user = await requireActionUser("content.edit");
    const id = str(fd, "id", 64);
    const title = str(fd, "title", 500);
    const content = str(fd, "content", 100000);
    const errors: Record<string, string> = {};
    if (!title) errors.title = "أدخل عنوانًا للرواية";
    if (!content) errors.content = "أدخل نص الرواية أو ملخصها";
    const data = {
      title: title ?? "",
      content: content ?? "",
      narrator: str(fd, "narrator", 500),
      narratorPublic: bool(fd, "narratorPublic"),
      consentNote: str(fd, "consentNote", 5000),
      recordedBy: str(fd, "recordedBy", 500),
      recordedAt: str(fd, "recordedAt", 100),
      place: str(fd, "place", 500),
      verification: oneOf(fd, "verification", VERIFICATIONS, "ORAL"),
      isPublic: bool(fd, "isPublic"),
      cemeteryId: str(fd, "cemeteryId", 64),
      personId: str(fd, "personId", 64),
    };
    if (data.narratorPublic && !data.consentNote) errors.consentNote = "لا يُعلَن اسم الراوي دون توثيق موافقته";
    if (Object.keys(errors).length) throw new ValidationError(errors);
    await prisma.$transaction(async (tx) => {
      if (id) {
        const before = await tx.oralAccount.findUniqueOrThrow({ where: { id } });
        const after = await tx.oralAccount.update({ where: { id }, data });
        await recordRevision(tx, { entityType: "OralAccount", entityId: id, action: "UPDATE", userId: user.id, before, after });
      } else {
        const after = await tx.oralAccount.create({ data });
        await recordRevision(tx, { entityType: "OralAccount", entityId: after.id, action: "CREATE", userId: user.id, after });
      }
    });
    refresh();
    return { message: "حُفظت الرواية ✓" };
  });
}

export async function deleteOralAccountAction(_: ActionResult, fd: FormData): Promise<ActionResult> {
  return runAction(async () => {
    const user = await requireActionUser("content.publish");
    const id = need(fd, "id");
    await prisma.$transaction(async (tx) => {
      const before = await tx.oralAccount.delete({ where: { id } });
      await recordRevision(tx, { entityType: "OralAccount", entityId: id, action: "DELETE", userId: user.id, before });
    });
    refresh();
    return { message: "حُذفت الرواية" };
  });
}
