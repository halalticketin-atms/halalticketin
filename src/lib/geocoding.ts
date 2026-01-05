// Location search via backend proxy to LocationIQ
// This keeps the API key secure on the server

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export interface LocationIQResult {
    place_id: string;
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
 * Search for locations using our backend proxy to LocationIQ
 * Free tier: 5,000 requests/day (no credit card required)
 */
export async function searchLocations(query: string): Promise<LocationSearchResult[]> {
    if (!query || query.trim().length < 3) {
        return [];
    }

    try {
        const params = new URLSearchParams({
            q: query.trim(),
        });

        const response = await fetch(`${API_BASE_URL}/api/v1/locations/search?${params}`);

        if (!response.ok) {
            const errorText = await response.text();
            console.error(`Location search error (${response.status}):`, errorText);
            throw new Error(`Location search error: ${response.status} ${response.statusText}`);
        }

        const data: LocationIQResult[] = await response.json();

        return data.map((result) => {
            // Extract venue name: prioritize first part of display_name (before first comma)
            // This gets "Convention Centre Dublin" from "Convention Centre Dublin, North Wall Quay..."
            const displayParts = result.display_name.split(',').map(s => s.trim());
            const venueName = result.address?.name || displayParts[0] || result.address?.road || '';

            return {
                id: parseInt(result.place_id, 10) || 0,
                displayName: result.display_name,
                venue: venueName,
                address: [
                    result.address?.house_number,
                    result.address?.road,
                ].filter(Boolean).join(' ') || '',
                city: result.address?.city || result.address?.town || result.address?.village || '',
                country: result.address?.country || '',
                lat: parseFloat(result.lat),
                lon: parseFloat(result.lon),
            };
        });
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
        });

        const response = await fetch(`${API_BASE_URL}/api/v1/locations/reverse?${params}`);

        if (!response.ok) {
            return null;
        }

        const result: LocationIQResult = await response.json();

        return {
            id: parseInt(result.place_id, 10) || 0,
            displayName: result.display_name,
            venue: result.address?.name || result.address?.road || '',
            address: [
                result.address?.house_number,
                result.address?.road,
            ].filter(Boolean).join(' ') || '',
            city: result.address?.city || result.address?.town || result.address?.village || '',
            country: result.address?.country || '',
            lat: parseFloat(result.lat),
            lon: parseFloat(result.lon),
        };
    } catch (error) {
        console.error('Reverse geocoding error:', error);
        return null;
    }
}
