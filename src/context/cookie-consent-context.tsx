'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState, useTransition } from 'react';
import { readConsentPreferences, writeConsentPreferences, type ConsentPreferences } from '@/lib/consent';

interface CookieConsentContextValue {
    marketingAllowed: boolean;
    hasResponded: boolean;
    isBannerVisible: boolean;
    showDetailedPreferences: boolean;
    acceptAll: () => void;
    rejectMarketing: () => void;
    savePreferences: (marketing: boolean) => void;
    openPreferences: () => void;
    closeBanner: () => void;
}

const CookieConsentContext = createContext<CookieConsentContextValue | undefined>(undefined);

const DEFAULT_PREFERENCES: ConsentPreferences = {
    marketing: false
};

export function CookieConsentProvider({ children }: { children: React.ReactNode }) {
    const [preferences, setPreferences] = useState<ConsentPreferences>(DEFAULT_PREFERENCES);
    const [hasResponded, setHasResponded] = useState(false);
    const [isBannerVisible, setIsBannerVisible] = useState(false);
    const [showDetailedPreferences, setShowDetailedPreferences] = useState(false);
    const [, startTransition] = useTransition();

    useEffect(() => {
        const stored = readConsentPreferences();
        startTransition(() => {
            if (stored) {
                setPreferences(stored);
                setHasResponded(true);
                setIsBannerVisible(false);
            } else {
                setPreferences(DEFAULT_PREFERENCES);
                setHasResponded(false);
                setIsBannerVisible(true);
            }
        });
    }, [startTransition]);

    const persistPreferences = useCallback((marketing: boolean) => {
        const next = { marketing };
        setPreferences(next);
        setHasResponded(true);
        setIsBannerVisible(false);
        setShowDetailedPreferences(false);
        writeConsentPreferences(next);
    }, []);

    const acceptAll = useCallback(() => {
        persistPreferences(true);
    }, [persistPreferences]);

    const rejectMarketing = useCallback(() => {
        persistPreferences(false);
    }, [persistPreferences]);

    const openPreferences = useCallback(() => {
        setShowDetailedPreferences(true);
        setIsBannerVisible(true);
    }, []);

    const closeBanner = useCallback(() => {
        if (hasResponded || showDetailedPreferences) {
            setIsBannerVisible(false);
            setShowDetailedPreferences(false);
        }
    }, [hasResponded, showDetailedPreferences]);

    const savePreferences = useCallback(
        (marketing: boolean) => {
            persistPreferences(marketing);
        },
        [persistPreferences]
    );

    const contextValue = useMemo<CookieConsentContextValue>(
        () => ({
            marketingAllowed: preferences.marketing,
            hasResponded,
            isBannerVisible,
            showDetailedPreferences,
            acceptAll,
            rejectMarketing,
            savePreferences,
            openPreferences,
            closeBanner
        }),
        [
            preferences.marketing,
            hasResponded,
            isBannerVisible,
            showDetailedPreferences,
            acceptAll,
            rejectMarketing,
            savePreferences,
            openPreferences,
            closeBanner
        ]
    );

    return <CookieConsentContext.Provider value={contextValue}>{children}</CookieConsentContext.Provider>;
}

export function useCookieConsent() {
    const context = useContext(CookieConsentContext);
    if (!context) {
        throw new Error('useCookieConsent must be used within a CookieConsentProvider');
    }
    return context;
}
