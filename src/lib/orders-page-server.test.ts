import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { DashboardSessionSeed } from './web-session-types';

const fake = vi.hoisted(() => ({ verify: vi.fn(), read: vi.fn() }));
vi.mock('server-only', () => ({}));
vi.mock('@/lib/web-session-server', () => ({ getVerifiedWebSession: fake.verify, fetchPrivateJson: fake.read }));
import { getOrdersPageSeed } from './orders-page-server';

function session(userId = 'user-a', role = 'owner', status = 'active', onboarding = false) {
    return {
        accessToken: `test-token-${userId}`,
        seed: {
            nonce: `test-nonce-${userId}`,
            profile: { user: { id: userId }, needsOnboarding: onboarding, memberships: [
                { organizerId: 'org-1', status, role, eventScope: { mode: 'all', eventIds: [] } },
            ] },
            organizers: [{ id: 'org-1', status, role, eventScope: { mode: 'all', eventIds: [] } }],
        } as unknown as DashboardSessionSeed,
    };
}

beforeEach(() => {
    fake.verify.mockReset().mockResolvedValue(session());
    fake.read.mockReset().mockImplementation(async (_token, path) => path.includes('ticket-breakdown')
        ? { events: [], currency: 'GBP' } : path.includes('/organizers/') ? { events: [] } : { orders: [{ id: 'order-a' }] });
});

describe('Orders private server data', () => {
    it.each(['attendees', 'waitlist', 'tickets'])('leaves the initial %s tab on its browser path', async tab => {
        expect(await getOrdersPageSeed('org-1', `tab=${tab}`)).toBeNull();
        expect(fake.verify).not.toHaveBeenCalled();
        expect(fake.read).not.toHaveBeenCalled();
    });

    it.each([
        ['missing session', null], ['onboarding', session('a', 'owner', 'active', true)],
        ['suspended', session('a', 'owner', 'suspended')], ['removed', session('a', 'owner', 'removed')],
        ['check-in', session('a', 'check_in')],
    ])('exposes no order data for %s', async (_reason, verified) => {
        fake.verify.mockResolvedValue(verified);
        expect(await getOrdersPageSeed('org-1', '')).toBeNull();
        expect(fake.read).not.toHaveBeenCalled();
    });

    it('requires both the verified profile membership and organiser access', async () => {
        const verified = session();
        verified.seed.profile.memberships = [];
        fake.verify.mockResolvedValue(verified);
        expect(await getOrdersPageSeed('org-1', '')).toBeNull();
        expect(fake.read).not.toHaveBeenCalled();
    });

    it('denies an event outside either verified event scope before any Orders GET', async () => {
        const verified = session();
        verified.seed.profile.memberships[0].eventScope = { mode: 'limited', eventIds: ['event-a'] };
        fake.verify.mockResolvedValue(verified);
        expect(await getOrdersPageSeed('org-1', 'eventId=event-b')).toBeNull();
        expect(fake.read).not.toHaveBeenCalled();
    });

    it('starts the three permitted resources together and returns only token-free data', async () => {
        const resolvers: Array<(value: unknown) => void> = [];
        fake.read.mockImplementation(() => new Promise(resolve => resolvers.push(resolve)));
        const pending = getOrdersPageSeed('org-1', 'eventId=event-a');
        await vi.waitFor(() => expect(fake.read).toHaveBeenCalledTimes(3));
        expect(fake.read.mock.calls.map(call => call[1])).toEqual([
            '/api/v1/orders?organizerId=org-1', '/api/v1/orders/ticket-breakdown?organizerId=org-1',
            '/api/v1/organizers/org-1/events',
        ]);
        resolvers[0]({ orders: [{ id: 'private-order' }] });
        resolvers[1]({ events: [], currency: 'GBP' });
        resolvers[2]({ events: [] });
        const data = await pending;
        expect(data).toMatchObject({ organizerId: 'org-1', userId: 'user-a', queryKey: 'eventId=event-a', orders: [{ id: 'private-order' }] });
        expect(JSON.stringify(data)).not.toContain('test-token');
    });

    it('preserves individual failures as null so browser retries cannot show a false empty result', async () => {
        fake.read.mockImplementation(async (_token, path) => path.includes('ticket-breakdown') ? null
            : path.includes('/organizers/') ? { events: [] } : { orders: [] });
        expect(await getOrdersPageSeed('org-1', '')).toMatchObject({ orders: [], ticketBreakdown: null, organizerEvents: [] });
    });

    it('keeps concurrent account credentials and results separate', async () => {
        fake.verify.mockResolvedValueOnce(session('a')).mockResolvedValueOnce(session('b'));
        fake.read.mockImplementation(async (token, path) => {
            await Promise.resolve();
            return path.includes('ticket-breakdown') ? { events: [], currency: 'GBP' }
                : path.includes('/organizers/') ? { events: [] } : { orders: [{ id: token === 'test-token-a' ? 'order-a' : 'order-b' }] };
        });
        const [a, b] = await Promise.all([getOrdersPageSeed('org-1', ''), getOrdersPageSeed('org-1', '')]);
        expect(a).toMatchObject({ userId: 'a', orders: [{ id: 'order-a' }] });
        expect(b).toMatchObject({ userId: 'b', orders: [{ id: 'order-b' }] });
        expect(fake.read.mock.calls.filter(call => call[0] === 'test-token-a')).toHaveLength(3);
        expect(fake.read.mock.calls.filter(call => call[0] === 'test-token-b')).toHaveLength(3);
    });
});
