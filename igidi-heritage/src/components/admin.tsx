import Link from "next/link";

export function AdminPage({ title, actions, children, crumbs }: { title: React.ReactNode; actions?: React.ReactNode; children: React.ReactNode; crumbs?: Array<{ href: string; label: string }> }) {
  return (
    <div className="mx-auto max-w-6xl p-4 md:p-8">
      {crumbs?.length ? (
        <nav className="mb-1 text-sm text-muted">
          {crumbs.map((c, i) => (
            <span key={c.href}>{i ? " ‹ " : ""}<Link href={c.href} className="hover:text-wine">{c.label}</Link></span>
          ))}
        </nav>
      ) : null}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl md:text-3xl font-bold text-green">{title}</h1>
        {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
      </div>
      {children}
    </div>
  );
}

export function Panel({ title, children, description, id }: { title: string; children: React.ReactNode; description?: React.ReactNode; id?: string }) {
  return (
    <section id={id} className="card mb-6 p-5 scroll-mt-6">
      <h2 className="text-lg font-bold text-green">{title}</h2>
      {description ? <p className="mt-1 text-sm text-muted">{description}</p> : null}
      <div className="mt-4">{children}</div>
    </section>
  );
}

export function Tabs({ base, current, tabs }: { base: string; current: string; tabs: Array<{ key: string; label: string; count?: number }> }) {
  return (
    <nav className="mb-6 flex gap-1 overflow-x-auto border-b border-line" aria-label="أقسام السجل">
      {tabs.map((t) => (
        <Link
          key={t.key}
          href={`${base}?tab=${t.key}`}
          className={`whitespace-nowrap rounded-t-lg border border-b-0 px-3 py-2 text-sm ${current === t.key ? "border-line bg-paper font-semibold text-wine" : "border-transparent text-muted hover:text-green"}`}
        >
          {t.label}{t.count != null ? <span className="ms-1 text-xs text-muted">({t.count})</span> : null}
        </Link>
      ))}
    </nav>
  );
}

export function Notice({ tone = "info", children }: { tone?: "info" | "success" | "warn"; children: React.ReactNode }) {
  const cls = tone === "success" ? "border-green/40 bg-green/5 text-green" : tone === "warn" ? "border-amber-300 bg-amber-50 text-amber-900" : "border-line bg-paper text-ink-soft";
  return <div className={`mb-4 rounded-lg border p-3 text-sm ${cls}`}>{children}</div>;
}
