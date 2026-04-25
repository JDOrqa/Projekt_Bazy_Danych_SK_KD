// frontend/src/components/MapPicker.js
import React, { useState } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix dla ikon Leaflet w React (inaczej nie działają)
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

const LocationMarker = ({ onSelect, position }) => {
    const map = useMapEvents({
        click(e) {
            const { lng, lat } = e.latlng;
            onSelect([lng, lat]);
        },
    });
    return position ? <Marker position={[position[1], position[0]]} /> : null;
};

const MapPicker = ({ onLocationSelect, initialLocation }) => {
    const [position, setPosition] = useState(initialLocation || null);

    const handleSelect = (coords) => {
        setPosition(coords);
        onLocationSelect(coords);
    };

    const center = position ? [position[1], position[0]] : [52.237049, 21.017532]; // Warszawa

    return (
        <MapContainer
            center={center}
            zoom={13}
            style={{ height: '300px', width: '100%', borderRadius: '8px' }}
            scrollWheelZoom={false}
        >
            <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <LocationMarker onSelect={handleSelect} position={position} />
        </MapContainer>
    );
};

export default MapPicker;