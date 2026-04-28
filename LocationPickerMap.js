import React, { useEffect } from 'react';
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  useMap,
  useMapEvents
} from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

delete L.Icon.Default.prototype._getIconUrl;

L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png'
});

function RecenterMap({ position }) {
  const map = useMap();

  useEffect(() => {
    if (position?.lat && position?.lng) {
      map.setView([position.lat, position.lng], map.getZoom(), {
        animate: true
      });
    }
  }, [position, map]);

  return null;
}

function LocationMarker({ position, setPosition }) {
  useMapEvents({
    click(e) {
      setPosition({
        lat: e.latlng.lat,
        lng: e.latlng.lng
      });
    }
  });

  if (!position) return null;

  return (
    <Marker position={[position.lat, position.lng]}>
      <Popup>
        <div style={{ lineHeight: 1.5 }}>
          <strong>Selected location</strong>
          <br />
          Lat: {position.lat.toFixed(6)}
          <br />
          Lng: {position.lng.toFixed(6)}
        </div>
      </Popup>
    </Marker>
  );
}

function LocationPickerMap({ position, setPosition }) {
  const fallbackPosition = position || { lat: 28.6139, lng: 77.2090 };

  return (
    <div
      style={{
        display: 'grid',
        gap: '14px'
      }}
    >
      <div
        style={{
          padding: '14px 16px',
          borderRadius: '16px',
          background: '#fff7f2',
          border: '1px solid #f3ddd2',
          color: '#6b7280',
          fontSize: '14px',
          lineHeight: 1.6
        }}
      >
        Click anywhere on the map to choose a location. The selected latitude and
        longitude can be used during provider registration or nearby provider search.
      </div>

      <div
        style={{
          borderRadius: '20px',
          overflow: 'hidden',
          border: '1px solid #eadfd7',
          boxShadow: '0 16px 30px rgba(31, 41, 55, 0.08)'
        }}
      >
        <MapContainer
          center={[fallbackPosition.lat, fallbackPosition.lng]}
          zoom={13}
          scrollWheelZoom={true}
          style={{ height: '360px', width: '100%' }}
        >
          <TileLayer
            attribution="&copy; OpenStreetMap contributors"
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <RecenterMap position={fallbackPosition} />
          <LocationMarker position={position} setPosition={setPosition} />
        </MapContainer>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: '12px'
        }}
      >
        <div
          style={{
            padding: '14px 16px',
            borderRadius: '16px',
            background: '#ffffff',
            border: '1px solid #ece7e1'
          }}
        >
          <div
            style={{
              fontSize: '12px',
              fontWeight: 700,
              color: '#8a8f98',
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              marginBottom: '6px'
            }}
          >
            Latitude
          </div>
          <strong style={{ color: '#1f2937' }}>
            {position ? position.lat.toFixed(6) : 'Not selected'}
          </strong>
        </div>

        <div
          style={{
            padding: '14px 16px',
            borderRadius: '16px',
            background: '#ffffff',
            border: '1px solid #ece7e1'
          }}
        >
          <div
            style={{
              fontSize: '12px',
              fontWeight: 700,
              color: '#8a8f98',
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              marginBottom: '6px'
            }}
          >
            Longitude
          </div>
          <strong style={{ color: '#1f2937' }}>
            {position ? position.lng.toFixed(6) : 'Not selected'}
          </strong>
        </div>
      </div>
    </div>
  );
}

export default LocationPickerMap;