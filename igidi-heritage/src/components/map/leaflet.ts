"use client";

import type * as Leaflet from "leaflet";

export type L = typeof Leaflet;

let loader: Promise<L> | null = null;

/** Loads Leaflet only in the browser (it touches `window` at import time). */
export function loadLeaflet(): Promise<L> {
  loader ??= import("leaflet").then((m) => (m.default ?? m) as L);
  return loader;
}

export function createBaseMap(L: L, el: HTMLElement, center: [number, number], zoom: number) {
  const map = L.map(el, { zoomControl: true, attributionControl: true, scrollWheelZoom: true }).setView(center, zoom);
  L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
  }).addTo(map);
  L.control.scale({ imperial: false }).addTo(map);
  return map;
}

/** Marker styling encodes how certain the location is — never shown as confirmed without support. */
export function markerIcon(L: L, kind: "confirmed" | "approximate" | "area") {
  return L.divIcon({
    className: "",
    html: `<div class="igidi-marker ${kind}"></div>`,
    iconSize: [26, 26],
    iconAnchor: [13, 26],
    popupAnchor: [0, -24],
  });
}

export function escapeHtml(s: string | null | undefined): string {
  return (s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}
