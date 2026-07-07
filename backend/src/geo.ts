import ngeohash from "ngeohash";

/**
 * Geohash precision used for the stored `geohash` attribute. Precision 7 gives
 * roughly 150m x 150m cells, plenty fine for street-level placement.
 */
export const GEOHASH_PRECISION = 7;

/**
 * Length of the `geohashPrefix` partition key on the geo GSI. Precision 5 gives
 * roughly 5km x 5km cells, a reasonable partition size for a metro-area data
 * set: a city-level viewport touches only a handful of prefixes.
 */
export const GEOHASH_PREFIX_LENGTH = 5;

export type BoundingBox = {
  minLat: number;
  minLng: number;
  maxLat: number;
  maxLng: number;
};

/** Encode a coordinate to the full-precision geohash stored on an item. */
export function encodeGeohash(lat: number, lng: number): string {
  return ngeohash.encode(lat, lng, GEOHASH_PRECISION);
}

/** The GSI partition key derived from a full geohash. */
export function geohashPrefix(geohash: string): string {
  return geohash.slice(0, GEOHASH_PREFIX_LENGTH);
}

/** Parse a comma-separated bbox query param into a BoundingBox.
 *  Expected wire format (from Mapbox getBounds): west,south,east,north
 *  i.e. minLng,minLat,maxLng,maxLat
 */
export function parseBoundingBox(bbox: string): BoundingBox | null {
  if(!bbox || bbox == "") return null;
  const bboxArray = bbox.split(",").map(Number);
  if (bboxArray.length !== 4 || bboxArray.some((n) => !Number.isFinite(n))) return null;
  const [minLng, minLat, maxLng, maxLat] = bboxArray;
  if (minLng > maxLng || minLat > maxLat) return null;
  return { minLng, minLat, maxLng, maxLat }; 
}

/**
 * The set of `geohashPrefix` partitions that cover a bounding box. A
 * bounding-box query should Query the geo GSI once per returned prefix, then
 * discard any items whose lat/lng falls outside the exact box.
 *
 * This is the geospatial primitive your viewport query is built on: turn the
 * map's visible bounds into prefixes, query those partitions, refine.
 */
export function boundingBoxPrefixes(box: BoundingBox): string[] {
  const cells = ngeohash.bboxes(
    box.minLat,
    box.minLng,
    box.maxLat,
    box.maxLng,
    GEOHASH_PREFIX_LENGTH
  );
  return Array.from(new Set(cells));
}

/** Whether a coordinate lies inside a bounding box (inclusive edges). */
export function isInBoundingBox(lat: number, lng: number, box: BoundingBox): boolean {
  return lat >= box.minLat && lat <= box.maxLat && lng >= box.minLng && lng <= box.maxLng;
}
