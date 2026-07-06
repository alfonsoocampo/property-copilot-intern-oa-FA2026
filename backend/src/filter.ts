import type { Property, PropertyFilter } from "./types";

/**
 * Apply renter filters to a list of properties. Pure and side-effect free so it
 * is easy to unit test and reuse on either side of the wire.
 *
 * Filters compose: every provided constraint must hold for an item to pass.
 * This is the baseline filter set (rent range, minimum bedrooms, property
 * type). Extend it with additional dimensions (bathrooms, square footage,
 * keyword) as you build out filtering.
 */
export function filterProperties(properties: Property[], filter: PropertyFilter): Property[] {
  return properties.filter((property) => {
    if (filter.minRent !== undefined && property.rent < filter.minRent) {
      return false;
    }
    if (filter.maxRent !== undefined && property.rent > filter.maxRent) {
      return false;
    }
    if (filter.bedrooms !== undefined && property.bedrooms < filter.bedrooms) {
      return false;
    }
    if (filter.propertyType !== undefined && property.propertyType !== filter.propertyType) {
      return false;
    }
    if (filter.minSquareFeet !== undefined && property.squareFeet < filter.minSquareFeet) {
      return false;
    }
    if (filter.maxSquareFeet !== undefined && property.squareFeet > filter.maxSquareFeet) {
      return false;
    }
    if (filter.city !== undefined && property.city !== filter.city) {
      return false;
    }
    return true;
  });
}

/** Parse and validate raw query-string values into a PropertyFilter. */
export function parseFilter(query: Record<string, string | undefined>): PropertyFilter {
  const filter: PropertyFilter = {};

  const minRent = Number(query.minRent);
  if (query.minRent !== undefined && Number.isFinite(minRent)) {
    filter.minRent = minRent;
  }

  const maxRent = Number(query.maxRent);
  if (query.maxRent !== undefined && Number.isFinite(maxRent)) {
    filter.maxRent = maxRent;
    
  }

  const bedrooms = Number(query.bedrooms);
  if (query.bedrooms !== undefined && Number.isFinite(bedrooms)) {
    filter.bedrooms = bedrooms;
  }

  if (
    query.propertyType === "apartment" ||
    query.propertyType === "condo" ||
    query.propertyType === "house" ||
    query.propertyType === "townhouse"
  ) {
    filter.propertyType = query.propertyType;
  }

  const minSquareFeet = Number(query.minSquareFeet);
  if (query.minSquareFeet !== undefined && Number.isFinite(minSquareFeet)) {
    filter.minSquareFeet = minSquareFeet;
  }

  const maxSquareFeet = Number(query.maxSquareFeet);
  if (query.maxSquareFeet !== undefined && Number.isFinite(maxSquareFeet)) {
    filter.maxSquareFeet = maxSquareFeet;
  }

  if (
    query.city === "Vancouver" ||
    query.city === "Richmond" ||
    query.city === "Burnaby" ||
    query.city === "Surrey"
  ) {
    filter.city = query.city;
  }

  return filter;
}
