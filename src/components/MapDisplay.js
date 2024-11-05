import React, { useImperativeHandle, forwardRef, useRef } from 'react';
import { MapContainer, TileLayer } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

const MapDisplay = forwardRef((props, ref) => {
  const mapRef = useRef();

  // Use the forwarded ref to access the map instance if needed
  useImperativeHandle(ref, () => ({
    invalidateSize: () => {
      if (mapRef.current) {
        mapRef.current.invalidateSize();
      }
    },
  }));

  return (
    <MapContainer
      center={[0, 0]}
      zoom={5}
      style={{ height: '100%', width: '100%' }}
      whenCreated={(mapInstance) => {
        mapRef.current = mapInstance;
      }}
    >
      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
    </MapContainer>
  );
});

export default MapDisplay;
