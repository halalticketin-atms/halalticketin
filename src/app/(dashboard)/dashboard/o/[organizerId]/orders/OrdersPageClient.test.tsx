import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const state = vi.hoisted(() => ({
    query: '',
    effects: [] as Array<() => void>,
    replace: vi.fn(),
    revision: 0,
    identityRevision: 0,
    seed: null as unknown,
    user: { id: 'user-a' } as { id: string } | null,
    get: vi.fn(),
    slot: 0,
    values: new Map<number, unknown>(),
    writes: [] as unknown[],
    listeners: new Map<string, () => void>(),
    buttons: new Map<string, () => unknown>(),
    viewDetails: null as (() => void) | null,
    changeSearch: null as ((value: string) => void) | null,
    nativeSearchValue: undefined as string | undefined,
}));

vi.mock('react', async (importOriginal) => ({
    ...await importOriginal<typeof import('react')>(),
    useEffect: (effect: () => void) => state.effects.push(effect),
    useSyncExternalStore: (_subscribe: unknown, snapshot: () => unknown) => snapshot(),
    useRef: (initial: unknown) => {
        const slot = state.slot++;
        if (!state.values.has(slot)) state.values.set(slot, { current: initial });
        return state.values.get(slot);
    },
    useState: (initial: unknown) => {
        const slot = state.slot++;
        const current = state.values.has(slot) ? state.values.get(slot)
            : typeof initial === 'function' ? (initial as () => unknown)() : initial;
        state.values.set(slot, current);
        return [current, (next: unknown) => {
            const value = typeof next === 'function' ? (next as (value: unknown) => unknown)(state.values.get(slot)) : next;
            state.values.set(slot, value);
            state.writes.push(value);
        }];
    },
}));
vi.mock('next/navigation', () => ({
    usePathname: () => '/dashboard/o/org-1/orders',
    useSearchParams: () => new URLSearchParams(state.query),
    useRouter: () => ({ replace: state.replace }),
}));
vi.mock('@/hooks/useOrganizerFromParams', () => ({ useOrganizerFromParams: () => 'org-1' }));
vi.mock('@/context/organizer-context', () => ({ useOrganizers: () => ({ organizers: [] }) }));
vi.mock('@/context/auth-context', () => ({ useAuth: () => ({ user: state.user }) }));
vi.mock('@/context/dashboard-session-seed', () => ({ useDashboardSessionSeed: () => state.seed }));
vi.mock('@/lib/api', () => ({ default: { get: state.get }, getAuthSessionRevision: () => state.revision, getAuthIdentityRevision: () => state.identityRevision, subscribeAuthSession: () => () => {}, getAuthToken: () => null }));

vi.mock('@/lib/events-api', () => ({ listOrganizerEvents: (id: string) => state.get(`/api/v1/organizers/${id}/events`) }));
vi.mock('@/components/orders/OrderCard', async original => {
    const ui = await original<typeof import('@/components/orders/OrderCard')>();
    return { ...ui, OrderCard: (props: React.ComponentProps<typeof ui.OrderCard>) => {
        state.viewDetails = () => props.onViewDetails(props.order);
        return React.createElement(ui.OrderCard, props);
    } };
});
vi.mock('@/components/ui/button', async original => {
    const ui = await original<typeof import('@/components/ui/button')>();
    return { ...ui, Button: (props: React.ComponentProps<typeof ui.Button>) => {
        if (props.onClick) state.buttons.set(props.onClick.name, () => props.onClick!({} as React.MouseEvent<HTMLButtonElement>));
        return React.createElement(ui.Button, props);
    } };
});
vi.mock('@/components/ui/input', async original => {
    const ui = await original<typeof import('@/components/ui/input')>();
    return { ...ui, Input: (props: React.ComponentProps<typeof ui.Input>) => {
        if (props.placeholder?.startsWith('Search') && props.ref && typeof props.ref === 'object') {
            props.ref.current = { value: state.nativeSearchValue ?? props.value ?? '' } as HTMLInputElement;
        }
        if (props.placeholder?.startsWith('Search by order ID')) {
            state.changeSearch = value => props.onChange!({ target: { value } } as React.ChangeEvent<HTMLInputElement>);
        }
        return React.createElement(ui.Input, props);
    } };
});
// Render dialog children in Node so their public action handlers can be exercised without a portal.
vi.mock('@/components/ui/dialog', async original => ({
    ...await original<typeof import('@/components/ui/dialog')>(),
    DialogContent: ({ children }: { children: React.ReactNode }) => React.createElement('div', null, children),
}));
import OrdersPage from './OrdersPageClient';
import type { OrdersPageSeed } from '@/lib/orders-page-data';

