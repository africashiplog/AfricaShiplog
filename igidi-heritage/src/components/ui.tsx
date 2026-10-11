import Link from "next/link";
import type { RecordStatus, VerificationStatus } from "@prisma/client";
import { RECORD_STATUS_LABELS, VERIFICATION_LABELS, NOT_DOCUMENTED } from "@/lib/labels";

const VERIFICATION_STYLES: Record<VerificationStatus, string> = {
  DOCUMENTED: "bg-emerald-50 text-emerald-900 border-emerald-300",
  MULTI_SOURCE: "bg-green/10 text-green border-green/40",
  ORAL: "bg-amber-50 text-amber-900 border-amber-300",
  DISPUTED: "bg-wine/10 text-wine border-wine/40",
  UNVERIFIED: "bg-stone-100 text-stone-600 border-stone-300",
};

const VERIFICATION_ICONS: Record<VerificationStatus, string> = {
  DOCUMENTED: "◆",
  MULTI_SOURCE: "◆◆",
  ORAL: "◇",
  DISPUTED: "⚖",
  UNVERIFIED: "○",
};

/** Describes the state of the available documentation — never a verdict on truth. */
export function VerificationBadge({ status, compact = false }: { status: VerificationStatus; compact?: boolean }) {
  return (
    <span
      title={`حالة التوثيق: ${VERIFICATION_LABELS[status]}`}
      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium whitespace-nowrap ${VERIFICATION_STYLES[status]}`}
    >
      <span aria-hidden>{VERIFICATION_ICONS[status]}</span>
      {compact ? null : VERIFICATION_LABELS[status]}
    </span>
  );
}

const RECORD_STYLES: Record<RecordStatus, string> = {
  DRAFT: "bg-stone-100 text-stone-700",
  IN_REVIEW: "bg-amber-100 text-amber-900",
  PUBLISHED: "bg-green/15 text-green",
  ARCHIVED: "bg-wine/10 text-wine",
};

export function RecordStatusBadge({ status }: { status: RecordStatus }) {
  return <span className={`rounded px-2 py-0.5 text-xs font-semibold ${RECORD_STYLES[status]}`}>{RECORD_STATUS_LABELS[status]}</span>;
}

export function Unknown({ text = NOT_DOCUMENTED }: { text?: string }) {
  return <span className="text-muted italic">{text}</span>;
}

export function SectionTitle({ children, id, aside }: { children: React.ReactNode; id?: string; aside?: React.ReactNode }) {
  return (
    <div id={id} className="mb-4 flex flex-wrap items-end justify-between gap-2 scroll-mt-24">
      <h2 className="text-xl md:text-2xl font-bold text-green flex items-center gap-2">
        <span className="text-gold" aria-hidden>۞</span>
        {children}
      </h2>
      {aside}
    </div>
  );
}

export function Fact({
  label,
  value,
  status,
  refs,
}: {
  label: string;
  value: React.ReactNode;
  status?: VerificationStatus;
  refs?: number[];
}) {
  const empty = value === null || value === undefined || value === "";
  return (
    <div className="grid grid-cols-1 sm:grid-cols-[11rem_1fr] gap-x-4 gap-y-1 border-b border-line/70 py-2.5 last:border-0">
      <dt className="text-sm font-semibold text-muted">{label}</dt>
      <dd className="flex flex-wrap items-start gap-2">
        <span className="prose-ar">{empty ? <Unknown /> : value}</span>
        {!empty && status ? <VerificationBadge status={status} /> : null}
        {!empty && refs?.length ? <RefMarks refs={refs} /> : null}
      </dd>
    </div>
  );
}

export function RefMarks({ refs }: { refs: number[] }) {
  return (
    <span className="text-xs text-gold">
      {refs.map((n) => (
        <a key={n} href={`#ref-${n}`} className="ms-0.5 hover:text-wine">
          [{n}]
        </a>
      ))}
    </span>
  );
}

export function EmptyState({ title, children }: { title: string; children?: React.ReactNode }) {
  return (
    <div className="card border-dashed p-8 text-center">
      <p className="font-display text-lg text-green">{title}</p>
      {children ? <div className="mt-2 text-sm text-muted">{children}</div> : null}
    </div>
  );
}

export function PageHeader({ title, subtitle, crumbs }: { title: React.ReactNode; subtitle?: React.ReactNode; crumbs?: Array<{ href: string; label: string }> }) {
  return (
    <div className="ornament text-white">
      <div className="mx-auto max-w-6xl px-4 py-8 md:py-10">
        {crumbs?.length ? (
          <nav className="mb-2 text-sm text-gold-light/90" aria-label="مسار التنقل">
            {crumbs.map((c, i) => (
              <span key={c.href}>
                {i > 0 ? <span className="mx-1.5">‹</span> : null}
                <Link href={c.href} className="hover:text-white">{c.label}</Link>
              </span>
            ))}
          </nav>
        ) : null}
        <h1 className="text-3xl md:text-4xl font-bold text-gold-light">{title}</h1>
        {subtitle ? <div className="mt-2 text-white/80">{subtitle}</div> : null}
      </div>
      <div className="gold-rule" />
    </div>
  );
}

export function yearsLabel(hijri?: number | null, gregorian?: number | null, text?: string | null): string | null {
  const parts: string[] = [];
  if (text) parts.push(text);
  const nums: string[] = [];
  if (hijri) nums.push(`${hijri}هـ`);
  if (gregorian) nums.push(`${gregorian}م`);
  if (nums.length) parts.push(text ? `(${nums.join(" / ")})` : nums.join(" / "));
  return parts.length ? parts.join(" ") : null;
}
