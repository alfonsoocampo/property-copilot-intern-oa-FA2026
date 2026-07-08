import { describe, expect, test } from "vitest";
import {
  GEOHASH_PREFIX_LENGTH,
  boundingBoxPrefixes,
  encodeGeohash,
  geohashPrefix,
  isInBoundingBox,
  parseBoundingBox,
  type BoundingBox
} from "../backend/src/geo";

// A box covering roughly downtown Vancouver.
const VANCOUVER_BOX: BoundingBox = {
  minLat: 49.26,
  minLng: -123.14,
  maxLat: 49.3,
  maxLng: -123.1
};

describe("geo", () => {
  test("encodeGeohash is deterministic and prefix is the right length", () => {
    const hash = encodeGeohash(49.2827, -123.1207);
    expect(hash).toBe(encodeGeohash(49.2827, -123.1207));
    expect(geohashPrefix(hash)).toHaveLength(GEOHASH_PREFIX_LENGTH);
    expect(hash.startsWith(geohashPrefix(hash))).toBe(true);
  });

  test("nearby points share a geohash prefix; far points do not", () => {
    const vancouver = geohashPrefix(encodeGeohash(49.2827, -123.1207));
    const nearby = geohashPrefix(encodeGeohash(49.2835, -123.1215));
    const surrey = geohashPrefix(encodeGeohash(49.1913, -122.849));
    expect(nearby).toBe(vancouver);
    expect(surrey).not.toBe(vancouver);
  });

  test("boundingBoxPrefixes covers the box and is de-duplicated", () => {
    const prefixes = boundingBoxPrefixes(VANCOUVER_BOX);
    expect(prefixes.length).toBeGreaterThan(0);
    expect(new Set(prefixes).size).toBe(prefixes.length);
    // A point inside the box must fall in one of the returned prefixes.
    const inside = geohashPrefix(encodeGeohash(49.28, -123.12));
    expect(prefixes).toContain(inside);
  });

  test("isInBoundingBox respects edges", () => {
    expect(isInBoundingBox(49.28, -123.12, VANCOUVER_BOX)).toBe(true);
    expect(isInBoundingBox(49.19, -122.85, VANCOUVER_BOX)).toBe(false);
  });

  test("geohashPrefix truncates to prefix length even for short inputs", () => {
    expect(geohashPrefix("abc")).toBe("abc");
    const full = encodeGeohash(49.2827, -123.1207);
    expect(geohashPrefix(full)).toHaveLength(GEOHASH_PREFIX_LENGTH);
    expect(full.startsWith(geohashPrefix(full))).toBe(true);
  });

  test("parseBoundingBox accepts Mapbox wire format and rejects invalid input", () => {
    expect(parseBoundingBox("-123.14,49.26,-123.1,49.3")).toEqual(VANCOUVER_BOX);
    expect(parseBoundingBox("")).toBeNull();
    expect(parseBoundingBox("1,2,3")).toBeNull();
    expect(parseBoundingBox("a,b,c,d")).toBeNull();
    expect(parseBoundingBox("NaN,49.26,-123.1,49.3")).toBeNull();
    expect(parseBoundingBox("-123.1,49.26,-123.14,49.3")).toBeNull(); // minLng > maxLng
    expect(parseBoundingBox("-123.14,49.3,-123.1,49.26")).toBeNull(); // minLat > maxLat
  });

  test("isInBoundingBox is inclusive on all four edges", () => {
    const { minLat, minLng, maxLat, maxLng } = VANCOUVER_BOX;
    expect(isInBoundingBox(minLat, minLng, VANCOUVER_BOX)).toBe(true);
    expect(isInBoundingBox(maxLat, maxLng, VANCOUVER_BOX)).toBe(true);
    expect(isInBoundingBox(minLat, maxLng, VANCOUVER_BOX)).toBe(true);
    expect(isInBoundingBox(maxLat, minLng, VANCOUVER_BOX)).toBe(true);
  });

  test("isInBoundingBox rejects points just outside each edge", () => {
    const { minLat, minLng, maxLat, maxLng } = VANCOUVER_BOX;
    const insideLat = (minLat + maxLat) / 2;
    const insideLng = (minLng + maxLng) / 2;
    expect(isInBoundingBox(minLat - 0.001, insideLng, VANCOUVER_BOX)).toBe(false);
    expect(isInBoundingBox(maxLat + 0.001, insideLng, VANCOUVER_BOX)).toBe(false);
    expect(isInBoundingBox(insideLat, minLng - 0.001, VANCOUVER_BOX)).toBe(false);
    expect(isInBoundingBox(insideLat, maxLng + 0.001, VANCOUVER_BOX)).toBe(false);
  });

  test("isInBoundingBox treats a degenerate point box as a single coordinate", () => {
    const point: BoundingBox = { minLat: 49.28, minLng: -123.12, maxLat: 49.28, maxLng: -123.12 };
    expect(isInBoundingBox(49.28, -123.12, point)).toBe(true);
    expect(isInBoundingBox(49.28, -123.11, point)).toBe(false);
  });

  test("boundingBoxPrefixes covers corners and a degenerate point box", () => {
    const prefixes = boundingBoxPrefixes(VANCOUVER_BOX);
    const corners = [
      geohashPrefix(encodeGeohash(VANCOUVER_BOX.minLat, VANCOUVER_BOX.minLng)),
      geohashPrefix(encodeGeohash(VANCOUVER_BOX.maxLat, VANCOUVER_BOX.maxLng))
    ];
    for (const corner of corners) {
      expect(prefixes).toContain(corner);
    }

    const point: BoundingBox = { minLat: 49.28, minLng: -123.12, maxLat: 49.28, maxLng: -123.12 };
    const pointPrefixes = boundingBoxPrefixes(point);
    expect(pointPrefixes).toContain(geohashPrefix(encodeGeohash(49.28, -123.12)));
    expect(new Set(pointPrefixes).size).toBe(pointPrefixes.length);
  });
});
