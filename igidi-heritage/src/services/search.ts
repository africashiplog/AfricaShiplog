import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { queryTokens } from "@/lib/arabic";
import { personDisplayName } from "./records";

export type SearchKind = "cemetery" | "person" | "source" | "region" | "family" | "period";

export interface SearchHit {
  kind: SearchKind;
  id: string;
  title: string;
  subtitle?: string | null;
  href: string;
  score: number;
}

export const SEARCH_KIND_LABELS: Record<SearchKind, string> = {
  cemetery: "مدفن",
  person: "شخصية",
  source: "مرجع",
  region: "منطقة",
  family: "أسرة/نسب",
  period: "فترة تاريخية",
};

/** SQL condition: every token appears in the normalized search column. */
function allTokens(column: Prisma.Sql, tokens: string[]): Prisma.Sql {
  return Prisma.join(tokens.map((t) => Prisma.sql`${column} LIKE ${"%" + t + "%"}`), " AND ");
}

/**
 * Arabic-normalized search across all indexed record types. Tokens are matched
 * against `searchText` (names, alternative names, spellings, translations).
 * Public mode only returns published people/cemeteries.
 */
export async function search(query: string, opts: { kinds?: SearchKind[]; publicOnly: boolean; limit?: number }): Promise<SearchHit[]> {
  const tokens = queryTokens(query).slice(0, 8);
  if (!tokens.length) return [];
  const full = tokens.join(" ");
  const kinds = new Set<SearchKind>(opts.kinds?.length ? opts.kinds : ["cemetery", "person", "source", "region", "family", "period"]);
  const limit = opts.limit ?? 30;
  const published = opts.publicOnly ? Prisma.sql`AND status = 'PUBLISHED'` : Prisma.empty;
  const hits: SearchHit[] = [];
  const base = opts.publicOnly ? "" : "/admin";

  if (kinds.has("cemetery")) {
    const rows = await prisma.$queryRaw<Array<{ id: string; slug: string; canonicalName: string; localName: string | null; locality: string | null; score: number }>>`
      SELECT id, slug, "canonicalName", "localName", locality, word_similarity(${full}, "searchText") AS score
      FROM "Cemetery" WHERE ${allTokens(Prisma.sql`"searchText"`, tokens)} ${published}
      ORDER BY score DESC, "canonicalName" LIMIT ${limit}`;
    for (const r of rows)
      hits.push({ kind: "cemetery", id: r.id, title: r.canonicalName, subtitle: [r.localName, r.locality].filter(Boolean).join(" — ") || null, href: opts.publicOnly ? `/cemeteries/${encodeURIComponent(r.slug)}` : `${base}/cemeteries/${r.id}`, score: r.score + 0.05 });
  }
  if (kinds.has("person")) {
    const rows = await prisma.$queryRaw<Array<{ id: string; slug: string; fullName: string | null; commonName: string | null; nasab: string | null; deathYearHijri: number | null; score: number }>>`
      SELECT id, slug, "fullName", "commonName", nasab, "deathYearHijri", word_similarity(${full}, "searchText") AS score
      FROM "Person" WHERE ${allTokens(Prisma.sql`"searchText"`, tokens)} ${published}
      ${opts.publicOnly ? Prisma.sql`AND ("isContemporary" = false OR "publicationConsent" IS NOT NULL)` : Prisma.empty}
      ORDER BY score DESC LIMIT ${limit}`;
    for (const r of rows)
      hits.push({
        kind: "person", id: r.id, title: personDisplayName(r),
        subtitle: [r.fullName && r.fullName !== personDisplayName(r) ? r.fullName : null, r.nasab, r.deathYearHijri ? `ت ${r.deathYearHijri}هـ` : null].filter(Boolean).join(" — ") || null,
        href: opts.publicOnly ? `/people/${encodeURIComponent(r.slug)}` : `${base}/people/${r.id}`, score: r.score + 0.04,
      });
  }
  if (kinds.has("source")) {
    const rows = await prisma.$queryRaw<Array<{ id: string; title: string; author: string | null; score: number }>>`
      SELECT id, title, author, word_similarity(${full}, "searchText") AS score
      FROM "Source" WHERE ${allTokens(Prisma.sql`"searchText"`, tokens)}
      ORDER BY score DESC LIMIT ${limit}`;
    for (const r of rows) hits.push({ kind: "source", id: r.id, title: r.title, subtitle: r.author, href: `${base}/sources/${r.id}`, score: r.score });
  }
  if (kinds.has("region")) {
    const rows = await prisma.$queryRaw<Array<{ id: string; name: string; kind: string | null; score: number }>>`
      SELECT id, name, kind, word_similarity(${full}, "searchText") AS score
      FROM "Region" WHERE ${allTokens(Prisma.sql`"searchText"`, tokens)} ORDER BY score DESC LIMIT ${limit}`;
    for (const r of rows) hits.push({ kind: "region", id: r.id, title: r.name, subtitle: r.kind, href: opts.publicOnly ? `/map?region=${r.id}` : `/admin/taxonomy?tab=regions#${r.id}`, score: r.score });
  }
  if (kinds.has("family")) {
    const rows = await prisma.$queryRaw<Array<{ id: string; name: string; score: number }>>`
      SELECT id, name, word_similarity(${full}, "searchText") AS score
      FROM "Family" WHERE ${allTokens(Prisma.sql`"searchText"`, tokens)} ORDER BY score DESC LIMIT ${limit}`;
    for (const r of rows) hits.push({ kind: "family", id: r.id, title: r.name, href: opts.publicOnly ? `/people?family=${r.id}` : `/admin/taxonomy?tab=families#${r.id}`, score: r.score });
  }
  if (kinds.has("period")) {
    const rows = await prisma.$queryRaw<Array<{ id: string; name: string; score: number }>>`
      SELECT id, name, word_similarity(${full}, "searchText") AS score
      FROM "HistoricalPeriod" WHERE ${allTokens(Prisma.sql`"searchText"`, tokens)} ORDER BY score DESC LIMIT ${limit}`;
    for (const r of rows) hits.push({ kind: "period", id: r.id, title: r.name, href: opts.publicOnly ? `/index#period-${r.id}` : `/admin/taxonomy?tab=periods#${r.id}`, score: r.score });
  }
  return hits.sort((a, b) => b.score - a.score);
}
