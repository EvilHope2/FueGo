"use client";

import { useEffect, useMemo, useState } from "react";
import { searchPlaces, type PlaceResult } from "@/lib/mapbox";
import { type PlacePoint } from "@/lib/types";

function extractStreetNumber(value: string) {
  const match = value.match(/\b\d{1,5}\b/);
  return match?.[0] || "";
}

function buildAddressLabel(streetName: string, streetNumber: string) {
  return `${streetName} ${streetNumber}`.trim();
}

export default function PlacesAutocomplete({
  label,
  proximity,
  onResolved,
}: {
  label: string;
  proximity?: { lat: number; lng: number } | null;
  onResolved: (place: PlacePoint | null) => void;
}) {
  const [streetQuery, setStreetQuery] = useState("");
  const [streetNumber, setStreetNumber] = useState("");
  const [streetSelection, setStreetSelection] = useState<PlaceResult | null>(null);
  const [results, setResults] = useState<PlaceResult[]>([]);
  const [exactMatch, setExactMatch] = useState<PlaceResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [isResolvingExact, setIsResolvingExact] = useState(false);

  useEffect(() => {
    const q = streetQuery.trim();
    if (q.length < 3 || (streetSelection && q === streetSelection.address)) {
      setResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      setResults(await searchPlaces(q, { proximity }));
      setLoading(false);
    }, 280);

    return () => clearTimeout(timer);
  }, [proximity, streetQuery, streetSelection]);

  useEffect(() => {
    const selection = streetSelection;
    const number = streetNumber.trim();
    if (!selection || !number) {
      setExactMatch(null);
      onResolved(null);
      return;
    }

    const composedQuery = `${selection.text} ${number}, Rio Grande, Tierra del Fuego, Argentina`;
    const timer = setTimeout(async () => {
      setIsResolvingExact(true);
      try {
        const exactCandidates = await searchPlaces(composedQuery, { proximity });
        const exact = exactCandidates.find((x) => x.isExactAddress) || null;
        setExactMatch(exact);

        if (exact) {
          onResolved({
            address: exact.address,
            lat: exact.lat,
            lng: exact.lng,
            streetName: selection.text,
            streetNumber: number,
            isApproximate: false,
            mapboxFeatureType: "address",
          });
          return;
        }

        onResolved({
          address: buildAddressLabel(selection.text, number),
          lat: selection.lat,
          lng: selection.lng,
          streetName: selection.text,
          streetNumber: number,
          isApproximate: selection.placeType !== "address",
          mapboxFeatureType: selection.placeType,
        });
      } finally {
        setIsResolvingExact(false);
      }
    }, 350);

    return () => clearTimeout(timer);
  }, [onResolved, proximity, streetNumber, streetSelection]);

  const status = useMemo(() => {
    if (!streetSelection) return null;
    if (!streetNumber.trim()) return { text: "Ingresa la altura (ej. 295)", tone: "warn" as const };
    if (isResolvingExact) return { text: "Validando altura exacta...", tone: "info" as const };
    if (exactMatch) return { text: "Direccion exacta encontrada", tone: "ok" as const };
    return { text: `Ubicacion aproximada, altura manual: ${streetNumber.trim()}`, tone: "warn" as const };
  }, [exactMatch, isResolvingExact, streetNumber, streetSelection]);

  return (
    <div className="relative space-y-2">
      <label className="text-xs font-semibold uppercase text-slate-500">{label}</label>

      <input
        className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
        value={streetQuery}
        onChange={(e) => {
          setStreetQuery(e.target.value);
          setStreetSelection(null);
          setExactMatch(null);
          onResolved(null);
        }}
        placeholder="Calle (ej. Shelknam)"
      />

      {results.length > 0 ? (
        <div className="absolute z-20 mt-10 w-full overflow-hidden rounded-xl border border-slate-200 bg-white shadow">
          {results.map((result, idx) => (
            <button
              key={`${result.address}-${idx}`}
              type="button"
              className="block w-full border-b border-slate-100 px-3 py-2 text-left text-sm hover:bg-slate-50"
              onClick={() => {
                setStreetSelection(result);
                setStreetQuery(result.address);
                setResults([]);
                if (!streetNumber && result.isExactAddress) {
                  const inferred = extractStreetNumber(result.address);
                  if (inferred) setStreetNumber(inferred);
                }
              }}
            >
              <div className="flex items-center justify-between">
                <span>{result.address}</span>
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${result.isExactAddress ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>
                  {result.isExactAddress ? "address" : "street"}
                </span>
              </div>
            </button>
          ))}
        </div>
      ) : null}

      <input
        className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
        value={streetNumber}
        onChange={(e) => setStreetNumber(e.target.value.replace(/[^\d]/g, ""))}
        placeholder="Numero / altura (ej. 295)"
      />

      {loading ? <p className="text-xs text-slate-500">Buscando calle...</p> : null}
      {status ? (
        <p className={`rounded-lg px-3 py-2 text-xs ${status.tone === "ok" ? "bg-emerald-50 text-emerald-700" : status.tone === "warn" ? "bg-amber-50 text-amber-700" : "bg-sky-50 text-sky-700"}`}>
          {status.text}
        </p>
      ) : null}
    </div>
  );
}
