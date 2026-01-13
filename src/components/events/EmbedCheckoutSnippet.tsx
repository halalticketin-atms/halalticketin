'use client';

import { useMemo, useState } from 'react';
import { Copy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { toast } from '@/lib/notifications';
import { buildEmbedCheckoutSnippet, type EmbedTheme } from '@/lib/embed';

export function EmbedCheckoutSnippet({
    slug,
    canCopy,
    isLive,
    isPublic,
    siteUrl,
}: {
    slug: string | null;
    canCopy: boolean;
    isLive: boolean;
    isPublic: boolean;
    siteUrl?: string;
}) {
    const [theme, setTheme] = useState<EmbedTheme>('light');

    const resolvedSiteUrl = useMemo(() => {
        if (siteUrl) return siteUrl;
        if (typeof window === 'undefined') return 'https://halalticketin.com';
        return window.location.origin;
    }, [siteUrl]);

    const resolvedSlug = slug ?? 'your-event-slug';

    const snippet = useMemo(
        () => buildEmbedCheckoutSnippet({ slug: resolvedSlug, theme, siteUrl: resolvedSiteUrl }),
        [resolvedSlug, theme, resolvedSiteUrl],
    );

    const handleCopy = async () => {
        if (typeof navigator === 'undefined' || !navigator.clipboard?.writeText) {
            toast.error('Clipboard access is not available.');
            return;
        }
        try {
            await navigator.clipboard.writeText(snippet);
            toast.success('Embed code copied');
        } catch {
            toast.error('Unable to copy embed code');
        }
    };

    return (
        <Card className="border-dashed border-primary/30 bg-gradient-to-br from-primary/5 via-background to-background">
            <CardHeader className="space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                        <CardTitle className="text-lg">Embed checkout widget</CardTitle>
                        <p className="text-sm text-muted-foreground">
                            Paste this snippet into your website to embed ticket checkout.
                        </p>
                    </div>
                    <Badge variant={isLive ? 'default' : 'secondary'}>
                        {isLive ? 'Live embed' : canCopy ? 'Draft embed' : 'Save draft'}
                    </Badge>
                </div>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="flex flex-wrap items-center gap-3">
                    <div className="w-40">
                        <Select value={theme} onValueChange={(value) => setTheme(value as EmbedTheme)}>
                            <SelectTrigger>
                                <SelectValue placeholder="Theme" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="light">Light theme</SelectItem>
                                <SelectItem value="dark">Dark theme</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <p className="text-xs text-muted-foreground">
                        The widget will match this theme inside the iframe.
                    </p>
                </div>

                <Textarea value={snippet} readOnly rows={4} className="font-mono text-xs" />

                {!canCopy && (
                    <p className="text-xs text-muted-foreground">
                        Save your draft once to generate the embed code.
                    </p>
                )}
                {canCopy && !isLive && (
                    <p className="text-xs text-muted-foreground">
                        This embed will go live once the event is published{isPublic ? '' : ' and set to public'}.
                    </p>
                )}

                <div className="flex items-center justify-between gap-3">
                    <p className="text-xs text-muted-foreground">
                        Event slug: <span className="font-medium text-foreground">{resolvedSlug}</span>
                    </p>
                    <Button onClick={handleCopy} disabled={!canCopy} className="gap-2">
                        <Copy className="h-4 w-4" />
                        Copy embed code
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
}
