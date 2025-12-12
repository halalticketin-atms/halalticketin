'use client';

import { useParams } from 'next/navigation';
import { useEffect } from 'react';

import { useOrganizers } from '@/context/organizer-context';

export function useOrganizerFromParams() {
    const params = useParams<{ organizerId?: string }>();
    const organizerId = typeof params?.organizerId === 'string' ? params.organizerId : null;
    const { setActiveOrganizerId } = useOrganizers();

    useEffect(() => {
        if (organizerId) {
            setActiveOrganizerId(organizerId);
        }
    }, [organizerId, setActiveOrganizerId]);

    return organizerId;
}
