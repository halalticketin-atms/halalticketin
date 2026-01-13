'use client';

import { useEffect, useMemo, useRef } from 'react';
import type { PublicEventRecord, PublicTicketRecord } from '@/lib/events-api';
import { normalizeEmbedTheme } from '@/lib/embed';
import { PublicEventPageContent } from '@/components/events/PublicEventPageContent';
import { cn } from '@/lib/utils';

export function EmbedCheckoutWidget({
    event,
    tickets,
    isLoading,
    error,
    theme,
}: {
    event: PublicEventRecord | null;
    tickets: PublicTicketRecord[];
    isLoading: boolean;
    error: string | null;
    theme: string;
}) {
    const shellRef = useRef<HTMLDivElement | null>(null);
    const embedTheme = useMemo(() => normalizeEmbedTheme(theme), [theme]);

    useEffect(() => {
        const node = shellRef.current;
        if (!node) return;

        const sendHeight = () => {
            const height = Math.ceil(node.getBoundingClientRect().height);
            window.parent?.postMessage(
                {
                    source: 'ht-embed',
                    type: 'resize',
                    height,
                },
                '*',
            );
        };

        if (typeof ResizeObserver === 'undefined') {
            sendHeight();
            return;
        }

        const observer = new ResizeObserver(() => sendHeight());
        observer.observe(node);
        sendHeight();

        return () => observer.disconnect();
    }, []);

    return (
        <div
            ref={shellRef}
            data-testid="embed-checkout-shell"
            className={cn(
                'min-h-0',
                embedTheme === 'dark' ? 'bg-slate-950 text-white' : 'bg-white text-slate-900',
            )}
        >
            <PublicEventPageContent
                event={event}
                tickets={tickets}
                isLoading={isLoading}
                error={error}
                embedMode="checkout"
                organizerNameOverride={event?.organizerName ?? null}
            />
        </div>
    );
}
