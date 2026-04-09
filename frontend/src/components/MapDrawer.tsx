import React, { useState, useRef, useEffect } from 'react';
import { MapContainer, TileLayer, FeatureGroup, Polygon } from 'react-leaflet';
import { EditControl } from 'react-leaflet-draw';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet-draw/dist/leaflet.draw.css';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

interface MapDrawerProps {
  onPolygonChange?: (wkt: string | null) => void;
  initialPolygonWKT?: string | null;
  readonly?: boolean;
}

const MapDrawer = ({ onPolygonChange, initialPolygonWKT = null, readonly = false }: MapDrawerProps) => {
  const [polygon, setPolygon] = useState(null);
  const featureGroupRef = useRef();

  useEffect(() => {
    // Konwertuj WKT do GeoJSON jeśli jest initialPolygonWKT
    if (initialPolygonWKT) {
      try {
        console.log('Parsing WKT:', initialPolygonWKT);
        const geoJson = wktToGeoJSON(initialPolygonWKT);
        console.log('Converted to GeoJSON:', geoJson);
        if (geoJson) {
          setPolygon(geoJson);
        }
      } catch (error) {
        console.error('Error parsing WKT:', error);
      }
    }
  }, [initialPolygonWKT]);

  const wktToGeoJSON = (wkt: string) => {
    // Usuń SRID jeśli istnieje
    let cleanWkt = wkt.replace(/SRID=\d+;/, '');
    
    // Parsuj WKT POLYGON
    const match = cleanWkt.match(/POLYGON\s*\(\s*\(\s*(.*?)\s*\)\s*\)/);
    if (!match) {
      console.error('WKT pattern not matched:', cleanWkt);
      return null;
    }
    
    const coords = match[1]
      .split(',')
      .filter(c => c.trim().length > 0)
      .map(coord => {
        const parts = coord.trim().split(/\s+/);
        const lng = parseFloat(parts[0]);
        const lat = parseFloat(parts[1]);
        if (isNaN(lng) || isNaN(lat)) {
          console.error('Invalid coordinates:', coord, lng, lat);
          return null;
        }
        return [lng, lat];
      })
      .filter(c => c !== null);

    if (coords.length === 0) {
      console.error('No valid coordinates found');
      return null;
    }

    return {
      type: 'Feature',
      geometry: {
        type: 'Polygon',
        coordinates: [coords]
      }
    };
  };

  const geoJSONToWKT = (geoJsonPolygon: any) => {
    if (!geoJsonPolygon || !geoJsonPolygon.geometry) return null;
    const coords = geoJsonPolygon.geometry.coordinates[0];
    let wkt = 'POLYGON((';
    coords.forEach((coord: any) => {
      wkt += `${coord[0]} ${coord[1]}, `;
    });
    wkt = wkt.slice(0, -2);
    wkt += '))';
    return wkt;
  };

  const _onCreate = (e: any) => {
    const { layerType, layer } = e;
    if (layerType === 'polygon') {
      const geoJson = layer.toGeoJSON();
      const wkt = geoJSONToWKT(geoJson);
      setPolygon(geoJson);
      if (onPolygonChange) onPolygonChange(wkt);
    }
  };

  const _onEdited = (e: any) => {
    const layers = e.layers;
    layers.eachLayer((layer: any) => {
      const geoJson = layer.toGeoJSON();
      const wkt = geoJSONToWKT(geoJson);
      setPolygon(geoJson);
      if (onPolygonChange) onPolygonChange(wkt);
    });
  };

  const _onDeleted = () => {
    setPolygon(null);
    if (onPolygonChange) onPolygonChange(null);
  };

  return (
    <MapContainer center={[52.0, 19.0]} zoom={6} style={{ height: '400px', width: '100%' }}>
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {!readonly && (
        <FeatureGroup ref={featureGroupRef}>
          <EditControl
            position="topright"
            onCreated={_onCreate}
            onEdited={_onEdited}
            onDeleted={_onDeleted}
            draw={{
              rectangle: false,
              circle: false,
              circlemarker: false,
              marker: false,
              polyline: false,
              polygon: true,
            }}
          />
        </FeatureGroup>
      )}
      {polygon && (
        <Polygon
          positions={(polygon as any).geometry.coordinates[0].map((coord: any) => [coord[1], coord[0]])}
          color="#2E7D32"
          weight={2}
          opacity={0.7}
          fillColor="#2E7D32"
          fillOpacity={0.2}
        />
      )}
    </MapContainer>
  );
};

export default MapDrawer;
