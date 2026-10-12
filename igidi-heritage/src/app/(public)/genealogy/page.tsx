import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { VISIBLE_PERSON, getGenealogy, personDisplayName } from "@/services/public";
import { EmptyState, PageHeader } from "@/components/ui";
import { GenealogyTree } from "@/components/genealogy/tree";

export const metadata: Metadata = { title: "شجرة الأنساب" };

export default async function GenealogyPage(props: PageProps<"/genealogy">) {
  const sp = await props.searchParams;
  const slug = typeof sp.person === "string" ? sp.person : null;
  // People that actually have at least one recorded kinship relation
  const candidates = await prisma.person.findMany({
    where: {
      ...VISIBLE_PERSON,
      OR: [
        { relationsFrom: { some: { type: { not: "TEACHER_OF" }, to: VISIBLE_PERSON } } },
        { relationsTo: { some: { type: { not: "TEACHER_OF" }, from: VISIBLE_PERSON } } },
      ],
    },
    select: { id: true, slug: true, fullName: true, commonName: true },
    orderBy: { commonName: "asc" },
    take: 1000,
  });
  const focus = slug ? await prisma.person.findFirst({ where: { slug, ...VISIBLE_PERSON } }) : null;
  const graph = focus ? await getGenealogy(focus.id) : null;

  return (
    <>
      <PageHeader title="شجرة الأنساب والروابط" subtitle="علاقات النسب المسجلة صراحةً مع مصدر كل علاقة وحالة توثيقها." />
      <div className="mx-auto max-w-6xl px-4 py-8">
        <form className="mb-5 flex flex-wrap items-end gap-2" action="/genealogy">
          <label className="text-sm font-semibold">
            اختر علَمًا ليكون محور الشجرة
            <select name="person" defaultValue={slug ?? ""} className="input mt-1 min-w-72">
              <option value="">— اختر —</option>
              {candidates.map((c) => <option key={c.id} value={c.slug}>{personDisplayName(c)}</option>)}
            </select>
          </label>
          <button className="btn btn-primary">عرض</button>
        </form>
        {candidates.length === 0 ? (
          <EmptyState title="لم تُسجَّل علاقات نسب منشورة بعد">تُضاف علاقات النسب من صفحة الشخص في لوحة الإدارة، ولكل علاقة مصدرها.</EmptyState>
        ) : !graph ? (
          <p className="text-sm text-muted">اختر علَمًا من القائمة أعلاه.</p>
        ) : graph.edges.length === 0 ? (
          <EmptyState title="لا علاقات نسب منشورة لهذا العلَم">
            <Link className="link" href={`/people/${encodeURIComponent(focus!.slug)}`}>العودة إلى السيرة</Link>
          </EmptyState>
        ) : (
          <GenealogyTree key={graph.focusId} focusId={graph.focusId} nodes={graph.nodes} edges={graph.edges} />
        )}
      </div>
    </>
  );
}
