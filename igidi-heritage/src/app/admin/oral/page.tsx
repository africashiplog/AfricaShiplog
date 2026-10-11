import Link from "next/link";
import { prisma } from "@/lib/db";
import { requirePageUser } from "@/lib/auth/guard";
import { can } from "@/lib/auth/permissions";
import { AdminPage, Panel } from "@/components/admin";
import { ActionForm, ConfirmActionButton, Field } from "@/components/forms";
import { VerificationBadge } from "@/components/ui";
import { OralFields } from "@/components/admin/oral-fields";
import { CitationForm, CitationList } from "@/components/admin/panels";
import { MediaPanel } from "@/components/admin/media-panel";
import { saveOralAccountAction, deleteOralAccountAction } from "@/app/admin/_actions/links";
import { cemeteryOptions, peopleOptions, loadOptions } from "@/services/admin-options";
import { personDisplayName } from "@/services/records";

export const metadata = { title: "الروايات الشفوية" };

export default async function OralPage(props: PageProps<"/admin/oral">) {
  const user = await requirePageUser();
  const sp = await props.searchParams;
  const editId = typeof sp.edit === "string" ? sp.edit : null;
  const canEdit = can(user.role, "content.edit");
  const [rows, cemeteries, people, options] = await Promise.all([
    prisma.oralAccount.findMany({ orderBy: { updatedAt: "desc" }, include: { cemetery: true, person: true } }),
    cemeteryOptions(), peopleOptions(), loadOptions(),
  ]);
  const editing = editId ? await prisma.oralAccount.findUnique({ where: { id: editId }, include: { citations: { include: { source: true } }, media: true } }) : null;

  const links = (d?: { cemeteryId: string | null; personId: string | null }) => (
    <div className="mb-3 grid gap-3 md:grid-cols-2">
      <Field label="المدفن المرتبط" name="cemeteryId">
        <select name="cemeteryId" defaultValue={d?.cemeteryId ?? ""} className="input"><option value="">— لا شيء —</option>{cemeteries.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
      </Field>
      <Field label="الشخص المرتبط" name="personId">
        <select name="personId" defaultValue={d?.personId ?? ""} className="input"><option value="">— لا شيء —</option>{people.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select>
      </Field>
    </div>
  );

  return (
    <AdminPage title="الروايات الشفوية">
      {editing ? (
        <>
          <Panel title={`تحرير: ${editing.title}`}>
            <ActionForm action={saveOralAccountAction} submitLabel="حفظ الرواية">
              <input type="hidden" name="id" value={editing.id} />
              {links(editing)}
              <OralFields defaults={editing} />
            </ActionForm>
            <Link href="/admin/oral" className="link mt-3 inline-block text-sm">← إغلاق التحرير</Link>
          </Panel>
          <Panel title="المصادر (مثل: محضر المقابلة)">
            <CitationList citations={editing.citations} canEdit={canEdit} />
            {canEdit ? <CitationForm target="oralAccountId" targetId={editing.id} sources={options.sources} compact /> : null}
          </Panel>
          <Panel title="التسجيلات الصوتية والوثائق">
            <MediaPanel media={editing.media} target={{ oralAccountId: editing.id }} canEdit={canEdit} canDelete={can(user.role, "content.publish")} defaultKind="AUDIO" />
          </Panel>
        </>
      ) : canEdit ? (
        <Panel title="تسجيل رواية جديدة" description="الروايات الداخلية لا تظهر للعامة. لا يُعلن اسم الراوي إلا بموافقة موثقة.">
          <ActionForm action={saveOralAccountAction} submitLabel="حفظ الرواية" resetOnSuccess>
            {links()}
            <OralFields />
          </ActionForm>
        </Panel>
      ) : null}
      <Panel title={`كل الروايات (${rows.length})`}>
        <ul className="divide-y divide-line text-sm">
          {rows.map((o) => (
            <li key={o.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
              <span>
                <Link href={`/admin/oral?edit=${o.id}`} className="font-semibold text-green hover:text-wine">{o.title}</Link> <VerificationBadge status={o.verification} />
                <span className="text-xs text-muted"> · {o.isPublic ? "عامة" : "داخلية"}{o.cemetery ? ` · ${o.cemetery.canonicalName}` : ""}{o.person ? ` · ${personDisplayName(o.person)}` : ""}</span>
              </span>
              {can(user.role, "content.publish") ? <ConfirmActionButton action={deleteOralAccountAction} label="حذف" confirmText="حذف الرواية؟" fields={{ id: o.id }} /> : null}
            </li>
          ))}
          {rows.length === 0 ? <li className="text-muted">لا روايات بعد.</li> : null}
        </ul>
      </Panel>
    </AdminPage>
  );
}
