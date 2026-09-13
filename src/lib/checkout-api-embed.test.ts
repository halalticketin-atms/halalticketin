import { afterEach, describe, expect, it, vi } from 'vitest';
import { getOrderStatus, handleCheckout, type CheckoutRequest } from './checkout-api';

const request: CheckoutRequest = { items: [{ ticketTypeId: 'fixture-ticket', quantity: 1 }], attendeeName: 'Fixture buyer', attendeeEmail: 'fixture@example.test', attendeeGender: 'male' };

afterEach(() => vi.unstubAllGlobals());

describe('embed checkout redirects with mocked purchases', () => {
    it('paid embed checkout redirects the parent and leaves the iframe location alone', async () => {
        const parent = { location: { href: 'https://host.example.test' } };
        const frame = { location: { href: 'https://embed.example.test' }, top: parent };
        vi.stubGlobal('window', frame);
        vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => ({ success: true, orderId: 'fixture-order', checkoutUrl: 'https://checkout.example.test/session' }) }));
        await handleCheckout('fixture-event', request, { redirectTarget: 'top' });
        expect(parent.location.href).toBe('https://checkout.example.test/session');
        expect(frame.location.href).toBe('https://embed.example.test');
    });
    it('hosted checkout retains its own redirect', async () => {
        const frame = { location: { href: 'https://event.example.test' }, top: { location: { href: 'https://host.example.test' } } };
        vi.stubGlobal('window', frame);
        vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => ({ success: true, checkoutUrl: 'https://checkout.example.test/session' }) }));
        await handleCheckout('fixture-event', request);
        expect(frame.location.href).toBe('https://checkout.example.test/session');
        expect(frame.top.location.href).toBe('https://host.example.test');
    });
    it('free checkout returns the order for the existing success-page flow', async () => {
        vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => ({ success: true, orderId: 'fixture-order', tickets: [{ id: 'fixture-ticket' }] }) }));
        await expect(handleCheckout('fixture-event', request, { redirectTarget: 'top' })).resolves.toMatchObject({ success: true, isFreeOrder: true, orderId: 'fixture-order' });
    });
    it('sends checkout access in an authorization header', async () => {
        const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ orderId: 'fixture-order' }) });
        vi.stubGlobal('fetch', fetchMock);

        await getOrderStatus('fixture-order', 'signed-access', 'cs_123');

        expect(fetchMock).toHaveBeenCalledWith(
            'http://localhost:3001/api/v1/orders/fixture-order/status',
            { headers: { Authorization: 'Bearer signed-access' } },
        );
    });
});
