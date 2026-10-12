"use server";

import { refresh } from "next/cache";
import { prisma } from "@/lib/db";
import { requireActionUser } from "@/lib/auth/guard";
import { runAction, decimal, int, str, ValidationError, type ActionResult } from "@/lib/forms";
import { recordRevision } from "@/lib/revisions";

export async function saveSettingsAction(_: ActionResult, fd: FormData): Promise<ActionResult> {
  return runAction(async () => {
    const user = await requireActionUser("settings.manage");
    const errors: Record<string, string> = {};
    const value = {
      lat: decimal(fd, "lat", errors, -90, 90),
      lng: decimal(fd, "lng", errors, -180, 180),
      zoom: int(fd, "zoom", errors, { min: 2, max: 18 }),
      intro: str(fd, "intro", 5000),
      methodology: str(fd, "methodology", 50000),
    };
    if (value.lat == null || value.lng == null || value.zoom == null) {
      errors.lat ??= "حدّد مركز الخريطة الافتراضي ومستوى التكبير";
    }
    if (Object.keys(errors).length) throw new ValidationError(errors);
    await prisma.$transaction(async (tx) => {
      const before = await tx.siteSetting.findUnique({ where: { key: "site" } });
      await tx.siteSetting.upsert({ where: { key: "site" }, create: { key: "site", value }, update: { value } });
      await recordRevision(tx, { entityType: "SiteSetting", entityId: "site", action: "UPDATE", userId: user.id, before: before?.value, after: value });
    });
    refresh();
    return { message: "حُفظت الإعدادات ✓" };
  });
}
