import Link from "next/link";
import { prisma } from "@/lib/db";
import { requirePageUser } from "@/lib/auth/guard";
import { AdminPage, Notice, Panel } from "@/components/admin";
import { ENTITY_LABELS, REVISION_ACTION_LABELS, RECORD_STATUS_LABELS } from "@/lib/labels";
import { personDisplayName } from "@/services/records";

export const metadata = { title: "لوحة التحكم" };

export default async function Dashboard(props: PageProps<"/admin">) {
  const user = await requirePageUser();
  const sp = await props.searchParams;
  const [cemByStatus, pplByStatus, sources, citations, inReview, recent, noLocation, noSources, unverifiedBurials] = await Promise.all([
    prisma.cemetery.groupBy({ by: ["status"], _count: true }),
    prisma.person.groupBy({ by: ["status"], _count: true }),
    prisma.source.count(),
    prisma.citation.count(),
    Promise.all([
      prisma.cemetery.findMany({ where: { status: "IN_REVIEW" }, select: { id: true, canonicalName: true }, take: 20 }),
      prisma.person.findMany({ where: { status: "IN_REVIEW" }, select: { id: true, fullName: true, commonName: true }, take: 20 }),
    ]),
    prisma.revision.findMany({ orderBy: { createdAt: "desc" }, take: 12, include: { user: { select: { name: true } } } }),
    prisma.cemetery.count({ where: { status: { not: "ARCHIVED" }, locations: { none: { latitude: { not: null } } } } }),
    prisma.person.count({ where: { status: { not: "ARCHIVED" }, citations: { none: {} } } }),
    prisma.burial.count({ where: { verification: "UNVERIFIED", citations: { none: {} } } }),
  ]);
  const count = (rows: Array<{ status: string; _count: number }>, s: string) => rows.find((r) => r.status === s)?._count ?? 0;
  return (
    <AdminPage title={`مرحبًا، ${user.name}`} actions={<><Link href="/admin/cemeteries/new" className="btn btn-primary">+ مدفن</Link><Link href="/admin/people/new" className="btn btn-gold">+ شخص</Link><Link href="/admin/sources/new" className="btn btn-ghost">+ مصدر</Link></>}>
      {sp.denied ? <Notice tone="warn">ليست لديك صلاحية لفتح تلك الصفحة.</Notice> : null}
      <div className="mb-6 grid gap-3 md:grid-cols-4">
        {[
          { label: "المدافن", rows: cemByStatus, href: "/admin/cemeteries" },
          { label: "الأشخاص", rows: pplByStatus, href: "/admin/people" },
        ].map((b) => (
          <Link key={b.label} href={b.href} className="card p-4 hover:border-gold md:col-span-1">
            <p className="text-sm text-muted">{b.label}</p>
            <p className="font-display text-3xl font-bold text-green">{b.rows.reduce((a, r) => a + r._count, 0)}</p>
            <p className="text-xs text-muted">{(["PUBLISHED", "IN_REVIEW", "DRAFT"] as const).map((s) => `${RECORD_STATUS_LABELS[s]}: ${count(b.rows, s)}`).join(" · ")}</p>
          </Link>
        ))}
        <Link href="/admin/sources" className="card p-4 hover:border-gold"><p className="text-sm text-muted">المصادر</p><p className="font-display text-3xl font-bold text-green">{sources}</p></Link>
        <div className="card p-4"><p className="text-sm text-muted">الاستشهادات</p><p className="font-display text-3xl font-bold text-green">{citations}</p></div>
      </div>
      <div className="grid gap-6 md:grid-cols-2">
        <Panel title="بانتظار المراجعة والنشر">
          <ul className="space-y-1 text-sm">
            {inReview[0].map((c) => <li key={c.id}>مدفن: <Link className="link" href={`/admin/cemeteries/${c.id}?tab=workflow`}>{c.canonicalName}</Link></li>)}
            {inReview[1].map((p) => <li key={p.id}>شخص: <Link className="link" href={`/admin/people/${p.id}?tab=workflow`}>{personDisplayName(p)}</Link></li>)}
            {inReview[0].length + inReview[1].length === 0 ? <li className="text-muted">لا شيء بانتظار المراجعة.</li> : null}
          </ul>
        </Panel>
        <Panel title="مهام التوثيق">
          <ul className="space-y-1 text-sm">
            <li>مدافن بلا إحداثيات: <strong>{noLocation}</strong></li>
            <li>أشخاص بلا أي استشهاد: <strong>{noSources}</strong></li>
            <li>علاقات دفن بلا مصدر ولا حالة توثيق: <strong>{unverifiedBurials}</strong></li>
          </ul>
        </Panel>
      </div>
      <Panel title="آخر التعديلات">
        <ul className="divide-y divide-line text-sm">
          {recent.map((r) => (
            <li key={r.id} className="py-1.5">
              <span className="font-semibold">{REVISION_ACTION_LABELS[r.action]}</span> · {ENTITY_LABELS[r.entityType] ?? r.entityType} {r.summary ? `— ${r.summary}` : ""}
              <span className="text-xs text-muted"> · {r.user?.name ?? "النظام"} · <span className="ltr">{r.createdAt.toISOString().replace("T", " ").slice(0, 16)}</span></span>
            </li>
          ))}
          {recent.length === 0 ? <li className="text-muted">لا تعديلات بعد. ابدأ بـ<Link href="/admin/guide" className="link">دليل الاستخدام</Link>.</li> : null}
        </ul>
        <Link href="/admin/revisions" className="link mt-2 inline-block text-sm">السجل الكامل ←</Link>
      </Panel>
    </AdminPage>
  );
}
