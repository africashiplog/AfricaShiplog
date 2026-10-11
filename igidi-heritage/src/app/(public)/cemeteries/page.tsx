import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { VISIBLE_CEMETERY, VISIBLE_PERSON } from "@/services/public";
import { EmptyState, PageHeader } from "@/components/ui";
import { PRECISION_LABELS } from "@/lib/labels";

export const metadata: Metadata = { title: "المدافن" };

export default async function CemeteriesPage() {
  const rows = await prisma.cemetery.findMany({
    where: VISIBLE_CEMETERY,
    orderBy: { canonicalName: "asc" },
    include: {
      region: true,
      locations: { where: { isPrimary: true }, take: 1 },
      _count: { select: { burials: { where: { person: VISIBLE_PERSON } } } },
    },
  });
  return (
    <>
      <PageHeader title="المدافن" subtitle={`${rows.length.toLocaleString("ar")} مدفنًا منشورًا`} />
      <div className="mx-auto max-w-6xl px-4 py-8">
        {rows.length === 0 ? (
          <EmptyState title="لا توجد مدافن منشورة بعد">تُضاف المدافن من لوحة الإدارة بعد توثيقها ومراجعتها.</EmptyState>
        ) : (
          <ul className="grid gap-4 md:grid-cols-2">
            {rows.map((c) => (
              <li key={c.id} className="card p-5">
                <Link href={`/cemeteries/${encodeURIComponent(c.slug)}`} className="font-display text-xl font-bold text-green hover:text-wine">{c.canonicalName}</Link>
                {c.localName ? <p className="text-sm text-muted">{c.localName}</p> : null}
                <p className="mt-2 text-sm">{[c.region?.name, c.locality].filter(Boolean).join(" — ") || "المنطقة: لم توثّق بعد"}</p>
                {c.summary ? <p className="mt-2 text-sm text-ink-soft line-clamp-3">{c.summary}</p> : null}
                <p className="mt-3 text-xs text-muted">
                  الأعلام: {c._count.burials.toLocaleString("ar")} · الموقع: {c.locations[0]?.latitude != null ? PRECISION_LABELS[c.locations[0].precision] : "لم يُحدَّد بعد"}
                </p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  );
}
