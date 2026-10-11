import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { requirePageUser } from "@/lib/auth/guard";
import { can } from "@/lib/auth/permissions";
import { CEMETERY_SECTIONS } from "@/lib/field-specs";
import {
  BURIAL_RELATION_LABELS, CEMETERY_FIELDS, METHOD_LABELS, PRECISION_LABELS, VERIFICATION_LABELS,
} from "@/lib/labels";
import { isLocationConfirmed } from "@/lib/verification";
import { AdminPage, Notice, Panel, Tabs } from "@/components/admin";
import { RecordStatusBadge, VerificationBadge } from "@/components/ui";
import { ActionForm, ConfirmActionButton, Field } from "@/components/forms";
import { SectionForm } from "@/components/admin/section-form";
import { NamesPanel, CitationForm, CitationList, FieldStatusTable, EventsPanel, WorkflowPanel, RevisionList, VerificationSelect } from "@/components/admin/panels";
import { MediaPanel } from "@/components/admin/media-panel";
import { OralFields } from "@/components/admin/oral-fields";
import { LocationPicker } from "@/components/map/location-picker";
import { loadOptions, peopleOptions } from "@/services/admin-options";
import { personDisplayName } from "@/services/records";
import { getSiteSettings } from "@/services/settings";
import { updateCemeteryAction, setCemeteryStatusAction, deleteCemeteryAction, createPersonAction } from "@/app/admin/_actions/records";
import { saveLocationAction, deleteLocationAction, saveBurialAction, deleteBurialAction, saveOralAccountAction } from "@/app/admin/_actions/links";

export const metadata = { title: "تحرير مدفن" };

const TABS = [
  { key: "identity", label: "الهوية والتسمية" },
  { key: "history", label: "التاريخ" },
  { key: "location", label: "الموقع" },
  { key: "narrative", label: "الوصف والروايات" },
  { key: "people", label: "المدفونون" },
  { key: "media", label: "الصور والوثائق" },
  { key: "sources", label: "المصادر وحالة التوثيق" },
  { key: "workflow", label: "النشر وسجل التعديلات" },
];

