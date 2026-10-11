import Link from "next/link";
import { prisma } from "@/lib/db";
import { requirePageUser } from "@/lib/auth/guard";
import { can } from "@/lib/auth/permissions";
import { queryTokens } from "@/lib/arabic";
import { AdminPage } from "@/components/admin";
import { SOURCE_TYPE_LABELS } from "@/lib/labels";

export const metadata = { title: "المصادر" };

export default async function AdminSources(props: PageProps<"/admin/sources">) {
  const user = await requirePageUser();
  const sp = await props.searchParams;
  const q = typeof sp.q === "string" ? sp.q : "";
  const rows = await prisma.source.findMany({
    where: { AND: queryTokens(q).map((t) => ({ searchText: { contains: t } })) },
    orderBy: [{ isPrimary: "desc" }, { title: "asc" }],
    include: { _count: { select: { citations: true, media: true } } },
  });
  return (
    <AdminPage title="المصادر والمراجع" actions={can(user.role, "content.edit") ? <Link href="/admin/sources/new" className="btn btn-primary">+ مصدر جديد</Link> : null}>
      <form className="mb-4 flex gap-2"><input name="q" defaultValue={q} placeholder="بحث بالعنوان أو المؤلف…" className="input max-w-sm" /><button className="btn btn-ghost">بحث</button></form>
      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-parchment text-muted"><tr><th className="p-3 text-start">العنوان</th><th className="p-3 text-start">المؤلف</th><th className="p-3 text-start">النوع</th><th className="p-3 text-start">السنة</th><th className="p-3 text-start">الاستشهادات</th></tr></thead>
          <tbody>
            {rows.map((s) => (
              <tr key={s.id} className="border-t border-line">
                <td className="p-3"><Link href={`/admin/sources/${s.id}`} className="font-semibold text-green hover:text-wine">{s.title}</Link>{s.isPrimary ? <span className="ms-2 rounded bg-gold/20 px-1.5 text-xs text-wine">رئيس</span> : null}</td>
                <td className="p-3">{s.author ?? "—"}</td><td className="p-3">{SOURCE_TYPE_LABELS[s.type]}</td><td className="p-3">{s.year ?? "—"}</td><td className="p-3">{s._count.citations}</td>
              </tr>
            ))}
            {rows.length === 0 ? <tr><td colSpan={5} className="p-6 text-center text-muted">لا مصادر.</td></tr> : null}
          </tbody>
        </table>
      </div>
    </AdminPage>
  );
}
