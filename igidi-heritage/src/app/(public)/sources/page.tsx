import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { EmptyState, PageHeader } from "@/components/ui";
import { SOURCE_TYPE_LABELS } from "@/lib/labels";

export const metadata: Metadata = { title: "المصادر والمراجع" };

export default async function SourcesPage() {
  const sources = await prisma.source.findMany({ orderBy: [{ isPrimary: "desc" }, { title: "asc" }], include: { _count: { select: { citations: true } } } });
  return (
    <>
      <PageHeader title="المصادر والمراجع" subtitle="كل مصدر مع بيانات نشره وملاحظات موثوقيته وعدد المواضع التي يُستشهد به فيها." />
      <div className="mx-auto max-w-5xl px-4 py-8">
        {sources.length === 0 ? <EmptyState title="لم تُسجَّل مصادر بعد" /> : (
          <ul className="space-y-3">
            {sources.map((s) => (
              <li key={s.id} className="card p-4">
                <div className="flex flex-wrap items-center gap-2">
                  {s.isPrimary ? <span className="rounded bg-gold/20 px-2 text-xs font-semibold text-wine">المصدر الرئيس</span> : null}
                  <span className="text-xs text-muted">{SOURCE_TYPE_LABELS[s.type]}</span>
                </div>
                <Link href={`/sources/${s.id}`} className="font-display text-lg font-bold text-green hover:text-wine">{s.title}</Link>
                <p className="text-sm text-muted">{[s.author, s.editor ? `تحقيق: ${s.editor}` : null, s.publisher, s.publicationPlace, s.year].filter(Boolean).join(" — ") || "بيانات النشر: لم توثّق بعد"}</p>
                <p className="mt-1 text-xs text-muted">يُستشهد به في {s._count.citations.toLocaleString("ar")} موضعًا</p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  );
}
