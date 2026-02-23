"use client";

import { useEffect, useRef } from "react";

type Point = { lat: number; lng: number };

export default function MapboxMap({
  center,
  pickup,
  dropoff,
  driverLocation,
  routeGeoJson,
}: {
  center: Point;
  pickup?: Point | null;
  dropoff?: Point | null;
  driverLocation?: Point | null;
  routeGeoJson?: any;
}) {
  const mapRef = useRef<any>(null);
  const mapInstance = useRef<any>(null);
  const markers = useRef<any[]>([]);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      if (!mapRef.current || mapInstance.current) return;
      const mapboxgl = (await import("mapbox-gl")).default;
      mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || "";
      if (!mapboxgl.accessToken || cancelled) return;

      mapInstance.current = new mapboxgl.Map({
        container: mapRef.current,
        style: "mapbox://styles/mapbox/streets-v12",
        center: [center.lng, center.lat],
        zoom: 12,
      });
    })();

    return () => {
      cancelled = true;
      mapInstance.current?.remove();
      mapInstance.current = null;
    };
  }, [center.lat, center.lng]);

  useEffect(() => {
    (async () => {
      const map = mapInstance.current;
      if (!map) return;
      const mapboxgl = (await import("mapbox-gl")).default;

      markers.current.forEach((m) => m.remove());
      markers.current = [];

      if (pickup) markers.current.push(new mapboxgl.Marker({ color: "#0f766e" }).setLngLat([pickup.lng, pickup.lat]).addTo(map));
      if (dropoff) markers.current.push(new mapboxgl.Marker({ color: "#1d4ed8" }).setLngLat([dropoff.lng, dropoff.lat]).addTo(map));
      if (driverLocation) markers.current.push(new mapboxgl.Marker({ color: "#f59e0b" }).setLngLat([driverLocation.lng, driverLocation.lat]).addTo(map));

      if (map.getSource("route")) {
        if (map.getLayer("route")) map.removeLayer("route");
        map.removeSource("route");
      }

      if (routeGeoJson) {
        map.addSource("route", {
          type: "geojson",
          data: { type: "Feature", properties: {}, geometry: routeGeoJson },
        });
        map.addLayer({
          id: "route",
          source: "route",
          type: "line",
          paint: { "line-color": "#0f766e", "line-width": 5 },
        });
      }

      const bounds = new mapboxgl.LngLatBounds();
      let hasBounds = false;
      [pickup, dropoff, driverLocation].forEach((p) => {
        if (p) {
          bounds.extend([p.lng, p.lat]);
          hasBounds = true;
        }
      });
      if (hasBounds) map.fitBounds(bounds, { padding: 50, duration: 500, maxZoom: 14 });
    })();
  }, [pickup, dropoff, routeGeoJson, driverLocation]);

  return <div ref={mapRef} className="h-80 w-full rounded-2xl border border-slate-200" />;
}

