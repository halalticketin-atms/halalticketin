'use client';

import { useMemo } from 'react';
import {
    Copy,
    Facebook,
    Linkedin,
    Mail,
    MessageCircle,
    Twitter,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogTitle,
    DialogDescription,
} from '@/components/ui/dialog';
import { copyShareUrl } from '@/lib/share';
import { cn } from '@/lib/utils';

type ShareDialogProps = {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    title?: string;
    text?: string;
    url?: string;
};

type ShareItem = {
    label: string;
    href?: string;
    onClick?: () => void;
    icon: React.ComponentType<{ className?: string }>;
    iconClassName: string;
    surfaceClassName: string;
};

function WhatsAppIcon({ className }: { className?: string }) {
    return (
        <svg
            className={className}
            viewBox="0 0 32 32"
            fill="currentColor"
            aria-hidden="true"
        >
            <path d="M19.11 17.2c-.27-.14-1.6-.79-1.85-.88-.25-.09-.43-.14-.61.14-.18.27-.7.88-.86 1.06-.16.18-.32.2-.59.07-.27-.14-1.16-.43-2.2-1.38-.81-.72-1.36-1.62-1.52-1.89-.16-.27-.02-.41.12-.55.12-.12.27-.32.41-.48.14-.16.18-.27.27-.45.09-.18.05-.34-.02-.48-.07-.14-.61-1.48-.84-2.03-.22-.54-.45-.47-.61-.47l-.52-.01c-.18 0-.47.07-.72.34-.25.27-.95.93-.95 2.26s.98 2.63 1.12 2.81c.14.18 1.93 2.95 4.67 4.14.65.28 1.16.44 1.56.56.66.21 1.26.18 1.73.11.53-.08 1.6-.65 1.82-1.27.23-.62.23-1.15.16-1.27-.07-.12-.25-.2-.52-.34z" />
            <path d="M16 3.2C9.05 3.2 3.4 8.85 3.4 15.8c0 2.23.58 4.31 1.6 6.12L3 29l7.25-1.9a12.52 12.52 0 0 0 5.75 1.4c6.95 0 12.6-5.65 12.6-12.6S22.95 3.2 16 3.2zm0 22.72c-1.94 0-3.85-.52-5.52-1.51l-.4-.24-4.3 1.12 1.15-4.18-.26-.43a10.4 10.4 0 0 1-1.61-5.56c0-5.74 4.68-10.4 10.4-10.4 5.73 0 10.4 4.66 10.4 10.4 0 5.72-4.67 10.4-10.4 10.4z" />
        </svg>
    );
}

function ShareTile({ item, disabled }: { item: ShareItem; disabled: boolean }) {
    const content = (
        <>
            <span
                className={cn(
                    'flex h-12 w-12 items-center justify-center rounded-2xl shadow-sm transition-all',
                    item.surfaceClassName,
                    disabled ? 'opacity-40' : 'group-hover:shadow-md'
                )}
            >
                <item.icon className={cn('h-5 w-5', item.iconClassName)} />
            </span>
            <span className="text-xs font-semibold text-foreground/90">{item.label}</span>
        </>
    );

    if (item.href) {
        const isExternal = item.href.startsWith('http');
        return (
            <a
                href={item.href}
                target={isExternal ? '_blank' : undefined}
                rel={isExternal ? 'noopener noreferrer' : undefined}
                aria-disabled={disabled}
                className={cn(
                    'group flex flex-col items-center gap-2 rounded-2xl px-2 py-3 text-center transition',
                    disabled ? 'pointer-events-none' : 'hover:bg-muted/40'
                )}
            >
                {content}
            </a>
        );
    }

    return (
        <button
            type="button"
            onClick={item.onClick}
            disabled={disabled}
            className={cn(
                'group flex flex-col items-center gap-2 rounded-2xl px-2 py-3 text-center transition',
                disabled ? 'cursor-not-allowed opacity-70' : 'hover:bg-muted/40'
            )}
        >
            {content}
        </button>
    );
}

