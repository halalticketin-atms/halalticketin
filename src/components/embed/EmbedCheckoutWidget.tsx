'use client';

import { useEffect, useMemo, useRef, type CSSProperties } from 'react';
import Image from 'next/image';
import type { PublicEventRecord, PublicTicketRecord } from '@/lib/events-api';
import { normalizeEmbedTheme } from '@/lib/embed';
import { PublicEventPageContent } from '@/components/events/PublicEventPageContent';
import { cn } from '@/lib/utils';

type CSSVariableStyles = CSSProperties & Record<`--${string}`, string>;

export function EmbedCheckoutWidget({
    event,
    tickets,
    isLoading,
    error,
    theme,
    isPreview = false,
    accessStatus,
    accessMessage,
    accessCode,
    onAccessSubmit,
}: {
    event: PublicEventRecord | null;
    tickets: PublicTicketRecord[];
    isLoading: boolean;
    error: string | null;
    theme: string;
    isPreview?: boolean;
    accessStatus?: 'required' | 'denied' | null;
    accessMessage?: string | null;
    accessCode?: string | null;
    onAccessSubmit?: (code: string) => void;
}) {
    const shellRef = useRef<HTMLDivElement | null>(null);
    const embedTheme = useMemo(() => normalizeEmbedTheme(theme), [theme]);
    const isDark = embedTheme === 'dark';
    const darkThemeStyles = useMemo<CSSVariableStyles>(
        () => ({
            '--background': '#0a1224',
            '--foreground': '#f8fafc',
            '--card': '#0f1a34',
            '--card-foreground': '#f8fafc',
            '--popover': '#0f1a34',
            '--popover-foreground': '#f8fafc',
            '--primary': '#23d3c3',
            '--primary-foreground': '#0a1224',
            '--secondary': '#132540',
            '--secondary-foreground': '#d6f8f3',
            '--muted': '#0f1b2e',
            '--muted-foreground': '#9fb2d0',
            '--accent': '#17324a',
            '--accent-foreground': '#c9f5f1',
            '--border': 'rgba(148, 163, 184, 0.22)',
            '--input': 'rgba(148, 163, 184, 0.28)',
            '--ring': '#23d3c3',
            '--brand-mint': '#4ee5d8',
            '--brand-cyan': '#23d3c3',
            '--brand-teal': '#1fb7a7',
        }),
        [],
    );

    useEffect(() => {
        const root = document.documentElement;
        const prevOffset = root.style.getPropertyValue('--nav-safe-offset');
        root.style.setProperty('--nav-safe-offset', '0px');

        const node = shellRef.current;
        if (!node) {
            return () => {
                if (prevOffset) {
                    root.style.setProperty('--nav-safe-offset', prevOffset);
                } else {
                    root.style.removeProperty('--nav-safe-offset');
                }
            };
        }

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
            return () => {
                if (prevOffset) {
                    root.style.setProperty('--nav-safe-offset', prevOffset);
                } else {
                    root.style.removeProperty('--nav-safe-offset');
                }
            };
        }

        const observer = new ResizeObserver(() => sendHeight());
        observer.observe(node);
        sendHeight();

        return () => {
            observer.disconnect();
            if (prevOffset) {
                root.style.setProperty('--nav-safe-offset', prevOffset);
            } else {
                root.style.removeProperty('--nav-safe-offset');
            }
        };
    }, []);

    return (
        <div
            ref={shellRef}
            data-testid="embed-checkout-shell"
            className={cn(
                'min-h-0',
                isDark ? 'dark bg-background text-foreground' : 'bg-white text-slate-900',
            )}
            style={isDark ? { ...darkThemeStyles, colorScheme: 'dark' } : undefined}
        >
            <PublicEventPageContent
                event={event}
                tickets={tickets}
                isLoading={isLoading}
                error={error}
                isPreview={isPreview}
                embedMode="checkout"
                organizerNameOverride={event?.organizerName ?? null}
                accessStatus={accessStatus}
                accessMessage={accessMessage}
                accessCode={accessCode}
                onAccessSubmit={onAccessSubmit}
            />
            <div className={cn('container pb-6 pt-2 flex items-center gap-3 text-sm', isDark ? 'text-slate-300' : 'text-muted-foreground')}>
                <Image
                    src="/logos/HTlogocr.png"
                    alt="HalalTicketin' logo"
                    width={32}
                    height={32}
                    className="h-8 w-8 object-contain"
                />
                <span>Delivered with Ihsan by HalalTicketin&apos;</span>
            </div>
        </div>
    );
}
