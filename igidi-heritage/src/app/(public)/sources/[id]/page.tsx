import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { VISIBLE_CEMETERY, VISIBLE_PERSON, personDisplayName } from "@/services/public";
import { Fact, PageHeader, SectionTitle } from "@/components/ui";
import { CEMETERY_FIELDS, PERSON_FIELDS, SOURCE_TYPE_LABELS } from "@/lib/labels";
import { MediaGallery } from "@/components/public/media-gallery";

export async function generateMetadata(props: PageProps<"/sources/[id]">): Promise<Metadata> {
  const { id } = await props.params;
  const s = await prisma.source.findUnique({ where: { id }, select: { title: true } });
  return { title: s?.title ?? "مصدر" };
}

export default async function SourcePage(props: PageProps<"/sources/[id]">) {
  const { id } = await props.params;
  const s = await prisma.source.findUnique({
    where: { id },
    include: {
      media: { where: { isPublic: true } },
      citations: {
        where: {
          OR: [
            { cemetery: VISIBLE_CEMETERY },
            { person: VISIBLE_PERSON },
            { burial: { person: VISIBLE_PERSON, cemetery: VISIBLE_CEMETERY } },
            { location: { cemetery: VISIBLE_CEMETERY } },
            { relation: { from: VISIBLE_PERSON, to: VISIBLE_PERSON } },
            { work: { person: VISIBLE_PERSON } },
            { event: { OR: [{ cemetery: VISIBLE_CEMETERY }, { person: VISIBLE_PERSON }] } },
          ],
        },
        include: {
          cemetery: true, person: true,
          burial: { include: { person: true, cemetery: true } },
          location: { include: { cemetery: true } },
          relation: { include: { from: true, to: true } },
          work: { include: { person: true } },
          event: { include: { person: true, cemetery: true } },
        },
        orderBy: { pages: "asc" },
      },
    },
  });
  if (!s) notFound();

  return (
    <>
      <PageHeader crumbs={[{ href: "/sources", label: "المصادر" }]} title={s.title} subtitle={s.author ?? undefined} />
      <div className="mx-auto max-w-5xl px-4 py-8 space-y-8">
        <dl className="card px-5">
          <Fact label="النوع" value={SOURCE_TYPE_LABELS[s.type]} />
          <Fact label="المؤلف" value={s.author} />
          <Fact label="المحقق" value={s.editor} />
          <Fact label="الناشر" value={s.publisher} />
          <Fact label="مكان النشر" value={s.publicationPlace} />
          <Fact label="سنة النشر" value={s.year} />
          <Fact label="الطبعة" value={s.edition} />
          <Fact label="الأجزاء" value={s.volumes} />
          <Fact label="الرابط الرقمي" value={s.url ? <a className="link ltr" href={s.url} target="_blank" rel="noopener noreferrer">{s.url}</a> : null} />
          <Fact label="الوصف" value={s.description} />
          <Fact label="ملاحظات حول الموثوقية" value={s.reliabilityNotes} />
          <Fact label="حقوق النشر" value={s.rightsNotes} />
        </dl>
        {s.media.length ? <MediaGallery media={s.media} /> : null}
        <section>
          <SectionTitle>المعلومات التي يدعمها هذا المصدر ({s.citations.length.toLocaleString("ar")})</SectionTitle>
          <ul className="space-y-2">
            {s.citations.map((c) => {
              let link: React.ReactNode = null;
              if (c.cemetery) link = <Link className="link" href={`/cemeteries/${encodeURIComponent(c.cemetery.slug)}`}>{c.cemetery.canonicalName}</Link>;
              else if (c.person) link = <Link className="link" href={`/people/${encodeURIComponent(c.person.slug)}`}>{personDisplayName(c.person)}</Link>;
              else if (c.burial) link = <>دفن <Link className="link" href={`/people/${encodeURIComponent(c.burial.person.slug)}`}>{personDisplayName(c.burial.person)}</Link> في <Link className="link" href={`/cemeteries/${encodeURIComponent(c.burial.cemetery.slug)}`}>{c.burial.cemetery.canonicalName}</Link></>;
              else if (c.location) link = <>موقع <Link className="link" href={`/cemeteries/${encodeURIComponent(c.location.cemetery.slug)}`}>{c.location.cemetery.canonicalName}</Link></>;
              else if (c.relation) link = <>علاقة بين <Link className="link" href={`/people/${encodeURIComponent(c.relation.from.slug)}`}>{personDisplayName(c.relation.from)}</Link> و<Link className="link" href={`/people/${encodeURIComponent(c.relation.to.slug)}`}>{personDisplayName(c.relation.to)}</Link></>;
              else if (c.work) link = <>مؤلَّف «{c.work.title}» لـ <Link className="link" href={`/people/${encodeURIComponent(c.work.person.slug)}`}>{personDisplayName(c.work.person)}</Link></>;
              else if (c.event) link = <>حدث: {c.event.title}</>;
              const fieldLabel = c.cemetery ? CEMETERY_FIELDS[c.field] : c.person ? PERSON_FIELDS[c.field] : null;
              return (
                <li key={c.id} className="card p-3 text-sm">
                  {link} {fieldLabel && c.field !== "general" ? <span className="text-muted">— {fieldLabel}</span> : null}
                  <span className="text-muted"> {c.volume ? `ج ${c.volume}، ` : ""}{c.pages ? `ص ${c.pages}` : ""}</span>
                  {c.quote ? <blockquote className="mt-1 border-s border-line ps-3 font-display">«{c.quote}»</blockquote> : null}
                  {c.summary ? <p className="mt-1">{c.summary}</p> : null}
                </li>
              );
            })}
          </ul>
        </section>
      </div>
    </>
  );
}
