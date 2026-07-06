"use client";

import type { City, PropertyFilter, PropertyType } from "@/lib/types";

const PROPERTY_TYPES: { value: PropertyType; label: string }[] = [
  { value: "apartment", label: "Apartment" },
  { value: "condo", label: "Condo" },
  { value: "house", label: "House" },
  { value: "townhouse", label: "Townhouse" },
];

const CITIES: City[] = ["Vancouver", "Richmond", "Burnaby", "Surrey"];

type FilterBarProps = {
  filter: PropertyFilter;
  onChange: (filter: PropertyFilter) => void;
};

function parseNumberInput(value: string): number | undefined {
  if (value === "") return undefined;
  const n = Number(value);
  return Number.isFinite(n) ? n : undefined;
}

function normalizeFilter(filter: PropertyFilter): PropertyFilter {
  return Object.fromEntries(
    Object.entries(filter).filter(([, value]) => value !== undefined)
  ) as PropertyFilter;
}

const inputClassName =
  "w-full rounded-md border border-gray-300 bg-white px-2 py-1.5 text-sm text-gray-900 focus:border-gray-500 focus:outline-none focus:ring-1 focus:ring-gray-500";

const labelClassName = "text-xs font-medium text-gray-600";

export function FilterBar({ filter, onChange }: FilterBarProps) {
  function updateNumberField(key: keyof PropertyFilter, value: string) {
    onChange(normalizeFilter({ ...filter, [key]: parseNumberInput(value) }));
  }

  function updateSelectField<K extends keyof PropertyFilter>(
    key: K,
    value: string
  ) {
    onChange(
      normalizeFilter({
        ...filter,
        [key]: value === "" ? undefined : (value as PropertyFilter[K]),
      })
    );
  }

  function resetFilters() {
    onChange({});
  }

  const hasActiveFilters = Object.values(filter).some((v) => v !== undefined);

  return (
    <div className="w-full rounded-[50px] bg-gray-100 p-4 shadow-md">
      <div className="flex flex-wrap items-end justify-center gap-3">
        <div className="flex min-w-[7rem] flex-col gap-1">
          <label htmlFor="min-rent" className={labelClassName}>
            Min rent
          </label>
          <input
            id="min-rent"
            type="number"
            min={0}
            step={100}
            placeholder="Min"
            className={inputClassName}
            value={filter.minRent ?? ""}
            onChange={(e) => updateNumberField("minRent", e.target.value)}
          />
        </div>

        <div className="flex min-w-[7rem] flex-col gap-1">
          <label htmlFor="max-rent" className={labelClassName}>
            Max rent
          </label>
          <input
            id="max-rent"
            type="number"
            min={0}
            step={100}
            placeholder="Max"
            className={inputClassName}
            value={filter.maxRent ?? ""}
            onChange={(e) => updateNumberField("maxRent", e.target.value)}
          />
        </div>

        <div className="flex min-w-[7rem] flex-col gap-1">
          <label htmlFor="bedrooms" className={labelClassName}>
            Bedrooms
          </label>
          <input
            id="bedrooms"
            type="number"
            min={0}
            step={1}
            placeholder="Any"
            className={inputClassName}
            value={filter.bedrooms ?? ""}
            onChange={(e) => updateNumberField("bedrooms", e.target.value)}
          />
        </div>

        <div className="flex min-w-[9rem] flex-col gap-1">
          <label htmlFor="property-type" className={labelClassName}>
            Property type
          </label>
          <select
            id="property-type"
            className={inputClassName}
            value={filter.propertyType ?? ""}
            onChange={(e) => updateSelectField("propertyType", e.target.value)}
          >
            <option value="">Any</option>
            {PROPERTY_TYPES.map(({ value, label }) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>

        <div className="flex min-w-[7rem] flex-col gap-1">
          <label htmlFor="min-sqft" className={labelClassName}>
            Min sq ft
          </label>
          <input
            id="min-sqft"
            type="number"
            min={0}
            step={50}
            placeholder="Min"
            className={inputClassName}
            value={filter.minSquareFeet ?? ""}
            onChange={(e) => updateNumberField("minSquareFeet", e.target.value)}
          />
        </div>

        <div className="flex min-w-[7rem] flex-col gap-1">
          <label htmlFor="max-sqft" className={labelClassName}>
            Max sq ft
          </label>
          <input
            id="max-sqft"
            type="number"
            min={0}
            step={50}
            placeholder="Max"
            className={inputClassName}
            value={filter.maxSquareFeet ?? ""}
            onChange={(e) => updateNumberField("maxSquareFeet", e.target.value)}
          />
        </div>

        <div className="flex min-w-[9rem] flex-col gap-1">
          <label htmlFor="city" className={labelClassName}>
            City
          </label>
          <select
            id="city"
            className={inputClassName}
            value={filter.city ?? ""}
            onChange={(e) => updateSelectField("city", e.target.value)}
          >
            <option value="">Any</option>
            {CITIES.map((city) => (
              <option key={city} value={city}>
                {city}
              </option>
            ))}
          </select>
        </div>

        {hasActiveFilters ? (
          <button
            type="button"
            onClick={resetFilters}
            className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
          >
            Reset
          </button>
        ) : null}
      </div>
    </div>
  );
}
