"use client";

import { useEffect, useState } from "react";
import { PlaceResult, searchPlaces } from "@/lib/mapbox";

export default function PlacesAutocomplete({
  label,
  value,
  onChange,
  onSelect,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  onSelect: (place: PlaceResult) => void;
}) {
  const [results, setResults] = useState<PlaceResult[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const q = value.trim();
    if (q.length < 3) {
      setResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      setResults(await searchPlaces(q));
      setLoading(false);
    }, 300);

    return () => clearTimeout(timer);
  }, [value]);

  return (
    <div className="relative space-y-1">
      <label className="text-xs font-semibold uppercase text-slate-500">{label}</label>
      <input
        className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Escribi una direccion"
      />
      {loading ? <p className="text-xs text-slate-500">Buscando...</p> : null}
      {results.length > 0 ? (
        <div className="absolute z-20 w-full overflow-hidden rounded-xl border border-slate-200 bg-white shadow">
          {results.map((result, idx) => (
            <button
              key={`${result.address}-${idx}`}
              type="button"
              className="block w-full border-b border-slate-100 px-3 py-2 text-left text-sm hover:bg-slate-50"
              onClick={() => {
                onSelect(result);
                setResults([]);
              }}
            >
              {result.address}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

