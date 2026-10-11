import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getPublicCemetery, numberCitations, personDisplayName } from "@/services/public";
import { fieldStatus, isLocationConfirmed, linkStatus } from "@/lib/verification";
import {
  BURIAL_RELATION_LABELS, CEMETERY_FIELDS, METHOD_LABELS, NAME_KIND_LABELS, NAME_LANGUAGE_LABELS, PRECISION_LABELS,
} from "@/lib/labels";
import { Fact, PageHeader, RefMarks, SectionTitle, Unknown, VerificationBadge, yearsLabel } from "@/components/ui";
import { CitationsList } from "@/components/public/citations";
import { MediaGallery } from "@/components/public/media-gallery";
import { MiniMap } from "@/components/map/mini-map";

export async function generateMetadata(props: PageProps<"/cemeteries/[slug]">): Promise<Metadata> {
  const { slug } = await props.params;
  const c = await getPublicCemetery(decodeURIComponent(slug));
  return { title: c?.canonicalName ?? "مدفن غير موجود", description: c?.summary ?? undefined };
}

export default async function CemeteryPage(props: PageProps<"/cemeteries/[slug]">) {
  const { slug } = await props.params;
  const c = await getPublicCemetery(decodeURIComponent(slug));
  if (!c) notFound();

  const { list, refsFor } = numberCitations([
    c.citations,
    ...c.locations.map((l) => l.citations),
    ...c.burials.map((b) => b.citations),
    ...c.events.map((e) => e.citations),
    ...c.oralAccounts.map((o) => o.citations),
  ]);
  const st = (field: string) => fieldStatus(field, c.citations, c.fieldStatus);
  const refs = (field: string) => refsFor(c.citations.filter((x) => x.field === field));
  const primary = c.locations[0];
  const mapPoints = c.locations
    .filter((l) => l.latitude != null && l.longitude != null)
    .map((l) => ({
      lat: Number(l.latitude), lng: Number(l.longitude), confirmed: isLocationConfirmed(l), precision: l.precision,
      radiusMeters: l.radiusMeters, label: l.isPrimary ? "الموقع الأساسي" : "موقع مقترح آخر",
    }));
  const buried = c.burials.filter((b) => ["BURIED", "FOUNDER", "REINTERRED"].includes(b.relation));
  const otherLinks = c.burials.filter((b) => !["BURIED", "FOUNDER", "REINTERRED"].includes(b.relation));

  const toc = [
    ["identity", "الهوية والتسمية"], ["history", "التاريخ"], ["location", "الموقع الجغرافي"],
    ["narratives", "التاريخ والروايات"], ["people", "الأشخاص المدفونون"], ["sources", "المصادر"],
  ];

  return (
    <>
      <PageHeader
        crumbs={[{ href: "/", label: "الرئيسية" }, { href: "/cemeteries", label: "المدافن" }]}
        title={c.canonicalName}
        subtitle={
          <span className="flex flex-wrap items-center gap-3">
            {c.localName ? <span className="font-display text-lg">{c.localName}</span> : null}
            {c.region ? <span>· {c.region.parent ? `${c.region.parent.name} › ` : ""}{c.region.name}</span> : null}
            {c.locality ? <span>· {c.locality}</span> : null}
          </span>
        }
      />
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-8 lg:grid-cols-[1fr_15rem]">
        <article className="space-y-10 min-w-0">
          {c.summary ? <p className="card p-5 text-lg leading-loose">{c.summary}</p> : null}

          <section>
            <SectionTitle id="identity">الهوية والتسمية</SectionTitle>
            <dl className="card px-5">
              <Fact label="الاسم المعتمد" value={c.canonicalName} status={st("names")} refs={refs("names")} />
              <Fact label="الاسم المحلي / التاريخي" value={c.localName} />
              <Fact label="معنى الاسم" value={c.nameMeaning} status={st("nameMeaning")} refs={refs("nameMeaning")} />
              <Fact label="الأصل اللغوي" value={c.nameOrigin} />
              <Fact label="المنطقة" value={c.region ? <Link className="link" href={`/map?region=${c.region.id}`}>{c.region.name}</Link> : null} />
              <Fact label="القرية أو الموضع" value={c.locality} />
              <Fact label="المنطقة الإدارية" value={c.adminArea} />
            </dl>
            {c.names.length ? (
              <div className="card mt-4 overflow-x-auto">
                <table className="w-full text-sm">
                  <caption className="p-3 text-start font-semibold text-green">الأسماء البديلة والتهجئات والترجمات</caption>
                  <thead className="bg-parchment text-muted">
                    <tr><th className="p-2 text-start">الاسم</th><th className="p-2 text-start">النوع</th><th className="p-2 text-start">اللغة</th><th className="p-2 text-start">ملاحظة</th></tr>
                  </thead>
                  <tbody>
                    {c.names.map((n) => (
                      <tr key={n.id} className="border-t border-line">
                        <td className="p-2 font-display text-base" dir="auto">{n.name}</td>
                        <td className="p-2">{NAME_KIND_LABELS[n.kind]}</td>
                        <td className="p-2">{NAME_LANGUAGE_LABELS[n.language]}</td>
                        <td className="p-2 text-muted">{n.note}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : null}
          </section>

          <section>
            <SectionTitle id="history">التاريخ</SectionTitle>
            <dl className="card px-5">
              <Fact label="تاريخ التأسيس" value={yearsLabel(c.foundingYearHijri, c.foundingYearGregorian, c.foundingDateText)} status={st("founding")} refs={refs("founding")} />
              <Fact
                label="أقدم ذكر موثق"
                value={yearsLabel(c.earliestMentionYearHijri, c.earliestMentionYearGregorian, c.earliestMentionText) ?? c.earliestMentionSourceNote}
                status={st("earliestMention")}
                refs={refs("earliestMention")}
              />
              {c.earliestMentionSourceNote && (c.earliestMentionText || c.earliestMentionYearHijri) ? <Fact label="موضع الذكر" value={c.earliestMentionSourceNote} /> : null}
              <Fact label="الفترات التاريخية" value={c.periods.length ? c.periods.map((p) => p.name).join("، ") : null} />
              <Fact label="آخر تحديث للمعلومات" value={<span className="ltr">{c.updatedAt.toISOString().slice(0, 10)}</span>} />
            </dl>
            <p className="mt-2 text-xs text-muted">تاريخ التأسيس وأقدم ذكر تاريخي للمدفن منفصلان عن تواريخ دفن الأشخاص فيه (انظر قسم الأشخاص المدفونين).</p>
            {c.events.length ? (
              <div className="mt-4">
                <h3 className="mb-2 font-bold text-green">أبرز الأحداث المتصلة به</h3>
                <ol className="relative space-y-3 border-s-2 border-gold/50 ps-5">
                  {c.events.map((e) => (
                    <li key={e.id}>
                      <span className="absolute -start-[7px] mt-2 h-3 w-3 rounded-full bg-wine" aria-hidden />
                      <p className="font-semibold">
                        {e.title} <span className="text-sm font-normal text-muted">{yearsLabel(e.yearHijri, e.yearGregorian, e.dateText) ?? "تاريخ غير معلوم"}</span>{" "}
                        <VerificationBadge status={linkStatus(e.verification, e.citations)} compact /> <RefMarks refs={refsFor(e.citations)} />
                      </p>
                      {e.description ? <p className="prose-ar text-sm text-ink-soft">{e.description}</p> : null}
                    </li>
                  ))}
                </ol>
              </div>
            ) : null}
          </section>

          <section>
            <SectionTitle id="location">الموقع الجغرافي</SectionTitle>
            {mapPoints.length ? <MiniMap locations={mapPoints} /> : (
              <div className="card border-dashed p-6 text-center text-sm text-muted">لم تُحدَّد إحداثيات هذا المدفن بعد. لا تُعرض مواقع غير مدعومة.</div>
            )}
            <dl className="card mt-4 px-5">
              <Fact
                label="الإحداثيات"
                value={primary?.latitude != null ? (
                  <span className="ltr font-mono text-sm">{Number(primary.latitude).toFixed(6)}, {Number(primary.longitude).toFixed(6)}</span>
                ) : null}
              />
              <Fact
                label="دقة الموقع"
                value={primary ? (
                  <>
                    {PRECISION_LABELS[primary.precision]}
                    {primary.radiusMeters ? <> (± <span className="ltr">{primary.radiusMeters.toLocaleString("ar")}</span> م)</> : null}
                    {isLocationConfirmed(primary) ? <span className="ms-2 text-green font-semibold">— موقع مؤكد</span> : primary.latitude != null ? <span className="ms-2 text-wine">— غير مؤكد</span> : null}
                  </>
                ) : null}
                status={primary ? linkStatus(primary.verification, primary.citations) : undefined}
                refs={primary ? refsFor(primary.citations) : undefined}
              />
              <Fact label="طريقة التحديد" value={primary?.method ? METHOD_LABELS[primary.method] : null} />
              <Fact label="مصدر تحديد الموقع" value={primary?.sourceNote} />
              <Fact label="الوصف الجغرافي" value={c.geographicDescription} status={st("location")} refs={refs("location")} />
              <Fact label="المنطقة الإدارية" value={c.adminArea} />
              <Fact label="ملاحظات الباحث الميداني" value={c.fieldNotes} />
            </dl>
            {c.locations.length > 1 ? (
              <p className="mt-2 text-sm text-muted">سُجّل لهذا المدفن {c.locations.length.toLocaleString("ar")} مواقع مقترحة؛ الأساسي هو المعروض أعلاه.</p>
            ) : null}
            {c.media.length ? <div className="mt-4"><h3 className="mb-2 font-bold text-green">الصور والخرائط والوثائق</h3><MediaGallery media={c.media} /></div> : null}
          </section>

          <section>
            <SectionTitle id="narratives">التاريخ والروايات</SectionTitle>
            <div className="space-y-4">
              <Block title="الوصف التاريخي" text={c.history} status={st("history")} refs={refs("history")} />
              <Block title="علاقته بالأسر والعلماء والجماعات المحلية" text={c.communityRelations} status={st("communityRelations")} refs={refs("communityRelations")} />
              {c.oralAccounts.length ? (
                <div className="card p-5">
                  <h3 className="font-bold text-green">الروايات الشفوية</h3>
                  <ul className="mt-3 space-y-4">
                    {c.oralAccounts.map((o) => (
                      <li key={o.id} className="border-s-2 border-amber-400 ps-3">
                        <p className="font-semibold">{o.title} <VerificationBadge status={o.verification} compact /> <RefMarks refs={refsFor(o.citations)} /></p>
                        <p className="text-xs text-muted">
                          {o.narratorPublic && o.narrator ? `الراوي: ${o.narrator}` : "الراوي: محفوظ لدى فريق البحث"}
                          {o.recordedAt ? ` · ${o.recordedAt}` : ""}{o.place ? ` · ${o.place}` : ""}
                        </p>
                        <p className="prose-ar mt-1 text-sm">{o.content}</p>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
              <Block title="الاختلافات بين الروايات والمراجع" text={c.narrativeDifferences} />
            </div>
          </section>

          <section>
            <SectionTitle id="people">الأشخاص المدفونون</SectionTitle>
            {buried.length === 0 && otherLinks.length === 0 ? (
              <p className="card p-5 text-sm text-muted">لم يُوثَّق بعد أي علَم مدفون في هذا الموضع.</p>
            ) : null}
            {buried.length ? <PeopleGrid items={buried} refsFor={refsFor} /> : null}
            {otherLinks.length ? (
              <>
                <h3 className="mt-6 mb-2 font-bold text-green">أشخاص مرتبطون بالمدفن دون ثبوت الدفن فيه</h3>
                <p className="mb-3 text-xs text-muted">ورود الاسم في سياق تاريخي متصل بالمدفن لا يعني ثبوت الدفن فيه؛ نوع الارتباط ودرجة ثبوته مبيّنان لكل شخص.</p>
                <PeopleGrid items={otherLinks} refsFor={refsFor} />
              </>
            ) : null}
          </section>

          <section>
            <SectionTitle id="sources">المصادر</SectionTitle>
            <div className="card p-5"><CitationsList list={list} fieldLabels={CEMETERY_FIELDS} /></div>
          </section>
        </article>

        <aside className="hidden lg:block">
          <nav className="sticky top-24 card p-4 text-sm" aria-label="محتويات الصفحة">
            <p className="mb-2 font-semibold text-green">محتويات الصفحة</p>
            <ul className="space-y-1.5">
              {toc.map(([id, label]) => <li key={id}><a href={`#${id}`} className="hover:text-wine">{label}</a></li>)}
            </ul>
            <div className="gold-rule my-3" />
            <Link href={`/map?q=${encodeURIComponent(c.canonicalName)}`} className="link">عرض على الخريطة العامة</Link>
          </nav>
        </aside>
      </div>
    </>
  );
}

function Block({ title, text, status, refs }: { title: string; text: string | null; status?: import("@prisma/client").VerificationStatus; refs?: number[] }) {
  return (
    <div className="card p-5">
      <h3 className="flex flex-wrap items-center gap-2 font-bold text-green">
        {title} {text && status ? <VerificationBadge status={status} /> : null} {text && refs?.length ? <RefMarks refs={refs} /> : null}
      </h3>
      <div className="prose-ar mt-2 leading-loose">{text ?? <Unknown />}</div>
    </div>
  );
}

type BurialItem = NonNullable<Awaited<ReturnType<typeof getPublicCemetery>>>["burials"][number];

function PeopleGrid({ items, refsFor }: { items: BurialItem[]; refsFor: (cs: BurialItem["citations"]) => number[] }) {
  return (
    <ul className="grid gap-3 sm:grid-cols-2">
      {items.map((b) => (
        <li key={b.id} className="card p-4">
          <Link href={`/people/${encodeURIComponent(b.person.slug)}`} className="font-display text-lg font-bold text-green hover:text-wine">
            {personDisplayName(b.person)}
          </Link>
          {b.person.nasab ? <p className="text-sm text-muted line-clamp-2">{b.person.nasab}</p> : null}
          <p className="mt-1 text-sm">
            {yearsLabel(b.person.birthYearHijri, null) ?? "؟"} – {yearsLabel(b.person.deathYearHijri, b.person.deathYearGregorian) ?? "؟"}
          </p>
          <p className="mt-2 flex flex-wrap items-center gap-2 text-xs">
            <span className="rounded bg-parchment px-2 py-0.5">{BURIAL_RELATION_LABELS[b.relation]}</span>
            <VerificationBadge status={linkStatus(b.verification, b.citations)} />
            <RefMarks refs={refsFor(b.citations)} />
          </p>
          {b.burialDateText ? <p className="mt-1 text-xs text-muted">تاريخ الدفن: {b.burialDateText}</p> : null}
        </li>
      ))}
    </ul>
  );
}
