import { Prisma, type LocationPrecision, type SourceType, type VerificationStatus } from "@prisma/client";
import { prisma } from "@/lib/db";
import { queryTokens } from "@/lib/arabic";
import { isLocationConfirmed, linkStatus } from "@/lib/verification";
import { personDisplayName } from "./records";

/** Visible person = published and not a contemporary person without recorded consent. */
export const VISIBLE_PERSON: Prisma.PersonWhereInput = {
  status: "PUBLISHED",
  OR: [{ isContemporary: false }, { publicationConsent: { not: null } }],
};
export const VISIBLE_CEMETERY: Prisma.CemeteryWhereInput = { status: "PUBLISHED" };

export async function getStats() {
  const [cemeteries, people, regionsWithCemeteries, sources, located] = await Promise.all([
    prisma.cemetery.count({ where: VISIBLE_CEMETERY }),
    prisma.person.count({ where: VISIBLE_PERSON }),
    prisma.region.count({ where: { cemeteries: { some: VISIBLE_CEMETERY } } }),
    prisma.source.count(),
    prisma.cemetery.count({ where: { ...VISIBLE_CEMETERY, locations: { some: { isPrimary: true, latitude: { not: null } } } } }),
  ]);
  return { cemeteries, people, regionsWithCemeteries, sources, located };
}

export interface MapFilters {
  q?: string;
  regionId?: string;
  periodId?: string;
  precision?: LocationPrecision | "CONFIRMED";
  verification?: VerificationStatus;
}

export interface MapFeature {
  id: string;
  slug: string;
  name: string;
  localName: string | null;
  region: string | null;
  summary: string | null;
  lat: number | null;
  lng: number | null;
  precision: LocationPrecision;
  radiusMeters: number | null;
  verification: VerificationStatus;
  confirmed: boolean;
  peopleCount: number;
  periods: string[];
}

/**
 * Published cemeteries for the map. The text query matches the cemetery's own
 * names, its region, OR the names of published people linked to it.
 */
export async function getMapFeatures(f: MapFilters): Promise<MapFeature[]> {
  const where: Prisma.CemeteryWhereInput = { ...VISIBLE_CEMETERY };
  const and: Prisma.CemeteryWhereInput[] = [];
  if (f.regionId) and.push({ OR: [{ regionId: f.regionId }, { region: { parentId: f.regionId } }] });
  if (f.periodId) and.push({ periods: { some: { id: f.periodId } } });
  if (f.precision === "CONFIRMED") {
    and.push({ locations: { some: { isPrimary: true, precision: "EXACT", verification: { in: ["DOCUMENTED", "MULTI_SOURCE"] }, latitude: { not: null } } } });
  } else if (f.precision === "UNKNOWN") {
    and.push({ OR: [{ locations: { none: {} } }, { locations: { some: { isPrimary: true, OR: [{ precision: "UNKNOWN" }, { latitude: null }] } } }] });
  } else if (f.precision) {
    and.push({ locations: { some: { isPrimary: true, precision: f.precision } } });
  }
  if (f.verification) and.push({ locations: { some: { isPrimary: true, verification: f.verification } } });
  const tokens = f.q ? queryTokens(f.q) : [];
  if (tokens.length) {
    and.push({
      AND: tokens.map((t) => ({
        OR: [
          { searchText: { contains: t } },
          { burials: { some: { person: { ...VISIBLE_PERSON, searchText: { contains: t } } } } },
        ],
      })),
    });
  }
  if (and.length) where.AND = and;

  const rows = await prisma.cemetery.findMany({
    where,
    orderBy: { canonicalName: "asc" },
    take: 2000,
    include: {
      region: { select: { name: true } },
      periods: { select: { name: true } },
      locations: { where: { isPrimary: true }, take: 1 },
      _count: { select: { burials: { where: { person: VISIBLE_PERSON } } } },
    },
  });
  return rows.map((c) => {
    const loc = c.locations[0];
    return {
      id: c.id,
      slug: c.slug,
      name: c.canonicalName,
      localName: c.localName,
      region: c.region?.name ?? null,
      summary: c.summary,
      lat: loc?.latitude != null ? Number(loc.latitude) : null,
      lng: loc?.longitude != null ? Number(loc.longitude) : null,
      precision: loc?.precision ?? "UNKNOWN",
      radiusMeters: loc?.radiusMeters ?? null,
      verification: loc?.verification ?? "UNVERIFIED",
      confirmed: loc ? isLocationConfirmed(loc) : false,
      peopleCount: c._count.burials,
      periods: c.periods.map((p) => p.name),
    };
  });
}

