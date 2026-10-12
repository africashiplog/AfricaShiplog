"use client";

import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import type { TreeEdge, TreeNode } from "@/services/public";

const W = 170, H = 64, GX = 26, GY = 70;

const EDGE_STYLE: Record<string, { stroke: string; dash?: string; label: string }> = {
  DOCUMENTED: { stroke: "#17432f", label: "موثّق بمصدر مباشر" },
  MULTI_SOURCE: { stroke: "#17432f", label: "مدعوم بأكثر من مصدر" },
  ORAL: { stroke: "#b0894b", dash: "6 4", label: "منقول شفهيًا" },
  DISPUTED: { stroke: "#6b1d2a", dash: "2 4", label: "مختلف فيه" },
  UNVERIFIED: { stroke: "#9b9184", dash: "1 5", label: "غير متحقق منه بعد" },
};

/**
 * Generational layout: the focus person is generation 0, parents -1, children +1.
 * Spouses/siblings sit on the focus row. Pan with drag, zoom with wheel/buttons.
 */
export function GenealogyTree({ focusId, nodes, edges }: { focusId: string; nodes: TreeNode[]; edges: TreeEdge[] }) {
  const layout = useMemo(() => {
    const gen = new Map<string, number>([[focusId, 0]]);
    const queue = [focusId];
    while (queue.length) {
      const id = queue.shift()!;
      const g = gen.get(id)!;
      for (const e of edges) {
        const vertical = e.type === "FATHER_OF" || e.type === "MOTHER_OF";
        let other: string | null = null, og = g;
        if (e.from === id) { other = e.to; og = vertical ? g + 1 : g; }
        else if (e.to === id) { other = e.from; og = vertical ? g - 1 : g; }
        if (other && !gen.has(other)) { gen.set(other, og); queue.push(other); }
      }
    }
    const rows = new Map<number, string[]>();
    for (const n of nodes) {
      const g = gen.get(n.id) ?? 0;
      rows.set(g, [...(rows.get(g) ?? []), n.id]);
    }
    const pos = new Map<string, { x: number; y: number }>();
    const gens = [...rows.keys()].sort((a, b) => a - b);
    const maxRow = Math.max(...[...rows.values()].map((r) => r.length), 1);
    const width = maxRow * (W + GX);
    gens.forEach((g, gi) => {
      let ids = rows.get(g)!;
      // keep the focus person in the middle of its row
      if (g === 0) {
        const others = ids.filter((id) => id !== focusId);
        const half = Math.floor(others.length / 2);
        ids = [...others.slice(0, half), focusId, ...others.slice(half)];
      }
      const rowW = ids.length * (W + GX);
      ids.forEach((id, i) => pos.set(id, { x: (width - rowW) / 2 + i * (W + GX), y: gi * (H + GY) }));
    });
    return { pos, width: Math.max(width, W + GX), height: gens.length * (H + GY) };
  }, [focusId, nodes, edges]);

  const [view, setView] = useState({ x: 0, y: 0, k: 1 });
  const drag = useRef<{ x: number; y: number } | null>(null);
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const [selected, setSelected] = useState<string | null>(null);
  const selectedEdge = edges.find((e) => e.id === selected);

  return (
    <div>
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <button type="button" className="btn btn-ghost btn-sm" onClick={() => setView((v) => ({ ...v, k: Math.min(v.k * 1.25, 3) }))} aria-label="تكبير">＋</button>
        <button type="button" className="btn btn-ghost btn-sm" onClick={() => setView((v) => ({ ...v, k: Math.max(v.k / 1.25, 0.3) }))} aria-label="تصغير">－</button>
        <button type="button" className="btn btn-ghost btn-sm" onClick={() => setView({ x: 0, y: 0, k: 1 })}>إعادة الضبط</button>
        <span className="text-xs text-muted">اسحب للتنقل، واستخدم عجلة الفأرة للتكبير. انقر على خط العلاقة لعرض مصدرها.</span>
      </div>
      <div
        className="relative h-[65vh] min-h-[420px] overflow-hidden rounded-xl border border-gold/40 bg-paper touch-none select-none cursor-grab"
        onPointerDown={(e) => { drag.current = { x: e.clientX - view.x, y: e.clientY - view.y }; (e.target as Element).setPointerCapture?.(e.pointerId); }}
        onPointerMove={(e) => { if (drag.current) setView((v) => ({ ...v, x: e.clientX - drag.current!.x, y: e.clientY - drag.current!.y })); }}
        onPointerUp={() => { drag.current = null; }}
        onWheel={(e) => { const f = e.deltaY < 0 ? 1.1 : 1 / 1.1; setView((v) => ({ ...v, k: Math.min(3, Math.max(0.3, v.k * f)) })); }}
      >
        <svg width="100%" height="100%" style={{ direction: "ltr" }} role="img" aria-label="شجرة النسب">
          <g transform={`translate(${view.x + 20},${view.y + 20}) scale(${view.k})`}>
            {edges.map((e) => {
              const a = layout.pos.get(e.from), b = layout.pos.get(e.to);
              if (!a || !b) return null;
              const s = EDGE_STYLE[e.verification];
              const vertical = e.type === "FATHER_OF" || e.type === "MOTHER_OF";
              const d = vertical
                ? `M${a.x + W / 2},${a.y + H} C${a.x + W / 2},${a.y + H + GY / 2} ${b.x + W / 2},${b.y - GY / 2} ${b.x + W / 2},${b.y}`
                : `M${a.x + W / 2},${a.y + H} Q${(a.x + b.x) / 2 + W / 2},${a.y + H + 30} ${b.x + W / 2},${b.y + H}`;
              return (
                <g key={e.id} onClick={() => setSelected(e.id)} className="cursor-pointer">
                  <path d={d} fill="none" stroke="transparent" strokeWidth={12} />
                  <path d={d} fill="none" stroke={s.stroke} strokeWidth={selected === e.id ? 3.5 : 2} strokeDasharray={s.dash} />
                </g>
              );
            })}
            {nodes.map((n) => {
              const p = layout.pos.get(n.id);
              if (!p) return null;
              const focus = n.id === focusId;
              return (
                <g key={n.id} transform={`translate(${p.x},${p.y})`}>
                  <a href={`/genealogy?person=${encodeURIComponent(n.slug)}`}>
                    <rect width={W} height={H} rx={10} fill={focus ? "#17432f" : "#fffdf7"} stroke={focus ? "#d8bd85" : n.gender === "F" ? "#6b1d2a" : "#b0894b"} strokeWidth={focus ? 2.5 : 1.5} />
                    <text x={W / 2} y={26} textAnchor="middle" direction="rtl" fontSize={14} fontWeight={700} fill={focus ? "#d8bd85" : "#15120f"}>
                      {n.name.length > 22 ? n.name.slice(0, 21) + "…" : n.name}
                    </text>
                    <text x={W / 2} y={46} textAnchor="middle" direction="rtl" fontSize={11} fill={focus ? "#ffffffcc" : "#6b6157"}>
                      {n.years ?? ""}
                    </text>
                  </a>
                </g>
              );
            })}
          </g>
        </svg>
      </div>

      <div className="mt-3 grid gap-3 md:grid-cols-2">
        <div className="card p-4 text-sm">
          <p className="mb-2 font-semibold text-green">مفتاح الخطوط (حالة توثيق العلاقة)</p>
          <ul className="space-y-1">
            {Object.entries(EDGE_STYLE).filter(([k]) => k !== "MULTI_SOURCE").map(([k, s]) => (
              <li key={k} className="flex items-center gap-2">
                <svg width="40" height="8" aria-hidden><line x1="0" y1="4" x2="40" y2="4" stroke={s.stroke} strokeWidth="2" strokeDasharray={s.dash} /></svg>
                {s.label}
              </li>
            ))}
          </ul>
        </div>
        <div className="card p-4 text-sm" aria-live="polite">
          {selectedEdge ? (
            <>
              <p className="font-semibold text-green">
                {byId.get(selectedEdge.from)?.name} ← {({ FATHER_OF: "أب لـ", MOTHER_OF: "أم لـ", SPOUSE_OF: "زوج/زوجة", SIBLING_OF: "أخ/أخت" } as const)[selectedEdge.type]} → {byId.get(selectedEdge.to)?.name}
              </p>
              <p className="mt-1">الحالة: {EDGE_STYLE[selectedEdge.verification].label}</p>
              <p className="mt-1">المصادر: {selectedEdge.sources.length ? selectedEdge.sources.join("؛ ") : "لا مصدر مسجل بعد"}</p>
            </>
          ) : (
            <p className="text-muted">انقر على أي خط لعرض نوع العلاقة ومصدرها. انقر على أي اسم لجعله محور الشجرة.</p>
          )}
          {byId.get(focusId) ? (
            <div className="mt-3 flex flex-wrap gap-2">
              <Link href={`/people/${encodeURIComponent(byId.get(focusId)!.slug)}`} className="btn btn-primary btn-sm">سيرة {byId.get(focusId)!.name}</Link>
              {byId.get(focusId)!.cemetery ? (
                <Link href={`/cemeteries/${encodeURIComponent(byId.get(focusId)!.cemetery!.slug)}`} className="btn btn-ghost btn-sm">المدفن: {byId.get(focusId)!.cemetery!.name}</Link>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
