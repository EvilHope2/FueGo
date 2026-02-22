"use client";

import { useEffect, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";

mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || "";

type Point = { lat: number; lng: number };

export function MapboxMap({
  center,
  pickup,
  dropoff,
  routeGeoJson,
}: {
  center: Point;
  pickup?: Point | null;
  dropoff?: Point | null;
  routeGeoJson?: import("geojson").LineString | null;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const pickupMarkerRef = useRef<mapboxgl.Marker | null>(null);
  const dropoffMarkerRef = useRef<mapboxgl.Marker | null>(null);
  const [mapReady, setMapReady] = useState(false);

  useEffect(() => {
    if (!containerRef.current || mapRef.current || !mapboxgl.accessToken) {
      return;
    }

    mapRef.current = new mapboxgl.Map({
      container: containerRef.current,
      style: "mapbox://styles/mapbox/streets-v12",
      center: [center.lng, center.lat],
      zoom: 12,
      attributionControl: false,
    });

    mapRef.current.addControl(new mapboxgl.NavigationControl({ showCompass: false }), "top-right");
    mapRef.current.on("load", () => setMapReady(true));

    return () => {
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, [center.lat, center.lng]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;

    if (pickupMarkerRef.current) {
      pickupMarkerRef.current.remove();
      pickupMarkerRef.current = null;
    }
    if (dropoffMarkerRef.current) {
      dropoffMarkerRef.current.remove();
      dropoffMarkerRef.current = null;
    }

    if (pickup) {
      pickupMarkerRef.current = new mapboxgl.Marker({ color: "#0f766e" }).setLngLat([pickup.lng, pickup.lat]).addTo(map);
    }

    if (dropoff) {
      dropoffMarkerRef.current = new mapboxgl.Marker({ color: "#1d4ed8" }).setLngLat([dropoff.lng, dropoff.lat]).addTo(map);
    }

    const sourceId = "route-source";
    const layerId = "route-layer";

    if (map.getLayer(layerId)) {
      map.removeLayer(layerId);
    }
    if (map.getSource(sourceId)) {
      map.removeSource(sourceId);
    }

    if (routeGeoJson) {
      map.addSource(sourceId, {
        type: "geojson",
        data: {
          type: "Feature",
          geometry: routeGeoJson,
          properties: {},
        },
      });

      map.addLayer({
        id: layerId,
        type: "line",
        source: sourceId,
        layout: {
          "line-join": "round",
          "line-cap": "round",
        },
        paint: {
          "line-color": "#0f766e",
          "line-width": 5,
        },
      });
    }

    const bounds = new mapboxgl.LngLatBounds();
    let hasBounds = false;

    if (pickup) {
      bounds.extend([pickup.lng, pickup.lat]);
      hasBounds = true;
    }

    if (dropoff) {
      bounds.extend([dropoff.lng, dropoff.lat]);
      hasBounds = true;
    }

    if (routeGeoJson?.coordinates?.length) {
      for (const coord of routeGeoJson.coordinates) {
        bounds.extend([coord[0], coord[1]]);
      }
      hasBounds = true;
    }

    if (hasBounds) {
      map.fitBounds(bounds, { padding: 60, maxZoom: 14, duration: 600 });
    } else {
      map.flyTo({ center: [center.lng, center.lat], zoom: 12, duration: 600 });
    }
  }, [center.lat, center.lng, dropoff, mapReady, pickup, routeGeoJson]);

  if (!mapboxgl.accessToken) {
    return <div className="h-80 rounded-2xl bg-slate-200 p-4 text-sm text-slate-600">Configura NEXT_PUBLIC_MAPBOX_TOKEN para ver el mapa.</div>;
  }

  return <div ref={containerRef} className="h-80 w-full overflow-hidden rounded-2xl" />;
}

