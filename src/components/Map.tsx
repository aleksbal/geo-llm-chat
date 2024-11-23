import React, { useEffect, useRef, useState } from 'react';
import { MapContainer, TileLayer, GeoJSON, useMap } from 'react-leaflet';
import { AlertCircle } from 'lucide-react';
import 'leaflet/dist/leaflet.css';
import type { FeatureCollection, Feature, GeoJsonProperties } from 'geojson';
import L from 'leaflet';

const INITIAL_VIEW = {
  center: [20, 0],
  zoom: 2,
  bounds: L.latLngBounds(
    L.latLng(-60, -170),
    L.latLng(75, 170)
  )
};

function MapResizeHandler() {
  const map = useMap();
  const containerRef = useRef<HTMLElement | null>(null);
  const debounceTimerRef = useRef<number | null>(null);

  useEffect(() => {
    if (!containerRef.current) {
      containerRef.current = document.querySelector('.leaflet-container');
    }

    if (!containerRef.current) return;

    const resizeObserver = new ResizeObserver((entries) => {
      if (debounceTimerRef.current) {
        window.clearTimeout(debounceTimerRef.current);
      }

      debounceTimerRef.current = window.setTimeout(() => {
        map.invalidateSize();
      }, 100);
    });

    resizeObserver.observe(containerRef.current);

    return () => {
      if (containerRef.current) {
        resizeObserver.unobserve(containerRef.current);
      }
      if (debounceTimerRef.current) {
        window.clearTimeout(debounceTimerRef.current);
      }
    };
  }, [map]);

  return null;
}

function MapController({ geoJsonData }: { geoJsonData: FeatureCollection | null }) {
  const map = useMap();
  const layersRef = useRef<L.GeoJSON[]>([]);
  
  useEffect(() => {
    if (!geoJsonData) {
      map.fitBounds(INITIAL_VIEW.bounds);
      return;
    }

    try {
      const newLayer = L.geoJSON(geoJsonData, {
        style: (feature) => ({
          color: '#2563eb',
          weight: 2,
          fillColor: '#3b82f6',
          fillOpacity: 0.2
        }),
        pointToLayer: (feature, latlng) => {
          return L.marker(latlng);
        },
        onEachFeature: (feature: Feature<any, GeoJsonProperties>, layer) => {
          if (feature.properties?.name || feature.properties?.description) {
            layer.bindPopup(`
              <div class="font-sans">
                <h3 class="font-semibold">${feature.properties.name || ''}</h3>
                <p>${feature.properties.description || ''}</p>
              </div>
            `);
          }
        }
      }).addTo(map);

      layersRef.current.push(newLayer);

      // Calculate bounds including all layers
      const bounds = L.latLngBounds([]);
      layersRef.current.forEach(layer => {
        bounds.extend(layer.getBounds());
      });

      // Extend bounds by a percentage to show more context
      const extendedBounds = bounds.pad(0.5); // Add 50% padding around the bounds

      // Fit bounds with more relaxed settings
      map.fitBounds(extendedBounds, { 
        padding: [50, 50],
        maxZoom: 8, // Lower maxZoom for less aggressive zooming
        animate: true,
        duration: 1.5
      });
    } catch (error) {
      console.error('Error handling GeoJSON:', error);
    }

    return () => {
      if (!geoJsonData) {
        layersRef.current.forEach(layer => layer.removeFrom(map));
        layersRef.current = [];
      }
    };
  }, [geoJsonData, map]);

  return null;
}

interface MapProps {
  geoJsonData: FeatureCollection | null;
}

export default function Map({ geoJsonData }: MapProps) {
  const [mapError, setMapError] = useState<string | null>(null);

  const handleTileError = () => {
    setMapError("Failed to load map tiles. Please check your connection.");
  };

  if (mapError) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-gray-50">
        <div className="text-center p-4">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-2" />
          <p className="text-gray-600">{mapError}</p>
        </div>
      </div>
    );
  }

  return (
    <MapContainer
      center={INITIAL_VIEW.center}
      zoom={INITIAL_VIEW.zoom}
      className="w-full h-full"
      style={{ background: '#f8fafc' }}
      minZoom={2}
      maxZoom={18}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        eventHandlers={{
          error: handleTileError
        }}
      />
      <MapController geoJsonData={geoJsonData} />
      <MapResizeHandler />
    </MapContainer>
  );
}