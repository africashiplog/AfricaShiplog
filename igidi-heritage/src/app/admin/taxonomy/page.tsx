import { prisma } from "@/lib/db";
import { requirePageUser } from "@/lib/auth/guard";
import { can } from "@/lib/auth/permissions";
import { AdminPage, Panel, Tabs } from "@/components/admin";
import { ActionForm, ConfirmActionButton, Field } from "@/components/forms";
import { saveRegionAction, savePeriodAction, saveFamilyAction, deleteTaxonomyAction } from "@/app/admin/_actions/catalog";

export const metadata = { title: "المناطق والفترات والأسر" };

export default async function TaxonomyPage(props: PageProps<"/admin/taxonomy">) {
  const user = await requirePageUser();
  const sp = await props.searchParams;
  const tab = sp.tab === "periods" || sp.tab === "families" ? sp.tab : "regions";
  const canEdit = can(user.role, "content.edit");
  const canDelete = can(user.role, "content.publish");

  return (
    <AdminPage title="المناطق والفترات التاريخية والأسر">
      <Tabs base="/admin/taxonomy" current={tab} tabs={[{ key: "regions", label: "المناطق والمواضع" }, { key: "periods", label: "الفترات التاريخية" }, { key: "families", label: "الأسر والقبائل" }]} />
      {tab === "regions" ? <Regions canEdit={canEdit} canDelete={canDelete} /> : null}
      {tab === "periods" ? <Periods canEdit={canEdit} canDelete={canDelete} /> : null}
      {tab === "families" ? <Families canEdit={canEdit} canDelete={canDelete} /> : null}
    </AdminPage>
  );
}

async function Regions({ canEdit, canDelete }: { canEdit: boolean; canDelete: boolean }) {
  const regions = await prisma.region.findMany({ orderBy: { name: "asc" }, include: { parent: true, _count: { select: { cemeteries: true, children: true } } } });
  const form = (r?: (typeof regions)[number]) => (
    <ActionForm action={saveRegionAction} submitLabel={r ? "حفظ" : "إضافة منطقة"} resetOnSuccess={!r} submitClassName={r ? "btn btn-ghost btn-sm" : "btn btn-primary"}>
      {r ? <input type="hidden" name="id" value={r.id} /> : null}
      <div className="grid gap-3 md:grid-cols-4">
        <Field label="الاسم" name="name" required><input name="name" defaultValue={r?.name ?? ""} className="input" dir="auto" /></Field>
        <Field label="النوع" name="kind"><input name="kind" defaultValue={r?.kind ?? ""} className="input" placeholder="منطقة، قرية، موضع…" /></Field>
        <Field label="تتبع لـ" name="parentId">
          <select name="parentId" defaultValue={r?.parentId ?? ""} className="input">
            <option value="">— لا شيء —</option>
            {regions.filter((x) => x.id !== r?.id).map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}
          </select>
        </Field>
        <Field label="أسماء وتهجئات أخرى (مفصولة بفاصلة)" name="altNames"><input name="altNames" defaultValue={r?.altNames.join("، ") ?? ""} className="input" /></Field>
        <Field label="وصف" name="description" className="md:col-span-4"><input name="description" defaultValue={r?.description ?? ""} className="input" /></Field>
      </div>
    </ActionForm>
  );
  return (
    <>
      {canEdit ? <Panel title="إضافة منطقة أو موضع" description="المناطق تُستخدم لتصفية الخريطة والفهرس. الإحداثيات تخص المدافن لا المناطق.">{form()}</Panel> : null}
      <Panel title={`المناطق (${regions.length})`}>
        <ul className="space-y-3">
          {regions.map((r) => (
            <li key={r.id} id={r.id} className="rounded-lg border border-line bg-white p-3">
              <p className="font-semibold">{r.name} <span className="text-xs font-normal text-muted">{[r.kind, r.parent ? `ضمن ${r.parent.name}` : null, `${r._count.cemeteries} مدفن`].filter(Boolean).join(" · ")}</span></p>
              {canEdit ? <details className="mt-2"><summary className="cursor-pointer text-sm text-green">تعديل</summary><div className="mt-2">{form(r)}</div></details> : null}
              {canDelete && r._count.cemeteries === 0 && r._count.children === 0 ? <div className="mt-2"><ConfirmActionButton action={deleteTaxonomyAction} label="حذف" confirmText="حذف المنطقة؟" fields={{ id: r.id, kind: "region" }} /></div> : null}
            </li>
          ))}
          {regions.length === 0 ? <li className="text-sm text-muted">لا مناطق بعد.</li> : null}
        </ul>
      </Panel>
    </>
  );
}

