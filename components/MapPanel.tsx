"use client";

import type { City, Property } from "@/lib/types";
import mapboxgl from "mapbox-gl";
import { useEffect, useRef } from "react";
import { CITY_CENTERS } from "@/lib/cityCenters";
type MapPanelProps = {
  properties: Property[];
  filterCity?: City | null;
  activeId?: string | null;
  shouldPan?: boolean;
  onSelect?: (id: string) => void;
  bboxOnChange?: (bbox: [number, number, number, number]) => void;
  onPanComplete?: () => void;
};


/**
 * PLACEHOLDER — this is where the map goes, and it is the core of the OA.
 *
 * Replace this component with a real, performant map (Google Maps, Mapbox, or
 * OpenStreetMap/Leaflet — your call, justify it in REPORT.md) that:
 *   - renders a marker for every property at its lat/lng,
 *   - stays smooth with all markers visible (clustering or viewport rendering),
 *   - selects a listing when its marker is clicked, and stays in sync with the
 *     list (the `activeId` / `onSelect` props are wired for you), and
 *   - ideally drives a server-side viewport query as the map pans/zooms.
 *
 * The props you need are already threaded through from the browse page.
 */

function formatRentLabel(rent: number): string {
  return `$${rent.toLocaleString("en-CA")}`;
}

// Helper function to convert the properties to a GeoJSON feature collection
function toFeatureCollection(properties: Property[]): GeoJSON.FeatureCollection {
  return {
    type: "FeatureCollection",
    features: properties.map((p) => ({
      type: "Feature",
      geometry: {
        type: "Point",
        coordinates: [p.lng, p.lat], // Mapbox order: [lng, lat]
      },
      properties:{
        id: p.id,
        title: p.title,
        rent: p.rent,
        rentLabel: formatRentLabel(p.rent),
      },
    })),
  };
}

function initLayers(map: mapboxgl.Map) {
   // Cluster layer
   map.addLayer({
    id: "property-clusters",
    type: "circle",
    source: "properties",
    filter: ["has", "point_count"],
    paint: { 
      "circle-radius": ["step", ["get", "point_count"], 20,
      5, 28, 
      10, 32],
      "circle-color": "#93c5fd",
      "circle-opacity": 0.7,
      "circle-stroke-width": 2,
      "circle-stroke-color": "#126DFF",
    },
  });

  // Cluster count layer
  map.addLayer({
    id: "property-cluster-count",
    type: "symbol",
    source: "properties",
    filter: ["has", "point_count"],
    layout: {
      "text-field": ["get", "point_count_abbreviated"],
      "text-font": ["DIN Offc Pro Medium", "Arial Unicode MS Bold"],
      "text-size": 12,
    },
    paint: {
      "text-color": "#1e3a5f",
    },
  });

  // Point layer
  map.addLayer({
    id: "property-points",
    type: "circle",
    source: "properties",
    filter: ["!", ["has", "point_count"]],
    paint: {
      "circle-radius": 8,
      "circle-color": "#2563eb",
      "circle-stroke-width": 2,
      "circle-stroke-color": "#fff",
    },
  });

  map.addLayer({
    id: "property-point-labels",
    type: "symbol",
    source: "properties",
    filter: ["!", ["has", "point_count"]],
    layout: {
      "text-field": ["get", "rentLabel"],
      "text-font": ["DIN Offc Pro Medium", "Arial Unicode MS Bold"],
      "text-size": 11,
      "text-offset": [0, -0.9],
      "text-anchor": "bottom",
      "text-allow-overlap": false,
      "text-ignore-placement": true,
    },
    paint: {
      "text-color": "#1e3a5f",
      "text-halo-color": "#ffffff",
      "text-halo-width": 1.5,
    },
  });
}

function getPopupContent(property: Property) {
  const description = property.description;
  const rent = property.rent;
  const title = property.title;
  const bedrooms = property.bedrooms;
  const bathrooms = property.bathrooms;
  const propertyType = property.propertyType;
  const squareFeet = property.squareFeet;
  const street = property.street;
  const city = property.city;
  const province = property.province;
  const postalCode = property.postalCode;
  return `
    <div>
       <h1 className="text-2xl font-bold">${title}</h1>
          <p>${description}</p>
          <p>$${rent} a month</p>
          <p>${bedrooms} bedrooms, ${bathrooms} bathrooms</p>
          <p>Property Type: ${propertyType.toUpperCase()}</p>
          <p>${squareFeet} square feet</p>
          <p>${street}, ${city}, <br>${province} ${postalCode}</p>
    </div>`
}