export function ShareDialog({ open, onOpenChange, title, text, url }: ShareDialogProps) {
    const resolvedUrl = useMemo(() => {
        if (url) return url;
        if (typeof window === 'undefined') return '';
        return window.location.href;
    }, [url]);

    const shareTitle = title?.trim() || 'Share link';
    const shareText = [text?.trim() || title?.trim() || 'Check this out', resolvedUrl]
        .filter(Boolean)
        .join(' ');

    const encodedUrl = encodeURIComponent(resolvedUrl);
    const encodedText = encodeURIComponent(shareText);

    const shareItems: ShareItem[] = [
        {
            label: 'Copy link',
            onClick: () => copyShareUrl(resolvedUrl),
            icon: Copy,
            iconClassName: 'text-slate-700',
            surfaceClassName: 'bg-slate-100',
        },
        {
            label: 'WhatsApp',
            href: `https://wa.me/?text=${encodedText}`,
            icon: WhatsAppIcon,
            iconClassName: 'text-[#25D366]',
            surfaceClassName: 'bg-[#25D366]/15',
        },
        {
            label: 'Messages',
            href: `sms:?body=${encodedText}`,
            icon: MessageCircle,
            iconClassName: 'text-[#34C759]',
            surfaceClassName: 'bg-[#34C759]/15',
        },
        {
            label: 'X (Twitter)',
            href: `https://twitter.com/intent/tweet?text=${encodedText}`,
            icon: Twitter,
            iconClassName: 'text-[#0F1419]',
            surfaceClassName: 'bg-[#0F1419]/10',
        },
        {
            label: 'Facebook',
            href: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
            icon: Facebook,
            iconClassName: 'text-[#1877F2]',
            surfaceClassName: 'bg-[#1877F2]/15',
        },
        {
            label: 'LinkedIn',
            href: `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`,
            icon: Linkedin,
            iconClassName: 'text-[#0A66C2]',
            surfaceClassName: 'bg-[#0A66C2]/15',
        },
        {
            label: 'Email',
            href: `mailto:?subject=${encodeURIComponent(shareTitle)}&body=${encodedText}`,
            icon: Mail,
            iconClassName: 'text-slate-600',
            surfaceClassName: 'bg-slate-100',
        },
    ];

    const isDisabled = !resolvedUrl;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="overflow-hidden border-border/60 p-0 sm:max-w-md">
                <div className="relative px-6 pb-5 pt-6">
                    <div className="absolute inset-0 bg-gradient-to-br from-[var(--brand-cyan)]/20 via-background to-[var(--brand-teal)]/20" />
                    <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[var(--brand-teal)]/40 to-transparent" />
                    <div className="relative">
                        <span className="inline-flex items-center gap-2 rounded-full bg-background/80 px-3 py-1 text-xs font-semibold text-foreground shadow-sm ring-1 ring-border/60">
                            <span className="h-2 w-2 rounded-full bg-[var(--brand-teal)]" />
                            Share
                        </span>
                        <DialogTitle className="mt-3 text-xl font-display text-foreground">
                            {shareTitle}
                        </DialogTitle>
                        <DialogDescription className="mt-1 text-sm text-muted-foreground">
                            Choose where you want to share this link.
                        </DialogDescription>
                    </div>
                </div>

                <div className="px-6 pb-6 pt-4">
                    <div className="rounded-2xl border border-border/60 bg-muted/30 px-4 py-3">
                        <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                                <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                                    Share link
                                </p>
                                <p className="mt-1 break-all text-sm font-medium text-foreground/90">
                                    {resolvedUrl || 'No link available'}
                                </p>
                            </div>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => copyShareUrl(resolvedUrl)}
                                disabled={isDisabled}
                                className="shrink-0 border-[var(--brand-teal)]/40 text-foreground hover:bg-[var(--brand-cyan)]/10"
                            >
                                <Copy className="h-4 w-4" />
                                Copy
                            </Button>
                        </div>
                    </div>

                    <div className="mt-5 grid grid-cols-3 gap-3">
                        {shareItems.map((item) => (
                            <ShareTile key={item.label} item={item} disabled={isDisabled} />
                        ))}
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
