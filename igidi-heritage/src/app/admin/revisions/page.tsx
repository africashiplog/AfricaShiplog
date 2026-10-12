import Link from "next/link";
import { prisma } from "@/lib/db";
import { requirePageUser } from "@/lib/auth/guard";
import { can } from "@/lib/auth/permissions";
import { AdminPage } from "@/components/admin";
import { RevisionList } from "@/components/admin/panels";
import { ENTITY_LABELS } from "@/lib/labels";

export const metadata = { title: "سجل التعديلات" };

export default async function RevisionsPage(props: PageProps<"/admin/revisions">) {
  const user = await requirePageUser();
  const sp = await props.searchParams;
  const page = Math.max(1, Number(typeof sp.page === "string" ? sp.page : "1") || 1);
  const type = typeof sp.type === "string" ? sp.type : undefined;
  const userId = typeof sp.user === "string" ? sp.user : undefined;
  const where = { ...(type ? { entityType: type } : {}), ...(userId ? { userId } : {}) };
  const [rows, total, types, users] = await Promise.all([
    prisma.revision.findMany({ where, orderBy: { createdAt: "desc" }, skip: (page - 1) * 50, take: 50, include: { user: { select: { name: true } } } }),
    prisma.revision.count({ where }),
    prisma.revision.findMany({ distinct: ["entityType"], select: { entityType: true } }),
    prisma.user.findMany({ select: { id: true, name: true } }),
  ]);
  const qs = (p: number) => `?${new URLSearchParams({ ...(type ? { type } : {}), ...(userId ? { user: userId } : {}), page: String(p) })}`;
  return (
    <AdminPage title="سجل التعديلات والمراجعات">
      <form className="mb-4 flex flex-wrap gap-2">
        <select name="type" defaultValue={type ?? ""} className="input !w-auto"><option value="">كل الأنواع</option>{types.map((t) => <option key={t.entityType} value={t.entityType}>{ENTITY_LABELS[t.entityType] ?? t.entityType}</option>)}</select>
        <select name="user" defaultValue={userId ?? ""} className="input !w-auto"><option value="">كل المحررين</option>{users.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}</select>
        <button className="btn btn-ghost">تصفية</button>
      </form>
      <RevisionList revisions={rows} canRestore={can(user.role, "content.publish")} />
      <div className="mt-4 flex items-center gap-3 text-sm">
        {page > 1 ? <Link href={qs(page - 1)} className="link">← الأحدث</Link> : null}
        <span className="text-muted">صفحة {page} من {Math.max(1, Math.ceil(total / 50))} ({total} تعديل)</span>
        {page * 50 < total ? <Link href={qs(page + 1)} className="link">الأقدم →</Link> : null}
      </div>
    </AdminPage>
  );
}
