'use client';

import { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import { LatLngExpression } from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Card } from '@/components/ui/card';

// Fix for default marker icon in Next.js - use CDN URLs
import L from 'leaflet';

// Delete the default icon to avoid conflicts
delete (L.Icon.Default.prototype as L.Icon & { _getIconUrl?: () => string })._getIconUrl;

// Set up the default icon with CDN URLs
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

interface EventLocationMapProps {
    lat: number;
    lon: number;
    venueName?: string;
    address?: string;
    className?: string;
}

// Component to handle map view updates
function ChangeView({ center, zoom }: { center: LatLngExpression; zoom: number }) {
    const map = useMap();
    useEffect(() => {
        map.setView(center, zoom);
    }, [center, zoom, map]);
    return null;
}

export function EventLocationMap({
    lat,
    lon,
    venueName,
    address,
    className,
}: EventLocationMapProps) {
    const position: LatLngExpression = [lat, lon];

    return (
        <Card className={className}>
            <MapContainer
                center={position}
                zoom={15}
                style={{ height: '300px', width: '100%', borderRadius: '0.5rem' }}
                scrollWheelZoom={false}
            >
                <ChangeView center={position} zoom={15} />

                <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />

                <Marker position={position}>
                    <Popup>
                        <div className="text-sm">
                            {venueName && <p className="font-semibold">{venueName}</p>}
                            {address && <p className="text-muted-foreground">{address}</p>}
                        </div>
                    </Popup>
                </Marker>
            </MapContainer>
        </Card>
    );
}