const order = {
    id: 'order-a', orderNumber: 'HT-TEST-00001', createdAt: '2026-10-03T23:30:00Z',
    attendee: { name: 'Amina Fixture', email: 'amina@example.test' },
    event: { id: 'event-a', name: 'Fixture gathering' },
    totals: { subtotal: 25, total: 25, net: 23, currency: 'GBP' }, status: 'completed' as const,
    items: [{ id: 'item-a', ticketTypeId: 'ticket-a', name: 'Standard', quantity: 1, unitPrice: 25 }],
};
const seed: OrdersPageSeed = {
    nonce: 'fixture-nonce', userId: 'user-a', organizerId: 'org-1', queryKey: '',
    orders: [order], ticketBreakdown: { events: [], currency: 'GBP' }, organizerEvents: [],
};
function render(initialData: OrdersPageSeed | null = null) {
    state.slot = 0;
    state.effects = [];
    return renderToStaticMarkup(React.createElement(OrdersPage, { initialData }));
}
function runReadEffects() {
    for (const effect of state.effects) {
        if (/fetchOrders|fetchBreakdown|fetchOrganizerEvents|fetchAttendees|fetchWaitlist|fetchOrderDetail/.test(effect.toString())) effect();
    }
}
async function settle() { await new Promise<void>(resolve => setImmediate(resolve)); }


beforeEach(() => {
    state.query = '';
    state.effects = [];
    state.replace.mockReset();
    state.revision = 0;
    state.identityRevision = 0;
    state.seed = null;
    state.user = { id: 'user-a' };
    state.slot = 0;
    state.values.clear();
    state.writes = [];
    state.listeners.clear();
    state.buttons.clear();
    state.viewDetails = null;
    state.changeSearch = null;
    state.nativeSearchValue = undefined;
    state.get.mockReset().mockImplementation(async (path: string) => path.includes('ticket-breakdown')
        ? { events: [], currency: 'GBP' } : path.includes('/organizers/') ? { events: [] } : { orders: [] });
});
afterEach(() => vi.unstubAllGlobals());

describe('orders page search URL updates', () => {
    it('persists search without starting a route navigation', () => {
        state.query = 'search=+Amina+';
        render();
        const replaceState = vi.fn();
        vi.stubGlobal('window', { history: { replaceState } });

        state.effects[1]();

        expect(replaceState).toHaveBeenCalledWith(null, '', '/dashboard/o/org-1/orders?search=Amina');
        expect(state.replace).not.toHaveBeenCalled();
    });

    it('does not replace history when the URL already matches the filters', () => {
        state.query = 'search=Amina';
        render();
        const replaceState = vi.fn();
        vi.stubGlobal('window', { history: { replaceState } });

        state.effects[1]();

        expect(replaceState).not.toHaveBeenCalled();
        expect(state.replace).not.toHaveBeenCalled();
    });
});