const citationInclude = { source: true, pageImage: { select: { id: true, isPublic: true, title: true } } } satisfies Prisma.CitationInclude;

export async function getPublicCemetery(slug: string) {
  const c = await prisma.cemetery.findFirst({
    where: { slug, ...VISIBLE_CEMETERY },
    include: {
      region: { include: { parent: true } },
      periods: { orderBy: { sortOrder: "asc" } },
      names: { orderBy: { createdAt: "asc" } },
      locations: { orderBy: [{ isPrimary: "desc" }, { createdAt: "asc" }], include: { citations: { include: citationInclude } } },
      burials: {
        where: { person: VISIBLE_PERSON },
        include: { person: true, citations: { include: citationInclude } },
      },
      events: { orderBy: [{ yearHijri: "asc" }, { yearGregorian: "asc" }], include: { citations: { include: citationInclude } } },
      oralAccounts: { where: { isPublic: true }, include: { citations: { include: citationInclude } } },
      media: { where: { isPublic: true }, orderBy: { createdAt: "asc" } },
      citations: { include: citationInclude, orderBy: { createdAt: "asc" } },
    },
  });
  if (!c) return null;
  const order: Record<string, number> = { FOUNDER: 0, BURIED: 1, REINTERRED: 2, BURIED_PROBABLE: 3, BURIED_DISPUTED: 4, ASSOCIATED: 5 };
  c.burials.sort((a, b) => order[a.relation] - order[b.relation] || (a.person.deathYearHijri ?? 9999) - (b.person.deathYearHijri ?? 9999));
  return c;
}

export async function getPublicPerson(slug: string) {
  const p = await prisma.person.findFirst({
    where: { slug, ...VISIBLE_PERSON },
    include: {
      family: true,
      periods: { orderBy: { sortOrder: "asc" } },
      names: { orderBy: { createdAt: "asc" } },
      burials: {
        where: { cemetery: VISIBLE_CEMETERY },
        include: {
          cemetery: { include: { locations: { where: { isPrimary: true }, take: 1 }, region: true } },
          citations: { include: citationInclude },
        },
      },
      relationsFrom: { where: { to: VISIBLE_PERSON }, include: { to: true, citations: { include: citationInclude } } },
      relationsTo: { where: { from: VISIBLE_PERSON }, include: { from: true, citations: { include: citationInclude } } },
      works: { orderBy: { title: "asc" }, include: { citations: { include: citationInclude } } },
      events: { orderBy: [{ yearHijri: "asc" }, { yearGregorian: "asc" }], include: { citations: { include: citationInclude } } },
      oralAccounts: { where: { isPublic: true }, include: { citations: { include: citationInclude } } },
      media: { where: { isPublic: true } },
      citations: { include: citationInclude, orderBy: { createdAt: "asc" } },
    },
  });
  return p;
}

export type CitationWithSource = Prisma.CitationGetPayload<{ include: typeof citationInclude }>;

/**
 * Numbers every citation shown on a page once (footnote style) and returns a
 * lookup for the [n] markers next to each claim.
 */
export function numberCitations(groups: CitationWithSource[][]) {
  const list: CitationWithSource[] = [];
  const index = new Map<string, number>();
  for (const g of groups)
    for (const c of g)
      if (!index.has(c.id)) {
        list.push(c);
        index.set(c.id, list.length);
      }
  const refsFor = (cs: CitationWithSource[]) => cs.map((c) => index.get(c.id)!).filter(Boolean);
  return { list, refsFor };
}

