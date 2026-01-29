'use client';

import { useEffect, useState, useTransition } from 'react';
import { usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle
} from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { useCookieConsent } from '@/context/cookie-consent-context';

export function CookieBanner() {
    const pathname = usePathname();
    const isEmbedRoute = Boolean(pathname?.startsWith('/embed'));
    const {
        isBannerVisible,
        showDetailedPreferences,
        marketingAllowed,
        acceptAll,
        rejectMarketing,
        savePreferences,
        openPreferences,
        closeBanner
    } = useCookieConsent();
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [pendingMarketing, setPendingMarketing] = useState(marketingAllowed);
    const [, startTransition] = useTransition();

    useEffect(() => {
        if (isBannerVisible && showDetailedPreferences) {
            startTransition(() => {
                setPendingMarketing(marketingAllowed);
                setIsDialogOpen(true);
            });
        }
    }, [isBannerVisible, showDetailedPreferences, marketingAllowed, startTransition]);

    useEffect(() => {
        if (!isBannerVisible) {
            startTransition(() => setIsDialogOpen(false));
        }
    }, [isBannerVisible, startTransition]);

    const handleOpenPreferences = () => {
        openPreferences();
        setPendingMarketing(marketingAllowed);
        setIsDialogOpen(true);
    };

    const handleDialogChange = (open: boolean) => {
        setIsDialogOpen(open);
        if (!open) {
            setPendingMarketing(marketingAllowed);
            if (showDetailedPreferences) {
                closeBanner();
            }
        }
    };

    const handleSavePreferences = () => {
        savePreferences(pendingMarketing);
    };

    if (!isBannerVisible) {
        return null;
    }

    if (isEmbedRoute) {
        return (
            <div className="fixed bottom-3 right-3 z-50 w-[calc(100%-1.5rem)] max-w-[320px]">
                <div className="rounded-2xl border border-border/60 bg-background/95 p-4 shadow-[0_18px_45px_rgba(0,0,0,0.2)] backdrop-blur-sm">
                    <div className="space-y-2">
                        <p className="text-sm font-semibold">We use cookies</p>
                        <p className="text-xs text-muted-foreground">
                            Essential cookies keep the site running. With your permission, we use marketing cookies to help organisers
                            understand how people find their events.
                        </p>
                    </div>
                    <div className="mt-3 flex items-center gap-2">
                        <Button onClick={acceptAll} size="sm" className="flex-1 rounded-full">
                            Accept all
                        </Button>
                        <Button variant="ghost" onClick={rejectMarketing} size="sm" className="flex-1 rounded-full">
                            Necessary only
                        </Button>
                    </div>
                    <a
                        href="/privacy"
                        target="_blank"
                        rel="noreferrer"
                        className="mt-3 inline-flex text-[11px] text-muted-foreground underline underline-offset-2"
                    >
                        Privacy &amp; cookie policy
                    </a>
                </div>
            </div>
        );
    }

    return (
        <>
            {!isDialogOpen && !showDetailedPreferences && (
                <div className="fixed bottom-4 right-4 z-50 w-[calc(100%-2rem)] max-w-sm rounded-2xl border bg-background/98 md:bg-background/95 p-5 shadow-2xl md:backdrop-blur">
                    <div className="flex flex-col gap-4">
                        <div>
                            <h3 className="text-base font-semibold">We use cookies</h3>
                            <p className="text-sm text-muted-foreground">
                                Essential cookies keep the site running. With your permission, we use marketing cookies to help organisers
                                understand how people find their events.
                            </p>
                        </div>
                        <div className="flex items-center gap-3">
                            <Button onClick={acceptAll} size="sm" className="flex-1">
                                Accept all
                            </Button>
                            <Button variant="outline" onClick={rejectMarketing} size="sm" className="flex-1">
                                Necessary only
                            </Button>
                        </div>
                        <button
                            onClick={handleOpenPreferences}
                            className="min-h-8 inline-flex items-center px-2 text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground transition-colors self-start"
                        >
                            Manage settings
                        </button>
                    </div>
                </div>
            )}
            <Dialog open={isDialogOpen} onOpenChange={handleDialogChange}>
                <DialogContent className="sm:max-w-lg max-h-[calc(100dvh-2rem)] sm:max-h-[90dvh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Cookie preferences</DialogTitle>
                        <DialogDescription>
                            Essential storage is always on. You can choose whether to enable marketing cookies that help organisers
                            understand how people find their events.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-2">
                        <div className="flex items-center justify-between rounded-lg border p-4">
                            <div>
                                <p className="font-medium">Marketing storage</p>
                                <p className="text-sm text-muted-foreground">
                                    Helps organisers understand how people discover their events.
                                </p>
                            </div>
                            <Switch checked={pendingMarketing} onCheckedChange={setPendingMarketing} />
                        </div>
                    </div>
                    <div className="flex justify-end gap-3">
                        <Button variant="outline" onClick={() => handleDialogChange(false)}>
                            Cancel
                        </Button>
                        <Button onClick={handleSavePreferences}>Save preferences</Button>
                    </div>
                </DialogContent>
            </Dialog>
        </>
    );
}
