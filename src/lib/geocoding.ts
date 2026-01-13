// Geocoding utilities using Google Geocoding API
// Note: Location search is now handled directly by the LocationAutocomplete component
// This file provides reverse geocoding for map-click features

const GOOGLE_MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '';

export interface LocationSearchResult {
    id: number;
    displayName: string;
    venue: string;
    address: string;
    city: string;
    country: string;
    lat: number;
    lon: number;
}

interface GoogleGeocodingResult {
    place_id: string;
    formatted_address: string;
    address_components: Array<{
        long_name: string;
        short_name: string;
        types: string[];
    }>;
    geometry: {
        location: {
            lat: number;
            lng: number;
        };
    };
}

interface GoogleGeocodingResponse {
    status: string;
    results: GoogleGeocodingResult[];
}

/**
 * Reverse geocode coordinates to address using Google Geocoding API
 */
export async function reverseGeocode(lat: number, lon: number): Promise<LocationSearchResult | null> {
    if (!GOOGLE_MAPS_API_KEY) {
        console.error('Google Maps API key not configured');
        return null;
    }

    try {
        const params = new URLSearchParams({
            latlng: `${lat},${lon}`,
            key: GOOGLE_MAPS_API_KEY,
        });

        const response = await fetch(`https://maps.googleapis.com/maps/api/geocode/json?${params}`);

        if (!response.ok) {
            return null;
        }

        const data: GoogleGeocodingResponse = await response.json();

        if (data.status !== 'OK' || data.results.length === 0) {
            return null;
        }

        const result = data.results[0];
        const addressComponents = result.address_components;

        // Extract address parts
        let city = '';
        let country = '';
        let streetNumber = '';
        let route = '';
        let venueName = '';

        for (const component of addressComponents) {
            const types = component.types;
            if (types.includes('locality')) {
                city = component.long_name;
            } else if (types.includes('postal_town') && !city) {
                city = component.long_name;
            } else if (types.includes('country')) {
                country = component.long_name;
            } else if (types.includes('street_number')) {
                streetNumber = component.long_name;
            } else if (types.includes('route')) {
                route = component.long_name;
            } else if (types.includes('premise') || types.includes('establishment')) {
                venueName = component.long_name;
            }
        }

        const streetAddress = [streetNumber, route].filter(Boolean).join(' ');

        return {
            id: Date.now(),
            displayName: result.formatted_address,
            venue: venueName || result.formatted_address.split(',')[0] || '',
            address: streetAddress,
            city,
            country,
            lat: result.geometry.location.lat,
            lon: result.geometry.location.lng,
        };
    } catch (error) {
        console.error('Reverse geocoding error:', error);
        return null;
    }
}

/**
 * @deprecated Location search is now handled by the LocationAutocomplete component directly.
 * This function is kept for backwards compatibility but will just return an empty array.
 */
export async function searchLocations(): Promise<LocationSearchResult[]> {
    console.warn('searchLocations is deprecated. Use the LocationAutocomplete component instead.');
    return [];
}
