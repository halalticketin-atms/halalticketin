'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { MapPin, Loader2, X } from 'lucide-react';
import { searchLocations, type LocationSearchResult } from '@/lib/geocoding';
import { cn } from '@/lib/utils';

interface LocationAutocompleteProps {
    value: string;
    onSelect: (location: LocationSearchResult) => void;
    placeholder?: string;
    label?: string;
    className?: string;
}

export function LocationAutocomplete({
    value,
    onSelect,
    placeholder = 'Search for a venue or address...',
    label,
    className,
}: LocationAutocompleteProps) {
    const [searchQuery, setSearchQuery] = useState(value);
    const [results, setResults] = useState<LocationSearchResult[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isOpen, setIsOpen] = useState(false);
    const debounceTimerRef = useRef<NodeJS.Timeout | undefined>(undefined);
    const wrapperRef = useRef<HTMLDivElement>(null);

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

    // Debounced search
    const performSearch = useCallback(async (query: string) => {
        if (query.trim().length < 3) {
            setResults([]);
            setIsOpen(false);
            return;
        }

        setIsLoading(true);
        setError(null);

        try {
            const locations = await searchLocations(query);
            setResults(locations);
            setIsOpen(locations.length > 0);
        } catch {
            setError('Failed to search locations. Please try again.');
            setResults([]);
        } finally {
            setIsLoading(false);
        }
    }, []);

    // Handle input change with debounce
    useEffect(() => {
        if (debounceTimerRef.current) {
            clearTimeout(debounceTimerRef.current);
        }

        debounceTimerRef.current = setTimeout(() => {
            performSearch(searchQuery);
        }, 500); // 500ms debounce

        return () => {
            if (debounceTimerRef.current) {
                clearTimeout(debounceTimerRef.current);
            }
        };
    }, [searchQuery, performSearch]);

    const handleSelect = (location: LocationSearchResult) => {
        setSearchQuery(location.displayName);
        setIsOpen(false);
        onSelect(location);
    };

    const handleClear = () => {
        setSearchQuery('');
        setResults([]);
        setIsOpen(false);
    };

    return (
        <div ref={wrapperRef} className={cn('space-y-2 relative', className)}>
            {label && <Label>{label}</Label>}

            <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onFocus={() => {
                        if (results.length > 0) setIsOpen(true);
                    }}
                    placeholder={placeholder}
                    className="pl-10 pr-10"
                />
                {isLoading && (
                    <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
                )}
                {!isLoading && searchQuery && (
                    <button
                        onClick={handleClear}
                        className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground hover:text-foreground"
                    >
                        <X className="h-4 w-4" />
                    </button>
                )}
            </div>

            {/* Dropdown Results */}
            {isOpen && (
                <div className="absolute z-50 w-full mt-1 bg-popover border rounded-md shadow-lg max-h-[300px] overflow-y-auto">
                    {error && (
                        <div className="py-6 text-center text-sm text-destructive px-4">
                            {error}
                        </div>
                    )}
                    {!error && results.length === 0 && !isLoading && (
                        <div className="py-6 text-center text-sm text-muted-foreground">
                            No locations found. Try a different search.
                        </div>
                    )}
                    {results.length > 0 && (
                        <div className="py-1">
                            <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground">
                                Locations
                            </div>
                            {results.map((location) => (
                                <button
                                    key={location.id}
                                    onClick={() => handleSelect(location)}
                                    className="w-full flex items-start gap-2 px-2 py-2 hover:bg-accent cursor-pointer text-left transition-colors"
                                >
                                    <MapPin className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                                    <div className="flex-1 overflow-hidden min-w-0">
                                        <p className="font-medium truncate text-sm">{location.displayName}</p>
                                    </div>
                                </button>
                            ))}
                        </div>
                    )}

                    {/* Attribution */}
                    <div className="border-t px-3 py-2 text-xs text-muted-foreground bg-muted/30">
                        Powered by <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer" className="underline hover:text-foreground">OpenStreetMap</a>
                    </div>
                </div>
            )}
        </div>
    );
}
