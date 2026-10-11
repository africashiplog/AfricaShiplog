"use client";

import "leaflet/dist/leaflet.css";
import { useEffect, useRef, useState } from "react";
import type * as Leaflet from "leaflet";
import { loadLeaflet, createBaseMap, markerIcon } from "./leaflet";
import { FieldError } from "@/components/forms";

/**
 * Admin coordinate picker: click on the map OR type coordinates manually.
 * Writes into the `latitude`/`longitude` inputs of the surrounding form, and
 * previews the uncertainty radius when one is entered.
 */
export function LocationPicker({
  center,
  zoom,
  initial,
  others = [],
}: {
  center: [number, number];
  zoom: number;
  initial: { lat: string; lng: string; radius: string };
  others?: Array<{ lat: number; lng: number; label: string }>;
}) {
  const el = useRef<HTMLDivElement>(null);
  const mapRef = useRef<Leaflet.Map | null>(null);
  const markerRef = useRef<Leaflet.Marker | null>(null);
  const circleRef = useRef<Leaflet.Circle | null>(null);
  const LRef = useRef<typeof Leaflet | null>(null);
  const [lat, setLat] = useState(initial.lat);
  const [lng, setLng] = useState(initial.lng);
  const [radius, setRadius] = useState(initial.radius);

  useEffect(() => {
    let cancelled = false;
    loadLeaflet().then((L) => {
      if (cancelled || !el.current || mapRef.current) return;
      LRef.current = L;
      const start: [number, number] = initial.lat && initial.lng ? [Number(initial.lat), Number(initial.lng)] : center;
      const map = createBaseMap(L, el.current, start, initial.lat ? 13 : zoom);
      mapRef.current = map;
      for (const o of others) L.circleMarker([o.lat, o.lng], { radius: 5, color: "#6b6157" }).bindTooltip(o.label).addTo(map);
      map.on("click", (e: Leaflet.LeafletMouseEvent) => {
        setLat(e.latlng.lat.toFixed(6));
        setLng(e.latlng.lng.toFixed(6));
      });
      setLat((v) => v); // ensure marker effect runs after init
    });
    return () => {
      cancelled = true;
      mapRef.current?.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- create once
  }, []);

  useEffect(() => {
    const L = LRef.current, map = mapRef.current;
    if (!L || !map) return;
    const la = Number(lat), ln = Number(lng);
    const valid = lat !== "" && lng !== "" && Number.isFinite(la) && Number.isFinite(ln) && Math.abs(la) <= 90 && Math.abs(ln) <= 180;
    markerRef.current?.remove();
    circleRef.current?.remove();
    if (!valid) return;
    markerRef.current = L.marker([la, ln], { icon: markerIcon(L, "approximate"), draggable: true }).addTo(map);
    markerRef.current.on("dragend", () => {
      const p = markerRef.current!.getLatLng();
      setLat(p.lat.toFixed(6));
      setLng(p.lng.toFixed(6));
    });
    const r = Number(radius);
    if (r > 0) circleRef.current = L.circle([la, ln], { radius: r, color: "#6b1d2a", weight: 1, dashArray: "4 4", fillOpacity: 0.08 }).addTo(map);
  }, [lat, lng, radius]);

  return (
    <div className="space-y-3">
      <div ref={el} className="h-[340px] rounded-lg border border-gold/40" aria-label="انقر على الخريطة لتحديد الموقع" />
      <p className="text-xs text-muted">انقر على الخريطة لتحديد الموقع أو اسحب العلامة، أو أدخل الإحداثيات يدويًا (درجات عشرية، WGS84).</p>
      <div className="grid gap-3 sm:grid-cols-3">
        <label className="text-sm font-semibold">
          خط العرض (Latitude)
          <input name="latitude" dir="ltr" className="input mt-1" value={lat} onChange={(e) => setLat(e.target.value)} placeholder="مثال: 17.123456" inputMode="decimal" />
          <FieldError name="latitude" />
        </label>
        <label className="text-sm font-semibold">
          خط الطول (Longitude)
          <input name="longitude" dir="ltr" className="input mt-1" value={lng} onChange={(e) => setLng(e.target.value)} placeholder="مثال: -15.123456" inputMode="decimal" />
          <FieldError name="longitude" />
        </label>
        <label className="text-sm font-semibold">
          نصف قطر عدم اليقين (متر)
          <input name="radiusMeters" dir="ltr" className="input mt-1" value={radius} onChange={(e) => setRadius(e.target.value)} inputMode="numeric" />
          <FieldError name="radiusMeters" />
        </label>
      </div>
      {lat || lng ? (
        <button type="button" className="btn btn-ghost btn-sm" onClick={() => { setLat(""); setLng(""); }}>
          إزالة الإحداثيات
        </button>
      ) : null}
    </div>
  );
}
