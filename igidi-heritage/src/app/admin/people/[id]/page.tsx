import Link from "next/link";
import { notFound } from "next/navigation";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requirePageUser } from "@/lib/auth/guard";
import { can } from "@/lib/auth/permissions";
import { PERSON_SECTIONS } from "@/lib/field-specs";
import { BURIAL_RELATION_LABELS, PERSON_FIELDS, RELATION_INVERSE_LABELS, RELATION_TYPE_LABELS, VERIFICATION_LABELS } from "@/lib/labels";
import { AdminPage, Notice, Panel, Tabs } from "@/components/admin";
import { RecordStatusBadge, VerificationBadge } from "@/components/ui";
import { ActionForm, ConfirmActionButton, Field } from "@/components/forms";
import { SectionForm } from "@/components/admin/section-form";
import { NamesPanel, CitationForm, CitationList, FieldStatusTable, EventsPanel, WorkflowPanel, RevisionList, VerificationSelect } from "@/components/admin/panels";
import { MediaPanel } from "@/components/admin/media-panel";
import { loadOptions, peopleOptions, cemeteryOptions } from "@/services/admin-options";
import { personDisplayName } from "@/services/records";
import { updatePersonAction, setPersonStatusAction, deletePersonAction } from "@/app/admin/_actions/records";
import { saveBurialAction, deleteBurialAction, saveRelationAction, deleteRelationAction, saveWorkAction, deleteSimpleAction } from "@/app/admin/_actions/links";

export const metadata = { title: "تحرير شخص" };

const TABS = [
  { key: "identity", label: "الاسم والنسب" },
  { key: "dates", label: "الميلاد والوفاة" },
  { key: "burials", label: "المدفن" },
  { key: "biography", label: "السيرة" },
  { key: "relations", label: "الأنساب والشيوخ والتلاميذ" },
  { key: "works", label: "المؤلفات والأحداث" },
  { key: "media", label: "الصور والوثائق" },
  { key: "sources", label: "المصادر وحالة التوثيق" },
  { key: "notes", label: "ملاحظات وخصوصية" },
  { key: "workflow", label: "النشر وسجل التعديلات" },
];

const citationInclude = { source: true } as const;
const personInclude = {
  periods: { select: { id: true } },
  names: { orderBy: { createdAt: "asc" } },
  burials: { include: { cemetery: true, citations: { include: citationInclude } }, orderBy: { createdAt: "asc" } },
  relationsFrom: { include: { to: true, citations: { include: citationInclude } } },
  relationsTo: { include: { from: true, citations: { include: citationInclude } } },
  works: { include: { citations: { include: citationInclude } }, orderBy: { title: "asc" } },
  events: { include: { citations: { include: citationInclude } }, orderBy: [{ yearHijri: "asc" }] },
  media: { orderBy: { createdAt: "desc" } },
  citations: { include: citationInclude, orderBy: { createdAt: "asc" } },
} satisfies Prisma.PersonInclude;
type P = Prisma.PersonGetPayload<{ include: typeof personInclude }>;
type SourceOpt = { id: string; title: string; author: string | null };

