"use client";

import "leaflet/dist/leaflet.css";
import { useEffect, useRef, useState, useCallback } from "react";
import Link from "next/link";
import type * as Leaflet from "leaflet";
import { loadLeaflet, createBaseMap, markerIcon, escapeHtml } from "./leaflet";
import type { MapFeature } from "@/services/public";

const PRECISION_AR: Record<string, string> = { EXACT: "دقيق", APPROXIMATE: "تقريبي", AREA: "المنطقة العامة فقط", UNKNOWN: "غير معلوم" };
const VERIF_AR: Record<string, string> = {
  DOCUMENTED: "موثقة بمصدر مباشر", MULTI_SOURCE: "مدعومة بأكثر من مصدر", ORAL: "منقولة عن رواية شفوية",
  DISPUTED: "مختلف فيها", UNVERIFIED: "غير متحقق منها بعد",
};

interface Option { id: string; name: string }

export function PublicMap({
  center,
  zoom,
  regions,
  periods,
  initial,
  compact = false,
}: {
  center: [number, number];
  zoom: number;
  regions: Option[];
  periods: Option[];
  initial: { q?: string; region?: string; period?: string; precision?: string; verification?: string };
  compact?: boolean;
}) {
  const el = useRef<HTMLDivElement>(null);
  const mapRef = useRef<Leaflet.Map | null>(null);
  const layerRef = useRef<Leaflet.LayerGroup | null>(null);
  const LRef = useRef<typeof Leaflet | null>(null);
  const [filters, setFilters] = useState({
    q: initial.q ?? "", region: initial.region ?? "", period: initial.period ?? "",
    precision: initial.precision ?? "", verification: initial.verification ?? "",
  });
  const [features, setFeatures] = useState<MapFeature[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Init map once
  useEffect(() => {
    let cancelled = false;
    loadLeaflet().then((L) => {
      if (cancelled || !el.current || mapRef.current) return;
      LRef.current = L;
      mapRef.current = createBaseMap(L, el.current, center, zoom);
      layerRef.current = L.layerGroup().addTo(mapRef.current);
      setFeatures((f) => (f ? [...f] : f)); // trigger a draw if data already arrived
    });
    return () => {
      cancelled = true;
      mapRef.current?.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- map is created once; center/zoom are initial values
  }, []);

  // Fetch features when filters change (debounced for the text box)
  useEffect(() => {
    const ctrl = new AbortController();
    const t = setTimeout(() => {
      const params = new URLSearchParams(Object.entries(filters).filter(([, v]) => v));
      fetch(`/api/public/map?${params}`, { signal: ctrl.signal })
        .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
        .then((d: { features: MapFeature[] }) => {
          setFeatures(d.features);
          setError(null);
        })
        .catch((e) => {
          if (e.name !== "AbortError") setError("تعذّر تحميل بيانات الخريطة");
        });
      if (!compact) window.history.replaceState(null, "", params.toString() ? `/map?${params}` : "/map");
    }, 300);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [filters, compact]);

  const draw = useCallback(() => {
    const L = LRef.current, map = mapRef.current, layer = layerRef.current;
    if (!L || !map || !layer || !features) return;
    layer.clearLayers();
    const bounds: Leaflet.LatLngExpression[] = [];
    for (const f of features) {
      if (f.lat == null || f.lng == null) continue;
      const kind = f.confirmed ? "confirmed" : f.precision === "AREA" ? "area" : "approximate";
      const latlng: [number, number] = [f.lat, f.lng];
      bounds.push(latlng);
      if (!f.confirmed && f.radiusMeters) {
        L.circle(latlng, { radius: f.radiusMeters, color: "#6b1d2a", weight: 1, dashArray: "4 4", fillOpacity: 0.06 }).addTo(layer);
      }
      const html = `
        <div style="min-width:200px">
          <strong style="font-size:15px;color:#17432f">${escapeHtml(f.name)}</strong>
          ${f.localName ? `<div style="color:#6b6157">${escapeHtml(f.localName)}</div>` : ""}
          ${f.region ? `<div>المنطقة: ${escapeHtml(f.region)}</div>` : ""}
          ${f.summary ? `<p style="margin:6px 0">${escapeHtml(f.summary.slice(0, 220))}${f.summary.length > 220 ? "…" : ""}</p>` : ""}
          <div style="font-size:12px;margin-top:4px">
            دقة الموقع: <b>${PRECISION_AR[f.precision]}</b>${f.radiusMeters && !f.confirmed ? ` (± ${f.radiusMeters} م)` : ""}<br/>
            توثيق الموقع: ${VERIF_AR[f.verification]}${f.confirmed ? " ✓" : ""}<br/>
            الأعلام الموثقون: ${f.peopleCount}
          </div>
          <a href="/cemeteries/${encodeURIComponent(f.slug)}" style="display:inline-block;margin-top:8px;color:#6b1d2a;font-weight:600">صفحة المدفن الكاملة ←</a>
        </div>`;
      L.marker(latlng, { icon: markerIcon(L, kind), title: f.name }).bindPopup(html).addTo(layer);
    }
    if (bounds.length) map.fitBounds(L.latLngBounds(bounds).pad(0.3), { maxZoom: 13 });
  }, [features]);

  useEffect(draw, [draw]);

  const unlocated = features?.filter((f) => f.lat == null) ?? [];
  const set = (k: keyof typeof filters) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setFilters((f) => ({ ...f, [k]: e.target.value }));

  return (
    <div className={compact ? "" : "grid gap-4 lg:grid-cols-[18rem_1fr]"}>
      {!compact ? (
        <aside className="card p-4 space-y-3 h-fit" aria-label="تصفية المدافن">
          <div>
            <label className="text-sm font-semibold" htmlFor="map-q">بحث</label>
            <input id="map-q" className="input mt-1" placeholder="اسم مدفن، منطقة، أو شخصية…" value={filters.q} onChange={set("q")} />
          </div>
          <div>
            <label className="text-sm font-semibold" htmlFor="map-region">المنطقة</label>
            <select id="map-region" className="input mt-1" value={filters.region} onChange={set("region")}>
              <option value="">كل المناطق</option>
              {regions.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
            </select>
          </div>
          <div>
            <label className="text-sm font-semibold" htmlFor="map-period">الفترة التاريخية</label>
            <select id="map-period" className="input mt-1" value={filters.period} onChange={set("period")}>
              <option value="">كل الفترات</option>
              {periods.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
            </select>
          </div>
          <div>
            <label className="text-sm font-semibold" htmlFor="map-precision">دقة الموقع</label>
            <select id="map-precision" className="input mt-1" value={filters.precision} onChange={set("precision")}>
              <option value="">الكل</option>
              <option value="CONFIRMED">موقع مؤكد (دقيق وموثق)</option>
              <option value="EXACT">دقيق</option>
              <option value="APPROXIMATE">تقريبي</option>
              <option value="AREA">المنطقة العامة فقط</option>
              <option value="UNKNOWN">غير محدد بعد</option>
            </select>
          </div>
          <div>
            <label className="text-sm font-semibold" htmlFor="map-verif">حالة توثيق الموقع</label>
            <select id="map-verif" className="input mt-1" value={filters.verification} onChange={set("verification")}>
              <option value="">الكل</option>
              {Object.entries(VERIF_AR).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
          <button type="button" className="btn btn-ghost btn-sm w-full" onClick={() => setFilters({ q: "", region: "", period: "", precision: "", verification: "" })}>
            مسح عوامل التصفية
          </button>
          <Legend />
        </aside>
      ) : null}

      <div>
        <div className="relative overflow-hidden rounded-xl border border-gold/40 shadow-sm">
          <div ref={el} className={compact ? "h-[340px] md:h-[420px]" : "h-[60vh] min-h-[380px]"} role="application" aria-label="خريطة المدافن" />
          {features && features.length === 0 ? (
            <div className="pointer-events-none absolute inset-x-0 top-3 mx-auto w-fit rounded-full bg-ink/85 px-4 py-1.5 text-sm text-gold-light z-[500]">
              لا توجد مدافن منشورة مطابقة بعد
            </div>
          ) : null}
        </div>
        {error ? <p className="mt-2 text-sm text-wine">{error}</p> : null}
        {compact ? <Legend inline /> : null}
        {!compact && features ? (
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <div className="card p-4">
              <p className="font-semibold text-green">النتائج ({features.length})</p>
              <ul className="mt-2 max-h-72 overflow-auto divide-y divide-line text-sm">
                {features.map((f) => (
                  <li key={f.id} className="py-1.5 flex justify-between gap-2">
                    <Link className="link" href={`/cemeteries/${encodeURIComponent(f.slug)}`}>{f.name}</Link>
                    <span className="text-muted text-xs">{f.lat == null ? "بلا إحداثيات" : PRECISION_AR[f.precision]}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="card p-4">
              <p className="font-semibold text-green">مدافن لم تُحدَّد مواقعها بعد ({unlocated.length})</p>
              <p className="text-xs text-muted">لا تُعرض على الخريطة حتى تتوفر إحداثيات — ولا تُخترع.</p>
              <ul className="mt-2 max-h-60 overflow-auto text-sm">
                {unlocated.map((f) => (
                  <li key={f.id}><Link className="link" href={`/cemeteries/${encodeURIComponent(f.slug)}`}>{f.name}</Link></li>
                ))}
              </ul>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function Legend({ inline = false }: { inline?: boolean }) {
  return (
    <div className={`text-xs text-muted ${inline ? "mt-2 flex flex-wrap gap-4" : "space-y-1.5 border-t border-line pt-3"}`}>
      <span className="flex items-center gap-2"><span className="inline-block h-3 w-3 rounded-full bg-green border border-gold-light" /> موقع مؤكد (دقيق وموثق)</span>
      <span className="flex items-center gap-2"><span className="inline-block h-3 w-3 rounded-full bg-wine border border-dashed border-gold-light" /> موقع تقريبي أو غير متحقق (مع دائرة عدم اليقين)</span>
      <span className="flex items-center gap-2"><span className="inline-block h-3 w-3 rounded-full bg-[#8a7a62]" /> المنطقة العامة فقط</span>
    </div>
  );
}
