"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useRef, useState } from "react";
import { fetchProperties } from "@/lib/api";
import type { Property, PropertyFilter } from "@/lib/types";
import { PropertyCard } from "@/components/PropertyCard";
import { FilterBar } from "@/components/FilterBar";

const MapPanel = dynamic(
  () => import("@/components/MapPanel").then((mod) => mod.MapPanel),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full min-h-[300px] w-full items-center justify-center rounded-lg border border-gray-200 bg-gray-50 text-sm text-gray-500">
        Loading map…
      </div>
    ),
  }
);

type LoadState = "loading" | "error" | "ready";
const DEFAULT_BBOX: [number, number, number, number] = [
  -123.03235772141238,  // west  (minLng)
  49.20165770721414,    // south (minLat)
  -122.92932870873227,  // east  (maxLng)
  49.29656880316119,    // north (maxLat)
];
function bboxToQuery(bbox: [number, number, number, number]): string {
  return bbox.join(",");
}
export default function BrowsePage() {
  const [properties, setProperties] = useState<Property[]>([]);
  const [state, setState] = useState<LoadState>("loading");
  const [error, setError] = useState("");
  const [activeId, setActiveId] = useState<string | null>(null);
  const [shouldPan, setShouldPan] = useState(false);
  const [filter, setFilter] = useState<PropertyFilter>({});
  const [bbox, setBbox] = useState<[number, number, number, number]>(DEFAULT_BBOX);
  const [hasLoaded, setHasLoaded] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasLoadedRef = useRef(false);

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (!hasLoadedRef.current) {
        setState("loading");
      }
      try {
        const data = await fetchProperties(filter, bboxToQuery(bbox));
        if (!cancelled) {
          setProperties(data);
          hasLoadedRef.current = true;
          setHasLoaded(true);
          setState("ready");
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load listings");
          setState("error");
        }
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [filter, bbox]);

  function selectFromMap(id: string) {
    setShouldPan(false);
    setActiveId(id);
    document.getElementById(`property-card-${id}`)?.scrollIntoView({
      behavior: "smooth",
      block: "center",   // or "nearest" for minimal scroll
    });
  }

  function selectFromCard(id: string) {
    setShouldPan(true);
    setActiveId(id);
  }

  function handleBboxChange(next: [number, number, number, number]) {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setBbox(next), 300);
  }

  const handlePanComplete = useCallback(() => setShouldPan(false), []);
  return (
    <section className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">Browse rentals</h1>
        <p className="text-sm text-gray-600">
          Metro Vancouver listings. Filters and the map are yours to build.
        </p>
      </div>

      <FilterBar filter={filter} onChange={setFilter} />

      {state === "loading" && !hasLoaded ? (
        <p className="text-sm text-gray-600">Loading listings…</p>
      ) : null}

      {state === "error" && !hasLoaded ? (
        <p className="text-sm text-red-700">Could not load listings: {error}</p>
      ) : null}

      {hasLoaded ? (
        <div className="grid gap-4 lg:grid-cols-[1fr_1.2fr]">
          <div className="space-y-3">
            {properties.length === 0 ? (
              <p className="text-sm text-gray-600">No listings match your search.</p>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {properties.map((property) => (
                  <PropertyCard
                    key={property.id}
                    property={property}
                    active={property.id === activeId}
                    onSelect={selectFromCard}
                  />
                ))}
              </div>
            )}
          </div>

          <div className="lg:sticky lg:top-4 lg:h-[calc(100vh-6rem)]">
            <MapPanel
              properties={properties}
              activeId={activeId}
              onSelect={selectFromMap}
              shouldPan={shouldPan}
              onPanComplete={handlePanComplete}
              filterCity={filter.city}
              bboxOnChange={handleBboxChange}
            />
          </div>
        </div>
      ) : null}
    </section>
  );
}
