'use client';

import { useState, useEffect, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { MapPin, Loader2, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLoadScript } from '@react-google-maps/api';
import usePlacesAutocomplete, { getDetails } from 'use-places-autocomplete';

const libraries: ('places')[] = ['places'];

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

interface LocationAutocompleteProps {
    value: string;
    onSelect: (location: LocationSearchResult) => void;
    onInputChange?: (value: string) => void;
    placeholder?: string;
    label?: string;
    className?: string;
}

interface ManualLocationInputProps {
    value: string;
    onInputChange?: (value: string) => void;
    placeholder?: string;
    label?: string;
    className?: string;
    helperText?: string;
    isLoading?: boolean;
}

function ManualLocationInput({
    value,
    onInputChange,
    placeholder = 'Enter a venue or address...',
    label,
    className,
    helperText,
    isLoading = false,
}: ManualLocationInputProps) {
    const [localValue, setLocalValue] = useState(value);

    useEffect(() => {
        setLocalValue(value);
    }, [value]);

    const displayValue = onInputChange ? value : localValue;

    return (
        <div className={cn('space-y-2', className)}>
            {label && <Label>{label}</Label>}
            <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                    value={displayValue}
                    onChange={(e) => {
                        const next = e.target.value;
                        setLocalValue(next);
                        onInputChange?.(next);
                    }}
                    placeholder={placeholder}
                    className="pl-10 pr-10"
                />
                {isLoading && (
                    <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
                )}
            </div>
            {helperText ? (
                <p className="text-xs text-muted-foreground">{helperText}</p>
            ) : null}
        </div>
    );
}

function PlacesAutocompleteInput({
    value,
    onSelect,
    onInputChange,
    placeholder = 'Search for a venue or address...',
    label,
    className,
}: LocationAutocompleteProps) {
    const [isOpen, setIsOpen] = useState(false);
    const wrapperRef = useRef<HTMLDivElement>(null);

    const {
        value: inputValue,
        suggestions: { status, data, loading },
        setValue,
        clearSuggestions,
    } = usePlacesAutocomplete({
        requestOptions: {
            types: ['establishment', 'geocode'],
        },
        debounce: 300,
        defaultValue: value,
    });

    // Close dropdown when clicking outside
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Open dropdown when we have suggestions
    useEffect(() => {
        if (status === 'OK' && data.length > 0) {
            setIsOpen(true);
        }
    }, [status, data]);

    useEffect(() => {
        if (value !== inputValue) {
            setValue(value, false);
        }
    }, [value, inputValue, setValue]);

    const handleSelect = async (placeId: string, description: string) => {
        setValue(description, false);
        clearSuggestions();
        setIsOpen(false);

        try {
            // Get place details including geometry
            const details = await getDetails({
                placeId,
                fields: ['geometry', 'address_components', 'name', 'formatted_address'],
            });

            if (!details || typeof details !== 'object' || !('geometry' in details)) {
                onInputChange?.(description);
                return;
            }

            const location = details.geometry?.location;
            if (!location) {
                onInputChange?.(description);
                return;
            }

            const addressComponents = details.address_components || [];

            // Extract address parts
            let city = '';
            let country = '';
            let streetNumber = '';
            let route = '';

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
                }
            }

            const streetAddress = [streetNumber, route].filter(Boolean).join(' ');

            const result: LocationSearchResult = {
                id: Date.now(),
                displayName: details.formatted_address || description,
                venue: details.name || description.split(',')[0] || '',
                address: streetAddress,
                city,
                country,
                lat: location.lat(),
                lon: location.lng(),
            };

            onSelect(result);
        } catch (error) {
            console.error('Error fetching place details:', error);
        }
    };

    const handleInputChange = (nextValue: string) => {
        setValue(nextValue);
        onInputChange?.(nextValue);
        if (!nextValue) {
            clearSuggestions();
            setIsOpen(false);
        }
    };

    const handleClear = () => {
        setValue('', false);
        clearSuggestions();
        setIsOpen(false);
        onInputChange?.('');
    };

    return (
        <div ref={wrapperRef} className={cn('space-y-2 relative', className)}>
            {label && <Label>{label}</Label>}

            <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                    value={inputValue}
                    onChange={(e) => handleInputChange(e.target.value)}
                    onFocus={() => {
                        if (data.length > 0) setIsOpen(true);
                    }}
                    placeholder={placeholder}
                    className="pl-10 pr-10"
                />
                {loading && (
                    <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
                )}
                {!loading && inputValue && (
                    <button
                        type="button"
                        onClick={handleClear}
                        className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground hover:text-foreground"
                    >
                        <X className="h-4 w-4" />
                    </button>
                )}
            </div>

            {/* Dropdown Results */}
            {isOpen && status === 'OK' && (
                <div
                    className="absolute z-50 w-full mt-1 bg-popover border rounded-md shadow-lg max-h-[300px] overflow-y-auto"
                    onMouseDown={(e) => {
                        e.preventDefault();
                    }}
                >
                    <div className="py-1">
                        <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground">
                            Locations
                        </div>
                        {data.map((suggestion) => (
                            <button
                                key={suggestion.place_id}
                                type="button"
                                onClick={() => handleSelect(suggestion.place_id, suggestion.description)}
                                className="w-full flex items-start gap-2 px-2 py-2 hover:bg-accent cursor-pointer text-left transition-colors"
                            >
                                <MapPin className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                                <div className="flex-1 overflow-hidden min-w-0">
                                    <p className="font-medium truncate text-sm">
                                        {suggestion.structured_formatting.main_text}
                                    </p>
                                    <p className="text-xs text-muted-foreground truncate">
                                        {suggestion.structured_formatting.secondary_text}
                                    </p>
                                </div>
                            </button>
                        ))}
                    </div>

                    {/* Attribution */}
                    <div className="border-t px-3 py-2 text-xs text-muted-foreground bg-muted/30 flex items-center gap-1.5">
                        <svg className="h-3.5 w-auto" viewBox="0 0 116 37" xmlns="http://www.w3.org/2000/svg">
                            <path d="M115.39 15.34c0-1.1-.1-2.16-.27-3.18H59v6.02h31.63c-1.37 7.34-5.48 13.56-11.66 17.73v14.74h18.88c11.05-10.18 17.42-25.17 17.42-35.31z" fill="#4285F4" />
                            <path d="M59 37c15.75 0 28.96-5.22 38.63-14.17L78.75 8.09C73.57 11.77 66.88 14 59 14c-11.47 0-21.2-7.74-24.67-18.14H14.88v12.41C24.52 29.19 40.56 37 59 37z" fill="#34A853" />
                            <path d="M34.33-4.14C32.97-8.44 32.22-13.01 32.22-17.75s.75-9.31 2.11-13.61V-43.77H14.88C10.36-34.74 7.78-24.57 7.78-13.75s2.58 20.99 7.1 30.02l19.45-12.41z" fill="#FBBC05" />
                            <path d="M59-35.5c6.47 0 12.28 2.23 16.85 6.6l12.63-12.63C79.93-49.04 70.7-53.25 59-53.25c-18.44 0-34.48 10.56-42.12 25.98l19.45 12.41C39.8-27.76 47.53-35.5 59-35.5z" fill="#EA4335" />
                        </svg>
                        <span>Powered by Google</span>
                    </div>
                </div>
            )}

            {/* No results state */}
            {isOpen && status === 'ZERO_RESULTS' && (
                <div
                    className="absolute z-50 w-full mt-1 bg-popover border rounded-md shadow-lg"
                    onMouseDown={(e) => e.preventDefault()}
                >
                    <div className="py-6 text-center text-sm text-muted-foreground">
                        No locations found. Try a different search.
                    </div>
                </div>
            )}
        </div>
    );
}

export function LocationAutocomplete(props: LocationAutocompleteProps) {
    const apiKey = (process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '').trim();
    if (!apiKey) {
        return (
            <ManualLocationInput
                value={props.value}
                onInputChange={props.onInputChange}
                placeholder={props.placeholder}
                label={props.label}
                className={props.className}
                helperText="Google Maps is not configured. Enter a venue manually."
            />
        );
    }

    const { isLoaded, loadError } = useLoadScript({
        googleMapsApiKey: apiKey,
        libraries,
    });

    if (loadError) {
        return (
            <ManualLocationInput
                value={props.value}
                onInputChange={props.onInputChange}
                placeholder={props.placeholder}
                label={props.label}
                className={props.className}
                helperText="Google Maps failed to load. Enter a venue manually."
            />
        );
    }

    if (!isLoaded) {
        return (
            <ManualLocationInput
                value={props.value}
                onInputChange={props.onInputChange}
                placeholder={props.placeholder}
                label={props.label}
                className={props.className}
                helperText="Loading Google Maps..."
                isLoading
            />
        );
    }

    return <PlacesAutocompleteInput {...props} />;
}