export default async function EditCemeteryPage(props: PageProps<"/admin/cemeteries/[id]">) {
  const user = await requirePageUser();
  const { id } = await props.params;
  const sp = await props.searchParams;
  const tab = typeof sp.tab === "string" && TABS.some((t) => t.key === sp.tab) ? sp.tab : "identity";
  const canEdit = can(user.role, "content.edit");
  const canPublish = can(user.role, "content.publish");

  const citationInclude = { source: true } as const;
  const c = await prisma.cemetery.findUnique({
    where: { id },
    include: {
      region: true,
      periods: { select: { id: true } },
      names: { orderBy: { createdAt: "asc" } },
      locations: { orderBy: [{ isPrimary: "desc" }, { createdAt: "asc" }], include: { citations: { include: citationInclude } } },
      burials: { include: { person: true, citations: { include: citationInclude } }, orderBy: { createdAt: "asc" } },
      events: { include: { citations: { include: citationInclude } }, orderBy: [{ yearHijri: "asc" }] },
      oralAccounts: { include: { citations: { include: citationInclude } } },
      media: { orderBy: { createdAt: "desc" } },
      citations: { include: citationInclude, orderBy: { createdAt: "asc" } },
      _count: { select: { burials: true, citations: true, media: true, locations: true } },
    },
  });
  if (!c) notFound();
  const options = await loadOptions();
  const base = `/admin/cemeteries/${c.id}`;
  const hidden = { id: c.id, version: String(c.version) };
  const record = c as unknown as Record<string, unknown>;
  const periodIds = c.periods.map((p) => p.id);

  return (
    <AdminPage
      crumbs={[{ href: "/admin/cemeteries", label: "المدافن" }]}
      title={<span className="flex flex-wrap items-center gap-3">{c.canonicalName} <RecordStatusBadge status={c.status} /></span>}
      actions={c.status === "PUBLISHED" ? <Link href={`/cemeteries/${encodeURIComponent(c.slug)}`} target="_blank" className="btn btn-ghost">الصفحة العامة ↗</Link> : null}
    >
      {sp.created ? <Notice tone="success">أُنشئت المسودة ✓ — أكمل المعلومات في الأقسام أدناه. يمكنك الحفظ قسمًا قسمًا والعودة لاحقًا.</Notice> : null}
      {!canEdit ? <Notice tone="warn">صلاحيتك للاطلاع فقط.</Notice> : null}
      <Tabs
        base={base}
        current={tab}
        tabs={TABS.map((t) => ({
          ...t,
          count: t.key === "people" ? c._count.burials : t.key === "sources" ? c._count.citations : t.key === "media" ? c._count.media : t.key === "location" ? c._count.locations : undefined,
        }))}
      />

      {tab === "identity" ? (
        <>
          <Panel title="الهوية والتسمية" description={CEMETERY_SECTIONS[0].description}>
            <SectionForm section={CEMETERY_SECTIONS[0]} record={record} periodIds={periodIds} options={options} action={updateCemeteryAction} hidden={hidden} readOnly={!canEdit} />
          </Panel>
          <Panel title="الأسماء البديلة والتهجئات والترجمات" description="احتفظ بكل صيغة كما وردت؛ يُبحث بها جميعًا.">
            <NamesPanel owner="cemetery" ownerId={c.id} names={c.names} canEdit={canEdit} />
          </Panel>
        </>
      ) : null}

      {tab === "history" ? (
        <>
          <Panel title="التاريخ" description={CEMETERY_SECTIONS[1].description}>
            <SectionForm section={CEMETERY_SECTIONS[1]} record={record} periodIds={periodIds} options={options} action={updateCemeteryAction} hidden={hidden} readOnly={!canEdit} />
          </Panel>
          <Panel title="أبرز الأحداث التاريخية المتصلة بالمدفن">
            <EventsPanel owner="cemetery" ownerId={c.id} events={c.events} sources={options.sources} canEdit={canEdit} />
          </Panel>
        </>
      ) : null}

      {tab === "location" ? <LocationTab c={c} canEdit={canEdit} sources={options.sources} /> : null}

      {tab === "narrative" ? (
        <>
          <Panel title="الوصف والروايات">
            <SectionForm section={CEMETERY_SECTIONS[2]} record={record} periodIds={periodIds} options={options} action={updateCemeteryAction} hidden={hidden} readOnly={!canEdit} />
          </Panel>
          <Panel title="الروايات الشفوية المرتبطة" description="تُدار الروايات كاملةً من صفحة «الروايات الشفوية»؛ يمكنك إضافة رواية مرتبطة بهذا المدفن هنا.">
            <ul className="mb-4 space-y-2 text-sm">
              {c.oralAccounts.map((o) => (
                <li key={o.id} className="rounded border border-line p-2">
                  <Link href={`/admin/oral?edit=${o.id}`} className="link font-semibold">{o.title}</Link> <VerificationBadge status={o.verification} /> <span className="text-xs text-muted">{o.isPublic ? "عامة" : "داخلية"}</span>
                </li>
              ))}
              {c.oralAccounts.length === 0 ? <li className="text-muted">لا روايات مرتبطة.</li> : null}
            </ul>
            {canEdit ? (
              <details className="rounded-lg border border-dashed border-line p-3">
                <summary className="cursor-pointer font-semibold text-green">+ تسجيل رواية شفوية</summary>
                <ActionForm action={saveOralAccountAction} submitLabel="حفظ الرواية" resetOnSuccess className="mt-3">
                  <input type="hidden" name="cemeteryId" value={c.id} />
                  <OralFields />
                </ActionForm>
              </details>
            ) : null}
          </Panel>
        </>
      ) : null}

      {tab === "people" ? <PeopleTab c={c} canEdit={canEdit} sources={options.sources} people={canEdit ? await peopleOptions() : []} /> : null}

      {tab === "media" ? (
        <Panel title="الصور والخرائط القديمة والوثائق الجغرافية" description="يُتحقق من نوع كل ملف من محتواه. لا يظهر الملف للعامة إلا إذا حُددت حقوق نشره وعُلِّم «عامًا» ونُشر المدفن.">
          <MediaPanel media={c.media} target={{ cemeteryId: c.id }} canEdit={canEdit} canDelete={canPublish} />
        </Panel>
      ) : null}

      {tab === "sources" ? (
        <>
          <Panel title="ربط معلومة بمصدرها" description="اختر المعلومة التي يدعمها المصدر (الاسم، التأسيس، الموقع…) وأدخل الجزء والصفحة والاقتباس.">
            {canEdit ? <CitationForm target="cemeteryId" targetId={c.id} fields={CEMETERY_FIELDS} sources={options.sources} /> : null}
          </Panel>
          <Panel title="حالة توثيق كل معلومة" description="تُحسب الحالة من الاستشهادات: لا استشهاد ← غير متحقق؛ مصدر مكتوب ← موثقة؛ مصدران أو أكثر ← مدعومة بأكثر من مصدر؛ مصادر شفوية فقط ← رواية شفوية. استخدم الضبط اليدوي لحالة «مختلف فيها».">
            <FieldStatusTable owner="cemetery" ownerId={c.id} fields={CEMETERY_FIELDS} citations={c.citations} overrides={c.fieldStatus} canEdit={canEdit} />
          </Panel>
          <Panel title={`الاستشهادات (${c.citations.length})`}>
            <CitationList citations={c.citations} fields={CEMETERY_FIELDS} canEdit={canEdit} />
          </Panel>
        </>
      ) : null}

      {tab === "workflow" ? (
        <>
          <Panel title="المراجعة والنشر">
            <WorkflowPanel status={c.status} id={c.id} action={setCemeteryStatusAction} canPublish={canPublish} canEdit={canEdit} publicHref={`/cemeteries/${encodeURIComponent(c.slug)}`} />
          </Panel>
          <Panel title="سجل التعديلات" description="كل تعديل محفوظ مع هوية المحرر وتاريخه. يمكن للمراجع استرجاع نسخة سابقة دون فقدان السجل.">
            <RevisionList revisions={await revisionsFor(c.id, c)} canRestore={canPublish} fieldLabels={fieldLabels()} />
          </Panel>
          {can(user.role, "content.delete") ? (
            <Panel title="منطقة الخطر">
              <p className="mb-2 text-sm text-muted">الأرشفة تكفي عادةً. الحذف النهائي يزيل المدفن وأسماءه ومواقعه وروابطه بالأشخاص (تبقى لقطة كاملة في سجل التعديلات).</p>
              <ConfirmActionButton action={deleteCemeteryAction} label="حذف نهائي" className="btn btn-wine" confirmText="حذف المدفن نهائيًا مع جميع روابطه؟ لا يمكن التراجع إلا يدويًا من سجل التعديلات." fields={{ id: c.id }} />
            </Panel>
          ) : null}
        </>
      ) : null}
    </AdminPage>
  );
}

