import Link from "next/link";
import { getCurrentUser } from "@/lib/auth/session";

const NAV = [
  { href: "/map", label: "الخريطة" },
  { href: "/cemeteries", label: "المدافن" },
  { href: "/people", label: "فهرس الأعلام" },
  { href: "/genealogy", label: "شجرة الأنساب" },
  { href: "/index", label: "الفهرس التاريخي" },
  { href: "/sources", label: "المصادر" },
  { href: "/methodology", label: "المنهجية" },
];

export default async function PublicLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  return (
    <>
      <header className="sticky top-0 z-[1000] bg-ink text-white shadow-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-2.5">
          <Link href="/" className="flex items-center gap-2.5">
            <span className="grid h-9 w-9 place-items-center rounded-full border border-gold text-gold font-display text-lg" aria-hidden>
              ۞
            </span>
            <span className="leading-tight">
              <span className="block font-display text-lg text-gold-light">مدافن الشمشوية</span>
              <span className="block text-[11px] text-white/60">الخريطة التاريخية — إيگيدي وضواحيها</span>
            </span>
          </Link>
          <nav className="hidden lg:flex items-center gap-1 text-sm" aria-label="القائمة الرئيسية">
            {NAV.map((n) => (
              <Link key={n.href} href={n.href} className="rounded px-2.5 py-1.5 text-white/85 hover:bg-white/10 hover:text-gold-light">
                {n.label}
              </Link>
            ))}
          </nav>
          <div className="flex items-center gap-2">
            <Link href="/search" className="rounded-full border border-gold/60 px-3 py-1 text-sm text-gold-light hover:bg-gold hover:text-ink" aria-label="البحث">
              ⌕ بحث
            </Link>
            {user ? (
              <Link href="/admin" className="hidden sm:inline text-xs text-white/70 hover:text-gold-light">لوحة الإدارة</Link>
            ) : null}
            <details className="relative lg:hidden">
              <summary className="list-none cursor-pointer rounded border border-white/20 px-2.5 py-1 text-sm" aria-label="القائمة">☰</summary>
              <nav className="absolute left-0 mt-2 w-56 rounded-lg border border-gold/30 bg-ink p-2 shadow-xl" aria-label="القائمة الرئيسية">
                {NAV.map((n) => (
                  <Link key={n.href} href={n.href} className="block rounded px-3 py-2 hover:bg-white/10">{n.label}</Link>
                ))}
                {user ? <Link href="/admin" className="block rounded px-3 py-2 text-gold-light hover:bg-white/10">لوحة الإدارة</Link> : null}
              </nav>
            </details>
          </div>
        </div>
        <div className="gold-rule" />
      </header>
      <main className="flex-1">{children}</main>
      <footer className="ornament mt-16 text-white/75">
        <div className="gold-rule" />
        <div className="mx-auto grid max-w-6xl gap-6 px-4 py-10 text-sm md:grid-cols-3">
          <div>
            <p className="font-display text-lg text-gold-light">الخريطة التاريخية لمدافن الشمشوية</p>
            <p className="mt-2">مشروع بحثي توثيقي مستدام. يعتمد أساسًا على كتاب «الحضارة الإيگيدية في ظلال المدافن الشمشوية»، مع مصادر أخرى موثّقة.</p>
          </div>
          <div>
            <p className="font-semibold text-gold-light">قاعدة المشروع</p>
            <p className="mt-2">لا تُختلق معلومة ولا اسم ولا إحداثيات. كل معلومة مرفقة بمصدرها وبحالة توثيقها، وما لم يوثّق يُعرض «غير معلوم».</p>
          </div>
          <div className="space-y-1">
            <p className="font-semibold text-gold-light">روابط</p>
            <Link href="/methodology" className="block hover:text-gold-light">منهجية التوثيق</Link>
            <Link href="/sources" className="block hover:text-gold-light">المصادر والمراجع</Link>
            <Link href="/login" className="block hover:text-gold-light">دخول المحررين</Link>
            <p className="pt-2 text-xs text-white/50">بيانات الخرائط © مساهمو OpenStreetMap</p>
          </div>
        </div>
      </footer>
    </>
  );
}
