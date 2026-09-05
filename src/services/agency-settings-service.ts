import { prisma } from "@/lib/db";
import type { Prisma } from "@prisma/client";
import type { AgencySettingsInput } from "@/lib/validation/agency-settings";

const KEY = "agency";

export interface AgencySettings {
  nameAr: string;
  name: string | null;
  currency: string;
  timezone: string;
}

const DEFAULTS: AgencySettings = {
  nameAr: "أفريكا شيبلوغ",
  name: "AfricaShiplog",
  currency: process.env.DEFAULT_CURRENCY ?? "MRU",
  timezone: process.env.DEFAULT_TIMEZONE ?? "Africa/Nouakchott",
};

export async function getAgencySettings(): Promise<AgencySettings> {
  const row = await prisma.systemSetting.findUnique({ where: { key: KEY } });
  if (!row) return DEFAULTS;
  return { ...DEFAULTS, ...(row.value as Partial<AgencySettings>) };
}

export async function updateAgencySettings(input: AgencySettingsInput, actorId: string): Promise<AgencySettings> {
  const value: AgencySettings = { nameAr: input.nameAr, name: input.name ?? null, currency: input.currency, timezone: input.timezone };
  const jsonValue = value as unknown as Prisma.InputJsonValue;
  await prisma.systemSetting.upsert({
    where: { key: KEY },
    create: { key: KEY, value: jsonValue, updatedBy: actorId },
    update: { value: jsonValue, updatedBy: actorId },
  });
  return value;
}
