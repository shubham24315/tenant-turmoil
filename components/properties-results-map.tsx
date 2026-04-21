"use client";

import { useEffect, useRef } from "react";
import type { Map as LeafletMap, Marker } from "leaflet";
import "leaflet/dist/leaflet.css";
import type { PropertyListItem } from "@/lib/data/properties";
import {
  BENGALURU_BBOX,
  bengaluruBboxCenter,
  isInBengaluruBbox,
} from "@/lib/places/photon";
import { escapeHtml } from "@/lib/html-escape";

type Props = {
  items: PropertyListItem[];
  className?: string;
};

function markerRatingClass(avg: number | null | undefined): string {
  if (avg == null || Number.isNaN(Number(avg))) return "properties-map-marker--none";
  const r = Math.round(Number(avg));
  if (r <= 1) return "properties-map-marker--1";
  if (r === 2) return "properties-map-marker--2";
  if (r === 3) return "properties-map-marker--3";
  if (r === 4) return "properties-map-marker--4";
  return "properties-map-marker--5";
}

function ratingLabel(avg: number | null | undefined): string {
  if (avg == null || Number.isNaN(Number(avg))) return "No ratings yet";
  return `${Number(avg).toFixed(1)} avg`;
}

export function PropertiesResultsMap({ items, className }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const markersRef = useRef<Marker[]>([]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    let cancelled = false;

    void import("leaflet").then((Leaflet) => {
      if (cancelled) return;

      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
      markersRef.current.forEach((m) => {
        m.remove();
      });
      markersRef.current = [];

      const center = bengaluruBboxCenter();
      const map = Leaflet.map(el, {
        center: [center.lat, center.lon],
        zoom: 12,
        maxBounds: [
          [BENGALURU_BBOX.minLat - 0.05, BENGALURU_BBOX.minLon - 0.05],
          [BENGALURU_BBOX.maxLat + 0.05, BENGALURU_BBOX.maxLon + 0.05],
        ],
        maxBoundsViscosity: 1,
      });

      Leaflet.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "© OpenStreetMap contributors",
      }).addTo(map);

      mapRef.current = map;

      const withCoords = items.filter(
        (p) =>
          p.latitude != null &&
          p.longitude != null &&
          isInBengaluruBbox(p.latitude, p.longitude),
      );

      const latLngs: [number, number][] = [];

      for (const p of withCoords) {
        const lat = p.latitude as number;
        const lon = p.longitude as number;
        latLngs.push([lat, lon]);

        const icon = Leaflet.divIcon({
          className: `properties-map-marker-icon ${markerRatingClass(p.stats?.avg_rating ?? null)}`,
          iconSize: [18, 18],
          iconAnchor: [9, 9],
        });

        const marker = Leaflet.marker([lat, lon], { icon }).addTo(map);
        markersRef.current.push(marker);

        const addr = escapeHtml(p.address);
        const label = escapeHtml(ratingLabel(p.stats?.avg_rating));
        const path = `/properties/${encodeURIComponent(p.id)}`;
        marker.bindPopup(
          `<div class="properties-map-popup"><div class="properties-map-popup-title">${addr}</div><div class="properties-map-popup-meta">${label}</div><a class="properties-map-popup-link" href="${path}">View listing</a></div>`,
        );
      }

      if (latLngs.length >= 2) {
        map.fitBounds(latLngs, { padding: [36, 36], maxZoom: 16 });
      } else if (latLngs.length === 1) {
        map.setView(latLngs[0], 15);
      } else {
        map.setView([center.lat, center.lon], 12);
      }
    });

    return () => {
      cancelled = true;
      markersRef.current.forEach((m) => {
        m.remove();
      });
      markersRef.current = [];
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [items]);

  return (
    <div
      ref={containerRef}
      className={
        className ??
        "properties-results-map min-h-[min(50vh,420px)] w-full overflow-hidden rounded-lg border border-border"
      }
    />
  );
}
