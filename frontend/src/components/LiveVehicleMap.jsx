'use client';

import { useEffect } from 'react';
import { CircleMarker, MapContainer, Popup, TileLayer, useMap } from 'react-leaflet';

function RecenterMap({ position }) {
  const map = useMap();

  useEffect(() => {
    map.setView(position, map.getZoom(), { animate: true });
  }, [map, position]);

  return null;
}

export default function LiveVehicleMap({ telemetry }) {
  const position = telemetry?.latitude != null && telemetry?.longitude != null
    ? [Number(telemetry.latitude), Number(telemetry.longitude)]
    : null;

  if (!position) {
    return (
      <div className="h-[360px] flex items-center justify-center bg-black/20 text-sm text-neutral-500">
        Waiting for vehicle location...
      </div>
    );
  }

  return (
    <MapContainer
      center={position}
      zoom={15}
      scrollWheelZoom
      className="h-[360px] w-full"
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <RecenterMap position={position} />
      <CircleMarker
        center={position}
        radius={10}
        pathOptions={{ color: '#0b0f0c', fillColor: '#c4ff4d', fillOpacity: 1, weight: 3 }}
      >
        <Popup>
          <strong>Vehicle location</strong><br />
          Speed: {telemetry.speed_kmh ?? '—'} km/h<br />
          Battery: {telemetry.battery_pct ?? '—'}%
        </Popup>
      </CircleMarker>
    </MapContainer>
  );
}
