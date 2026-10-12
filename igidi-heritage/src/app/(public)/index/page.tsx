import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { VISIBLE_CEMETERY, VISIBLE_PERSON, personDisplayName } from "@/services/public";
import { EmptyState, PageHeader, SectionTitle } from "@/components/ui";

export const metadata: Metadata = { title: "الفهرس التاريخي" };

export default async function HistoricalIndexPage() {
  const [periods, regions, families, undated] = await Promise.all([
    prisma.historicalPeriod.findMany({
      orderBy: [{ sortOrder: "asc" }, { startYearHijri: "asc" }],
      include: {
        cemeteries: { where: VISIBLE_CEMETERY, select: { id: true, slug: true, canonicalName: true }, orderBy: { canonicalName: "asc" } },
        people: { where: VISIBLE_PERSON, select: { id: true, slug: true, fullName: true, commonName: true, deathYearHijri: true }, orderBy: { deathYearHijri: "asc" } },
      },
    }),
    prisma.region.findMany({
      where: { cemeteries: { some: VISIBLE_CEMETERY } },
      orderBy: { name: "asc" },
      include: { cemeteries: { where: VISIBLE_CEMETERY, select: { id: true, slug: true, canonicalName: true }, orderBy: { canonicalName: "asc" } } },
    }),
    prisma.family.findMany({
      where: { members: { some: VISIBLE_PERSON } },
      orderBy: { name: "asc" },
      include: { _count: { select: { members: { where: VISIBLE_PERSON } } }, parent: true },
    }),
    prisma.person.findMany({ where: { ...VISIBLE_PERSON, periods: { none: {} } }, select: { id: true, slug: true, fullName: true, commonName: true, deathYearHijri: true }, orderBy: { deathYearHijri: "asc" }, take: 500 }),
  ]);
  const hasAny = periods.some((p) => p.cemeteries.length || p.people.length) || regions.length || families.length;

  return (
    <>
      <PageHeader title="الفهرس التاريخي" subtitle="المدافن والأعلام بحسب الفترات التاريخية والمناطق والأسر." />
      <div className="mx-auto max-w-6xl px-4 py-8 space-y-12">
        {!hasAny ? <EmptyState title="لا توجد سجلات منشورة مفهرسة بعد" /> : null}

        {periods.length ? (
          <section>
            <SectionTitle id="periods">بحسب الفترات التاريخية</SectionTitle>
            <ol className="relative space-y-6 border-s-2 border-gold/50 ps-6">
              {periods.map((p) => (
                <li key={p.id} id={`period-${p.id}`} className="scroll-mt-24">
                  <span className="absolute -start-[9px] mt-2 h-4 w-4 rounded-full border-2 border-gold bg-ink" aria-hidden />
                  <h3 className="font-display text-xl font-bold text-wine">
                    {p.name}{" "}
                    <span className="text-sm font-normal text-muted">
                      {[p.startYearHijri && p.endYearHijri ? `${p.startYearHijri}–${p.endYearHijri}هـ` : null, p.startYearGregorian && p.endYearGregorian ? `${p.startYearGregorian}–${p.endYearGregorian}م` : null].filter(Boolean).join(" / ")}
                    </span>
                  </h3>
                  {p.description ? <p className="text-sm text-ink-soft">{p.description}</p> : null}
                  <div className="mt-2 grid gap-3 md:grid-cols-2">
                    <div className="card p-3 text-sm">
                      <p className="font-semibold text-green">المدافن ({p.cemeteries.length.toLocaleString("ar")})</p>
                      <ul className="mt-1">{p.cemeteries.map((c) => <li key={c.id}><Link className="link" href={`/cemeteries/${encodeURIComponent(c.slug)}`}>{c.canonicalName}</Link></li>)}</ul>
                    </div>
                    <div className="card p-3 text-sm">
                      <p className="font-semibold text-green">الأعلام ({p.people.length.toLocaleString("ar")})</p>
                      <ul className="mt-1">{p.people.map((x) => <li key={x.id}><Link className="link" href={`/people/${encodeURIComponent(x.slug)}`}>{personDisplayName(x)}</Link>{x.deathYearHijri ? <span className="text-muted"> (ت {x.deathYearHijri}هـ)</span> : null}</li>)}</ul>
                    </div>
                  </div>
                </li>
              ))}
            </ol>
            {undated.length ? (
              <details className="mt-4 card p-4 text-sm">
                <summary className="cursor-pointer font-semibold text-green">أعلام لم تُحدَّد فترتهم بعد ({undated.length.toLocaleString("ar")})</summary>
                <ul className="mt-2 columns-1 md:columns-2">{undated.map((x) => <li key={x.id}><Link className="link" href={`/people/${encodeURIComponent(x.slug)}`}>{personDisplayName(x)}</Link></li>)}</ul>
              </details>
            ) : null}
          </section>
        ) : null}

        {regions.length ? (
          <section>
            <SectionTitle id="regions">بحسب المناطق</SectionTitle>
            <div className="grid gap-4 md:grid-cols-3">
              {regions.map((r) => (
                <div key={r.id} className="card p-4">
                  <h3 className="font-bold text-green"><Link href={`/map?region=${r.id}`} className="hover:text-wine">{r.name}</Link></h3>
                  <ul className="mt-1 text-sm">{r.cemeteries.map((c) => <li key={c.id}><Link className="link" href={`/cemeteries/${encodeURIComponent(c.slug)}`}>{c.canonicalName}</Link></li>)}</ul>
                </div>
              ))}
            </div>
          </section>
        ) : null}

        {families.length ? (
          <section>
            <SectionTitle id="families">بحسب الأسر والأنساب</SectionTitle>
            <ul className="grid gap-3 md:grid-cols-3">
              {families.map((f) => (
                <li key={f.id} className="card p-4">
                  <Link href={`/people?family=${f.id}`} className="font-bold text-green hover:text-wine">{f.name}</Link>
                  {f.parent ? <p className="text-xs text-muted">فرع من: {f.parent.name}</p> : null}
                  <p className="text-xs text-muted">{f._count.members.toLocaleString("ar")} علَمًا</p>
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </div>
    </>
  );
}
