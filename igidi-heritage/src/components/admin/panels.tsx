import Link from "next/link";
import type { Citation, MediaFile, RecordStatus, Revision, Source, User, VerificationStatus } from "@prisma/client";
import { ActionForm, ConfirmActionButton, Field } from "@/components/forms";
import { RecordStatusBadge, VerificationBadge, yearsLabel } from "@/components/ui";
import {
  ENTITY_LABELS, NAME_KIND_LABELS, NAME_LANGUAGE_LABELS, RECORD_STATUS_LABELS, REVISION_ACTION_LABELS, SOURCE_TYPE_LABELS,
  VERIFICATION_LABELS, VERIFICATION_ORDER,
} from "@/lib/labels";
import { fieldStatus } from "@/lib/verification";
import { addNameAction, deleteNameAction, addCitationAction, deleteSimpleAction, setFieldStatusAction, saveEventAction } from "@/app/admin/_actions/links";
import { restoreRevisionAction } from "@/app/admin/_actions/records";

export function VerificationSelect({ name = "verification", defaultValue = "UNVERIFIED", label = "حالة التوثيق" }: { name?: string; defaultValue?: VerificationStatus; label?: string }) {
  return (
    <Field label={label} name={name}>
      <select id={name} name={name} defaultValue={defaultValue} className="input">
        {VERIFICATION_ORDER.map((v) => <option key={v} value={v}>{VERIFICATION_LABELS[v]}</option>)}
      </select>
    </Field>
  );
}

// ---------------------------------------------------------------------------
// Alternative names
// ---------------------------------------------------------------------------

