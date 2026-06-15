'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, useTransition } from 'react';
import { usePathname } from 'next/navigation';
import { readConsentPreferences, writeConsentPreferences, type ConsentPreferences } from '@/lib/consent';
import { CONSENT_EVENT_VERSION, logConsentEvent, type ConsentEventSource } from '@/lib/consent-events';
import { useOptionalAuth } from '@/context/auth-context';
import api from '@/lib/api';
import { ConsentAccountSync } from '@/lib/consent-account-sync';
import { applyTrackingConsent } from '@/lib/tracking-consent';

interface CookieConsentContextValue {
    analyticsAllowed: boolean;
    marketingAllowed: boolean;
    hasResponded: boolean;
    isBannerVisible: boolean;
    showDetailedPreferences: boolean;
    consentSource: ConsentEventSource;
    setConsentNeeded: (
        needed: { analytics?: boolean; marketing?: boolean },
        source?: ConsentEventSource
    ) => void;
    setMarketingNeeded: (needed: boolean, source?: ConsentEventSource) => void;
    acceptAll: () => void;
    rejectOptional: () => void;
    rejectMarketing: () => void;
    savePreferences: (preferences: { analytics: boolean; marketing: boolean }) => void;
    openPreferences: (source?: ConsentEventSource) => void;
    closeBanner: () => void;
}

const CookieConsentContext = createContext<CookieConsentContextValue | undefined>(undefined);

const DEFAULT_PREFERENCES: ConsentPreferences = {
    analytics: false,
    marketing: false,
    version: 2
};

const EMBED_CONSENT_STORAGE_KEY = 'ht_embed_consent';

const parseStoredPreferences = (value: string | null): ConsentPreferences | null => {
    if (!value) {
        return null;
    }
    try {
        const parsed = JSON.parse(value) as ConsentPreferences;
        if (
            parsed.version === 2 &&
            typeof parsed.analytics === 'boolean' &&
            typeof parsed.marketing === 'boolean'
        ) {
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
    const accountSyncRef = useRef(new ConsentAccountSync());

    const auth = useOptionalAuth();
    const authUserId = auth?.user?.id ?? null;

    // Load consent from cookie on mount
    useEffect(() => {
        const stored = isEmbedRoute ? readEmbedConsentPreferences() : readConsentPreferences();
        startTransition(() => {
            if (stored) {
                applyTrackingConsent(stored);
                setPreferences(stored);
                setHasResponded(true);
            } else {
                applyTrackingConsent(DEFAULT_PREFERENCES);
                setPreferences(DEFAULT_PREFERENCES);
                setHasResponded(false);
            }
            setIsBannerVisible(false);
        });
    }, [isEmbedRoute, startTransition]);

    const setConsentNeeded = useCallback((
        needed: { analytics?: boolean; marketing?: boolean },
        source: ConsentEventSource = 'event_page'
    ) => {
        const needsConsent = Boolean(needed.analytics || needed.marketing);
        if (!needsConsent) {
            setIsBannerVisible(false);
            setShowDetailedPreferences(false);
            return;
        }
        setConsentSource(source);
        if (!hasResponded) {
            setIsBannerVisible(true);
        }
    }, [hasResponded]);

    const setMarketingNeeded = useCallback((needed: boolean, source: ConsentEventSource = 'event_page') => {
        setConsentNeeded({ marketing: needed }, source);
    }, [setConsentNeeded]);

    // Sync consent from DB when user logs in (DB takes precedence if set)
    useEffect(() => {
        const accountSync = accountSyncRef.current;
        if (!authUserId || isEmbedRoute) {
            accountSync.setIdentity(null);
            return;
        }

        void accountSync.hydrate(authUserId, {
            load: () => api.get('/api/v1/auth/me/consent'),
            readLocal: readConsentPreferences,
            applyRemote: (dbPreferences) => {
                applyTrackingConsent(dbPreferences);
                setPreferences(dbPreferences);
                setHasResponded(true);
                setIsBannerVisible(false);
                writeConsentPreferences(dbPreferences); // Sync cookie with DB
            },
            write: (nextPreferences) => api.patch('/api/v1/auth/me/consent', {
                analytics: nextPreferences.analytics,
                marketing: nextPreferences.marketing,
                version: 2
            })
        }).catch(() => {
            // Silently fail - cookie consent still works
        });

        return () => accountSync.cancelHydration(authUserId);
    }, [authUserId, isEmbedRoute]);

    const persistPreferences = useCallback((
        preferenceInput: { analytics: boolean; marketing: boolean },
        source: ConsentEventSource = consentSource
    ) => {
        const next: ConsentPreferences = {
            analytics: preferenceInput.analytics,
            marketing: preferenceInput.marketing,
            updatedAt: new Date().toISOString(),
            version: 2
        };
        const accountWrite = authUserId && !isEmbedRoute
            ? accountSyncRef.current.persist(
                authUserId,
                next,
                (nextPreferences) => api.patch('/api/v1/auth/me/consent', {
                    analytics: nextPreferences.analytics,
                    marketing: nextPreferences.marketing,
                    version: 2
                })
            )
            : null;
        const action = hasResponded
            ? 'updated'
            : next.analytics || next.marketing
                ? 'accepted'
                : 'rejected';
        applyTrackingConsent(next);
        setPreferences(next);
        setHasResponded(true);
        setIsBannerVisible(false);
        setShowDetailedPreferences(false);
        if (isEmbedRoute) {
            writeEmbedConsentPreferences(next);
        } else {
            writeConsentPreferences(next);
        }

        if (accountWrite) {
            accountWrite.catch(() => {
                // Silently fail - cookie consent still works as fallback
            });
        }
        void logConsentEvent({
            action,
            analytics: next.analytics,
            marketing: next.marketing,
            source: isEmbedRoute ? 'embed' : source,
            version: CONSENT_EVENT_VERSION
        });
    }, [authUserId, consentSource, hasResponded, isEmbedRoute]);

    const acceptAll = useCallback(() => {
        persistPreferences({ analytics: true, marketing: true });
    }, [persistPreferences]);

    const rejectOptional = useCallback(() => {
        persistPreferences({ analytics: false, marketing: false });
    }, [persistPreferences]);

    const rejectMarketing = rejectOptional;

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
        (nextPreferences: { analytics: boolean; marketing: boolean }) => {
            persistPreferences(nextPreferences);
        },
        [persistPreferences]
    );

    const contextValue = useMemo<CookieConsentContextValue>(
        () => ({
            analyticsAllowed: preferences.analytics,
            marketingAllowed: preferences.marketing,
            hasResponded,
            isBannerVisible,
            showDetailedPreferences,
            consentSource,
            setConsentNeeded,
            setMarketingNeeded,
            acceptAll,
            rejectOptional,
            rejectMarketing,
            savePreferences,
            openPreferences,
            closeBanner
        }),
        [
            preferences.analytics,
            preferences.marketing,
            hasResponded,
            isBannerVisible,
            showDetailedPreferences,
            consentSource,
            setConsentNeeded,
            setMarketingNeeded,
            acceptAll,
            rejectOptional,
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
