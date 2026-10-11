"use server";

import { redirect } from "next/navigation";
import { refresh } from "next/cache";
import type { RecordStatus } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requireActionUser } from "@/lib/auth/guard";
import { runAction, str, int, bool, oneOf, ValidationError, type ActionResult } from "@/lib/forms";
import { recordRevision } from "@/lib/revisions";
import { createCemetery, createPerson, updateCemeterySection, updatePersonSection, restoreRevision } from "@/services/entities";
import { setCemeteryStatus, setPersonStatus } from "@/services/records";

const STATUSES: RecordStatus[] = ["DRAFT", "IN_REVIEW", "PUBLISHED", "ARCHIVED"];

function requiredId(fd: FormData, name = "id"): string {
  const v = str(fd, name, 64);
  if (!v) throw new ValidationError({}, "معرّف السجل مفقود");
  return v;
}

// ---------------------------------------------------------------------------
// Cemeteries
// ---------------------------------------------------------------------------

export async function createCemeteryAction(_: ActionResult, fd: FormData): Promise<ActionResult> {
  let newId: string | null = null;
  const res = await runAction(async () => {
    const user = await requireActionUser("content.edit");
    const result = await createCemetery(
      {
        canonicalName: str(fd, "canonicalName", 500) ?? "",
        localName: str(fd, "localName", 500),
        regionId: str(fd, "regionId", 64),
        locality: str(fd, "locality", 500),
        summary: str(fd, "summary"),
      },
      user,
      { confirmDuplicate: bool(fd, "confirmDuplicate") }
    );
    if ("duplicates" in result) return { ok: false, duplicates: result.duplicates };
    newId = result.id;
  });
  if (res.ok && newId) redirect(`/admin/cemeteries/${newId}?created=1`);
  return res.duplicates ? { ...res, ok: false } : res;
}

export async function updateCemeteryAction(_: ActionResult, fd: FormData): Promise<ActionResult> {
  return runAction(async () => {
    const user = await requireActionUser("content.edit");
    const errors: Record<string, string> = {};
    const version = int(fd, "version", errors) ?? 0;
    await updateCemeterySection(requiredId(fd), str(fd, "section", 40) ?? "", fd, version, user);
    refresh();
    return { message: "حُفظت التعديلات ✓" };
  });
}

export async function setCemeteryStatusAction(_: ActionResult, fd: FormData): Promise<ActionResult> {
  return runAction(async () => {
    const user = await requireActionUser("content.edit");
    await setCemeteryStatus(requiredId(fd), oneOf(fd, "status", STATUSES, "DRAFT"), user, str(fd, "note", 1000));
    refresh();
    return { message: "تم تغيير الحالة ✓" };
  });
}

export async function deleteCemeteryAction(_: ActionResult, fd: FormData): Promise<ActionResult> {
  const res = await runAction(async () => {
    const user = await requireActionUser("content.delete");
    const id = requiredId(fd);
    await prisma.$transaction(async (tx) => {
      const before = await tx.cemetery.findUniqueOrThrow({
        where: { id },
        include: { names: true, locations: true, burials: true, events: true, citations: true },
      });
      await tx.cemetery.delete({ where: { id } });
      await recordRevision(tx, { entityType: "Cemetery", entityId: id, action: "DELETE", userId: user.id, before, summary: `حذف نهائي: ${before.canonicalName}` });
    });
  });
  if (res.ok) redirect("/admin/cemeteries?deleted=1");
  return res;
}

// ---------------------------------------------------------------------------
// People
// ---------------------------------------------------------------------------

export async function createPersonAction(_: ActionResult, fd: FormData): Promise<ActionResult> {
  let newId: string | null = null;
  const res = await runAction(async () => {
    const user = await requireActionUser("content.edit");
    const result = await createPerson(
      {
        fullName: str(fd, "fullName", 500),
        commonName: str(fd, "commonName", 500),
        nasab: str(fd, "nasab"),
        familyId: str(fd, "familyId", 64),
        summary: str(fd, "summary"),
      },
      user,
      { confirmDuplicate: bool(fd, "confirmDuplicate") }
    );
    if ("duplicates" in result) return { ok: false, duplicates: result.duplicates };
    newId = result.id;
  });
  if (res.ok && newId) {
    // Optional: link the new person to a cemetery straight away (from the cemetery page)
    const cemeteryId = str(fd, "cemeteryId", 64);
    if (cemeteryId) redirect(`/admin/people/${newId}?created=1&tab=burials&cemeteryId=${encodeURIComponent(cemeteryId)}`);
    redirect(`/admin/people/${newId}?created=1`);
  }
  return res.duplicates ? { ...res, ok: false } : res;
}

export async function updatePersonAction(_: ActionResult, fd: FormData): Promise<ActionResult> {
  return runAction(async () => {
    const user = await requireActionUser("content.edit");
    const errors: Record<string, string> = {};
    const version = int(fd, "version", errors) ?? 0;
    await updatePersonSection(requiredId(fd), str(fd, "section", 40) ?? "", fd, version, user);
    refresh();
    return { message: "حُفظت التعديلات ✓" };
  });
}

export async function setPersonStatusAction(_: ActionResult, fd: FormData): Promise<ActionResult> {
  return runAction(async () => {
    const user = await requireActionUser("content.edit");
    await setPersonStatus(requiredId(fd), oneOf(fd, "status", STATUSES, "DRAFT"), user, str(fd, "note", 1000));
    refresh();
    return { message: "تم تغيير الحالة ✓" };
  });
}

export async function deletePersonAction(_: ActionResult, fd: FormData): Promise<ActionResult> {
  const res = await runAction(async () => {
    const user = await requireActionUser("content.delete");
    const id = requiredId(fd);
    await prisma.$transaction(async (tx) => {
      const before = await tx.person.findUniqueOrThrow({
        where: { id },
        include: { names: true, burials: true, relationsFrom: true, relationsTo: true, works: true, events: true, citations: true },
      });
      await tx.person.delete({ where: { id } });
      await recordRevision(tx, { entityType: "Person", entityId: id, action: "DELETE", userId: user.id, before, summary: `حذف نهائي: ${before.commonName ?? before.fullName ?? id}` });
    });
  });
  if (res.ok) redirect("/admin/people?deleted=1");
  return res;
}

// ---------------------------------------------------------------------------
// Revisions
// ---------------------------------------------------------------------------

export async function restoreRevisionAction(_: ActionResult, fd: FormData): Promise<ActionResult> {
  return runAction(async () => {
    const user = await requireActionUser("content.publish");
    await restoreRevision(requiredId(fd), user);
    refresh();
    return { message: "تم استرجاع النسخة ✓ (سُجّل الاسترجاع في السجل)" };
  });
}