function fieldLabels(): Record<string, string> {
  return Object.fromEntries(CEMETERY_SECTIONS.flatMap((s) => s.fields).map((f) => [f.name, f.label]).concat([["status", "الحالة"], ["slug", "الرابط"], ["fieldStatus", "حالات التوثيق"], ["regionId", "المنطقة"], ["periods", "الفترات"]]));
}

async function revisionsFor(id: string, c: { names: { id: string }[]; locations: { id: string }[]; burials: { id: string }[] }) {
  const linkedIds = [...c.names.map((n) => n.id), ...c.locations.map((l) => l.id), ...c.burials.map((b) => b.id)];
  return prisma.revision.findMany({
    where: { OR: [{ entityType: "Cemetery", entityId: id }, { entityId: { in: linkedIds } }] },
    include: { user: { select: { name: true } } },
    orderBy: { createdAt: "desc" },
    take: 200,
  });
}

type C = Prisma.CemeteryGetPayload<{
  include: {
    locations: { include: { citations: { include: { source: true } } } };
    burials: { include: { person: true; citations: { include: { source: true } } } };
  };
}>;
type SourceOpt = { id: string; title: string; author: string | null };

async function LocationTab({ c, canEdit, sources }: { c: C; canEdit: boolean; sources: SourceOpt[] }) {
  const settings = await getSiteSettings();
  const others = (await prisma.location.findMany({ where: { cemeteryId: { not: c.id }, isPrimary: true, latitude: { not: null } }, include: { cemetery: { select: { canonicalName: true } } }, take: 500 }))
    .map((l) => ({ lat: Number(l.latitude), lng: Number(l.longitude), label: l.cemetery.canonicalName }));
  return (
    <>
      <Notice>
        لا تُدخل إحداثيات لا يدعمها دليل. إن لم يتوفر إلا موقع تقريبي، اختر «تقريبي» وحدد نصف قطر عدم اليقين. لا يُعرض الموقع «مؤكدًا» إلا إذا كان دقيقًا وحالة توثيقه «موثقة» أو «مدعومة بأكثر من مصدر» مع ذكر مصدر التحديد.
      </Notice>
      {c.locations.map((l) => (
        <Panel key={l.id} title={`${l.isPrimary ? "الموقع الأساسي" : "موقع مقترح"} — ${PRECISION_LABELS[l.precision]}`}>
          <div className="mb-3 flex flex-wrap items-center gap-2 text-sm">
            {l.latitude != null ? <span className="ltr font-mono">{Number(l.latitude).toFixed(6)}, {Number(l.longitude).toFixed(6)}</span> : <span className="text-muted">بلا إحداثيات</span>}
            <VerificationBadge status={l.verification} />
            {isLocationConfirmed(l) ? <span className="font-semibold text-green">يُعرض مؤكدًا</span> : <span className="text-wine">يُعرض غير مؤكد</span>}
            {l.method ? <span className="text-muted">· {METHOD_LABELS[l.method]}</span> : null}
          </div>
          {canEdit ? (
            <details>
              <summary className="cursor-pointer text-sm font-semibold text-green">تعديل هذا الموقع</summary>
              <div className="mt-3"><LocationForm cemeteryId={c.id} loc={l} center={[settings.lat, settings.lng]} zoom={settings.zoom} others={others} /></div>
            </details>
          ) : null}
          <div className="mt-4 border-t border-line pt-3">
            <p className="mb-2 text-sm font-semibold">مصادر تحديد الموقع</p>
            <CitationList citations={l.citations} canEdit={canEdit} />
            {canEdit ? <div className="mt-2"><CitationForm target="locationId" targetId={l.id} sources={sources} compact /></div> : null}
          </div>
          {canEdit ? <div className="mt-3"><ConfirmActionButton action={deleteLocationAction} label="حذف الموقع" confirmText="حذف هذا الموقع؟" fields={{ id: l.id }} /></div> : null}
        </Panel>
      ))}
      {canEdit ? (
        <Panel title={c.locations.length ? "إضافة موقع مقترح آخر" : "تحديد موقع المدفن"} description="انقر على الخريطة أو أدخل الإحداثيات يدويًا. يمكن أيضًا حفظ وصف للموقع دون إحداثيات.">
          <LocationForm cemeteryId={c.id} center={[settings.lat, settings.lng]} zoom={settings.zoom} others={others} />
        </Panel>
      ) : null}
    </>
  );
}