export { linkStatus, personDisplayName };

// ---------------------------------------------------------------------------
// Genealogy graph
// ---------------------------------------------------------------------------

export interface TreeNode {
  id: string;
  slug: string;
  name: string;
  years: string | null;
  gender: string | null;
  cemetery: { slug: string; name: string } | null;
}
export interface TreeEdge {
  id: string;
  from: string;
  to: string;
  type: "FATHER_OF" | "MOTHER_OF" | "SPOUSE_OF" | "SIBLING_OF";
  verification: VerificationStatus;
  sources: string[];
}

/**
 * Builds the neighbourhood of a person in the kinship graph (ancestors up to
 * `up` generations, descendants down to `down`, plus spouses and siblings of
 * the focus person). Only published, visible people and only explicitly
 * recorded relations — nothing is inferred from similar names.
 */
export async function getGenealogy(focusId: string, up = 4, down = 3, publicOnly = true) {
  const visible = publicOnly ? VISIBLE_PERSON : {};
  const relInclude = { citations: { include: { source: { select: { title: true, type: true } } } } } as const;
  const nodes = new Map<string, TreeNode>();
  const edges = new Map<string, TreeEdge>();

  const addEdge = (r: { id: string; fromId: string; toId: string; type: string; verification: VerificationStatus; citations: Array<{ sourceId: string; pages: string | null; source: { title: string; type: SourceType } }> }) => {
    edges.set(r.id, {
      id: r.id, from: r.fromId, to: r.toId, type: r.type as TreeEdge["type"],
      verification: linkStatus(r.verification, r.citations),
      sources: r.citations.map((c) => `${c.source.title}${c.pages ? ` ص ${c.pages}` : ""}`),
    });
  };

  const kin = ["FATHER_OF", "MOTHER_OF"] as const;
  let frontier = [focusId];
  for (let g = 0; g < up && frontier.length; g++) {
    const rels = await prisma.personRelation.findMany({ where: { toId: { in: frontier }, type: { in: [...kin] }, from: visible }, include: relInclude });
    rels.forEach(addEdge);
    frontier = rels.map((r) => r.fromId);
  }
  frontier = [focusId];
  for (let g = 0; g < down && frontier.length; g++) {
    const rels = await prisma.personRelation.findMany({ where: { fromId: { in: frontier }, type: { in: [...kin] }, to: visible }, include: relInclude });
    rels.forEach(addEdge);
    frontier = rels.map((r) => r.toId);
  }
  const lateral = await prisma.personRelation.findMany({
    where: {
      type: { in: ["SPOUSE_OF", "SIBLING_OF"] },
      OR: [{ fromId: focusId, to: visible }, { toId: focusId, from: visible }],
    },
    include: relInclude,
  });
  lateral.forEach(addEdge);

  const ids = new Set<string>([focusId]);
  for (const e of edges.values()) {
    ids.add(e.from);
    ids.add(e.to);
  }
  const people = await prisma.person.findMany({
    where: { id: { in: [...ids] }, ...visible },
    include: { burials: { where: { relation: { in: ["BURIED", "FOUNDER", "REINTERRED"] }, cemetery: publicOnly ? VISIBLE_CEMETERY : {} }, include: { cemetery: true }, take: 1 } },
  });
  for (const p of people) {
    const years = [p.birthYearHijri ? `${p.birthYearHijri}` : "؟", p.deathYearHijri ? `${p.deathYearHijri}هـ` : "؟"];
    nodes.set(p.id, {
      id: p.id, slug: p.slug, name: personDisplayName(p),
      years: p.birthYearHijri || p.deathYearHijri ? years.join(" – ") : null,
      gender: p.gender,
      cemetery: p.burials[0] ? { slug: p.burials[0].cemetery.slug, name: p.burials[0].cemetery.canonicalName } : null,
    });
  }
  const edgeList = [...edges.values()].filter((e) => nodes.has(e.from) && nodes.has(e.to));
  return { focusId, nodes: [...nodes.values()], edges: edgeList };
}