describe('Orders SSR adoption and private reads', () => {
    it('renders populated initial markup and skips all three matching browser reads', () => {
        state.seed = { nonce: seed.nonce, profile: { user: { id: seed.userId } } };
        const markup = render(seed);
        expect(markup).toContain('Amina Fixture');
        expect(markup).toContain('amina@example.test');
        expect(markup).toContain('Fixture gathering');
        expect(markup).not.toContain('Loading orders');
        runReadEffects();
        expect(state.get).not.toHaveBeenCalled();
    });

    it('keeps adopted rows and skips resource GETs after typing updates the native search URL', async () => {
        state.seed = { nonce: seed.nonce, profile: { user: { id: seed.userId } } };
        const replaceState = vi.fn((_state, _title, href: string) => {
            state.query = new URL(href, 'https://frontend.example.test').search.slice(1);
        });
        vi.stubGlobal('window', { history: { replaceState } });
        render(seed);
        state.changeSearch!('Amina');
        render(seed);
        state.effects.find(effect => effect.toString().includes('buildOrdersPageSearchParams'))!();
        expect(replaceState).toHaveBeenCalledWith(null, '', '/dashboard/o/org-1/orders?search=Amina');
        render(seed);
        runReadEffects();
        await settle();
        const markup = render(seed);
        expect(markup).toContain('amina@example.test');
        expect(markup).toContain('data-seed-enter="list"');
        expect(state.get).not.toHaveBeenCalled();
    });

    it('keeps adopted resource ownership through filter history changes and back navigation', async () => {
        state.seed = { nonce: seed.nonce, profile: { user: { id: seed.userId } } };
        const location = { search: '' };
        vi.stubGlobal('window', { location, addEventListener: (event: string, listener: () => void) => state.listeners.set(event, listener) });
        render(seed);
        state.effects.find(effect => effect.toString().includes('restoreUrlState'))!();
        for (const query of ['eventId=event-a&status=completed&search=Amina', '']) {
            state.query = query;
            location.search = query ? `?${query}` : '';
            state.listeners.get('popstate')!();
            render(seed);
            runReadEffects();
            await settle();
            const markup = render(seed);
            expect(markup).toContain('amina@example.test');
            expect(markup).toContain('data-seed-enter="list"');
        }
        expect(state.get).not.toHaveBeenCalled();
    });

    it.each([
        ['typed before hydration', '', 'Amina', 'Amina', false],
        ['cleared before hydration', 'eventId=event-a&search=Yusuf&status=completed', '', '', true],
    ] as const)('adopts native search %s without a second input event', async (_reason, query, nativeValue, expectedSearch, includesYusuf) => {
        state.query = query;
        state.nativeSearchValue = nativeValue;
        state.seed = { nonce: seed.nonce, profile: { user: { id: seed.userId } } };
        const initialData = { ...seed, queryKey: query, orders: [order, {
            ...order, id: 'order-b', orderNumber: 'HT-YUSUF-00002', attendee: { name: 'Yusuf Fixture', email: 'yusuf@example.test' },
        }] };
        const replaceState = vi.fn((_state, _title, href: string) => {
            state.query = new URL(href, 'https://frontend.example.test').search.slice(1);
        });
        vi.stubGlobal('window', { history: { replaceState } });
        render(initialData);
        for (const effect of state.effects) {
            if (effect.toString().includes('searchInputRef')) effect();
        }
        const markup = render(initialData);
        expect(markup).toContain('amina@example.test');
        expect(markup.includes('yusuf@example.test')).toBe(includesYusuf);
        state.effects.find(effect => effect.toString().includes('buildOrdersPageSearchParams'))!();
        const updated = new URLSearchParams(state.query);
        expect(updated.get('search') ?? '').toBe(expectedSearch);
        if (query) {
            expect(updated.get('eventId')).toBe('event-a');
            expect(updated.get('status')).toBe('completed');
        }
        runReadEffects();
        await settle();
        expect(state.get).not.toHaveBeenCalled();
    });

    it('keeps browser reads when a later RSC seed was never adopted into owned state', async () => {
        state.seed = { nonce: seed.nonce, profile: { user: { id: seed.userId } } };
        render();
        render(seed);
        runReadEffects();
        await settle();
        expect(state.get).toHaveBeenCalledTimes(3);
    });

    it('keeps accepted rows visible while a proven same-account credential refresh retries private reads', () => {
        state.seed = { nonce: seed.nonce, profile: { user: { id: seed.userId } } };
        render(seed);
        state.seed = null;
        state.revision += 1;
        state.get.mockImplementation(() => new Promise(() => {}));
        render();
        runReadEffects();
        expect(state.get).toHaveBeenCalledTimes(3);
        expect(render()).toContain('amina@example.test');
    });

    it('retries only the resource which failed server rendering', async () => {
        state.seed = { nonce: seed.nonce, profile: { user: { id: seed.userId } } };
        render({ ...seed, ticketBreakdown: null });
        runReadEffects();
        await settle();
        expect(state.get).toHaveBeenCalledTimes(1);
        expect(state.get).toHaveBeenCalledWith('/api/v1/orders/ticket-breakdown', { params: { organizerId: 'org-1' } });
    });

    it('reads fresh resources after the existing focus refresh', async () => {
        state.seed = { nonce: seed.nonce, profile: { user: { id: seed.userId } } };
        vi.stubGlobal('window', { addEventListener: (event: string, listener: () => void) => state.listeners.set(event, listener), removeEventListener: vi.fn() });
        vi.stubGlobal('document', { addEventListener: vi.fn(), removeEventListener: vi.fn(), visibilityState: 'visible' });
        render(seed);
        const focusEffect = state.effects.find(effect => effect.toString().includes('refreshForegroundData'))!;
        focusEffect();
        state.listeners.get('focus')!();
        render(seed);
        runReadEffects();
        await settle();
        expect(state.get).toHaveBeenCalledTimes(3);
        expect(state.get).toHaveBeenCalledWith('/api/v1/orders', { params: { organizerId: 'org-1' } });
    });

    it.each<[string, OrdersPageSeed]>([['rows', seed], ['empty result', { ...seed, orders: [] }]])(
        'retains accepted %s while foreground resource reads are held', (_label, initialData) => {
            state.seed = { nonce: seed.nonce, profile: { user: { id: seed.userId } } };
            state.get.mockImplementation(() => new Promise(() => {}));
            vi.stubGlobal('window', { addEventListener: (event: string, listener: () => void) => state.listeners.set(event, listener), removeEventListener: vi.fn() });
            vi.stubGlobal('document', { addEventListener: vi.fn(), removeEventListener: vi.fn(), visibilityState: 'visible' });
            render(initialData);
            state.effects.find(effect => effect.toString().includes('refreshForegroundData'))!();
            state.listeners.get('focus')!();
            render(initialData);
            runReadEffects();
            expect(state.get).toHaveBeenCalledTimes(3);
            const markup = render(initialData);
            expect(markup).not.toContain('Loading orders...');
            if (initialData.orders!.length) {
                expect(markup).toContain('amina@example.test');
                expect(markup).toContain('data-seed-enter="list"');
            } else {
                expect(markup).toContain('No orders found');
            }
        },
    );

    it('shows the initial loading state while no Orders result has been accepted', () => {
        state.get.mockImplementation(() => new Promise(() => {}));
        render();
        runReadEffects();
        const markup = render();
        expect(markup).toContain('Loading orders...');
        expect(markup).not.toContain('No orders found');
    });

    it.each(['nonce', 'user', 'organiser', 'query'])('does not render a seed with a different %s', reason => {
        state.seed = { nonce: seed.nonce, profile: { user: { id: seed.userId } } };
        let input = seed;
        if (reason === 'nonce') state.seed = { nonce: 'old-nonce', profile: { user: { id: seed.userId } } };
        if (reason === 'user') state.seed = { nonce: seed.nonce, profile: { user: { id: 'user-b' } } };
        if (reason === 'organiser') input = { ...seed, organizerId: 'org-other' };
        if (reason === 'query') state.query = 'search=elsewhere';
        expect(render(input)).not.toContain('amina@example.test');
    });

    it('permanently rejects a cached seed after its session was invalidated', () => {
        state.seed = null;
        render(seed);
        state.seed = { nonce: seed.nonce, profile: { user: { id: seed.userId } } };
        expect(render(seed)).not.toContain('amina@example.test');
    });

    it('does not dispatch an old render read after credentials have already changed', () => {
        render();
        state.revision += 1;
        runReadEffects();
        expect(state.get).not.toHaveBeenCalled();
    });

    it.each(['success', 'error'])('ignores Orders, breakdown and events %s completions after the session changes', async result => {
        const pending: Array<{ resolve: (data: unknown) => void; reject: (error: Error) => void }> = [];
        state.get.mockImplementation(() => new Promise((resolve, reject) => pending.push({ resolve, reject })));
        render();
        runReadEffects();
        expect(pending).toHaveLength(3);
        const writes = state.writes.length;
        state.revision += 1;
        pending.forEach(request => result === 'success' ? request.resolve({ orders: [order], events: [] }) : request.reject(new Error('Old account error')));
        await settle();
        expect(state.writes).toHaveLength(writes);
    });

    it.each(['success', 'error'])('ignores order detail %s after an account change', async result => {
        state.seed = { nonce: seed.nonce, profile: { user: { id: seed.userId } } };
        render(seed);
        state.viewDetails!();
        render(seed);
        let resolveDetail!: (value: unknown) => void;
        let rejectDetail!: (error: Error) => void;
        state.get.mockImplementation(() => new Promise((resolve, reject) => { resolveDetail = resolve; rejectDetail = reject; }));
        runReadEffects();
        expect(state.get).toHaveBeenCalledWith('/api/v1/orders/order-a');
        const writes = state.writes.length;
        state.revision += 1;
        if (result === 'success') resolveDetail({ ...order, tickets: [] });
        else rejectDetail(new Error('Old account detail error'));
        await settle();
        expect(state.writes).toHaveLength(writes);
    });

    it.each(['handleExport', 'handleExportWaitlist'])('prevents a stale %s download and completion update', async action => {
        if (action === 'handleExportWaitlist') state.query = 'tab=waitlist&eventId=event-a';
        let resolveCsv!: (value: unknown) => void;
        const blob = vi.fn().mockResolvedValue(new Blob(['private csv']));
        const text = vi.fn().mockResolvedValue('private csv');
        const fetch = vi.fn().mockImplementation(() => new Promise(resolve => { resolveCsv = resolve; }));
        vi.stubGlobal('fetch', fetch);
        const createElement = vi.fn();
        vi.stubGlobal('document', { createElement });
        vi.stubGlobal('window', { localStorage: { getItem: () => 'fixture-token' } });
        render();
        const pending = state.buttons.get(action)!() as Promise<void>;
        expect(fetch).toHaveBeenCalledTimes(1);
        const writes = state.writes.length;
        state.revision += 1;
        resolveCsv({ ok: true, text, blob });
        await pending;
        expect(text).not.toHaveBeenCalled();
        expect(blob).not.toHaveBeenCalled();
        expect(createElement).not.toHaveBeenCalled();
        expect(state.writes).toHaveLength(writes);
    });

    it.each(['attendees', 'waitlist'])('ignores stale initial %s reads, including error and loading updates', async tab => {
        state.query = `tab=${tab}&eventId=event-a`;
        let rejectPrivate!: (error: Error) => void;
        state.get.mockImplementation((path: string) => path.endsWith(`/${tab}`)
            ? new Promise((_resolve, reject) => { rejectPrivate = reject; }) : Promise.resolve({ orders: [], events: [] }));
        render();
        runReadEffects();
        await settle();
        const writes = state.writes.length;
        state.revision += 1;
        rejectPrivate(new Error('Account A read failed'));
        await settle();
        expect(state.writes).toHaveLength(writes);
    });
});