export function NamesPanel({
  owner,
  ownerId,
  names,
  canEdit,
}: {
  owner: "cemetery" | "person";
  ownerId: string;
  names: Array<{ id: string; name: string; language: keyof typeof NAME_LANGUAGE_LABELS; kind: keyof typeof NAME_KIND_LABELS; note: string | null }>;
  canEdit: boolean;
}) {
  return (
    <div>
      {names.length ? (
        <ul className="mb-4 divide-y divide-line">
          {names.map((n) => (
            <li key={n.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
              <span>
                <span dir="auto" className="font-display text-lg">{n.name}</span>
                <span className="ms-2 text-xs text-muted">{NAME_KIND_LABELS[n.kind]} · {NAME_LANGUAGE_LABELS[n.language]}{n.note ? ` · ${n.note}` : ""}</span>
              </span>
              {canEdit ? <ConfirmActionButton action={deleteNameAction} label="حذف" confirmText="حذف هذا الاسم؟" fields={{ id: n.id, owner }} /> : null}
            </li>
          ))}
        </ul>
      ) : (
        <p className="mb-4 text-sm text-muted">لا توجد أسماء بديلة مسجلة.</p>
      )}
      {canEdit ? (
        <ActionForm action={addNameAction} submitLabel="إضافة الاسم" resetOnSuccess submitClassName="btn btn-ghost">
          <input type="hidden" name={owner === "cemetery" ? "cemeteryId" : "personId"} value={ownerId} />
          <div className="grid gap-3 md:grid-cols-4">
            <Field label="الاسم (بكتابته الأصلية)" name="name" required className="md:col-span-2">
              <input id="name" name="name" className="input" dir="auto" />
            </Field>
            <Field label="النوع" name="kind">
              <select name="kind" className="input" defaultValue="SPELLING_VARIANT">
                {Object.entries(NAME_KIND_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </Field>
            <Field label="اللغة" name="language">
              <select name="language" className="input" defaultValue="AR">
                {Object.entries(NAME_LANGUAGE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </Field>
            <Field label="ملاحظة (مثل: الصيغة الواردة في المصدر)" name="note" className="md:col-span-4">
              <input name="note" className="input" />
            </Field>
          </div>
        </ActionForm>
      ) : null}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Citations + documentation status per field
// ---------------------------------------------------------------------------

type CitationRow = Citation & { source: Source };

export function CitationForm({
  target,
  targetId,
  fields,
  sources,
  pageScans = [],
  defaultField = "general",
  compact = false,
}: {
  target: "cemeteryId" | "personId" | "burialId" | "relationId" | "locationId" | "workId" | "eventId" | "oralAccountId";
  targetId: string;
  fields?: Record<string, string>;
  sources: Array<Pick<Source, "id" | "title" | "author">>;
  pageScans?: Array<Pick<MediaFile, "id" | "title" | "originalName">>;
  defaultField?: string;
  compact?: boolean;
}) {
  if (!sources.length) {
    return <p className="text-sm text-muted">لا توجد مصادر بعد. <Link href="/admin/sources/new" className="link">أضف مصدرًا</Link> ثم عُد لربطه.</p>;
  }
  return (
    <ActionForm action={addCitationAction} submitLabel="ربط بالمصدر" resetOnSuccess submitClassName={compact ? "btn btn-ghost btn-sm" : "btn btn-ghost"}>
      <input type="hidden" name={target} value={targetId} />
      <div className={`grid gap-3 ${compact ? "md:grid-cols-4" : "md:grid-cols-6"}`}>
        <Field label="المصدر" name="sourceId" required className="md:col-span-2">
          <select name="sourceId" className="input" defaultValue="">
            <option value="" disabled>— اختر —</option>
            {sources.map((s) => <option key={s.id} value={s.id}>{s.title}{s.author ? ` — ${s.author}` : ""}</option>)}
          </select>
        </Field>
        {fields ? (
          <Field label="المعلومة التي يدعمها" name="field" className="md:col-span-2">
            <select name="field" className="input" defaultValue={defaultField}>
              {Object.entries(fields).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </Field>
        ) : null}
        <Field label="الجزء" name="volume"><input name="volume" className="input" dir="ltr" /></Field>
        <Field label="الصفحة/الصفحات" name="pages"><input name="pages" className="input" dir="ltr" placeholder="45 أو 45-47" /></Field>
        {!compact ? (
          <>
            <Field label="نص الاقتباس" name="quote" className="md:col-span-3"><textarea name="quote" className="input" rows={3} dir="auto" /></Field>
            <Field label="أو ملخصه" name="summary" className="md:col-span-3"><textarea name="summary" className="input" rows={3} /></Field>
            {pageScans.length ? (
              <Field label="صورة الصفحة (اختياري)" name="pageImageId" className="md:col-span-3">
                <select name="pageImageId" className="input" defaultValue="">
                  <option value="">— بدون —</option>
                  {pageScans.map((m) => <option key={m.id} value={m.id}>{m.title ?? m.originalName}</option>)}
                </select>
              </Field>
            ) : null}
            <Field label="ملاحظة" name="note" className="md:col-span-3"><input name="note" className="input" /></Field>
          </>
        ) : (
          <Field label="الاقتباس أو الملخص" name="quote" className="md:col-span-4"><input name="quote" className="input" dir="auto" /></Field>
        )}
      </div>
    </ActionForm>
  );
}

export function CitationList({ citations, fields, canEdit }: { citations: CitationRow[]; fields?: Record<string, string>; canEdit: boolean }) {
  if (!citations.length) return <p className="text-sm text-muted">لا استشهادات بعد.</p>;
  return (
    <ul className="divide-y divide-line text-sm">
      {citations.map((c) => (
        <li key={c.id} className="flex flex-wrap items-start justify-between gap-2 py-2">
          <div>
            {fields && c.field ? <span className="me-2 rounded bg-parchment px-1.5 text-xs">{fields[c.field] ?? c.field}</span> : null}
            <Link href={`/admin/sources/${c.sourceId}`} className="link font-semibold">{c.source.title}</Link>
            <span className="text-muted"> ({SOURCE_TYPE_LABELS[c.source.type]}){c.volume ? ` ج ${c.volume}` : ""}{c.pages ? ` ص ${c.pages}` : ""}</span>
            {c.quote ? <p className="font-display text-ink-soft">«{c.quote}»</p> : null}
            {c.summary ? <p className="text-ink-soft">{c.summary}</p> : null}
          </div>
          {canEdit ? <ConfirmActionButton action={deleteSimpleAction} label="حذف" confirmText="حذف هذا الاستشهاد؟" fields={{ id: c.id, kind: "citation" }} /> : null}
        </li>
      ))}
    </ul>
  );
}

export function FieldStatusTable({
  owner,
  ownerId,
  fields,
  citations,
  overrides,
  canEdit,
}: {
  owner: "cemetery" | "person";
  ownerId: string;
  fields: Record<string, string>;
  citations: CitationRow[];
  overrides: unknown;
  canEdit: boolean;
}) {
  const o = (overrides ?? {}) as Record<string, string>;
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-parchment text-muted">
          <tr><th className="p-2 text-start">المعلومة</th><th className="p-2 text-start">الاستشهادات</th><th className="p-2 text-start">الحالة المعروضة</th><th className="p-2 text-start">ضبط يدوي</th></tr>
        </thead>
        <tbody>
          {Object.entries(fields).map(([k, label]) => {
            const count = citations.filter((c) => c.field === k).length;
            const status = fieldStatus(k, citations, overrides);
            return (
              <tr key={k} className="border-t border-line">
                <td className="p-2 font-semibold">{label}</td>
                <td className="p-2">{count}</td>
                <td className="p-2"><VerificationBadge status={status} />{o[k] ? <span className="ms-1 text-xs text-muted">(يدوي)</span> : null}</td>
                <td className="p-2">
                  {canEdit ? (
                    <ActionForm action={setFieldStatusAction} submitLabel="تطبيق" submitClassName="btn btn-ghost btn-sm" className="flex flex-wrap items-center gap-2 [&>div]:mt-0">
                      <input type="hidden" name={owner === "cemetery" ? "cemeteryId" : "personId"} value={ownerId} />
                      <input type="hidden" name="field" value={k} />
                      <select name="value" defaultValue={o[k] ?? ""} className="input !w-auto !py-1 text-xs">
                        <option value="">تلقائي (من الاستشهادات)</option>
                        {VERIFICATION_ORDER.map((v) => <option key={v} value={v}>{VERIFICATION_LABELS[v]}</option>)}
                      </select>
                    </ActionForm>
                  ) : null}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Events
// ---------------------------------------------------------------------------

export function EventsPanel({
  owner,
  ownerId,
  events,
  sources,
  canEdit,
}: {
  owner: "cemetery" | "person";
  ownerId: string;
  events: Array<{ id: string; title: string; dateText: string | null; yearHijri: number | null; yearGregorian: number | null; description: string | null; verification: VerificationStatus; citations: CitationRow[] }>;
  sources: Array<Pick<Source, "id" | "title" | "author">>;
  canEdit: boolean;
}) {
  return (
    <div>
      {events.length ? (
        <ul className="mb-4 space-y-3">
          {events.map((e) => (
            <li key={e.id} className="rounded-lg border border-line p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-semibold">{e.title} <span className="text-sm font-normal text-muted">{yearsLabel(e.yearHijri, e.yearGregorian, e.dateText) ?? "تاريخ غير معلوم"}</span> <VerificationBadge status={e.verification} /></p>
                {canEdit ? <ConfirmActionButton action={deleteSimpleAction} label="حذف" confirmText="حذف هذا الحدث؟" fields={{ id: e.id, kind: "event" }} /> : null}
              </div>
              {e.description ? <p className="prose-ar text-sm">{e.description}</p> : null}
              <details className="mt-2 text-sm">
                <summary className="cursor-pointer text-green">المصادر ({e.citations.length})</summary>
                <div className="mt-2"><CitationList citations={e.citations} canEdit={canEdit} /></div>
                {canEdit ? <div className="mt-2"><CitationForm target="eventId" targetId={e.id} sources={sources} compact /></div> : null}
              </details>
            </li>
          ))}
        </ul>
      ) : <p className="mb-4 text-sm text-muted">لا أحداث مسجلة.</p>}
      {canEdit ? (
        <details className="rounded-lg border border-dashed border-line p-3">
          <summary className="cursor-pointer font-semibold text-green">+ إضافة حدث</summary>
          <ActionForm action={saveEventAction} submitLabel="إضافة الحدث" resetOnSuccess className="mt-3">
            <input type="hidden" name={owner === "cemetery" ? "cemeteryId" : "personId"} value={ownerId} />
            <div className="grid gap-3 md:grid-cols-4">
              <Field label="عنوان الحدث" name="title" required className="md:col-span-2"><input name="title" className="input" /></Field>
              <Field label="التاريخ كما ورد" name="dateText" className="md:col-span-2"><input name="dateText" className="input" /></Field>
              <Field label="السنة (هجري)" name="yearHijri"><input name="yearHijri" className="input" dir="ltr" inputMode="numeric" /></Field>
              <Field label="السنة (ميلادي)" name="yearGregorian"><input name="yearGregorian" className="input" dir="ltr" inputMode="numeric" /></Field>
              <div className="md:col-span-2"><VerificationSelect /></div>
              <Field label="الوصف" name="description" className="md:col-span-4"><textarea name="description" className="input" rows={3} /></Field>
            </div>
          </ActionForm>
        </details>
      ) : null}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Workflow + revision history
// ---------------------------------------------------------------------------

export function WorkflowPanel({
  status,
  id,
  action,
  canPublish,
  canEdit,
  publicHref,
}: {
  status: RecordStatus;
  id: string;
  action: Parameters<typeof ActionForm>[0]["action"];
  canPublish: boolean;
  canEdit: boolean;
  publicHref: string;
}) {
  const transitions: Array<{ to: RecordStatus; label: string; cls: string; confirm?: string }> = [];
  if (status === "DRAFT" && canEdit) transitions.push({ to: "IN_REVIEW", label: "إرسال للمراجعة", cls: "btn btn-gold" });
  if (status === "IN_REVIEW" && canEdit) transitions.push({ to: "DRAFT", label: "إعادة إلى المسودة", cls: "btn btn-ghost" });
  if (canPublish && status !== "PUBLISHED" && status !== "ARCHIVED") transitions.push({ to: "PUBLISHED", label: "مراجعة ونشر", cls: "btn btn-primary", confirm: "نشر السجل للعامة؟ تأكد من مراجعة المعلومات ومصادرها." });
  if (canPublish && status === "PUBLISHED") transitions.push({ to: "DRAFT", label: "إلغاء النشر", cls: "btn btn-ghost", confirm: "إخفاء السجل عن العامة وإعادته مسودة؟" });
  if (canPublish && status !== "ARCHIVED") transitions.push({ to: "ARCHIVED", label: "أرشفة", cls: "btn btn-wine", confirm: "أرشفة السجل؟ يختفي من الموقع ويبقى في قاعدة البيانات." });
  if (canPublish && status === "ARCHIVED") transitions.push({ to: "DRAFT", label: "استعادة من الأرشيف", cls: "btn btn-ghost" });
  return (
    <div className="space-y-3">
      <p className="flex items-center gap-2">الحالة الحالية: <RecordStatusBadge status={status} /></p>
      {status === "PUBLISHED" ? <p className="text-sm"><Link href={publicHref} className="link" target="_blank">عرض الصفحة العامة ↗</Link></p> : null}
      <div className="flex flex-wrap gap-2">
        {transitions.map((t) => (
          <ConfirmActionButton key={`${t.to}-${t.label}`} action={action} label={t.label} className={t.cls} confirmText={t.confirm} fields={{ id, status: t.to }} />
        ))}
      </div>
      {!canPublish ? <p className="text-xs text-muted">النشر من صلاحية المراجع أو مدير النظام.</p> : null}
      <p className="text-xs text-muted">المسار: {(["DRAFT", "IN_REVIEW", "PUBLISHED"] as RecordStatus[]).map((s) => RECORD_STATUS_LABELS[s]).join(" ← ")}</p>
    </div>
  );
}

export function RevisionList({ revisions, canRestore, fieldLabels }: { revisions: Array<Revision & { user: Pick<User, "name"> | null }>; canRestore: boolean; fieldLabels?: Record<string, string> }) {
  if (!revisions.length) return <p className="text-sm text-muted">لا توجد تعديلات مسجلة.</p>;
  return (
    <ol className="space-y-2 text-sm">
      {revisions.map((r) => {
        const changes = (r.changes ?? {}) as Record<string, { from: unknown; to: unknown }>;
        const keys = Object.keys(changes);
        return (
          <li key={r.id} className="rounded-lg border border-line bg-white p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span>
                <span className="font-semibold">{REVISION_ACTION_LABELS[r.action]}</span>
                <span className="text-muted"> · {r.user?.name ?? "النظام"} · <span className="ltr">{r.createdAt.toISOString().replace("T", " ").slice(0, 16)}</span></span>
                {r.entityType !== "Cemetery" && r.entityType !== "Person" ? <span className="text-xs text-muted"> · {ENTITY_LABELS[r.entityType] ?? r.entityType}</span> : null}
                {r.summary ? <span className="text-muted"> — {r.summary}</span> : null}
              </span>
              {canRestore && (r.entityType === "Cemetery" || r.entityType === "Person") && r.snapshot && r.action !== "DELETE" ? (
                <ConfirmActionButton action={restoreRevisionAction} label="استرجاع هذه النسخة" confirmText="استرجاع الحقول النصية والتواريخ كما كانت بعد هذا التعديل؟ (يُسجَّل الاسترجاع ولا يُفقد شيء)" fields={{ id: r.id }} />
              ) : null}
            </div>
            {keys.length && r.action !== "CREATE" ? (
              <details className="mt-1">
                <summary className="cursor-pointer text-xs text-green">الحقول المتغيرة ({keys.length})</summary>
                <table className="mt-1 w-full text-xs">
                  <tbody>
                    {keys.map((k) => (
                      <tr key={k} className="border-t border-line align-top">
                        <td className="p-1 font-semibold whitespace-nowrap">{fieldLabels?.[k] ?? k}</td>
                        <td className="p-1 text-wine line-through break-all">{fmt(changes[k].from)}</td>
                        <td className="p-1 text-green break-all">{fmt(changes[k].to)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </details>
            ) : null}
          </li>
        );
      })}
    </ol>
  );
}

function fmt(v: unknown): string {
  if (v == null || v === "") return "—";
  const s = typeof v === "string" ? v : JSON.stringify(v);
  return s.length > 300 ? s.slice(0, 300) + "…" : s;
}