export default async function EditPersonPage(props: PageProps<"/admin/people/[id]">) {
  const user = await requirePageUser();
  const { id } = await props.params;
  const sp = await props.searchParams;
  const tab = typeof sp.tab === "string" && TABS.some((t) => t.key === sp.tab) ? sp.tab : "identity";
  const canEdit = can(user.role, "content.edit");
  const canPublish = can(user.role, "content.publish");

  const p = await prisma.person.findUnique({ where: { id }, include: personInclude });
  if (!p) notFound();
  const options = await loadOptions();
  const base = `/admin/people/${p.id}`;
  const hidden = { id: p.id, version: String(p.version) };
  const record = p as unknown as Record<string, unknown>;
  const periodIds = p.periods.map((x) => x.id);
  const section = (key: string) => PERSON_SECTIONS.find((s) => s.key === key)!;

  return (
    <AdminPage
      crumbs={[{ href: "/admin/people", label: "الأشخاص" }]}
      title={<span className="flex flex-wrap items-center gap-3">{personDisplayName(p)} <RecordStatusBadge status={p.status} /></span>}
      actions={p.status === "PUBLISHED" ? <Link href={`/people/${encodeURIComponent(p.slug)}`} target="_blank" className="btn btn-ghost">الصفحة العامة ↗</Link> : null}
    >
      {sp.created ? <Notice tone="success">أُنشئ السجل الأولي ✓ — أكمل المعلومات في الأقسام. ما لا يُعرف يُترك فارغًا ويظهر «غير معلوم».</Notice> : null}
      {p.isContemporary && !p.publicationConsent ? <Notice tone="warn">شخص معاصر بلا موافقة موثقة: لا يمكن نشره.</Notice> : null}
      <Tabs
        base={base}
        current={tab}
        tabs={TABS.map((t) => ({
          ...t,
          count: t.key === "burials" ? p.burials.length : t.key === "relations" ? p.relationsFrom.length + p.relationsTo.length : t.key === "sources" ? p.citations.length : t.key === "media" ? p.media.length : undefined,
        }))}
      />

      {["identity", "dates", "biography", "notes"].includes(tab) ? (
        <Panel title={section(tab).title} description={section(tab).description}>
          <SectionForm section={section(tab)} record={record} periodIds={periodIds} options={options} action={updatePersonAction} hidden={hidden} readOnly={!canEdit} />
        </Panel>
      ) : null}
      {tab === "identity" ? (
        <Panel title="الأسماء البديلة واختلافات كتابة الاسم">
          <NamesPanel owner="person" ownerId={p.id} names={p.names} canEdit={canEdit} />
        </Panel>
      ) : null}

      {tab === "burials" ? <BurialsTab p={p} canEdit={canEdit} sources={options.sources} cemeteries={canEdit ? await cemeteryOptions() : []} preselect={typeof sp.cemeteryId === "string" ? sp.cemeteryId : undefined} /> : null}
      {tab === "relations" ? <RelationsTab p={p} canEdit={canEdit} sources={options.sources} people={canEdit ? await peopleOptions(p.id) : []} /> : null}

      {tab === "works" ? (
        <>
          <Panel title="المؤلفات والآثار العلمية">
            <ul className="mb-4 space-y-2">
              {p.works.map((w) => (
                <li key={w.id} className="rounded-lg border border-line bg-white p-3 text-sm">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p><span className="font-semibold">{w.title}</span> <span className="text-muted">{[w.subject, w.form, w.state].filter(Boolean).join("، ")}</span></p>
                    {canEdit ? <ConfirmActionButton action={deleteSimpleAction} label="حذف" confirmText="حذف هذا المؤلَّف؟" fields={{ id: w.id, kind: "work" }} /> : null}
                  </div>
                  <details className="mt-1">
                    <summary className="cursor-pointer text-green">المصادر ({w.citations.length})</summary>
                    <CitationList citations={w.citations} canEdit={canEdit} />
                    {canEdit ? <CitationForm target="workId" targetId={w.id} sources={options.sources} compact /> : null}
                  </details>
                </li>
              ))}
              {p.works.length === 0 ? <li className="text-sm text-muted">لا مؤلفات مسجلة.</li> : null}
            </ul>
            {canEdit ? (
              <ActionForm action={saveWorkAction} submitLabel="إضافة مؤلَّف" resetOnSuccess submitClassName="btn btn-ghost">
                <input type="hidden" name="personId" value={p.id} />
                <div className="grid gap-3 md:grid-cols-3">
                  <Field label="العنوان" name="title" required className="md:col-span-2"><input name="title" className="input" /></Field>
                  <Field label="الموضوع / الفن" name="subject"><input name="subject" className="input" /></Field>
                  <Field label="الشكل (نظم، شرح، فتوى…)" name="form"><input name="form" className="input" /></Field>
                  <Field label="الحالة (مخطوط، مطبوع، مفقود…)" name="state"><input name="state" className="input" /></Field>
                  <Field label="مكان الحفظ" name="holdingNote"><input name="holdingNote" className="input" /></Field>
                  <Field label="ملاحظة" name="note" className="md:col-span-3"><input name="note" className="input" /></Field>
                </div>
              </ActionForm>
            ) : null}
          </Panel>
          <Panel title="الأحداث المهمة في حياته">
            <EventsPanel owner="person" ownerId={p.id} events={p.events} sources={options.sources} canEdit={canEdit} />
          </Panel>
        </>
      ) : null}

      {tab === "media" ? (
        <Panel title="الصور والوثائق والمخطوطات المرتبطة">
          <MediaPanel media={p.media} target={{ personId: p.id }} canEdit={canEdit} canDelete={canPublish} defaultKind="MANUSCRIPT" />
        </Panel>
      ) : null}

      {tab === "sources" ? (
        <>
          <Panel title="ربط معلومة بمصدرها" description="لكل معلومة (الوفاة، النسب، الشيوخ…) استشهادها الخاص مع الجزء والصفحة.">
            {canEdit ? <CitationForm target="personId" targetId={p.id} fields={PERSON_FIELDS} sources={options.sources} /> : null}
          </Panel>
          <Panel title="درجة الثقة في كل معلومة">
            <FieldStatusTable owner="person" ownerId={p.id} fields={PERSON_FIELDS} citations={p.citations} overrides={p.fieldStatus} canEdit={canEdit} />
          </Panel>
          <Panel title={`الاستشهادات (${p.citations.length})`}>
            <CitationList citations={p.citations} fields={PERSON_FIELDS} canEdit={canEdit} />
          </Panel>
        </>
      ) : null}

      {tab === "workflow" ? (
        <>
          <Panel title="المراجعة والنشر">
            <WorkflowPanel status={p.status} id={p.id} action={setPersonStatusAction} canPublish={canPublish} canEdit={canEdit} publicHref={`/people/${encodeURIComponent(p.slug)}`} />
          </Panel>
          <Panel title="سجل التعديلات">
            <RevisionList
              revisions={await prisma.revision.findMany({
                where: { OR: [{ entityType: "Person", entityId: p.id }, { entityId: { in: [...p.names.map((n) => n.id), ...p.burials.map((b) => b.id), ...p.relationsFrom.map((r) => r.id), ...p.relationsTo.map((r) => r.id), ...p.works.map((w) => w.id)] } }] },
                include: { user: { select: { name: true } } },
                orderBy: { createdAt: "desc" },
                take: 200,
              })}
              canRestore={canPublish}
              fieldLabels={Object.fromEntries(PERSON_SECTIONS.flatMap((s) => s.fields).map((f) => [f.name, f.label]))}
            />
          </Panel>
          {can(user.role, "content.delete") ? (
            <Panel title="منطقة الخطر">
              <ConfirmActionButton action={deletePersonAction} label="حذف نهائي" className="btn btn-wine" confirmText="حذف هذا الشخص نهائيًا مع علاقاته؟" fields={{ id: p.id }} />
            </Panel>
          ) : null}
        </>
      ) : null}
    </AdminPage>
  );
}

