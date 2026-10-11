import Link from "next/link";
import type { Prisma, RecordStatus } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requirePageUser } from "@/lib/auth/guard";
import { can } from "@/lib/auth/permissions";
import { queryTokens } from "@/lib/arabic";
import { AdminPage, Notice } from "@/components/admin";
import { RecordStatusBadge } from "@/components/ui";
import { PRECISION_LABELS, RECORD_STATUS_LABELS } from "@/lib/labels";

export const metadata = { title: "المدافن" };

export default async function AdminCemeteries(props: PageProps<"/admin/cemeteries">) {
  const user = await requirePageUser();
  const sp = await props.searchParams;
  const q = typeof sp.q === "string" ? sp.q : "";
  const status = typeof sp.status === "string" && sp.status in RECORD_STATUS_LABELS ? (sp.status as RecordStatus) : undefined;
  const where: Prisma.CemeteryWhereInput = {
    ...(status ? { status } : { status: { not: "ARCHIVED" } }),
    AND: queryTokens(q).map((t) => ({ searchText: { contains: t } })),
  };
  const rows = await prisma.cemetery.findMany({
    where,
    orderBy: { updatedAt: "desc" },
    take: 300,
    include: { region: true, locations: { where: { isPrimary: true }, take: 1 }, _count: { select: { burials: true, citations: true } } },
  });
  return (
    <AdminPage title="المدافن" actions={can(user.role, "content.edit") ? <Link href="/admin/cemeteries/new" className="btn btn-primary">+ مدفن جديد</Link> : null}>
      {sp.deleted ? <Notice tone="success">حُذف المدفن وسُجّل الحذف في سجل التعديلات.</Notice> : null}
      <form className="mb-4 flex flex-wrap gap-2">
        <input name="q" defaultValue={q} placeholder="بحث بالاسم أو الاسم البديل أو المنطقة…" className="input max-w-sm" />
        <select name="status" defaultValue={status ?? ""} className="input !w-auto">
          <option value="">كل الحالات (عدا المؤرشف)</option>
          {Object.entries(RECORD_STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <button className="btn btn-ghost">تصفية</button>
      </form>
      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-parchment text-muted">
            <tr>
              <th className="p-3 text-start">الاسم المعتمد</th><th className="p-3 text-start">المنطقة</th><th className="p-3 text-start">الموقع</th>
              <th className="p-3 text-start">الأشخاص</th><th className="p-3 text-start">الاستشهادات</th><th className="p-3 text-start">الحالة</th><th className="p-3 text-start">آخر تعديل</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((c) => (
              <tr key={c.id} className="border-t border-line hover:bg-parchment/50">
                <td className="p-3"><Link href={`/admin/cemeteries/${c.id}`} className="font-semibold text-green hover:text-wine">{c.canonicalName}</Link>{c.localName ? <div className="text-xs text-muted">{c.localName}</div> : null}</td>
                <td className="p-3">{c.region?.name ?? "—"}</td>
                <td className="p-3">{c.locations[0]?.latitude != null ? PRECISION_LABELS[c.locations[0].precision] : <span className="text-muted">بلا إحداثيات</span>}</td>
                <td className="p-3">{c._count.burials}</td>
                <td className="p-3">{c._count.citations}</td>
                <td className="p-3"><RecordStatusBadge status={c.status} /></td>
                <td className="p-3 text-xs text-muted ltr">{c.updatedAt.toISOString().slice(0, 10)}</td>
              </tr>
            ))}
            {rows.length === 0 ? <tr><td colSpan={7} className="p-6 text-center text-muted">لا توجد سجلات. ابدأ بإضافة مدفن جديد.</td></tr> : null}
          </tbody>
        </table>
      </div>
    </AdminPage>
  );
}
