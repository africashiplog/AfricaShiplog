import Link from "next/link";
import { prisma } from "@/lib/db";
import { getStats } from "@/services/public";
import { getSiteSettings } from "@/services/settings";
import { PublicMap } from "@/components/map/public-map";
import { VERIFICATION_LABELS, VERIFICATION_ORDER } from "@/lib/labels";
import { VerificationBadge } from "@/components/ui";

export default async function HomePage() {
  const [stats, settings, regions, periods, primarySources] = await Promise.all([
    getStats(),
    getSiteSettings(),
    prisma.region.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
    prisma.historicalPeriod.findMany({ orderBy: [{ sortOrder: "asc" }, { name: "asc" }], select: { id: true, name: true } }),
    prisma.source.findMany({ where: { isPrimary: true }, take: 3 }),
  ]);

  return (
    <>
      <section className="ornament text-white">
        <div className="mx-auto max-w-6xl px-4 py-12 md:py-16">
          <p className="text-sm tracking-wide text-gold-light/90">مشروع بحثي توثيقي</p>
          <h1 className="mt-2 text-3xl md:text-5xl font-bold leading-snug text-gold-light">
            الخريطة التاريخية لمدافن الشمشوية
            <span className="block text-2xl md:text-3xl text-white/90">في إيگيدي وضواحيها</span>
          </h1>
          <p className="mt-5 max-w-3xl text-white/80 text-lg">
            {settings.intro ??
              "توثيق المدافن الشمشوية والأعلام المدفونين فيها: مواقعها، وتسمياتها، وتاريخها، وتراجم أعلامها وأنسابهم — مع ربط كل معلومة بمصدرها وبيان حالة توثيقها، اعتمادًا أساسًا على كتاب «الحضارة الإيگيدية في ظلال المدافن الشمشوية»."}
          </p>
          <form action="/search" className="mt-8 flex max-w-2xl gap-2" role="search">
            <label htmlFor="home-q" className="sr-only">بحث شامل</label>
            <input
              id="home-q"
              name="q"
              className="input !py-3 !text-base"
              placeholder="ابحث عن مدفن، علَم، أسرة، منطقة، مرجع… (تُراعى اختلافات الهمزات والتشكيل)"
            />
            <button className="btn btn-gold !px-6">بحث</button>
          </form>
        </div>
        <div className="gold-rule" />
      </section>

      <section className="mx-auto max-w-6xl px-4 -mt-px">
        <dl className="grid grid-cols-2 gap-3 py-8 md:grid-cols-4">
          {[
            { label: "مدفنًا موثقًا", value: stats.cemeteries },
            { label: "علَمًا مترجَمًا", value: stats.people },
            { label: "منطقة مغطاة", value: stats.regionsWithCemeteries },
            { label: "مصدرًا ومرجعًا", value: stats.sources },
          ].map((s) => (
            <div key={s.label} className="card p-5 text-center">
              <dd className="font-display text-4xl font-bold text-wine">{s.value.toLocaleString("ar")}</dd>
              <dt className="mt-1 text-sm text-muted">{s.label}</dt>
            </div>
          ))}
        </dl>
        {stats.cemeteries === 0 ? (
          <p className="card mb-6 border-dashed p-4 text-center text-sm text-muted">
            لم يُنشر أي سجل بعد. تُضاف المدافن والأعلام من لوحة الإدارة بعد توثيقها ومراجعتها — لا تُعرض هنا بيانات تجريبية أو مختلقة.
          </p>
        ) : null}
      </section>

      <section className="mx-auto max-w-6xl px-4">
        <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
          <h2 className="text-2xl font-bold text-green">خريطة المدافن</h2>
          <Link href="/map" className="link text-sm">الخريطة الكاملة مع التصفية ←</Link>
        </div>
        <PublicMap compact center={[settings.lat, settings.lng]} zoom={settings.zoom} regions={regions} periods={periods} initial={{}} />
        <p className="mt-2 text-xs text-muted">
          {stats.located.toLocaleString("ar")} من {stats.cemeteries.toLocaleString("ar")} مدفنًا منشورًا لها إحداثيات. المواقع غير المؤكدة تُعرض بعلامات متقطعة ودوائر عدم يقين.
        </p>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-12">
        <h2 className="mb-5 text-2xl font-bold text-green">مداخل الفهارس</h2>
        <div className="grid gap-4 md:grid-cols-3">
          {[
            { href: "/index", title: "الفهرس التاريخي", text: "المدافن والأعلام مرتبةً بحسب الفترات التاريخية والمناطق والأسر.", icon: "۞" },
            { href: "/people", title: "فهرس الأعلام", text: "تراجم الأعلام المدفونين في المدافن الشمشوية، مع أنسابهم ومصادرهم.", icon: "✦" },
            { href: "/genealogy", title: "شجرة الأنساب", text: "علاقات النسب الموثقة والمنقولة شفهيًا والمختلف فيها، مع مصدر كل علاقة.", icon: "❦" },
          ].map((c) => (
            <Link key={c.href} href={c.href} className="card group p-6 transition hover:border-gold hover:shadow-md">
              <span className="text-3xl text-gold" aria-hidden>{c.icon}</span>
              <h3 className="mt-2 text-xl font-bold text-green group-hover:text-wine">{c.title}</h3>
              <p className="mt-1 text-sm text-muted">{c.text}</p>
            </Link>
          ))}
        </div>
      </section>

      <section className="bg-paper border-y border-line">
        <div className="mx-auto grid max-w-6xl gap-8 px-4 py-12 md:grid-cols-2">
          <div>
            <h2 className="text-2xl font-bold text-green">المصادر ومنهجية التوثيق</h2>
            <p className="mt-3 text-ink-soft">
              كل معلومة تاريخية — تاريخ وفاة، أو نسب، أو موقع قبر، أو علاقة أسرية — تُربط بمصدرها ورقم الجزء والصفحة. وتُعرض بجانبها حالة توثيقها:
            </p>
            <ul className="mt-4 space-y-2">
              {VERIFICATION_ORDER.map((v) => (
                <li key={v} className="flex items-center gap-2 text-sm">
                  <VerificationBadge status={v} compact /> {VERIFICATION_LABELS[v]}
                </li>
              ))}
            </ul>
            <p className="mt-3 text-xs text-muted">هذه التصنيفات وصفٌ لحالة التوثيق المتاحة، لا أحكام نهائية على صحة الرواية.</p>
            <Link href="/methodology" className="btn btn-primary mt-5">المنهجية بالتفصيل</Link>
          </div>
          <div>
            <h3 className="text-xl font-bold text-green">المصدر الرئيس</h3>
            {primarySources.length ? (
              <ul className="mt-3 space-y-3">
                {primarySources.map((s) => (
                  <li key={s.id} className="card p-4">
                    <Link href={`/sources/${s.id}`} className="font-display text-lg text-wine hover:underline">«{s.title}»</Link>
                    <p className="text-sm text-muted">{[s.author, s.publisher, s.year].filter(Boolean).join(" — ") || "بيانات النشر: لم توثّق بعد"}</p>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-3 text-sm text-muted">لم يُسجَّل المصدر الرئيس بعد.</p>
            )}
            <Link href="/sources" className="link mt-4 inline-block text-sm">جميع المصادر والمراجع ←</Link>
          </div>
        </div>
      </section>
    </>
  );
}
