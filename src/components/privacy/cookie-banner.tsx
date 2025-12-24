'use client';

import { useEffect, useState, useTransition } from 'react';
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

    return (
        <>
            {!isDialogOpen && !showDetailedPreferences && (
                <div className="fixed bottom-4 right-4 z-50 w-[calc(100%-2rem)] max-w-sm rounded-2xl border bg-background/98 md:bg-background/95 p-5 shadow-2xl md:backdrop-blur">
                    <div className="flex flex-col gap-4">
                        <div>
                            <h3 className="text-base font-semibold">This website uses cookies</h3>
                            <p className="text-sm text-muted-foreground">
                                We use cookies to improve your experience and help organisers measure their ads.
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
                            className="text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground transition-colors self-start"
                        >
                            Manage settings
                        </button>
                    </div>
                </div>
            )}
            <Dialog open={isDialogOpen} onOpenChange={handleDialogChange}>
                <DialogContent className="sm:max-w-lg">
                    <DialogHeader>
                        <DialogTitle>Cookie preferences</DialogTitle>
                        <DialogDescription>
                            Essential storage is always active. Enable marketing storage only if you want organisers to
                            measure ads with Meta Pixels.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-2">
                        <div className="flex items-center justify-between rounded-lg border p-4">
                            <div>
                                <p className="font-medium">Marketing storage</p>
                                <p className="text-sm text-muted-foreground">
                                    Allows organisers to measure their ad performance using Meta Pixel.
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
