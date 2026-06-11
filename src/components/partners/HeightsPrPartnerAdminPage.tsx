'use client';

import { useCallback, useEffect, useState } from 'react';

import { HeightsPrPartnerAdminView } from './HeightsPrPartnerAdminView';
import {
    getHeightsPrPartnerOrganizers,
    type HeightsPrPartnerOrganizer,
} from '@/lib/heightspr-partner-api';
import { ApiError } from '@/lib/api';

type LoadState = 'loading' | 'loaded' | 'unauthenticated' | 'forbidden' | 'error';

export function HeightsPrPartnerAdminPage() {
    const [state, setState] = useState<LoadState>('loading');
    const [organizers, setOrganizers] = useState<HeightsPrPartnerOrganizer[]>([]);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    const loadOrganizers = useCallback(async (options: { showLoading?: boolean } = {}) => {
        if (options.showLoading !== false) {
            setState('loading');
            setErrorMessage(null);
        }

        try {
            const response = await getHeightsPrPartnerOrganizers();
            setOrganizers(response.data);
            setState('loaded');
        } catch (error) {
            setOrganizers([]);
            if (error instanceof ApiError && error.status === 401) {
                setState('unauthenticated');
                return;
            }
            if (error instanceof ApiError && error.status === 403) {
                setState('forbidden');
                return;
            }
            setErrorMessage(error instanceof Error ? error.message : null);
            setState('error');
        }
    }, []);

    useEffect(() => {
        let cancelled = false;

        getHeightsPrPartnerOrganizers()
            .then((response) => {
                if (cancelled) return;
                setOrganizers(response.data);
                setState('loaded');
            })
            .catch((error) => {
                if (cancelled) return;
                setOrganizers([]);
                if (error instanceof ApiError && error.status === 401) {
                    setState('unauthenticated');
                    return;
                }
                if (error instanceof ApiError && error.status === 403) {
                    setState('forbidden');
                    return;
                }
                setErrorMessage(error instanceof Error ? error.message : null);
                setState('error');
            });

        return () => {
            cancelled = true;
        };
    }, []);

    return (
        <HeightsPrPartnerAdminView
            state={state}
            organizers={organizers}
            errorMessage={errorMessage}
            onRetry={loadOrganizers}
        />
    );
}
