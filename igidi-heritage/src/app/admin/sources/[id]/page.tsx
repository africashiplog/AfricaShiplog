import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { requirePageUser } from "@/lib/auth/guard";
import { can } from "@/lib/auth/permissions";
import { AdminPage, Notice, Panel } from "@/components/admin";
import { SourceForm } from "@/components/admin/source-form";
import { MediaPanel } from "@/components/admin/media-panel";
import { ConfirmActionButton } from "@/components/forms";
import { deleteSourceAction } from "@/app/admin/_actions/catalog";
import { personDisplayName } from "@/services/records";
import { CEMETERY_FIELDS, PERSON_FIELDS } from "@/lib/labels";

export const metadata = { title: "مصدر" };

export default async function EditSourcePage(props: PageProps<"/admin/sources/[id]">) {
  const user = await requirePageUser();
  const { id } = await props.params;
  const sp = await props.searchParams;
  const s = await prisma.source.findUnique({
    where: { id },
    include: {
      media: { orderBy: { createdAt: "desc" } },
      citations: { include: { cemetery: true, person: true, burial: { include: { person: true, cemetery: true } }, relation: { include: { from: true, to: true } }, location: { include: { cemetery: true } }, work: true, event: true, oralAccount: true }, orderBy: { createdAt: "desc" } },
    },
  });
  if (!s) notFound();
  const canEdit = can(user.role, "content.edit");
  return (
    <AdminPage title={s.title} crumbs={[{ href: "/admin/sources", label: "المصادر" }]} actions={<Link href={`/sources/${s.id}`} target="_blank" className="btn btn-ghost">الصفحة العامة ↗</Link>}>
      {sp.created ? <Notice tone="success">أُضيف المصدر ✓ يمكنك الآن ربطه بالمعلومات من صفحات المدافن والأشخاص (قسم «المصادر»).</Notice> : null}
      <Panel title="بيانات المصدر"><SourceForm source={s} readOnly={!canEdit} /></Panel>
      <Panel title="صور الصفحات والمقتطفات" description="ارفع صور الصفحات فقط إذا كانت حقوق النشر تسمح؛ يمكن ربط صورة الصفحة بالاستشهاد.">
        <MediaPanel media={s.media} target={{ sourceId: s.id }} canEdit={canEdit} canDelete={can(user.role, "content.publish")} defaultKind="PAGE_SCAN" />
      </Panel>
      <Panel title={`المعلومات التي يدعمها (${s.citations.length})`}>
        <ul className="divide-y divide-line text-sm">
          {s.citations.map((c) => (
            <li key={c.id} className="py-2">
              {c.cemetery ? <Link className="link" href={`/admin/cemeteries/${c.cemetery.id}?tab=sources`}>{c.cemetery.canonicalName}</Link> : null}
              {c.person ? <Link className="link" href={`/admin/people/${c.person.id}?tab=sources`}>{personDisplayName(c.person)}</Link> : null}
              {c.burial ? <>دفن {personDisplayName(c.burial.person)} في {c.burial.cemetery.canonicalName}</> : null}
              {c.relation ? <>علاقة: {personDisplayName(c.relation.from)} ↔ {personDisplayName(c.relation.to)}</> : null}
              {c.location ? <>موقع {c.location.cemetery.canonicalName}</> : null}
              {c.work ? <>مؤلَّف: {c.work.title}</> : null}
              {c.event ? <>حدث: {c.event.title}</> : null}
              {c.oralAccount ? <>رواية: {c.oralAccount.title}</> : null}
              <span className="text-muted"> — {(c.cemetery ? CEMETERY_FIELDS : PERSON_FIELDS)[c.field] ?? c.field}{c.pages ? ` · ص ${c.pages}` : ""}</span>
            </li>
          ))}
          {s.citations.length === 0 ? <li className="text-muted">لم يُستشهد به بعد.</li> : null}
        </ul>
      </Panel>
      {can(user.role, "content.delete") ? (
        <Panel title="حذف المصدر"><ConfirmActionButton action={deleteSourceAction} label="حذف المصدر" className="btn btn-wine" confirmText="حذف المصدر؟ (يُرفض إن كان مستشهدًا به)" fields={{ id: s.id }} /></Panel>
      ) : null}
    </AdminPage>
  );
}
