'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, useTransition } from 'react';
import { usePathname } from 'next/navigation';
import { readConsentPreferences, writeConsentPreferences, type ConsentPreferences } from '@/lib/consent';
import { CONSENT_EVENT_VERSION, logConsentEvent, type ConsentEventSource } from '@/lib/consent-events';
import { useOptionalAuth } from '@/context/auth-context';
import api from '@/lib/api';

interface CookieConsentContextValue {
    marketingAllowed: boolean;
    hasResponded: boolean;
    isBannerVisible: boolean;
    showDetailedPreferences: boolean;
    consentSource: ConsentEventSource;
    setMarketingNeeded: (needed: boolean, source?: ConsentEventSource) => void;
    acceptAll: () => void;
    rejectMarketing: () => void;
    savePreferences: (marketing: boolean) => void;
    openPreferences: (source?: ConsentEventSource) => void;
    closeBanner: () => void;
}

const CookieConsentContext = createContext<CookieConsentContextValue | undefined>(undefined);

const DEFAULT_PREFERENCES: ConsentPreferences = {
    marketing: false
};

const EMBED_CONSENT_STORAGE_KEY = 'ht_embed_consent';

const parseStoredPreferences = (value: string | null): ConsentPreferences | null => {
    if (!value) {
        return null;
    }
    try {
        const parsed = JSON.parse(value) as ConsentPreferences;
        if (typeof parsed.marketing === 'boolean') {
            return parsed;
        }
    } catch {
        // ignore malformed storage
    }
    return null;
};

const readEmbedConsentPreferences = (): ConsentPreferences | null => {
    if (typeof window === 'undefined') {
        return null;
    }
    try {
        const stored = window.sessionStorage.getItem(EMBED_CONSENT_STORAGE_KEY);
        const parsed = parseStoredPreferences(stored);
        return parsed ?? readConsentPreferences();
    } catch {
        return readConsentPreferences();
    }
};

const writeEmbedConsentPreferences = (preferences: ConsentPreferences) => {
    if (typeof window === 'undefined') {
        return;
    }
    try {
        window.sessionStorage.setItem(EMBED_CONSENT_STORAGE_KEY, JSON.stringify(preferences));
    } catch {
        // Ignore storage errors (e.g., privacy mode).
    }
    try {
        if (!readConsentPreferences()) {
            writeConsentPreferences(preferences);
        }
    } catch {
        // Ignore cookie write errors.
    }
};


export function CookieConsentProvider({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const isEmbedRoute = Boolean(pathname?.startsWith('/embed'));
    const [preferences, setPreferences] = useState<ConsentPreferences>(DEFAULT_PREFERENCES);
    const [hasResponded, setHasResponded] = useState(false);
    const [isBannerVisible, setIsBannerVisible] = useState(false);
    const [showDetailedPreferences, setShowDetailedPreferences] = useState(false);
    const [consentSource, setConsentSource] = useState<ConsentEventSource>('event_page');
    const [, startTransition] = useTransition();
    const hasSyncedCookieToDbRef = useRef(false);

    const auth = useOptionalAuth();
    const isLoggedIn = auth?.user !== null && auth?.user !== undefined;

    // Load consent from cookie on mount
    useEffect(() => {
        const stored = isEmbedRoute ? readEmbedConsentPreferences() : readConsentPreferences();
        startTransition(() => {
            if (stored) {
                setPreferences(stored);
                setHasResponded(true);
            } else {
                setPreferences(DEFAULT_PREFERENCES);
                setHasResponded(false);
            }
            setIsBannerVisible(false);
        });
    }, [isEmbedRoute, startTransition]);

    const setMarketingNeeded = useCallback((needed: boolean, source: ConsentEventSource = 'event_page') => {
        if (!needed) {
            setIsBannerVisible(false);
            setShowDetailedPreferences(false);
            return;
        }
        setConsentSource(source);
        if (!hasResponded) {
            setIsBannerVisible(true);
        }
    }, [hasResponded]);

    // Sync consent from DB when user logs in (DB takes precedence if set)
    useEffect(() => {
        if (!isLoggedIn || isEmbedRoute) return;
        hasSyncedCookieToDbRef.current = false;

        const syncFromDb = async () => {
            try {
                const response = await api.get<{ marketing: boolean; updatedAt: string | null }>('/api/v1/auth/me/consent');
                // If DB has a consent record, use it
                if (response.updatedAt !== null) {
                    const dbPreferences = { marketing: response.marketing };
                    setPreferences(dbPreferences);
                    setHasResponded(true);
                    setIsBannerVisible(false);
                    writeConsentPreferences(dbPreferences); // Sync cookie with DB
                    hasSyncedCookieToDbRef.current = true;
                    return;
                }

                // If the user already made a cookie choice before logging in,
                // persist that choice to the DB so it follows them across devices.
                if (hasResponded && !hasSyncedCookieToDbRef.current) {
                    await api.patch('/api/v1/auth/me/consent', { marketing: preferences.marketing });
                    hasSyncedCookieToDbRef.current = true;
                }
            } catch {
                // Silently fail - cookie consent still works
            }
        };

        syncFromDb();
    }, [isEmbedRoute, isLoggedIn, hasResponded, preferences.marketing]);

    const persistPreferences = useCallback((marketing: boolean, source: ConsentEventSource = consentSource) => {
        const next = { marketing };
        const action = hasResponded ? 'updated' : marketing ? 'accepted' : 'rejected';
        setPreferences(next);
        setHasResponded(true);
        setIsBannerVisible(false);
        setShowDetailedPreferences(false);
        if (isEmbedRoute) {
            writeEmbedConsentPreferences(next);
        } else {
            writeConsentPreferences(next);
        }

        // If logged in, also sync to database
        if (isLoggedIn && !isEmbedRoute) {
            api.patch('/api/v1/auth/me/consent', { marketing }).catch(() => {
                // Silently fail - cookie consent still works as fallback
            });
        }
        void logConsentEvent({
            action,
            marketing,
            source: isEmbedRoute ? 'embed' : source,
            version: CONSENT_EVENT_VERSION
        });
    }, [consentSource, hasResponded, isEmbedRoute, isLoggedIn]);

    const acceptAll = useCallback(() => {
        persistPreferences(true);
    }, [persistPreferences]);

    const rejectMarketing = useCallback(() => {
        persistPreferences(false);
    }, [persistPreferences]);

    const openPreferences = useCallback((source: ConsentEventSource = 'footer') => {
        setConsentSource(source);
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
            consentSource,
            setMarketingNeeded,
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
            consentSource,
            setMarketingNeeded,
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
