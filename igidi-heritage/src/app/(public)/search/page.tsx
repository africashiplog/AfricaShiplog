import type { Metadata } from "next";
import Link from "next/link";
import { search, SEARCH_KIND_LABELS, type SearchKind } from "@/services/search";
import { PageHeader } from "@/components/ui";

export const metadata: Metadata = { title: "البحث" };

const KINDS = Object.keys(SEARCH_KIND_LABELS) as SearchKind[];

export default async function SearchPage(props: PageProps<"/search">) {
  const sp = await props.searchParams;
  const q = typeof sp.q === "string" ? sp.q.slice(0, 200) : "";
  const kind = typeof sp.type === "string" && KINDS.includes(sp.type as SearchKind) ? (sp.type as SearchKind) : null;
  const all = q ? await search(q, { publicOnly: true, limit: 40 }) : [];
  const hits = kind ? all.filter((h) => h.kind === kind) : all;
  const counts = KINDS.map((k) => [k, all.filter((h) => h.kind === k).length] as const);

  return (
    <>
      <PageHeader title="البحث الشامل" subtitle="في أسماء المدافن والأعلام وألقابهم، والأسر، والمناطق، والمراجع، والفترات، والأسماء البديلة." />
      <div className="mx-auto max-w-4xl px-4 py-8">
        <form className="flex gap-2" role="search">
          <label htmlFor="q" className="sr-only">كلمات البحث</label>
          <input id="q" name="q" defaultValue={q} className="input !py-3" placeholder="مثال: اسم علَم أو مدفن أو منطقة…" autoFocus />
          {kind ? <input type="hidden" name="type" value={kind} /> : null}
          <button className="btn btn-primary !px-6">بحث</button>
        </form>
        <p className="mt-2 text-xs text-muted">يتجاهل البحث التشكيل واختلاف الهمزات (أ/إ/آ/ا) والياء والألف المقصورة والتاء المربوطة، ويطابق «گ» مع «ك».</p>
        {q ? (
          <>
            <nav className="mt-6 flex flex-wrap gap-2 text-sm" aria-label="تصفية النتائج">
              <Link href={`/search?q=${encodeURIComponent(q)}`} className={`rounded-full border px-3 py-1 ${!kind ? "border-green bg-green text-white" : "border-line"}`}>الكل ({all.length})</Link>
              {counts.filter(([, n]) => n > 0).map(([k, n]) => (
                <Link key={k} href={`/search?q=${encodeURIComponent(q)}&type=${k}`} className={`rounded-full border px-3 py-1 ${kind === k ? "border-green bg-green text-white" : "border-line"}`}>
                  {SEARCH_KIND_LABELS[k]} ({n})
                </Link>
              ))}
            </nav>
            {hits.length === 0 ? (
              <p className="mt-8 text-center text-muted">لا نتائج منشورة مطابقة لـ «{q}».</p>
            ) : (
              <ul className="mt-6 space-y-2">
                {hits.map((h) => (
                  <li key={`${h.kind}-${h.id}`} className="card p-4">
                    <span className="me-2 rounded bg-parchment px-2 py-0.5 text-xs text-muted">{SEARCH_KIND_LABELS[h.kind]}</span>
                    <Link href={h.href} className="font-semibold text-green hover:text-wine">{h.title}</Link>
                    {h.subtitle ? <p className="mt-1 text-sm text-muted">{h.subtitle}</p> : null}
                  </li>
                ))}
              </ul>
            )}
          </>
        ) : null}
      </div>
    </>
  );
}
