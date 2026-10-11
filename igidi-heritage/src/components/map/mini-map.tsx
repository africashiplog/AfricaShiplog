"use client";

import "leaflet/dist/leaflet.css";
import { useEffect, useRef } from "react";
import { loadLeaflet, createBaseMap, markerIcon } from "./leaflet";

export interface MiniLocation {
  lat: number;
  lng: number;
  confirmed: boolean;
  precision: string;
  radiusMeters: number | null;
  label: string;
}

export function MiniMap({ locations, height = 280 }: { locations: MiniLocation[]; height?: number }) {
  const el = useRef<HTMLDivElement>(null);
  useEffect(() => {
    let map: import("leaflet").Map | null = null;
    let cancelled = false;
    loadLeaflet().then((L) => {
      if (cancelled || !el.current || !locations.length) return;
      const first = locations[0];
      map = createBaseMap(L, el.current, [first.lat, first.lng], first.confirmed ? 14 : 11);
      const pts: [number, number][] = [];
      for (const l of locations) {
        const p: [number, number] = [l.lat, l.lng];
        pts.push(p);
        if (!l.confirmed && l.radiusMeters) L.circle(p, { radius: l.radiusMeters, color: "#6b1d2a", weight: 1, dashArray: "4 4", fillOpacity: 0.08 }).addTo(map);
        const kind = l.confirmed ? "confirmed" : l.precision === "AREA" ? "area" : "approximate";
        L.marker(p, { icon: markerIcon(L, kind), title: l.label }).bindTooltip(l.label).addTo(map);
      }
      if (pts.length > 1) map.fitBounds(L.latLngBounds(pts).pad(0.4));
    });
    return () => {
      cancelled = true;
      map?.remove();
    };
  }, [locations]);
  return <div ref={el} style={{ height }} className="rounded-xl border border-gold/40" role="img" aria-label="خريطة موقع المدفن" />;
}
