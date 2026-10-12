import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { VerificationStatus } from "@prisma/client";
import { getPublicPerson, numberCitations, personDisplayName } from "@/services/public";
import { fieldStatus, linkStatus } from "@/lib/verification";
import { BURIAL_RELATION_LABELS, NAME_KIND_LABELS, NAME_LANGUAGE_LABELS, PERSON_FIELDS, PRECISION_LABELS, RELATION_INVERSE_LABELS, RELATION_TYPE_LABELS } from "@/lib/labels";
import { Fact, PageHeader, RefMarks, SectionTitle, Unknown, VerificationBadge, yearsLabel } from "@/components/ui";
import { CitationsList } from "@/components/public/citations";
import { MediaGallery } from "@/components/public/media-gallery";

export async function generateMetadata(props: PageProps<"/people/[slug]">): Promise<Metadata> {
  const { slug } = await props.params;
  const p = await getPublicPerson(decodeURIComponent(slug));
  return { title: p ? personDisplayName(p) : "غير موجود", description: p?.summary ?? undefined };
}

export default async function PersonPage(props: PageProps<"/people/[slug]">) {
  const { slug } = await props.params;
  const p = await getPublicPerson(decodeURIComponent(slug));
  if (!p) notFound();

  const { list, refsFor } = numberCitations([
    p.citations,
    ...p.burials.map((b) => b.citations),
    ...p.relationsFrom.map((r) => r.citations),
    ...p.relationsTo.map((r) => r.citations),
    ...p.works.map((w) => w.citations),
    ...p.events.map((e) => e.citations),
    ...p.oralAccounts.map((o) => o.citations),
  ]);
  const st = (f: string) => fieldStatus(f, p.citations, p.fieldStatus);
  const refs = (f: string) => refsFor(p.citations.filter((c) => c.field === f));
  const name = personDisplayName(p);

  // Relations seen from this person
  type Rel = { id: string; other: { slug: string; name: string }; label: string; verification: VerificationStatus; refs: number[]; note: string | null };
  const kin: Rel[] = [];
  const teachers: Rel[] = [];
  const students: Rel[] = [];
  for (const r of p.relationsTo) {
    const rel: Rel = { id: r.id, other: { slug: r.from.slug, name: personDisplayName(r.from) }, label: r.type === "OTHER_KIN" ? r.kinLabel ?? RELATION_TYPE_LABELS.OTHER_KIN : RELATION_TYPE_LABELS[r.type], verification: linkStatus(r.verification, r.citations), refs: refsFor(r.citations), note: r.note };
    (r.type === "TEACHER_OF" ? teachers : kin).push(rel);
  }
  for (const r of p.relationsFrom) {
    const rel: Rel = { id: r.id, other: { slug: r.to.slug, name: personDisplayName(r.to) }, label: r.type === "OTHER_KIN" ? `${r.kinLabel ?? "قريب"} (من الطرف الآخر)` : RELATION_INVERSE_LABELS[r.type], verification: linkStatus(r.verification, r.citations), refs: refsFor(r.citations), note: r.note };
    (r.type === "TEACHER_OF" ? students : kin).push(rel);
  }
  const hasKinship = p.relationsFrom.some((r) => r.type !== "TEACHER_OF") || p.relationsTo.some((r) => r.type !== "TEACHER_OF");

  return (
    <>
      <PageHeader
        crumbs={[{ href: "/", label: "الرئيسية" }, { href: "/people", label: "فهرس الأعلام" }]}
        title={name}
        subtitle={
          <span className="flex flex-wrap gap-3">
            {p.fullName && p.fullName !== name ? <span className="font-display text-lg">{p.fullName}</span> : null}
            {p.titles ? <span>· {p.titles}</span> : null}
            <span>· {yearsLabel(p.birthYearHijri, p.birthYearGregorian) ?? "؟"} – {yearsLabel(p.deathYearHijri, p.deathYearGregorian) ?? "؟"}</span>
          </span>
        }
      />
      <div className="mx-auto max-w-5xl px-4 py-8 space-y-10">
        {p.summary ? <p className="card p-5 text-lg leading-loose">{p.summary}</p> : null}

        <section>
          <SectionTitle id="identity" aside={hasKinship ? <Link href={`/genealogy?person=${encodeURIComponent(p.slug)}`} className="btn btn-ghost btn-sm">❦ عرض في شجرة الأنساب</Link> : null}>
            الاسم والنسب
          </SectionTitle>
          <dl className="card px-5">
            <Fact label="الاسم الكامل" value={p.fullName} status={st("names")} refs={refs("names")} />
            <Fact label="الاسم الشائع" value={p.commonName} />
            <Fact label="الألقاب" value={p.titles} />
            <Fact label="النسب" value={p.nasab} status={st("nasab")} refs={refs("nasab")} />
            <Fact label="الأسرة / القبيلة" value={p.family ? <Link className="link" href={`/people?family=${p.family.id}`}>{p.family.name}</Link> : null} />
            <Fact label="الفترة التاريخية" value={p.periods.length ? p.periods.map((x) => x.name).join("، ") : null} />
          </dl>
          {p.names.length ? (
            <div className="card mt-4 p-4 text-sm">
              <p className="mb-2 font-semibold text-green">الأسماء البديلة واختلافات الكتابة</p>
              <ul className="flex flex-wrap gap-2">
                {p.names.map((n) => (
                  <li key={n.id} className="rounded-full border border-line bg-parchment px-3 py-1" title={n.note ?? undefined}>
                    <span dir="auto" className="font-display">{n.name}</span>
                    <span className="text-xs text-muted"> · {NAME_KIND_LABELS[n.kind]} · {NAME_LANGUAGE_LABELS[n.language]}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </section>

        <section>
          <SectionTitle id="dates">الميلاد والوفاة</SectionTitle>
          <dl className="card px-5">
            <Fact label="الميلاد" value={yearsLabel(p.birthYearHijri, p.birthYearGregorian, p.birthDateText)} status={st("birth")} refs={refs("birth")} />
            <Fact label="مكان الميلاد" value={p.birthPlace} />
            <Fact label="الوفاة" value={yearsLabel(p.deathYearHijri, p.deathYearGregorian, p.deathDateText)} status={st("death")} refs={refs("death")} />
            <Fact label="مكان الوفاة" value={p.deathPlace} />
          </dl>
        </section>

        <section>
          <SectionTitle id="burial">المدفن</SectionTitle>
          {p.burials.length === 0 ? (
            <p className="card p-5 text-sm text-muted">لم يُوثَّق موضع دفنه بعد.</p>
          ) : (
            <ul className="grid gap-3 sm:grid-cols-2">
              {p.burials.map((b) => {
                const loc = b.cemetery.locations[0];
                return (
                  <li key={b.id} className="card p-4">
                    <Link href={`/cemeteries/${encodeURIComponent(b.cemetery.slug)}`} className="font-display text-lg font-bold text-green hover:text-wine">{b.cemetery.canonicalName}</Link>
                    <p className="text-sm text-muted">{b.cemetery.region?.name ?? ""}</p>
                    <p className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                      <span className="rounded bg-parchment px-2 py-0.5">{BURIAL_RELATION_LABELS[b.relation]}</span>
                      <VerificationBadge status={linkStatus(b.verification, b.citations)} />
                      <RefMarks refs={refsFor(b.citations)} />
                    </p>
                    {b.graveDescription ? <p className="mt-2 text-sm">{b.graveDescription}</p> : null}
                    {b.note ? <p className="mt-1 text-xs text-muted">{b.note}</p> : null}
                    <p className="mt-2 text-xs">
                      {loc?.latitude != null ? (
                        <Link className="link" href={`/map?q=${encodeURIComponent(b.cemetery.canonicalName)}`}>على الخريطة ({PRECISION_LABELS[loc.precision]})</Link>
                      ) : "لم يُحدَّد موقع المدفن على الخريطة بعد"}
                    </p>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <section>
          <SectionTitle id="bio">السيرة</SectionTitle>
          <div className="space-y-4">
            <Block title="السيرة الذاتية" text={p.biography} status={st("biography")} refs={refs("biography")} />
            <Block title="النشأة والبيئة التاريخية" text={p.upbringing} status={st("upbringing")} refs={refs("upbringing")} />
            <Block title="الرحلات والإقامة والتنقلات" text={p.travels} status={st("travels")} refs={refs("travels")} />
          </div>
        </section>

        <section>
          <SectionTitle id="scholarship">الشيوخ والتلاميذ والعلوم</SectionTitle>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="card p-5">
              <h3 className="font-bold text-green flex gap-2 items-center">الشيوخ والأساتذة {p.teachersText || teachers.length ? <VerificationBadge status={st("teachers")} compact /> : null}</h3>
              <RelList items={teachers} />
              {p.teachersText ? <p className="prose-ar mt-2 text-sm">{p.teachersText} <RefMarks refs={refs("teachers")} /></p> : null}
              {!teachers.length && !p.teachersText ? <Unknown /> : null}
            </div>
            <div className="card p-5">
              <h3 className="font-bold text-green flex gap-2 items-center">التلاميذ والطلاب {p.studentsText || students.length ? <VerificationBadge status={st("students")} compact /> : null}</h3>
              <RelList items={students} />
              {p.studentsText ? <p className="prose-ar mt-2 text-sm">{p.studentsText} <RefMarks refs={refs("students")} /></p> : null}
              {!students.length && !p.studentsText ? <Unknown /> : null}
            </div>
          </div>
          <div className="mt-4 space-y-4">
            <Block title="العلوم والتخصصات والأنشطة" text={p.sciences} status={st("sciences")} refs={refs("sciences")} />
            <div className="card p-5">
              <h3 className="font-bold text-green">المؤلفات والآثار العلمية</h3>
              {p.works.length ? (
                <ul className="mt-2 space-y-2">
                  {p.works.map((w) => (
                    <li key={w.id} className="text-sm">
                      <span className="font-display text-base font-semibold">{w.title}</span>
                      {[w.subject, w.form, w.state].filter(Boolean).length ? <span className="text-muted"> — {[w.subject, w.form, w.state].filter(Boolean).join("، ")}</span> : null}
                      <RefMarks refs={refsFor(w.citations)} />
                      {w.holdingNote ? <p className="text-xs text-muted">مكان الحفظ: {w.holdingNote}</p> : null}
                    </li>
                  ))}
                </ul>
              ) : <Unknown />}
            </div>
            <Block title="المناصب والأدوار الاجتماعية والتاريخية" text={p.positions} status={st("positions")} refs={refs("positions")} />
          </div>
        </section>

        <section>
          <SectionTitle id="family">الأبناء والأقارب والصلات الأسرية</SectionTitle>
          <div className="card p-5">
            {kin.length ? <RelList items={kin} /> : <Unknown text="لم تُسجَّل صلات أسرية موثقة بعد" />}
            <p className="mt-3 text-xs text-muted">تُعرض العلاقات المسجلة صراحةً مع مصدرها فقط؛ لا تُستنتج القرابة من تشابه الأسماء.</p>
          </div>
        </section>

        {p.events.length ? (
          <section>
            <SectionTitle id="events">الأحداث المهمة في حياته</SectionTitle>
            <ol className="relative space-y-3 border-s-2 border-gold/50 ps-5">
              {p.events.map((e) => (
                <li key={e.id}>
                  <p className="font-semibold">{e.title} <span className="text-sm font-normal text-muted">{yearsLabel(e.yearHijri, e.yearGregorian, e.dateText) ?? "تاريخ غير معلوم"}</span> <VerificationBadge status={linkStatus(e.verification, e.citations)} compact /> <RefMarks refs={refsFor(e.citations)} /></p>
                  {e.description ? <p className="prose-ar text-sm text-ink-soft">{e.description}</p> : null}
                </li>
              ))}
            </ol>
          </section>
        ) : null}

        <section>
          <SectionTitle id="legacy">الأثر</SectionTitle>
          <Block title="الأثر العلمي أو الاجتماعي والتاريخي" text={p.legacy} status={st("legacy")} refs={refs("legacy")} />
        </section>

        {p.oralAccounts.length ? (
          <section>
            <SectionTitle id="oral">روايات شفوية</SectionTitle>
            <ul className="space-y-3">
              {p.oralAccounts.map((o) => (
                <li key={o.id} className="card p-4">
                  <p className="font-semibold">{o.title} <VerificationBadge status={o.verification} compact /></p>
                  <p className="text-xs text-muted">{o.narratorPublic && o.narrator ? `الراوي: ${o.narrator}` : "الراوي: محفوظ لدى فريق البحث"}{o.recordedAt ? ` · ${o.recordedAt}` : ""}</p>
                  <p className="prose-ar mt-1 text-sm">{o.content}</p>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {p.media.length ? (
          <section>
            <SectionTitle id="media">الصور والوثائق والمخطوطات</SectionTitle>
            <MediaGallery media={p.media} />
          </section>
        ) : null}

        {p.researcherNotes || p.corrections ? (
          <section>
            <SectionTitle id="notes">ملاحظات الباحث والتصحيحات</SectionTitle>
            <div className="space-y-4">
              {p.researcherNotes ? <Block title="ملاحظات الباحث" text={p.researcherNotes} /> : null}
              {p.corrections ? <Block title="التصحيحات اللاحقة" text={p.corrections} /> : null}
            </div>
          </section>
        ) : null}

        <section>
          <SectionTitle id="sources">المصادر والمراجع</SectionTitle>
          <div className="card p-5"><CitationsList list={list} fieldLabels={PERSON_FIELDS} /></div>
          <p className="mt-2 text-xs text-muted">آخر تحديث: <span className="ltr">{p.updatedAt.toISOString().slice(0, 10)}</span></p>
        </section>
      </div>
    </>
  );
}

function Block({ title, text, status, refs }: { title: string; text: string | null; status?: VerificationStatus; refs?: number[] }) {
  return (
    <div className="card p-5">
      <h3 className="flex flex-wrap items-center gap-2 font-bold text-green">
        {title} {text && status ? <VerificationBadge status={status} /> : null} {text && refs?.length ? <RefMarks refs={refs} /> : null}
      </h3>
      <div className="prose-ar mt-2 leading-loose">{text ?? <Unknown />}</div>
    </div>
  );
}

function RelList({ items }: { items: Array<{ id: string; other: { slug: string; name: string }; label: string; verification: VerificationStatus; refs: number[]; note: string | null }> }) {
  if (!items.length) return null;
  return (
    <ul className="mt-2 divide-y divide-line">
      {items.map((r) => (
        <li key={r.id} className="flex flex-wrap items-center gap-2 py-2 text-sm">
          <span className="min-w-20 text-muted">{r.label}:</span>
          <Link href={`/people/${encodeURIComponent(r.other.slug)}`} className="link font-semibold">{r.other.name}</Link>
          <VerificationBadge status={r.verification} />
          <RefMarks refs={r.refs} />
          {r.note ? <span className="w-full text-xs text-muted">{r.note}</span> : null}
        </li>
      ))}
    </ul>
  );
}
