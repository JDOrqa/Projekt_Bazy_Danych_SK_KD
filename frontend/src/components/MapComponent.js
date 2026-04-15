// Plik: components/MapComponent.js
// Komponent mapy z obsługą wielokąta (granice łowiska) - bez react-leaflet-draw.
// Używany w LakeDetail (tryb podglądu) oraz w LakeEdit (tryb edycji).

import React, { useEffect, useState, useRef } from 'react';
import { MapContainer, TileLayer, Polygon, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet-draw/dist/leaflet.draw.css';
import 'leaflet-draw';

// Poprawka dla domyślnych ikon Leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

// Wewnętrzny komponent do obsługi rysowania
const DrawControl = ({ onPolygonCreated, onPolygonEdited, existingPolygon, readonly }) => {
    const map = useMap();
    const drawnItemsRef = useRef(null);

    useEffect(() => {
        if (readonly) return;

        // Inicjalizacja warstwy dla rysowanych obiektów
        const drawnItems = new L.FeatureGroup();
        map.addLayer(drawnItems);
        drawnItemsRef.current = drawnItems;

        // Jeśli istnieje istniejący wielokąt, dodaj go do warstwy
        if (existingPolygon && existingPolygon.length >= 3) {
            const latLngs = existingPolygon.map(([lng, lat]) => [lat, lng]);
            const polygon = L.polygon(latLngs, { color: '#00cc00', weight: 3 });
            drawnItems.addLayer(polygon);
            // Dopasuj widok mapy do wielokąta
            map.fitBounds(polygon.getBounds());
        }

        // Konfiguracja kontrolki rysowania
        const drawControl = new L.Control.Draw({
            edit: {
                featureGroup: drawnItems,
                remove: true
            },
            draw: {
                rectangle: false,
                circle: false,
                circlemarker: false,
                marker: false,
                polyline: false,
                polygon: {
                    allowIntersection: false,
                    showArea: true,
                    shapeOptions: {
                        color: '#00cc00',
                        weight: 3
                    }
                }
            }
        });
        map.addControl(drawControl);

        // Obsługa zdarzenia utworzenia wielokąta
        map.on('draw:created', (e) => {
            const layer = e.layer;
            drawnItems.clearLayers();
            drawnItems.addLayer(layer);
            const latLngs = layer.getLatLngs()[0];
            const coords = latLngs.map(({ lng, lat }) => [lng, lat]);
            if (onPolygonCreated) onPolygonCreated(coords);
        });

        // Obsługa zdarzenia edycji
        map.on('draw:edited', (e) => {
            const layers = e.layers;
            layers.eachLayer(layer => {
                const latLngs = layer.getLatLngs()[0];
                const coords = latLngs.map(({ lng, lat }) => [lng, lat]);
                if (onPolygonEdited) onPolygonEdited(coords);
            });
        });

        // Obsługa usunięcia
        map.on('draw:deleted', () => {
            if (onPolygonCreated) onPolygonCreated([]);
        });

        return () => {
            map.removeControl(drawControl);
            map.removeLayer(drawnItems);
        };
    }, [map, onPolygonCreated, onPolygonEdited, existingPolygon, readonly]);

    return null;
};

const MapComponent = ({ initialPolygonCoords, readonly = false, onPolygonChange }) => {
    const [polygonCoords, setPolygonCoords] = useState(initialPolygonCoords || []);

    useEffect(() => {
        if (initialPolygonCoords && initialPolygonCoords.length) {
            setPolygonCoords(initialPolygonCoords);
        }
    }, [initialPolygonCoords]);

    // Konwersja na format Leaflet [lat, lng]
    const leafletPositions = polygonCoords.map(([lng, lat]) => [lat, lng]);

    // Środek mapy – jeśli istnieje wielokąt, ustaw na jego centroid; w przeciwnym razie Polska
    const center = leafletPositions.length
        ? leafletPositions.reduce((acc, [lat, lng]) => [acc[0] + lat, acc[1] + lng], [0, 0])
            .map(v => v / leafletPositions.length)
        : [52.237049, 21.017532];

    const handlePolygonCreated = (coords) => {
        setPolygonCoords(coords);
        if (onPolygonChange) onPolygonChange(coords);
    };

    const handlePolygonEdited = (coords) => {
        setPolygonCoords(coords);
        if (onPolygonChange) onPolygonChange(coords);
    };

    return (
        <MapContainer
            center={center}
            zoom={13}
            style={{ height: '400px', width: '100%', borderRadius: '8px' }}
            scrollWheelZoom={false}
        >
            <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            {!readonly && (
                <DrawControl
                    onPolygonCreated={handlePolygonCreated}
                    onPolygonEdited={handlePolygonEdited}
                    existingPolygon={polygonCoords}
                    readonly={readonly}
                />
            )}
            {leafletPositions.length > 0 && (
                <Polygon
                    positions={leafletPositions}
                    color={readonly ? "#3388ff" : "#00cc00"}
                    weight={3}
                    fillOpacity={0.3}
                />
            )}
        </MapContainer>
    );
};

export default MapComponent;