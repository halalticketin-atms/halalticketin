'use client';

import { useMemo, useState } from 'react';
import { Check, Copy, Moon, Sun, LayoutPanelLeft, Maximize, Code2, LayoutTemplate } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { toast } from '@/lib/notifications';
import { buildEmbedCheckoutSnippet, type EmbedTheme } from '@/lib/embed';

export function EmbedCheckoutSnippet({
    slug,
    canCopy,
    isLive,
    siteUrl,
}: {
    slug: string | null;
    canCopy: boolean;
    isLive: boolean;
    isPublic: boolean;
    siteUrl?: string;
}) {
    const [theme, setTheme] = useState<EmbedTheme>('light');
    const [selectedLayout, setSelectedLayout] = useState<'default' | 'side' | 'full'>('default');
    const [copied, setCopied] = useState(false);

    const resolvedSiteUrl = useMemo(() => {
        if (siteUrl) return siteUrl;
        if (typeof window === 'undefined') return 'https://halalticketin.com';
        return window.location.origin;
    }, [siteUrl]);

    const resolvedSlug = slug ?? 'your-event-slug';

    // Generate snippets
    const defaultSnippet = useMemo(
        () => buildEmbedCheckoutSnippet({ slug: resolvedSlug, theme, siteUrl: resolvedSiteUrl }),
        [resolvedSlug, theme, resolvedSiteUrl],
    );
    const sideSnippet = useMemo(
        () => [
            `<div style="max-width: 380px;">`,
            `  <div id="halal-ticketin-checkout" data-event-slug="${resolvedSlug}" data-theme="${theme}" data-height="720px"></div>`,
            `</div>`,
            `<script src="${resolvedSiteUrl.replace(/\/$/, '')}/embed/checkout.js"></script>`,
        ].join('\n'),
        [resolvedSiteUrl, resolvedSlug, theme],
    );

    const fullSnippet = useMemo(
        () => [
            `<div id="halal-ticketin-checkout" data-event-slug="${resolvedSlug}" data-theme="${theme}" data-height="1100px"></div>`,
            `<script src="${resolvedSiteUrl.replace(/\/$/, '')}/embed/checkout.js"></script>`,
        ].join('\n'),
        [resolvedSiteUrl, resolvedSlug, theme],
    );

    const currentSnippet =
        selectedLayout === 'default' ? defaultSnippet : selectedLayout === 'side' ? sideSnippet : fullSnippet;

    const handleCopySnippet = async () => {
        if (!navigator.clipboard?.writeText) {
            toast.error('Clipboard access is not available.');
            return;
        }
        try {
            await navigator.clipboard.writeText(currentSnippet);
            toast.success('Code copied to clipboard');
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch {
            toast.error('Unable to copy embed code');
        }
    };

    return (
        <div className="grid gap-6 lg:grid-cols-12 md:gap-8">
            {/* Left Column: Configuration */}
            <div className="lg:col-span-5 space-y-6">
                {/* Status Indicator */}
                <div className="flex items-center gap-3">
                    <div className={cn(
                        "h-2.5 w-2.5 rounded-full ring-2 ring-offset-2 ring-offset-background",
                        isLive ? "bg-emerald-500 ring-emerald-500/30" : "bg-amber-500 ring-amber-500/30"
                    )} />
                    <span className="text-sm font-medium text-muted-foreground">
                        {!canCopy ? 'Save draft to generate code' : isLive ? 'Ready for your website' : 'Publish to make it live'}
                    </span>
                </div>

                <div className="space-y-4">
                    {/* Theme Selection */}
                    <div className="space-y-3">
                        <label className="text-sm font-medium">Theme</label>
                        <div className="grid grid-cols-2 gap-2 p-1 bg-muted/40 rounded-lg border border-border/50">
                            <button
                                onClick={() => setTheme('light')}
                                className={cn(
                                    "flex items-center justify-center gap-2 px-4 py-2.5 rounded-md text-sm font-medium transition-all duration-200",
                                    theme === 'light'
                                        ? "bg-background text-foreground shadow-sm ring-1 ring-border/50"
                                        : "text-muted-foreground hover:text-foreground hover:bg-background/50"
                                )}
                            >
                                <Sun className="h-4 w-4" />
                                Light
                            </button>
                            <button
                                onClick={() => setTheme('dark')}
                                className={cn(
                                    "flex items-center justify-center gap-2 px-4 py-2.5 rounded-md text-sm font-medium transition-all duration-200",
                                    theme === 'dark'
                                        ? "bg-slate-900 text-white shadow-sm"
                                        : "text-muted-foreground hover:text-foreground hover:bg-background/50"
                                )}
                            >
                                <Moon className="h-4 w-4" />
                                Dark
                            </button>
                        </div>
                    </div>

                    {/* Layout Selection */}
                    <div className="space-y-3">
                        <label className="text-sm font-medium">Layout</label>
                        <div className="grid gap-3">
                            <div
                                onClick={() => setSelectedLayout('default')}
                                className={cn(
                                    "relative flex items-center gap-4 p-3 rounded-xl border-2 transition-all cursor-pointer hover:bg-muted/30",
                                    selectedLayout === 'default'
                                        ? "border-primary bg-primary/5"
                                        : "border-border/50"
                                )}
                            >
                                <div className={cn(
                                    "h-10 w-10 rounded-lg flex items-center justify-center transition-colors",
                                    selectedLayout === 'default' ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                                )}>
                                    <LayoutTemplate className="h-5 w-5" />
                                </div>
                                <div className="flex-1">
                                    <p className="font-medium text-sm">Default</p>
                                </div>
                                {selectedLayout === 'default' && (
                                    <div className="h-2 w-2 rounded-full bg-primary absolute right-3 top-3" />
                                )}
                            </div>
                            <div
                                onClick={() => setSelectedLayout('side')}
                                className={cn(
                                    "relative flex items-center gap-4 p-3 rounded-xl border-2 transition-all cursor-pointer hover:bg-muted/30",
                                    selectedLayout === 'side'
                                        ? "border-primary bg-primary/5"
                                        : "border-border/50"
                                )}
                            >
                                <div className={cn(
                                    "h-10 w-10 rounded-lg flex items-center justify-center transition-colors",
                                    selectedLayout === 'side' ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                                )}>
                                    <LayoutPanelLeft className="h-5 w-5" />
                                </div>
                                <div className="flex-1">
                                    <p className="font-medium text-sm">Side Panel</p>
                                </div>
                                {selectedLayout === 'side' && (
                                    <div className="h-2 w-2 rounded-full bg-primary absolute right-3 top-3" />
                                )}
                            </div>

                            <div
                                onClick={() => setSelectedLayout('full')}
                                className={cn(
                                    "relative flex items-center gap-4 p-3 rounded-xl border-2 transition-all cursor-pointer hover:bg-muted/30",
                                    selectedLayout === 'full'
                                        ? "border-primary bg-primary/5"
                                        : "border-border/50"
                                )}
                            >
                                <div className={cn(
                                    "h-10 w-10 rounded-lg flex items-center justify-center transition-colors",
                                    selectedLayout === 'full' ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                                )}>
                                    <Maximize className="h-5 w-5" />
                                </div>
                                <div className="flex-1">
                                    <p className="font-medium text-sm">Full Width</p>
                                </div>
                                {selectedLayout === 'full' && (
                                    <div className="h-2 w-2 rounded-full bg-primary absolute right-3 top-3" />
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Right Column: Code Preview */}
            <div className="lg:col-span-7">
                <Card className="h-full border-border/50 bg-card shadow-xl overflow-hidden flex flex-col">
                    <div className="flex items-center justify-between px-4 py-3 border-b border-border/10 bg-muted/30">
                        <div className="flex items-center gap-2">
                            <div className="flex gap-1.5">
                                <div className="w-2.5 h-2.5 rounded-full bg-destructive/20 ring-1 ring-destructive/30" />
                                <div className="w-2.5 h-2.5 rounded-full bg-amber-500/20 ring-1 ring-amber-500/30" />
                                <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/20 ring-1 ring-emerald-500/30" />
                            </div>
                            <span className="ml-3 text-xs font-mono text-muted-foreground/60">embed.html</span>
                        </div>
                        <Button
                            size="sm"
                            variant="secondary"
                            className={cn(
                                "h-7 gap-1.5 text-xs transition-all",
                                copied ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" : "bg-primary/5 hover:bg-primary/10 text-primary"
                            )}
                            onClick={handleCopySnippet}
                            disabled={!canCopy}
                        >
                            {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                            {copied ? 'Copied!' : 'Copy Code'}
                        </Button>
                    </div>
                    <div className="p-4 overflow-x-auto custom-scrollbar flex-1 relative group bg-muted/5">
                        <pre className="text-xs sm:text-sm font-mono leading-relaxed text-foreground/80 whitespace-pre-wrap break-all">
                            {currentSnippet}
                        </pre>

                        {/* Mask for disabled state */}
                        {!canCopy && (
                            <div className="absolute inset-0 bg-background/60 backdrop-blur-[1px] flex items-center justify-center p-4 text-center">
                                <p className="text-sm font-medium text-foreground/80 bg-background px-4 py-2 rounded-full shadow-lg border border-border/50">
                                    Save your event first to generate code
                                </p>
                            </div>
                        )}
                    </div>
                    {/* Helper tip footer */}
                    <div className="bg-muted/30 px-4 py-3 border-t border-border/10">
                        <p className="text-[11px] text-muted-foreground/70 flex items-center gap-2">
                            <Code2 className="h-3 w-3" />
                            Paste this code anywhere in your website&apos;s body tag
                        </p>
                    </div>
                </Card>
            </div>
        </div>
    );
}
