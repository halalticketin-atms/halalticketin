'use client';

import { useEffect, useMemo, useRef } from 'react';
import Image from 'next/image';
import type { PublicEventRecord, PublicTicketRecord } from '@/lib/events-api';
import { normalizeEmbedAppearance, type EmbedAppearanceInput } from '@/lib/embed';
import { PublicEventPageContent } from '@/components/events/PublicEventPageContent';
import { embedAppearanceStyles } from '@/lib/embed-appearance';

export function EmbedCheckoutWidget({
    event, tickets, isLoading, error, theme, appearance, eventSlug,
    isPreview = false, accessStatus, accessMessage, accessCode, onAccessSubmit,
    isValidated = true, initialRenderTime,
}: {
    event: PublicEventRecord | null;
    tickets: PublicTicketRecord[];
    isLoading: boolean;
    isValidated?: boolean;
    initialRenderTime?: number;
    error: string | null;
    theme: string;
    appearance?: EmbedAppearanceInput;
    eventSlug?: string;
    isPreview?: boolean;
    accessStatus?: 'required' | 'denied' | null;
    accessMessage?: string | null;
    accessCode?: string | null;
    onAccessSubmit?: (code: string) => void;
}) {
    const shellRef = useRef<HTMLDivElement | null>(null);
    const settings = useMemo(() => normalizeEmbedAppearance({ ...appearance, theme }), [appearance, theme]);
    const styles = useMemo(() => embedAppearanceStyles(settings), [settings]);
    const slug = event?.slug || eventSlug;
    const hostedUrl = slug ? `/events/${encodeURIComponent(slug)}` : '/events';

    // Apply tokens to the iframe document so checkout portals share the widget theme.
    useEffect(() => {
        const root = document.documentElement;
        const previous = Object.keys(styles).map(key => [key, root.style.getPropertyValue(key)]);
        const previousMode = root.getAttribute('data-ht-embed');
        root.setAttribute('data-ht-embed', settings.theme);
        for (const [key, value] of Object.entries(styles)) root.style.setProperty(key, value);
        return () => {
            for (const [key, value] of previous) {
                if (value) root.style.setProperty(key, value);
                else root.style.removeProperty(key);
            }
            if (previousMode === null) root.removeAttribute('data-ht-embed');
            else root.setAttribute('data-ht-embed', previousMode);
        };
    }, [settings.theme, styles]);

    useEffect(() => {
        const node = shellRef.current;
        if (!node) return;
        const sendHeight = () => {
            window.parent?.postMessage({
                source: 'ht-embed', type: 'resize',
                height: Math.ceil(node.getBoundingClientRect().height),
            }, '*');
        };
        const handleMeasure = (event: MessageEvent) => {
            const payload = event.data as { source?: unknown; type?: unknown } | null;
            if (event.source === window.parent && payload?.source === 'ht-embed-host' && payload.type === 'measure') {
                sendHeight();
            }
        };
        sendHeight();
        window.addEventListener('message', handleMeasure);
        if (typeof ResizeObserver === 'undefined') {
            window.addEventListener('resize', sendHeight);
            return () => {
                window.removeEventListener('message', handleMeasure);
                window.removeEventListener('resize', sendHeight);
            };
        }
        const observer = new ResizeObserver(sendHeight);
        observer.observe(node);
        return () => {
            window.removeEventListener('message', handleMeasure);
            observer.disconnect();
        };
    }, []);

    return (
        <div
            ref={shellRef}
            data-testid="embed-checkout-shell"
            data-ht-embed-shell={settings.theme}
            className="min-h-0 bg-background text-foreground"
            style={{ ...styles, fontFamily: 'var(--embed-font)', colorScheme: 'var(--embed-color-scheme)' }}
        >
            {/* Keep the snapshot visible while browser access and availability are checked. */}
            <div inert={Boolean(event) && !isValidated}>
                {isLoading && !accessStatus ? (
                    <p role="status" className="px-4 py-8 text-sm">Loading tickets...</p>
                ) : (error || !event) && !accessStatus ? (
                    <div role="alert" className="px-4 py-6 space-y-2">
                        <h1 className="text-lg font-semibold">Tickets unavailable</h1>
                        <p className="text-sm">{error || 'This event is not available.'}</p>
                    </div>
                ) : (
                    <PublicEventPageContent
                        event={event} tickets={tickets} isLoading={isLoading} error={error}
                        isPreview={isPreview} embedMode="checkout"
                        embedShowDetails={settings.showDetails} embedMinimal={settings.minimal}
                        organizerNameOverride={event?.organizerName ?? null}
                        accessStatus={accessStatus} accessMessage={accessMessage}
                        accessCode={accessCode} onAccessSubmit={onAccessSubmit}
                        initialRenderTime={initialRenderTime}
                    />
                )}
            </div>
            <footer className="flex flex-wrap items-center justify-between gap-x-4 px-3 pb-2 text-xs text-muted-foreground">
                <span className="inline-flex min-h-11 items-center gap-3">
                    <Image src="/logos/HTlogocr.png" alt="" width={1186} height={448} sizes="53px" className="h-5 w-auto object-contain" />
                    Delivered with Ihsan by HalalTicketin&apos;
                </span>
                {!isPreview && (
                    <a href={hostedUrl} target="_top" className="inline-flex min-h-11 items-center underline underline-offset-4">Open event page</a>
                )}
            </footer>
            {/* Match the iframe theme and navigation offset before the portal-token effect runs. */}
            <style>{`html:has([data-ht-embed-shell]) { ${Object.entries(styles).map(([key, value]) => `${key}: ${value};`).join(' ')} }`}</style>
            <style jsx global>{`
                html:has([data-ht-embed-shell]), html:has([data-ht-embed-shell]) body {
                    background: var(--background) !important;
                    background-image: none !important;
                    color: var(--foreground);
                    font-family: var(--embed-font);
                    color-scheme: var(--embed-color-scheme);
                }
                html:has([data-ht-embed-shell]) body::before { display: none; }
                html:has([data-ht-embed-shell]) h1, html:has([data-ht-embed-shell]) h2,
                html:has([data-ht-embed-shell]) h3, html:has([data-ht-embed-shell]) h4,
                html:has([data-ht-embed-shell]) .font-display { font-family: var(--embed-font); }
                html:has([data-ht-embed-shell]) [data-slot="card"],
                html:has([data-ht-embed-shell]) [data-slot="button"],
                html:has([data-ht-embed-shell]) input, html:has([data-ht-embed-shell]) select,
                html:has([data-ht-embed-shell]) textarea, html:has([data-ht-embed-shell]) .rounded-lg {
                    border-radius: var(--radius);
                }
                html:has([data-ht-embed-shell]) button, html:has([data-ht-embed-shell]) input,
                html:has([data-ht-embed-shell]) select { min-height: 44px; }
                html:has([data-ht-embed-shell]) button { min-width: 44px; }
                html:has([data-ht-embed-shell]) .text-primary { color: var(--embed-accent-text); }
                html:has([data-ht-embed-shell]) [data-slot="dialog-content"] .bg-white\\/90 {
                    background: var(--card);
                }
            `}</style>
        </div>
    );
}
