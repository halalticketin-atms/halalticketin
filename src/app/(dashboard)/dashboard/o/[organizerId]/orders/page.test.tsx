import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const fake = vi.hoisted(() => ({ seed: vi.fn() }));
vi.mock('@/lib/orders-page-server', () => ({ getOrdersPageSeed: fake.seed }));
vi.mock('./OrdersPageClient', () => ({ default: ({ initialData }: { initialData: unknown }) =>
    React.createElement('pre', null, JSON.stringify(initialData)) }));
import OrdersPage from './page';

beforeEach(() => fake.seed.mockReset());

describe('Orders server route', () => {
    it('awaits Next parameters and passes only the matching token-free seed', async () => {
        fake.seed.mockResolvedValue({ userId: 'a', orders: [{ id: 'private-order' }] });
        const page = await OrdersPage({ params: Promise.resolve({ organizerId: 'org-1' }),
            searchParams: Promise.resolve({ eventIds: ['a,b'], search: ' Amina ', status: 'completed' }) });
        expect(fake.seed).toHaveBeenCalledWith('org-1', 'eventIds=a%2Cb&search=Amina&status=completed');
        expect(renderToStaticMarkup(page)).toContain('private-order');
    });

    it('places no private Orders payload in the route for a denied seed', async () => {
        fake.seed.mockResolvedValue(null);
        const page = await OrdersPage({ params: Promise.resolve({ organizerId: 'org-1' }), searchParams: Promise.resolve({}) });
        expect(renderToStaticMarkup(page)).toBe('<pre>null</pre>');
    });
});