function LocationForm({ cemeteryId, loc, center, zoom, others }: { cemeteryId: string; loc?: C["locations"][number]; center: [number, number]; zoom: number; others: Array<{ lat: number; lng: number; label: string }> }) {
  return (
    <ActionForm action={saveLocationAction} submitLabel="حفظ الموقع">
      <input type="hidden" name="cemeteryId" value={cemeteryId} />
      {loc ? <input type="hidden" name="locationId" value={loc.id} /> : null}
      <LocationPicker
        center={center}
        zoom={zoom}
        initial={{ lat: loc?.latitude != null ? String(loc.latitude) : "", lng: loc?.longitude != null ? String(loc.longitude) : "", radius: loc?.radiusMeters ? String(loc.radiusMeters) : "" }}
        others={others}
      />
      <div className="mt-4 grid gap-3 md:grid-cols-3">
        <Field label="درجة دقة الموقع" name="precision" required>
          <select name="precision" defaultValue={loc?.precision ?? "UNKNOWN"} className="input">
            {Object.entries(PRECISION_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </Field>
        <Field label="طريقة التحديد" name="method">
          <select name="method" defaultValue={loc?.method ?? ""} className="input">
            <option value="">— غير محددة —</option>
            {Object.entries(METHOD_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </Field>
        <VerificationSelect defaultValue={loc?.verification ?? "UNVERIFIED"} label="حالة توثيق الموقع" />
        <Field label="مصدر تحديد الموقع" name="sourceNote" className="md:col-span-2" help="مثال: رصد ميداني بتاريخ… / وصف الكتاب ص… / خريطة…">
          <input name="sourceNote" defaultValue={loc?.sourceNote ?? ""} className="input" />
        </Field>
        <Field label="تاريخ الرصد" name="recordedAt"><input type="date" name="recordedAt" defaultValue={loc?.recordedAt?.toISOString().slice(0, 10) ?? ""} className="input" /></Field>
        <Field label="وصف الموقع" name="description" className="md:col-span-3"><textarea name="description" defaultValue={loc?.description ?? ""} className="input" rows={2} /></Field>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="isPrimary" defaultChecked={loc?.isPrimary ?? true} /> الموقع الأساسي للمدفن</label>
      </div>
    </ActionForm>
  );
}

function PeopleTab({ c, canEdit, sources, people }: { c: C; canEdit: boolean; sources: SourceOpt[]; people: Array<{ id: string; name: string }> }) {
  return (
    <>
      <Notice>لا يُسجَّل الشخص «مدفونًا» إلا بدليل؛ إن ورد اسمه في سياق مرتبط بالمدفن فقط فاختر «مرتبط به دون ثبوت الدفن». أرفق مصدر كل علاقة.</Notice>
      <Panel title={`الأشخاص المرتبطون بالمدفن (${c.burials.length})`}>
        {c.burials.length === 0 ? <p className="text-sm text-muted">لم يُربط أي شخص بعد.</p> : (
          <ul className="space-y-3">
            {c.burials.map((b) => (
              <li key={b.id} className="rounded-lg border border-line bg-white p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p>
                    <Link href={`/admin/people/${b.personId}`} className="font-semibold text-green hover:text-wine">{personDisplayName(b.person)}</Link>
                    <span className="ms-2 rounded bg-parchment px-2 text-xs">{BURIAL_RELATION_LABELS[b.relation]}</span>{" "}
                    <VerificationBadge status={b.verification} /> <RecordStatusBadge status={b.person.status} />
                  </p>
                  {canEdit ? <ConfirmActionButton action={deleteBurialAction} label="فك الربط" confirmText="فك ربط هذا الشخص بالمدفن؟" fields={{ id: b.id }} /> : null}
                </div>
                {canEdit ? (
                  <details className="mt-2 text-sm">
                    <summary className="cursor-pointer text-green">تعديل العلاقة والمصادر ({b.citations.length})</summary>
                    <BurialForm burial={b} />
                    <div className="mt-3"><CitationList citations={b.citations} canEdit={canEdit} /></div>
                    <div className="mt-2"><CitationForm target="burialId" targetId={b.id} sources={sources} compact /></div>
                  </details>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </Panel>
      {canEdit ? (
        <>
          <Panel title="ربط شخص مسجل بهذا المدفن">
            <ActionForm action={saveBurialAction} submitLabel="ربط" resetOnSuccess>
              <input type="hidden" name="cemeteryId" value={c.id} />
              <div className="grid gap-3 md:grid-cols-3">
                <Field label="الشخص" name="personId" required>
                  <select name="personId" className="input" defaultValue="">
                    <option value="" disabled>— اختر —</option>
                    {people.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </Field>
                <BurialFields />
              </div>
            </ActionForm>
          </Panel>
          <Panel title="شخص غير مسجل؟ أنشئ سجله ثم اربطه" description="يُنشأ سجل أولي (مسودة) وتنتقل إلى صفحته لإكمال الربط بهذا المدفن وتسجيل سيرته.">
            <ActionForm action={createPersonAction} submitLabel="إنشاء الشخص ومتابعة">
              <input type="hidden" name="cemeteryId" value={c.id} />
              <div className="grid gap-3 md:grid-cols-2">
                <Field label="الاسم الكامل" name="fullName"><input name="fullName" className="input" dir="auto" /></Field>
                <Field label="الاسم الشائع" name="commonName"><input name="commonName" className="input" dir="auto" /></Field>
              </div>
            </ActionForm>
          </Panel>
        </>
      ) : null}
    </>
  );
}

function BurialFields({ burial }: { burial?: C["burials"][number] }) {
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

function BurialForm({ burial }: { burial: C["burials"][number] }) {
  return (
    <ActionForm action={saveBurialAction} submitLabel="حفظ العلاقة" className="mt-2">
      <input type="hidden" name="burialId" value={burial.id} />
      <div className="grid gap-3 md:grid-cols-3"><BurialFields burial={burial} /></div>
    </ActionForm>
  );
}
