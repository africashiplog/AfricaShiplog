import { prisma } from "@/lib/db";
import { personDisplayName } from "./records";

export async function loadOptions() {
  const [regions, families, periods, sources] = await Promise.all([
    prisma.region.findMany({ orderBy: { name: "asc" }, include: { parent: { select: { name: true } } } }),
    prisma.family.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
    prisma.historicalPeriod.findMany({ orderBy: [{ sortOrder: "asc" }, { name: "asc" }], select: { id: true, name: true } }),
    prisma.source.findMany({ orderBy: [{ isPrimary: "desc" }, { title: "asc" }], select: { id: true, title: true, author: true } }),
  ]);
  return {
    regions: regions.map((r) => ({ id: r.id, name: r.parent ? `${r.parent.name} › ${r.name}` : r.name })),
    families,
    periods,
    sources,
  };
}

export async function peopleOptions(excludeId?: string) {
  const people = await prisma.person.findMany({
    where: excludeId ? { id: { not: excludeId }, status: { not: "ARCHIVED" } } : { status: { not: "ARCHIVED" } },
    select: { id: true, fullName: true, commonName: true, deathYearHijri: true },
    orderBy: [{ commonName: "asc" }, { fullName: "asc" }],
    take: 5000,
  });
  return people.map((p) => ({ id: p.id, name: `${personDisplayName(p)}${p.deathYearHijri ? ` (ت ${p.deathYearHijri}هـ)` : ""}` }));
}

export async function cemeteryOptions() {
  const rows = await prisma.cemetery.findMany({ where: { status: { not: "ARCHIVED" } }, select: { id: true, canonicalName: true, locality: true }, orderBy: { canonicalName: "asc" }, take: 5000 });
  return rows.map((c) => ({ id: c.id, name: c.locality ? `${c.canonicalName} — ${c.locality}` : c.canonicalName }));
}
