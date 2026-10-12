import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { VISIBLE_CEMETERY, VISIBLE_PERSON, personDisplayName } from "@/services/public";
import { normalizeArabic } from "@/lib/arabic";
import { EmptyState, PageHeader, yearsLabel } from "@/components/ui";

export const metadata: Metadata = { title: "فهرس الأعلام" };

export default async function PeoplePage(props: PageProps<"/people">) {
  const sp = await props.searchParams;
  const familyId = typeof sp.family === "string" ? sp.family : undefined;
  const [people, family] = await Promise.all([
    prisma.person.findMany({
      where: { ...VISIBLE_PERSON, ...(familyId ? { familyId } : {}) },
      include: {
        family: true,
        burials: { where: { relation: { in: ["BURIED", "FOUNDER", "REINTERRED"] }, cemetery: VISIBLE_CEMETERY }, include: { cemetery: true }, take: 2 },
      },
    }),
    familyId ? prisma.family.findUnique({ where: { id: familyId } }) : null,
  ]);
  const sorted = people
    .map((p) => ({ p, name: personDisplayName(p), key: normalizeArabic(personDisplayName(p)) }))
    .sort((a, b) => a.key.localeCompare(b.key, "ar"));
  const groups = new Map<string, typeof sorted>();
  for (const item of sorted) {
    const letter = item.key[0] ?? "؟";
    groups.set(letter, [...(groups.get(letter) ?? []), item]);
  }

  return (
    <>
      <PageHeader title={family ? `أعلام ${family.name}` : "فهرس الأعلام"} subtitle={`${people.length.toLocaleString("ar")} علَمًا منشورًا — مرتبون هجائيًا`} />
      <div className="mx-auto max-w-6xl px-4 py-8">
        {family ? <Link href="/people" className="link text-sm">← كل الأعلام</Link> : null}
        {people.length === 0 ? (
          <EmptyState title="لا توجد تراجم منشورة بعد" />
        ) : (
          <>
            <nav className="my-4 flex flex-wrap gap-1.5" aria-label="الحروف">
              {[...groups.keys()].map((l) => (
                <a key={l} href={`#l-${l}`} className="grid h-8 w-8 place-items-center rounded border border-line bg-paper font-display hover:border-gold">{l}</a>
              ))}
            </nav>
            {[...groups.entries()].map(([letter, items]) => (
              <section key={letter} id={`l-${letter}`} className="mb-6 scroll-mt-24">
                <h2 className="mb-2 border-b border-gold/40 font-display text-2xl text-wine">{letter}</h2>
                <ul className="grid gap-2 md:grid-cols-2">
                  {items.map(({ p, name }) => (
                    <li key={p.id} className="card p-3">
                      <Link href={`/people/${encodeURIComponent(p.slug)}`} className="font-semibold text-green hover:text-wine">{name}</Link>
                      <span className="ms-2 text-xs text-muted">{yearsLabel(p.deathYearHijri, p.deathYearGregorian) ? `ت ${yearsLabel(p.deathYearHijri, p.deathYearGregorian)}` : ""}</span>
                      <p className="text-xs text-muted">
                        {[p.nasab?.slice(0, 120), p.family?.name, p.burials.map((b) => b.cemetery.canonicalName).join("، ")].filter(Boolean).join(" · ")}
                      </p>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </>
        )}
      </div>
    </>
  );
}