function BurialsTab({ p, canEdit, sources, cemeteries, preselect }: { p: P; canEdit: boolean; sources: SourceOpt[]; cemeteries: Array<{ id: string; name: string }>; preselect?: string }) {
  return (
    <>
      <Notice>يمكن ربط الشخص بأكثر من مدفن عند وجود دليل، مع توضيح نوع العلاقة بكل موقع ودرجة ثبوتها ومصدرها.</Notice>
      <Panel title="المدافن المرتبطة">
        {p.burials.length === 0 ? <p className="text-sm text-muted">لم يُربط بأي مدفن بعد.</p> : (
          <ul className="space-y-3">
            {p.burials.map((b) => (
              <li key={b.id} className="rounded-lg border border-line bg-white p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p>
                    <Link href={`/admin/cemeteries/${b.cemeteryId}?tab=people`} className="font-semibold text-green hover:text-wine">{b.cemetery.canonicalName}</Link>
                    <span className="ms-2 rounded bg-parchment px-2 text-xs">{BURIAL_RELATION_LABELS[b.relation]}</span> <VerificationBadge status={b.verification} />
                  </p>
                  {canEdit ? <ConfirmActionButton action={deleteBurialAction} label="فك الربط" confirmText="فك الربط بهذا المدفن؟" fields={{ id: b.id }} /> : null}
                </div>
                <details className="mt-2 text-sm">
                  <summary className="cursor-pointer text-green">التفاصيل والمصادر ({b.citations.length})</summary>
                  {canEdit ? (
                    <ActionForm action={saveBurialAction} submitLabel="حفظ" className="mt-2">
                      <input type="hidden" name="burialId" value={b.id} />
                      <div className="grid gap-3 md:grid-cols-3"><BurialFields burial={b} /></div>
                    </ActionForm>
                  ) : null}
                  <div className="mt-2"><CitationList citations={b.citations} canEdit={canEdit} /></div>
                  {canEdit ? <CitationForm target="burialId" targetId={b.id} sources={sources} compact /> : null}
                </details>
              </li>
            ))}
          </ul>
        )}
      </Panel>
      {canEdit ? (
        <Panel title="ربط بمدفن" id="link-cemetery">
          <ActionForm action={saveBurialAction} submitLabel="ربط بالمدفن" resetOnSuccess>
            <input type="hidden" name="personId" value={p.id} />
            <div className="grid gap-3 md:grid-cols-3">
              <Field label="المدفن" name="cemeteryId" required>
                <select name="cemeteryId" className="input" defaultValue={preselect ?? ""}>
                  <option value="" disabled>— اختر —</option>
                  {cemeteries.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </Field>
              <BurialFields />
            </div>
          </ActionForm>
          {cemeteries.length === 0 ? <p className="mt-2 text-sm text-muted">لا توجد مدافن بعد. <Link href="/admin/cemeteries/new" className="link">أضف مدفنًا</Link>.</p> : null}
        </Panel>
      ) : null}
    </>
  );
}

function BurialFields({ burial }: { burial?: P["burials"][number] }) {
  return (
    <>
      <Field label="طبيعة العلاقة بالمدفن" name="relation">
        <select name="relation" defaultValue={burial?.relation ?? "BURIED"} className="input">
          {Object.entries(BURIAL_RELATION_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
      </Field>
      <Field label="درجة ثبوت العلاقة" name="verification">
        <select name="verification" defaultValue={burial?.verification ?? "UNVERIFIED"} className="input">
          {Object.entries(VERIFICATION_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
      </Field>
      <Field label="تاريخ الدفن (كما ورد)" name="burialDateText"><input name="burialDateText" defaultValue={burial?.burialDateText ?? ""} className="input" /></Field>
      <Field label="وصف القبر أو الشاهد" name="graveDescription" className="md:col-span-2"><input name="graveDescription" defaultValue={burial?.graveDescription ?? ""} className="input" /></Field>
      <Field label="ملاحظة" name="note"><input name="note" defaultValue={burial?.note ?? ""} className="input" /></Field>
    </>
  );
}

function RelationsTab({ p, canEdit, sources, people }: { p: P; canEdit: boolean; sources: SourceOpt[]; people: Array<{ id: string; name: string }> }) {
  const rows = [
    ...p.relationsTo.map((r) => ({ r, other: r.from, label: r.type === "OTHER_KIN" ? r.kinLabel ?? "قريب" : RELATION_TYPE_LABELS[r.type] })),
    ...p.relationsFrom.map((r) => ({ r, other: r.to, label: r.type === "OTHER_KIN" ? `${r.kinLabel ?? "قريب"} (الطرف الآخر)` : RELATION_INVERSE_LABELS[r.type] })),
  ];
  return (
    <>
      <Notice>سجّل العلاقة فقط إذا ورد بها نص أو رواية — لا تستنتج القرابة من تشابه الأسماء. ميّز بين النسب الموثق والمنقول شفهيًا والمختلف فيه بحقل «حالة التوثيق»، وأرفق مصدر كل علاقة.</Notice>
      <Panel title={`العلاقات المسجلة (${rows.length})`}>
        {rows.length === 0 ? <p className="text-sm text-muted">لا علاقات مسجلة.</p> : (
          <ul className="space-y-3">
            {rows.map(({ r, other, label }) => (
              <li key={r.id} className="rounded-lg border border-line bg-white p-3 text-sm">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p>
                    <span className="text-muted">{label}:</span>{" "}
                    <Link href={`/admin/people/${other.id}?tab=relations`} className="font-semibold text-green hover:text-wine">{personDisplayName(other)}</Link>{" "}
                    <VerificationBadge status={r.verification} /> {r.note ? <span className="text-xs text-muted">— {r.note}</span> : null}
                  </p>
                  {canEdit ? <ConfirmActionButton action={deleteRelationAction} label="حذف" confirmText="حذف هذه العلاقة؟" fields={{ id: r.id }} /> : null}
                </div>
                <details className="mt-2">
                  <summary className="cursor-pointer text-green">الحالة والمصادر ({r.citations.length})</summary>
                  {canEdit ? (
                    <ActionForm action={saveRelationAction} submitLabel="حفظ" className="mt-2">
                      <input type="hidden" name="relationId" value={r.id} />
                      <div className="grid gap-3 md:grid-cols-3">
                        <VerificationSelect defaultValue={r.verification} />
                        {r.type === "OTHER_KIN" ? <Field label="نوع القرابة" name="kinLabel"><input name="kinLabel" defaultValue={r.kinLabel ?? ""} className="input" /></Field> : null}
                        <Field label="ملاحظة (أوجه الاختلاف…)" name="note"><input name="note" defaultValue={r.note ?? ""} className="input" /></Field>
                      </div>
                    </ActionForm>
                  ) : null}
                  <div className="mt-2"><CitationList citations={r.citations} canEdit={canEdit} /></div>
                  {canEdit ? <CitationForm target="relationId" targetId={r.id} sources={sources} compact /> : null}
                </details>
              </li>
            ))}
          </ul>
        )}
      </Panel>
      {canEdit ? (
        <Panel title="إضافة علاقة" description="الشخص الآخر يجب أن يكون مسجلًا (يمكن إنشاء سجل أولي له أولًا).">
          <ActionForm action={saveRelationAction} submitLabel="حفظ العلاقة" resetOnSuccess>
            <input type="hidden" name="selfId" value={p.id} />
            <div className="grid gap-3 md:grid-cols-3">
              <Field label={`الشخص الآخر هو… لـ «${personDisplayName(p)}»`} name="role" required>
                <select name="role" className="input" defaultValue="">
                  <option value="" disabled>— اختر —</option>
                  <option value="father">أبوه</option>
                  <option value="mother">أمه</option>
                  <option value="child">ابنه / ابنته</option>
                  <option value="spouse">زوجه / زوجته</option>
                  <option value="sibling">أخوه / أخته</option>
                  <option value="kin">قريب آخر (حدّد النوع)</option>
                  <option value="teacher">شيخه / أستاذه</option>
                  <option value="student">تلميذه</option>
                </select>
              </Field>
              <Field label="الشخص" name="otherId" required>
                <select name="otherId" className="input" defaultValue="">
                  <option value="" disabled>— اختر —</option>
                  {people.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}
                </select>
              </Field>
              <VerificationSelect />
              <Field label="عند اختيار «ابنه/ابنته»: هذا الشخص هو" name="parentRole">
                <select name="parentRole" className="input" defaultValue="">
                  <option value="">بحسب جنس السجل</option>
                  <option value="father">الأب</option>
                  <option value="mother">الأم</option>
                </select>
              </Field>
              <Field label="نوع القرابة (لـ«قريب آخر»)" name="kinLabel"><input name="kinLabel" className="input" placeholder="عم، خال، حفيد…" /></Field>
              <Field label="ملاحظة" name="note"><input name="note" className="input" /></Field>
            </div>
          </ActionForm>
        </Panel>
      ) : null}
    </>
  );
}
