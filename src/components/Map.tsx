import React, { useEffect, useRef, useState, useMemo } from 'react';
import { MapContainer, TileLayer, useMap } from 'react-leaflet';
import { AlertCircle } from 'lucide-react';
import 'leaflet/dist/leaflet.css';
import type { FeatureCollection } from 'geojson';
import L from 'leaflet';

const INITIAL_VIEW = {
  center: [20, 0] as [number, number],
  zoom: 2,
  bounds: L.latLngBounds(
    L.latLng(-60, -170),
    L.latLng(75, 170)
  )
};

function MapResizeHandler() {
  const map = useMap();
  const containerRef = useRef<HTMLElement | null>(null);
  const resizeTimerRef = useRef<number>();

  useEffect(() => {
    if (!containerRef.current) {
      containerRef.current = document.querySelector('.leaflet-container');
    }

    if (!containerRef.current) return;

    const resizeObserver = new ResizeObserver(() => {
      if (resizeTimerRef.current) {
        window.clearTimeout(resizeTimerRef.current);
      }

      resizeTimerRef.current = window.setTimeout(() => {
        map.invalidateSize();
      }, 100);
    });

    resizeObserver.observe(containerRef.current);

    return () => {
      if (containerRef.current) {
        resizeObserver.unobserve(containerRef.current);
      }
      if (resizeTimerRef.current) {
        window.clearTimeout(resizeTimerRef.current);
      }
    };
  }, [map]);

  return null;
}

const GeoJSONLayer = React.memo(({ data }: { data: FeatureCollection }) => {
  const map = useMap();
  const layerRef = useRef<L.GeoJSON | null>(null);
  const dataRef = useRef<string>(JSON.stringify(data));

  const style = useMemo(() => ({
    color: '#2563eb',
    weight: 2,
    fillColor: '#3b82f6',
    fillOpacity: 0.2
  }), []);

  useEffect(() => {
    const newDataString = JSON.stringify(data);
    if (dataRef.current === newDataString && layerRef.current) {
      return; // Data hasn't changed, skip update
    }
    dataRef.current = newDataString;

    // Clean up existing layer
    if (layerRef.current) {
      layerRef.current.remove();
      layerRef.current = null;
    }

    // Create new layer
    layerRef.current = L.geoJSON(data, {
      style,
      pointToLayer: (feature, latlng) => L.marker(latlng),
      onEachFeature: (feature, layer) => {
        if (feature.properties?.name || feature.properties?.description) {
          const popup = L.popup().setContent(`
            <div class="font-sans">
              <h3 class="font-semibold">${feature.properties.name || ''}</h3>
              <p>${feature.properties.description || ''}</p>
            </div>
          `);
          layer.bindPopup(popup);
        }
      }
    }).addTo(map);

    // Calculate and set bounds
    const bounds = layerRef.current.getBounds();
    if (bounds.isValid()) {
      const extendedBounds = bounds.pad(0.5);
      requestAnimationFrame(() => {
        map.fitBounds(extendedBounds, {
          padding: [50, 50],
          maxZoom: 8,
          animate: true,
          duration: 1.5
        });
      });
    }

    return () => {
      if (layerRef.current) {
        layerRef.current.remove();
        layerRef.current = null;
      }
    };
  }, [map, data, style]);

  return null;
});

GeoJSONLayer.displayName = 'GeoJSONLayer';

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
      {geoJsonData && <GeoJSONLayer data={geoJsonData} />}
      <MapResizeHandler />
    </MapContainer>
  );
}