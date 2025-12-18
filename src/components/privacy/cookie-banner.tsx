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
            <div className="fixed bottom-4 right-4 z-50 w-[calc(100%-2rem)] max-w-md rounded-2xl border bg-background/95 p-6 shadow-2xl backdrop-blur">
                <div className="flex flex-col gap-4">
                    <div>
                        <h3 className="text-lg font-semibold">Cookies &amp; Privacy</h3>
                        <p className="text-sm text-muted-foreground">
                            We use essential cookies to make Halal Ticketin&apos; work. Optional cookies (like organisers&apos;
                            Meta Pixels) only run after you accept them, helping organisers measure their ads.
                        </p>
                    </div>
                    <div className="flex flex-wrap gap-3">
                        <Button variant="outline" onClick={rejectMarketing} className="flex-1 sm:flex-none">
                            Essential only
                        </Button>
                        <Button onClick={acceptAll} className="flex-1 sm:flex-none">
                            Accept all cookies
                        </Button>
                        <Button variant="ghost" onClick={handleOpenPreferences} className="flex-1 sm:flex-none">
                            Manage preferences
                        </Button>
                    </div>
                </div>
            </div>
            <Dialog open={isDialogOpen} onOpenChange={handleDialogChange}>
                <DialogContent className="sm:max-w-lg">
                    <DialogHeader>
                        <DialogTitle>Cookie preferences</DialogTitle>
                        <DialogDescription>
                            Toggle marketing cookies whenever you like. Essential cookies are always active.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-2">
                        <div className="flex items-center justify-between rounded-lg border p-4">
                            <div>
                                <p className="font-medium">Marketing cookies</p>
                                <p className="text-sm text-muted-foreground">
                                    Allow organisers&apos; Meta Pixels so they can optimise their ads.
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
