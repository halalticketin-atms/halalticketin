const NOMINATIM_BASE_URL = 'https://nominatim.openstreetmap.org';

export interface NominatimResult {
    place_id: number;
    display_name: string;
    lat: string;
    lon: string;
    address: {
        name?: string;
        road?: string;
        house_number?: string;
        city?: string;
        town?: string;
        village?: string;
        state?: string;
        country?: string;
        postcode?: string;
    };
    boundingbox: [string, string, string, string];
}

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

/**
 * Search for locations using Nominatim geocoding API
 * Rate limit: 1 request per second
 */
export async function searchLocations(query: string): Promise<LocationSearchResult[]> {
    if (!query || query.trim().length < 3) {
        return [];
    }

    try {
        const params = new URLSearchParams({
            q: query.trim(),
            format: 'json',
            addressdetails: '1',
            limit: '5',
        });

        const response = await fetch(`${NOMINATIM_BASE_URL}/search?${params}`, {
            headers: {
                'User-Agent': 'HalalTicketing/1.0 (Event Management Platform)',
            },
        });

        if (!response.ok) {
            throw new Error(`Nominatim API error: ${response.statusText}`);
        }

        const data: NominatimResult[] = await response.json();

        return data.map((result) => ({
            id: result.place_id,
            displayName: result.display_name,
            venue: result.address.name || result.address.road || '',
            address: [
                result.address.house_number,
                result.address.road,
            ].filter(Boolean).join(' ') || '',
            city: result.address.city || result.address.town || result.address.village || '',
            country: result.address.country || '',
            lat: parseFloat(result.lat),
            lon: parseFloat(result.lon),
        }));
    } catch (error) {
        console.error('Location search error:', error);
        throw error;
    }
}

/**
 * Reverse geocode coordinates to address
 */
export async function reverseGeocode(lat: number, lon: number): Promise<LocationSearchResult | null> {
    try {
        const params = new URLSearchParams({
            lat: lat.toString(),
            lon: lon.toString(),
            format: 'json',
            addressdetails: '1',
        });

        const response = await fetch(`${NOMINATIM_BASE_URL}/reverse?${params}`, {
            headers: {
                'User-Agent': 'HalalTicketing/1.0 (Event Management Platform)',
            },
        });

        if (!response.ok) {
            return null;
        }

        const result: NominatimResult = await response.json();

        return {
            id: result.place_id,
            displayName: result.display_name,
            venue: result.address.name || result.address.road || '',
            address: [
                result.address.house_number,
                result.address.road,
            ].filter(Boolean).join(' ') || '',
            city: result.address.city || result.address.town || result.address.village || '',
            country: result.address.country || '',
            lat: parseFloat(result.lat),
            lon: parseFloat(result.lon),
        };
    } catch (error) {
        console.error('Reverse geocoding error:', error);
        return null;
    }
}