export function MapPanel({ properties, activeId, onSelect, shouldPan, filterCity, bboxOnChange, onPanComplete }: MapPanelProps) {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const propertiesRef = useRef(properties);
  propertiesRef.current = properties;
  const bboxOnChangeRef = useRef(bboxOnChange);
  bboxOnChangeRef.current = bboxOnChange;

  useEffect(() => {
    const token = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN;
    if (!token || !mapContainerRef.current) return;
    mapboxgl.accessToken = token;

    function reportBounds(map: mapboxgl.Map) {
      const bounds = map.getBounds();
      if (!bounds || !bboxOnChangeRef.current) return;
      bboxOnChangeRef.current([
        bounds.getWest(),
        bounds.getSouth(),
        bounds.getEast(),
        bounds.getNorth(),
      ]);
    }

    const map = new mapboxgl.Map({
      container: mapContainerRef.current,
      style: "mapbox://styles/mapbox/streets-v12",
      center: [-122.9805, 49.2488],
      zoom: 12,
    });

    // Disable the map interactions - 2D map
    map.dragRotate.disable();
    map.touchZoomRotate.disableRotation();
    map.setPitch(0);
    map.setBearing(0);
  
    // Load the map and add the layers
    map.on("load", () => {
      const featureCollection = toFeatureCollection(propertiesRef.current);
      map.addSource("properties", {
        type: "geojson",
        data: featureCollection,
        cluster: true,
        clusterMaxZoom: 50,
        clusterRadius: 24,
      });
    
      initLayers(map);
      reportBounds(map);
    });

    map.on("moveend", () => {
      reportBounds(map);
    });

    // Mouse Handlers
    const popup = new mapboxgl.Popup({
      closeOnClick: false
    });

    function showPopup(property: Property) {
      popup
        .setLngLat([property.lng, property.lat])
        .setHTML(getPopupContent(property))
        .addTo(map);
    }

    map.addInteraction('property-points-click-interaction', {
      type: 'click',
      target: {layerId: 'property-points'},
      handler: (e) => {
        const feature = e.feature;
        const id = feature?.properties?.id as string;
        if (id) onSelect?.(id);
        activeId = id;
      }
    });

    map.addInteraction('property-clusters-click-interaction', {
      type: 'click',
      target: {layerId: 'property-clusters'},
      handler: (e) => {
        const feature = e.feature;
        const clusterId = feature?.properties?.cluster_id as number;
        if (clusterId == null) return;
        const source = map.getSource("properties") as mapboxgl.GeoJSONSource;
        if (!source) return;
        source.getClusterExpansionZoom(clusterId, (err, zoom) => {
          if (err || zoom == null) return;
          map.easeTo({
            center: (feature?.geometry as GeoJSON.Point).coordinates as [number, number],
            zoom,
          });
        });
      }
    });

    map.addInteraction('property-points-mouseenter-interaction',{
      type: 'mouseenter',
      target: {layerId: 'property-points'},
      handler: (e) => {
        map.getCanvas().style.cursor = 'pointer';
        // Copy the coordinates from the POI underneath the cursor
        const property = propertiesRef.current.find((p) => p.id === e.feature?.properties.id);
        if (!property) return;
        showPopup(property);
    }
    })
    
    map.addInteraction('places-mouseleave-interaction', {
      type: 'mouseleave',
      target: { layerId: 'property-points' },
      handler: () => {
          map.getCanvas().style.cursor = '';
          popup.remove();
      }
    });
    
    mapRef.current = map;
    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    const source = map?.getSource("properties") as mapboxgl.GeoJSONSource | undefined;
    if (source) {
      source.setData(toFeatureCollection(properties));
    }
  }, [properties]);

  // Active point style
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.getLayer("property-points")) return;
    const applyActiveStyle = () => {
      map.setPaintProperty("property-points", "circle-color", [
        "case",
        ["==", ["get", "id"], activeId ?? ""],
        "#ef4444",  // red — active
        "#2563eb",  // blue — default
      ]);
      map.setPaintProperty("property-points", "circle-radius", [
        "case",
        ["==", ["get", "id"], activeId ?? ""],
        12,  // bigger when active
        8,
      ]);
      map.setPaintProperty("property-points", "circle-stroke-width", [
        "case",
        ["==", ["get", "id"], activeId ?? ""],
        3,
        2,
      ]);
    };
    if (map.isStyleLoaded()) {
      applyActiveStyle();
    } else {
      map.once("load", applyActiveStyle);
    }
  }, [activeId]);

  // Pan to the active property only when the user selects from the list.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !activeId || !shouldPan) return;

    const property = propertiesRef.current.find((p) => p.id === activeId);
    if (!property) return;

    map.easeTo({
      center: [property.lng, property.lat],
      zoom: Math.max(map.getZoom(), 12.5),
      duration: 800,
    });
    onPanComplete?.();
  }, [activeId, shouldPan, onPanComplete]);
  
  // Pan to the filter city
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !filterCity) return;
    const center = CITY_CENTERS[filterCity];
    map.easeTo({
      center,
      zoom: 12,
      duration: 800,
    });
  }, [filterCity]);
  return (
    <div className="relative h-full min-h-[300px] w-full overflow-hidden rounded-lg border border-gray-200 bg-white">
      <div ref={mapContainerRef} className="absolute inset-0" />
    </div>
  );
}
