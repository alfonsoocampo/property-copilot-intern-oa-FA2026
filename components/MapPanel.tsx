"use client";

import type { Property } from "@/lib/types";
import mapboxgl from "mapbox-gl";
import { useEffect, useRef } from "react";

type MapPanelProps = {
  properties: Property[];
  activeId?: string | null;
  onSelect?: (id: string) => void;
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

export function MapPanel({ properties, activeId, onSelect }: MapPanelProps) {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);

  useEffect(() => {
    const token = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN;
    if (!token || !mapContainerRef.current) return;
    mapboxgl.accessToken = token;

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
      const featureCollection = toFeatureCollection(properties);
      map.addSource("properties", {
        type: "geojson",
        data: featureCollection,
        cluster: true,
        clusterMaxZoom: 50,
        clusterRadius: 24,
      });

      initLayers(map);
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
        const property = properties.find((p) => p.id === e.feature?.properties.id);
        if (!property) return;
        showPopup(property);
    }
    })
    
    map.addInteraction('places-mouseleave-interaction', {
      type: 'mouseleave',
      target: { layerId: 'property-points' },
      handler: (e) => {
          map.getCanvas().style.cursor = '';
          const id = e.feature?.properties.id as string;      
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
    if (!map) return;
    const source = map.getSource("properties") as mapboxgl.GeoJSONSource | undefined;
    if (!source) return;
    source.setData(toFeatureCollection(properties));
  }, [properties]);


  return (
    <div className="relative h-full min-h-[300px] w-full overflow-hidden rounded-lg border border-gray-200 bg-white">
      <div ref={mapContainerRef} className="absolute inset-0" />
    </div>
  );
}
