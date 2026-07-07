import { describe, expect, test } from "vitest";
import { filterProperties, parseFilter } from "../backend/src/filter";
import { SEED_PROPERTIES } from "../backend/src/seed-data";
import type { Property } from "../backend/src/types";

// Seed data lacks geo attributes; tests here do not need them.
const PROPERTIES = SEED_PROPERTIES as Property[];

describe("filterProperties", () => {
  test("rent range is inclusive on both ends", () => {
    const result = filterProperties(PROPERTIES, { minRent: 2000, maxRent: 3000 });
    expect(result.length).toBeGreaterThan(0);
    for (const p of result) {
      expect(p.rent).toBeGreaterThanOrEqual(2000);
      expect(p.rent).toBeLessThanOrEqual(3000);
    }
  });

  test("rent max filter shows properties with rent less than or equal to the max rent", () => {
    const result = filterProperties(PROPERTIES, { maxRent: 3000 });
    expect(result.length).toBeGreaterThan(0);
    for (const p of result) {
      expect(p.rent).toBeLessThanOrEqual(3000);
    }
  });

  test("rent min filter shows properties with rent greater than or equal to the min rent", () => {
    const result = filterProperties(PROPERTIES, { minRent: 2000 });
    expect(result.length).toBeGreaterThan(0);
    for (const p of result) {
      expect(p.rent).toBeGreaterThanOrEqual(2000);
    }
  });

  test("rent min square footage filter shows properties with square footage greater than or equal to the min square footage", () => {
    const result = filterProperties(PROPERTIES, { minSquareFeet: 1000 });
    expect(result.length).toBeGreaterThan(0);
    for (const p of result) {
      expect(p.squareFeet).toBeGreaterThanOrEqual(1000);
    }
  });

  test("rent max square footage filter shows properties with square footage less than or equal to the max square footage", () => {
    const result = filterProperties(PROPERTIES, { maxSquareFeet: 1500 });
    expect(result.length).toBeGreaterThan(0);
    for (const p of result) {
      expect(p.squareFeet).toBeLessThanOrEqual(1500);
    }
  });

  test("square footage range is inclusive on both ends", () => {
    const result = filterProperties(PROPERTIES, { minSquareFeet: 900, maxSquareFeet: 1200 });
    expect(result.length).toBeGreaterThan(0);
    for (const p of result) {
      expect(p.squareFeet).toBeGreaterThanOrEqual(900);
      expect(p.squareFeet).toBeLessThanOrEqual(1200);
    }
  });

  test("bedrooms filter is a minimum", () => {
    const result = filterProperties(PROPERTIES, { bedrooms: 3 });
    expect(result.every((p) => p.bedrooms >= 3)).toBe(true);
  });

  test("property type matches exactly", () => {
    const result = filterProperties(PROPERTIES, { propertyType: "condo" });
    expect(result.length).toBeGreaterThan(0);
    expect(result.every((p) => p.propertyType === "condo")).toBe(true);
  });

  test("filters compose: combining rent and bedrooms narrows the result", () => {
    const rentOnly = filterProperties(PROPERTIES, { maxRent: 3000 });
    const both = filterProperties(PROPERTIES, { maxRent: 3000, bedrooms: 2 });
    expect(both.length).toBeLessThanOrEqual(rentOnly.length);
    expect(both.every((p) => p.rent <= 3000 && p.bedrooms >= 2)).toBe(true);
  });

  test("no filters returns everything", () => {
    expect(filterProperties(PROPERTIES, {})).toHaveLength(PROPERTIES.length);
  });

  test("empty input returns an empty array", () => {
    expect(filterProperties([], { maxRent: 3000 })).toEqual([]);
    expect(filterProperties([], {})).toEqual([]);
  });

  test("restrictive filters with no matches return an empty array", () => {
    expect(filterProperties(PROPERTIES, { minRent: 999_999 })).toEqual([]);
    expect(filterProperties(PROPERTIES, { minRent: 5000, maxRent: 1000 })).toEqual([]);
  });

  test("square footage range is inclusive on both ends", () => {
    const result = filterProperties(PROPERTIES, { minSquareFeet: 900, maxSquareFeet: 1200 });
    expect(result.length).toBeGreaterThan(0);
    for (const p of result) {
      expect(p.squareFeet).toBeGreaterThanOrEqual(900);
      expect(p.squareFeet).toBeLessThanOrEqual(1200);
    }
  });

  test("city matches exactly", () => {
    const result = filterProperties(PROPERTIES, { city: "Vancouver" });
    expect(result.length).toBeGreaterThan(0);
    expect(result.every((p) => p.city === "Vancouver")).toBe(true);
  });
});

describe("parseFilter", () => {
  test("parses valid query params", () => {
    expect(
      parseFilter({ minRent: "1500", maxRent: "3000", bedrooms: "2", propertyType: "house" })
    ).toEqual({ minRent: 1500, maxRent: 3000, bedrooms: 2, propertyType: "house" });
  });

  test("ignores invalid property type and absent fields", () => {
    expect(parseFilter({ propertyType: "castle" })).toEqual({});
    expect(parseFilter({})).toEqual({});
  });

  test("parses square footage and city query params", () => {
    expect(
      parseFilter({
        minSquareFeet: "800",
        maxSquareFeet: "1500",
        city: "Burnaby",
      })
    ).toEqual({ minSquareFeet: 800, maxSquareFeet: 1500, city: "Burnaby" });
  });

  test("drops non-finite numeric query params", () => {
    expect(parseFilter({ minRent: "abc" })).toEqual({});
    expect(parseFilter({ maxRent: "Infinity" })).toEqual({});
    expect(parseFilter({ bedrooms: "NaN" })).toEqual({});
    expect(parseFilter({ minSquareFeet: "oops", maxSquareFeet: "nope" })).toEqual({});
  });

  test("keeps valid fields when others are invalid", () => {
    expect(
      parseFilter({
        minRent: "2000",
        maxRent: "oops",
        bedrooms: "2",
        propertyType: "castle",
        minSquareFeet: "800",
        maxSquareFeet: "nope",
        city: "vancouver",
      })
    ).toEqual({ minRent: 2000, bedrooms: 2, minSquareFeet: 800 });
  });
});
