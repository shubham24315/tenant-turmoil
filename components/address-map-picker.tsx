"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { LeafletMouseEvent, Map as LeafletMap, Marker } from "leaflet";
import "leaflet/dist/leaflet.css";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BENGALURU_BBOX, bengaluruBboxCenter, isInBengaluruBbox } from "@/lib/places/photon";
import type { PlaceSuggestionMapPin } from "@/lib/places/types";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (place: PlaceSuggestionMapPin) => void;
};

const MAP_ZOOM = 15;
const MAP_ZOOM_DEFAULT = 12;

export function AddressMapPicker({ open, onOpenChange, onConfirm }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const markerRef = useRef<Marker | null>(null);
  const reverseTimerRef = useRef<number | undefined>(undefined);
  const positionRef = useRef<{ lat: number; lon: number } | null>(null);

  const [label, setLabel] = useState("");
  const [geoHint, setGeoHint] = useState<string | null>(null);
  const [reversePending, setReversePending] = useState(false);
  const [confirmError, setConfirmError] = useState<string | null>(null);

  const fetchReverse = useCallback(async (lat: number, lon: number) => {
    if (!isInBengaluruBbox(lat, lon)) return;
    setReversePending(true);
    try {
      const res = await fetch(
        `/api/places/reverse?lat=${encodeURIComponent(String(lat))}&lon=${encodeURIComponent(String(lon))}`,
      );
      if (res.ok) {
        const data = (await res.json()) as { label?: string };
        if (typeof data.label === "string" && data.label.trim().length > 0) {
          setLabel(data.label.trim());
        }
      }
    } finally {
      setReversePending(false);
    }
  }, []);

  const scheduleReverse = useCallback(
    (lat: number, lon: number) => {
      if (reverseTimerRef.current !== undefined) {
        window.clearTimeout(reverseTimerRef.current);
      }
      reverseTimerRef.current = window.setTimeout(() => {
        void fetchReverse(lat, lon);
      }, 450);
    },
    [fetchReverse],
  );

  useEffect(() => {
    if (!open) {
      if (reverseTimerRef.current !== undefined) {
        window.clearTimeout(reverseTimerRef.current);
        reverseTimerRef.current = undefined;
      }
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
        markerRef.current = null;
      }
      setGeoHint(null);
      setConfirmError(null);
      setLabel("");
      positionRef.current = null;
      return;
    }

    let cancelled = false;

    void import("leaflet").then(async (Leaflet) => {
      if (cancelled) return;
      const el = containerRef.current;
      if (!el) return;

      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
        markerRef.current = null;
      }

      const center = bengaluruBboxCenter();
      const map = Leaflet.map(el, {
        center: [center.lat, center.lon],
        zoom: MAP_ZOOM_DEFAULT,
        maxBounds: [
          [BENGALURU_BBOX.minLat - 0.05, BENGALURU_BBOX.minLon - 0.05],
          [BENGALURU_BBOX.maxLat + 0.05, BENGALURU_BBOX.maxLon + 0.05],
        ],
        maxBoundsViscosity: 1,
      });

      Leaflet.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "© OpenStreetMap contributors",
      }).addTo(map);

      const icon = Leaflet.divIcon({
        className: "address-map-marker-icon",
        iconSize: [18, 18],
        iconAnchor: [9, 9],
      });

      let lat = center.lat;
      let lon = center.lon;
      let usedGeo = false;

      if (typeof navigator !== "undefined" && navigator.geolocation) {
        try {
          const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, {
              enableHighAccuracy: true,
              maximumAge: 60_000,
              timeout: 12_000,
            });
          });
          const glat = pos.coords.latitude;
          const glon = pos.coords.longitude;
          if (isInBengaluruBbox(glat, glon)) {
            lat = glat;
            lon = glon;
            map.setView([lat, lon], MAP_ZOOM);
            usedGeo = true;
          } else {
            setGeoHint(
              "Your location is outside Bengaluru. Drag the pin to your address.",
            );
          }
        } catch {
          setGeoHint("Using map center — enable location or tap the map to place the pin.");
        }
      }

      if (cancelled) {
        map.remove();
        return;
      }

      if (!usedGeo) {
        map.setView([lat, lon], MAP_ZOOM_DEFAULT);
      }

      const marker = Leaflet.marker([lat, lon], { draggable: true, icon }).addTo(map);
      mapRef.current = map;
      markerRef.current = marker;
      positionRef.current = { lat, lon };

      void fetchReverse(lat, lon);

      marker.on("dragend", () => {
        const ll = marker.getLatLng();
        positionRef.current = { lat: ll.lat, lon: ll.lng };
        scheduleReverse(ll.lat, ll.lng);
      });

      map.on("click", (e: LeafletMouseEvent) => {
        const ll = e.latlng;
        if (!isInBengaluruBbox(ll.lat, ll.lng)) return;
        marker.setLatLng(ll);
        positionRef.current = { lat: ll.lat, lon: ll.lng };
        scheduleReverse(ll.lat, ll.lng);
      });
    });

    return () => {
      cancelled = true;
      if (reverseTimerRef.current !== undefined) {
        window.clearTimeout(reverseTimerRef.current);
        reverseTimerRef.current = undefined;
      }
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
        markerRef.current = null;
      }
    };
  }, [open, fetchReverse, scheduleReverse]);

  function handleConfirm() {
    const pos = positionRef.current;
    const trimmed = label.trim();
    if (!pos || !isInBengaluruBbox(pos.lat, pos.lon)) {
      setConfirmError("Pin must be inside Bengaluru.");
      return;
    }
    if (!trimmed) {
      setConfirmError("Add or edit the address description.");
      return;
    }
    setConfirmError(null);
    onConfirm({
      kind: "map_pin",
      label: trimmed,
      latitude: pos.lat,
      longitude: pos.lon,
      mapPinId: crypto.randomUUID(),
    });
    onOpenChange(false);
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-end justify-center sm:items-center sm:p-4">
      <button
        type="button"
        className="absolute inset-0 bg-black/50"
        aria-label="Close map"
        onClick={() => onOpenChange(false)}
      />
      <div className="relative z-10 flex max-h-[90vh] w-full max-w-lg flex-col gap-3 overflow-y-auto rounded-t-lg border border-border bg-background p-4 shadow-lg sm:rounded-lg">
        <h2 className="text-lg font-semibold">Pin your address</h2>
        {geoHint ? <p className="text-sm text-muted-foreground">{geoHint}</p> : null}
        <div
          ref={containerRef}
          className="address-map-picker min-h-[280px] w-full overflow-hidden rounded-md border"
        />
        <div className="flex flex-col gap-2">
          <Label htmlFor="map-address-label">Address as it should appear</Label>
          <Input
            id="map-address-label"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="Street, area, landmark…"
            autoComplete="off"
          />
          {reversePending ? (
            <p className="text-xs text-muted-foreground">Looking up address…</p>
          ) : null}
        </div>
        {confirmError ? (
          <p className="text-sm text-destructive" role="alert">
            {confirmError}
          </p>
        ) : null}
        <div className="flex flex-wrap gap-2 pt-1">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="button" onClick={handleConfirm}>
            Use this location
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">Map data © OpenStreetMap contributors.</p>
      </div>
    </div>
  );
}
