import Link from "next/link";
import type { CitationWithSource } from "@/services/public";
import { SOURCE_TYPE_LABELS } from "@/lib/labels";

/** Footnote-style list of every citation on the page, numbered to match the [n] markers. */
export function CitationsList({ list, fieldLabels }: { list: CitationWithSource[]; fieldLabels?: Record<string, string> }) {
  if (!list.length) {
    return <p className="text-sm text-muted">لم تُربط معلومات هذه الصفحة بمصادر بعد — تُعامل جميعها على أنها «غير متحقق منها بعد».</p>;
  }
  return (
    <ol className="space-y-3 text-sm">
      {list.map((c, i) => (
        <li key={c.id} id={`ref-${i + 1}`} className="scroll-mt-24 border-s-2 border-gold/60 ps-3">
          <span className="font-semibold text-gold">[{i + 1}]</span>{" "}
          <Link href={`/sources/${c.sourceId}`} className="link font-semibold">{c.source.title}</Link>
          {c.source.author ? <span> — {c.source.author}</span> : null}
          {c.volume ? <span>، ج {c.volume}</span> : null}
          {c.pages ? <span>، ص <span className="ltr">{c.pages}</span></span> : null}
          <span className="text-muted"> ({SOURCE_TYPE_LABELS[c.source.type]})</span>
          {fieldLabels && c.field !== "general" ? <span className="ms-2 rounded bg-parchment px-1.5 text-xs text-muted">يدعم: {fieldLabels[c.field] ?? c.field}</span> : null}
          {c.quote ? <blockquote className="mt-1 border-s border-line ps-3 font-display text-ink-soft">«{c.quote}»</blockquote> : null}
          {c.summary ? <p className="mt-1 text-ink-soft">{c.summary}</p> : null}
          {c.pageImage?.isPublic ? (
            <a href={`/api/media/${c.pageImage.id}`} target="_blank" rel="noopener" className="link text-xs">صورة الصفحة</a>
          ) : null}
        </li>
      ))}
    </ol>
  );
}
