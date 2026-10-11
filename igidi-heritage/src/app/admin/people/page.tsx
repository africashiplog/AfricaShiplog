import Link from "next/link";
import type { Prisma, RecordStatus } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requirePageUser } from "@/lib/auth/guard";
import { can } from "@/lib/auth/permissions";
import { queryTokens } from "@/lib/arabic";
import { AdminPage, Notice } from "@/components/admin";
import { RecordStatusBadge } from "@/components/ui";
import { RECORD_STATUS_LABELS } from "@/lib/labels";
import { personDisplayName } from "@/services/records";

export const metadata = { title: "الأشخاص" };

export default async function AdminPeople(props: PageProps<"/admin/people">) {
  const user = await requirePageUser();
  const sp = await props.searchParams;
  const q = typeof sp.q === "string" ? sp.q : "";
  const status = typeof sp.status === "string" && sp.status in RECORD_STATUS_LABELS ? (sp.status as RecordStatus) : undefined;
  const where: Prisma.PersonWhereInput = {
    ...(status ? { status } : { status: { not: "ARCHIVED" } }),
    AND: queryTokens(q).map((t) => ({ searchText: { contains: t } })),
  };
  const rows = await prisma.person.findMany({
    where, orderBy: { updatedAt: "desc" }, take: 300,
    include: { family: true, burials: { include: { cemetery: { select: { canonicalName: true } } }, take: 2 }, _count: { select: { citations: true, relationsFrom: true, relationsTo: true } } },
  });
  return (
    <AdminPage title="الأشخاص والأعلام" actions={can(user.role, "content.edit") ? <Link href="/admin/people/new" className="btn btn-primary">+ شخص جديد</Link> : null}>
      {sp.deleted ? <Notice tone="success">حُذف السجل وسُجّل الحذف في سجل التعديلات.</Notice> : null}
      <form className="mb-4 flex flex-wrap gap-2">
        <input name="q" defaultValue={q} placeholder="بحث بالاسم أو اللقب أو النسب أو الأسرة…" className="input max-w-sm" />
        <select name="status" defaultValue={status ?? ""} className="input !w-auto">
          <option value="">كل الحالات (عدا المؤرشف)</option>
          {Object.entries(RECORD_STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <button className="btn btn-ghost">تصفية</button>
      </form>
      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-parchment text-muted">
            <tr><th className="p-3 text-start">الاسم</th><th className="p-3 text-start">الوفاة</th><th className="p-3 text-start">الأسرة</th><th className="p-3 text-start">المدفن</th><th className="p-3 text-start">علاقات</th><th className="p-3 text-start">استشهادات</th><th className="p-3 text-start">الحالة</th></tr>
          </thead>
          <tbody>
            {rows.map((p) => (
              <tr key={p.id} className="border-t border-line hover:bg-parchment/50">
                <td className="p-3"><Link href={`/admin/people/${p.id}`} className="font-semibold text-green hover:text-wine">{personDisplayName(p)}</Link>{p.isContemporary ? <span className="ms-1 text-xs text-wine">(معاصر)</span> : null}</td>
                <td className="p-3">{p.deathYearHijri ? `${p.deathYearHijri}هـ` : p.deathDateText ?? "—"}</td>
                <td className="p-3">{p.family?.name ?? "—"}</td>
                <td className="p-3">{p.burials.map((b) => b.cemetery.canonicalName).join("، ") || "—"}</td>
                <td className="p-3">{p._count.relationsFrom + p._count.relationsTo}</td>
                <td className="p-3">{p._count.citations}</td>
                <td className="p-3"><RecordStatusBadge status={p.status} /></td>
              </tr>
            ))}
            {rows.length === 0 ? <tr><td colSpan={7} className="p-6 text-center text-muted">لا توجد سجلات.</td></tr> : null}
          </tbody>
        </table>
      </div>
    </AdminPage>
  );
}
