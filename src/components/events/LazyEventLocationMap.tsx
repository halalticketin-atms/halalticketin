'use client';

import { useEffect, useRef, useState, type ComponentProps } from 'react';
import dynamic from 'next/dynamic';
import { Card } from '@/components/ui/card';

type MapProps = ComponentProps<typeof import('./EventLocationMap').EventLocationMap>;

function MapPlaceholder() {
    return (
        <Card>
            <div className="h-[300px] rounded-lg bg-muted/40 flex items-center justify-center text-sm text-muted-foreground">
                Loading map...
            </div>
        </Card>
    );
}

const EventLocationMap = dynamic(
    () => import('./EventLocationMap').then(module => ({ default: module.EventLocationMap })),
    { ssr: false, loading: MapPlaceholder },
);

export function LazyEventLocationMap(props: MapProps) {
    const container = useRef<HTMLDivElement>(null);
    const [shouldLoad, setShouldLoad] = useState(false);

    useEffect(() => {
        if (typeof window.IntersectionObserver !== 'function') {
            const frame = window.requestAnimationFrame(() => setShouldLoad(true));
            return () => window.cancelAnimationFrame(frame);
        }
        const observer = new IntersectionObserver(entries => {
            if (entries.some(entry => entry.isIntersecting)) {
                setShouldLoad(true);
                observer.disconnect();
            }
        }, { rootMargin: '400px' });
        if (container.current) observer.observe(container.current);
        return () => observer.disconnect();
    }, []);

    return (
        <div ref={container} data-testid="event-location-map">
            {shouldLoad ? <EventLocationMap {...props} /> : <MapPlaceholder />}
        </div>
    );
}