async function Periods({ canEdit, canDelete }: { canEdit: boolean; canDelete: boolean }) {
  const periods = await prisma.historicalPeriod.findMany({ orderBy: [{ sortOrder: "asc" }, { name: "asc" }], include: { _count: { select: { cemeteries: true, people: true } } } });
  const form = (p?: (typeof periods)[number]) => (
    <ActionForm action={savePeriodAction} submitLabel={p ? "حفظ" : "إضافة فترة"} resetOnSuccess={!p} submitClassName={p ? "btn btn-ghost btn-sm" : "btn btn-primary"}>
      {p ? <input type="hidden" name="id" value={p.id} /> : null}
      <div className="grid gap-3 md:grid-cols-6">
        <Field label="اسم الفترة" name="name" required className="md:col-span-2"><input name="name" defaultValue={p?.name ?? ""} className="input" /></Field>
        <Field label="من (هـ)" name="startYearHijri"><input name="startYearHijri" defaultValue={p?.startYearHijri ?? ""} className="input" dir="ltr" /></Field>
        <Field label="إلى (هـ)" name="endYearHijri"><input name="endYearHijri" defaultValue={p?.endYearHijri ?? ""} className="input" dir="ltr" /></Field>
        <Field label="من (م)" name="startYearGregorian"><input name="startYearGregorian" defaultValue={p?.startYearGregorian ?? ""} className="input" dir="ltr" /></Field>
        <Field label="إلى (م)" name="endYearGregorian"><input name="endYearGregorian" defaultValue={p?.endYearGregorian ?? ""} className="input" dir="ltr" /></Field>
        <Field label="الترتيب" name="sortOrder"><input name="sortOrder" defaultValue={p?.sortOrder ?? 0} className="input" dir="ltr" /></Field>
        <Field label="وصف" name="description" className="md:col-span-5"><input name="description" defaultValue={p?.description ?? ""} className="input" /></Field>
      </div>
    </ActionForm>
  );
  return (
    <>
      {canEdit ? <Panel title="إضافة فترة تاريخية" description="يحدد الباحث الفترات وفق تقسيم المصادر.">{form()}</Panel> : null}
      <Panel title={`الفترات (${periods.length})`}>
        <ul className="space-y-3">
          {periods.map((p) => (
            <li key={p.id} id={p.id} className="rounded-lg border border-line bg-white p-3">
              <p className="font-semibold">{p.name} <span className="text-xs font-normal text-muted">{p._count.cemeteries} مدفن · {p._count.people} شخص</span></p>
              {canEdit ? <details className="mt-2"><summary className="cursor-pointer text-sm text-green">تعديل</summary><div className="mt-2">{form(p)}</div></details> : null}
              {canDelete ? <div className="mt-2"><ConfirmActionButton action={deleteTaxonomyAction} label="حذف" confirmText="حذف الفترة؟ (تُزال من السجلات المرتبطة)" fields={{ id: p.id, kind: "period" }} /></div> : null}
            </li>
          ))}
          {periods.length === 0 ? <li className="text-sm text-muted">لا فترات بعد.</li> : null}
        </ul>
      </Panel>
    </>
  );
}

async function Families({ canEdit, canDelete }: { canEdit: boolean; canDelete: boolean }) {
  const families = await prisma.family.findMany({ orderBy: { name: "asc" }, include: { parent: true, _count: { select: { members: true, branches: true } } } });
  const form = (f?: (typeof families)[number]) => (
    <ActionForm action={saveFamilyAction} submitLabel={f ? "حفظ" : "إضافة أسرة"} resetOnSuccess={!f} submitClassName={f ? "btn btn-ghost btn-sm" : "btn btn-primary"}>
      {f ? <input type="hidden" name="id" value={f.id} /> : null}
      <div className="grid gap-3 md:grid-cols-3">
        <Field label="اسم الأسرة/القبيلة" name="name" required><input name="name" defaultValue={f?.name ?? ""} className="input" dir="auto" /></Field>
        <Field label="فرع من" name="parentId">
          <select name="parentId" defaultValue={f?.parentId ?? ""} className="input">
            <option value="">— لا شيء —</option>
            {families.filter((x) => x.id !== f?.id).map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}
          </select>
        </Field>
        <Field label="تهجئات أخرى (مفصولة بفاصلة)" name="altNames"><input name="altNames" defaultValue={f?.altNames.join("، ") ?? ""} className="input" /></Field>
        <Field label="وصف (مع ذكر المصدر)" name="description" className="md:col-span-3"><textarea name="description" defaultValue={f?.description ?? ""} className="input" rows={2} /></Field>
      </div>
    </ActionForm>
  );
  return (
    <>
      {canEdit ? <Panel title="إضافة أسرة أو قبيلة">{form()}</Panel> : null}
      <Panel title={`الأسر (${families.length})`}>
        <ul className="space-y-3">
          {families.map((f) => (
            <li key={f.id} id={f.id} className="rounded-lg border border-line bg-white p-3">
              <p className="font-semibold">{f.name} <span className="text-xs font-normal text-muted">{[f.parent ? `فرع من ${f.parent.name}` : null, `${f._count.members} شخص`].filter(Boolean).join(" · ")}</span></p>
              {canEdit ? <details className="mt-2"><summary className="cursor-pointer text-sm text-green">تعديل</summary><div className="mt-2">{form(f)}</div></details> : null}
              {canDelete && f._count.members === 0 && f._count.branches === 0 ? <div className="mt-2"><ConfirmActionButton action={deleteTaxonomyAction} label="حذف" confirmText="حذف الأسرة؟" fields={{ id: f.id, kind: "family" }} /></div> : null}
            </li>
          ))}
          {families.length === 0 ? <li className="text-sm text-muted">لا أسر بعد.</li> : null}
        </ul>
      </Panel>
    </>
  );
}
