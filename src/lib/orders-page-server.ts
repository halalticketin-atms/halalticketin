import 'server-only';

import { cache } from 'react';
import type { EventRecord } from '@/lib/events-api';
import { getOrdersPageUrlState } from '@/lib/orders-attendees-ui';
import { getOrdersResourcePaths, type OrdersPageSeed, type OrdersResponse, type TicketBreakdownResponse } from '@/lib/orders-page-data';
import { fetchPrivateJson, getVerifiedWebSession } from '@/lib/web-session-server';
import type { EventScope } from '@/types';

const scopeAllows = (scope: EventScope, eventIds: string[]): boolean =>
    scope.mode === 'all' || (scope.mode === 'limited' && scope.eventIds.length > 0 &&
        eventIds.every(id => scope.eventIds.includes(id)));

// React cache is request-local, including when the fetch helper uses a timeout signal.
export const getOrdersPageSeed = cache(async (organizerId: string, queryKey: string): Promise<OrdersPageSeed | null> => {
    const state = getOrdersPageUrlState(new URLSearchParams(queryKey));
    if (state.pageTab !== 'orders') return null;
    const session = await getVerifiedWebSession();
    if (!session?.seed.profile.user || session.seed.profile.needsOnboarding) return null;
    const userId = session.seed.profile.user.id;
    const { profile, organizers, nonce } = session.seed;
    const organizer = organizers.find(entry => entry.id === organizerId && entry.status === 'active');
    const membership = profile.memberships.find(entry => entry.organizerId === organizerId && entry.status === 'active');
    if (!organizer || !membership || organizer.role === 'check_in' || membership.role === 'check_in' ||
        !scopeAllows(organizer.eventScope, state.eventFilter) || !scopeAllows(membership.eventScope, state.eventFilter)) {
        return null;
    }

    const paths = getOrdersResourcePaths(organizerId);
    const [orders, ticketBreakdown, events] = await Promise.all([
        fetchPrivateJson<OrdersResponse>(session.accessToken, paths.orders),
        fetchPrivateJson<TicketBreakdownResponse>(session.accessToken, paths.ticketBreakdown),
        fetchPrivateJson<{ events: EventRecord[] }>(session.accessToken, paths.organizerEvents),
    ]);
    return {
        nonce,
        userId,
        organizerId,
        queryKey,
        orders: orders?.orders ?? null,
        ticketBreakdown,
        organizerEvents: events?.events ?? null,
    };
});
