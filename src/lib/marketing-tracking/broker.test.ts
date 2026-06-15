import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createMarketingTracker } from './broker';

const initMetaPixelMock = vi.hoisted(() => vi.fn());
const trackPixelEventMock = vi.hoisted(() => vi.fn());

vi.mock('@/lib/meta-pixel', () => ({
    initMetaPixel: initMetaPixelMock,
    trackPixelEvent: trackPixelEventMock,
}));

describe('createMarketingTracker', () => {
    let gtagMock: ReturnType<typeof vi.fn>;
    let ttqLoadMock: ReturnType<typeof vi.fn>;
    let ttqTrackMock: ReturnType<typeof vi.fn>;
    let ttqInstanceMock: ReturnType<typeof vi.fn>;
    let localStorageState: Record<string, string>;

    beforeEach(() => {
        vi.clearAllMocks();
        localStorageState = {};
        gtagMock = vi.fn();
        ttqLoadMock = vi.fn();
        ttqTrackMock = vi.fn();
        ttqInstanceMock = vi.fn(() => ({ track: ttqTrackMock }));
        vi.stubGlobal('window', {
            dataLayer: [],
            gtag: gtagMock,
            localStorage: {
                getItem: vi.fn((key: string) => localStorageState[key] ?? null),
                setItem: vi.fn((key: string, value: string) => {
                    localStorageState[key] = value;
                }),
            },
            ttq: {
                load: ttqLoadMock,
                instance: ttqInstanceMock,
            },
        });
    });

    it('routes Meta events when marketing consent is allowed', () => {
        const tracker = createMarketingTracker({ analyticsAllowed: false, marketingAllowed: true });

        tracker.trackMarketingEvent('event_viewed', {
            providerTargets: { metaPixelId: '123456789012345' },
            publicEventId: 'event_001',
            publicEventTitle: 'Test Event',
            currency: 'GBP',
        });

        expect(initMetaPixelMock).toHaveBeenCalledWith('123456789012345');
        expect(trackPixelEventMock).toHaveBeenCalledWith(
            '123456789012345',
            'ViewContent',
            {
                currency: 'GBP',
                content_type: 'product',
                content_ids: ['event_001'],
                content_name: 'Test Event',
            },
            undefined,
        );
    });

    it('does not route events without marketing consent', () => {
        const tracker = createMarketingTracker({ analyticsAllowed: false, marketingAllowed: false });

        tracker.trackMarketingEvent('event_viewed', {
            providerTargets: { metaPixelId: '123456789012345' },
            publicEventId: 'event_001',
            currency: 'GBP',
        });

        expect(initMetaPixelMock).not.toHaveBeenCalled();
        expect(trackPixelEventMock).not.toHaveBeenCalled();
    });

    it('pushes first-party data layer events when analytics consent is allowed', () => {
        const tracker = createMarketingTracker({ analyticsAllowed: true, marketingAllowed: false });

        tracker.trackMarketingEvent('event_viewed', {
            providerTargets: {},
            organizerId: 'org_123',
            publicEventId: 'event_001',
            publicEventTitle: 'Test Event',
            currency: 'GBP',
        });

        expect(window.dataLayer).toContainEqual({
            event: 'ht_event_viewed',
            organizer_id: 'org_123',
            public_event_id: 'event_001',
            public_event_title: 'Test Event',
            currency: 'GBP',
        });
    });

    it('does not push first-party data layer events without optional consent', () => {
        const tracker = createMarketingTracker({ analyticsAllowed: false, marketingAllowed: false });

        tracker.trackMarketingEvent('event_viewed', {
            providerTargets: {},
            publicEventId: 'event_001',
            currency: 'GBP',
        });

        expect(window.dataLayer).toEqual([]);
    });

    it('routes GA4 events when analytics consent is allowed', () => {
        const tracker = createMarketingTracker({ analyticsAllowed: true, marketingAllowed: false });

        tracker.trackMarketingEvent('event_viewed', {
            providerTargets: { googleAnalyticsMeasurementId: ' G-ABC123 ' },
            publicEventId: 'event_001',
            publicEventTitle: 'Test Event',
            currency: 'GBP',
        });

        expect(gtagMock).toHaveBeenNthCalledWith(2, 'consent', 'update', {
            analytics_storage: 'granted',
            ad_storage: 'denied',
            ad_user_data: 'denied',
            ad_personalization: 'denied',
        });
        expect(gtagMock).toHaveBeenNthCalledWith(3, 'config', 'G-ABC123', {
            send_page_view: false,
        });
        expect(gtagMock).toHaveBeenNthCalledWith(4, 'event', 'view_item', {
            send_to: 'G-ABC123',
            currency: 'GBP',
            items: [{ item_id: 'event_001', item_name: 'Test Event' }],
        });
    });

    it('does not route GA4 events without analytics consent', () => {
        const tracker = createMarketingTracker({ analyticsAllowed: false, marketingAllowed: true });

        tracker.trackMarketingEvent('event_viewed', {
            providerTargets: { googleAnalyticsMeasurementId: 'G-ABC123' },
            publicEventId: 'event_001',
            publicEventTitle: 'Test Event',
            currency: 'GBP',
        });

        expect(gtagMock).not.toHaveBeenCalled();
    });

    it('routes TikTok events through the targeted pixel instance when marketing consent is allowed', () => {
        const tracker = createMarketingTracker({ analyticsAllowed: false, marketingAllowed: true });

        tracker.trackMarketingEvent('tickets_added', {
            providerTargets: { tiktokPixelId: 'CABC12345' },
            value: 25,
            currency: 'GBP',
            items: [{ ticketTypeId: 'ticket_001', ticketName: 'Adult', quantity: 1, unitPrice: 25 }],
        });

        expect(ttqLoadMock).toHaveBeenCalledWith('CABC12345');
        expect(ttqInstanceMock).toHaveBeenCalledWith('CABC12345');
        expect(ttqTrackMock).toHaveBeenCalledWith('AddToCart', {
            value: 25,
            currency: 'GBP',
            contents: [{ content_id: 'ticket_001', content_name: 'Adult', quantity: 1, price: 25 }],
            content_type: 'product',
        });
    });

    it('passes TikTok purchase event_id as the third track argument', () => {
        const tracker = createMarketingTracker({ analyticsAllowed: false, marketingAllowed: true });

        tracker.trackMarketingEvent('purchase_completed', {
            providerTargets: { tiktokPixelId: 'CABC12345' },
            eventId: 'tiktok_event_123',
            orderId: 'order_123',
            value: 29.2,
            currency: 'GBP',
        });

        expect(ttqTrackMock).toHaveBeenCalledWith(
            'Purchase',
            {
                value: 29.2,
                currency: 'GBP',
                order_id: 'order_123',
                content_type: 'product',
            },
            { event_id: 'tiktok_event_123' },
        );
    });

    it('does not route TikTok events without marketing consent', () => {
        const tracker = createMarketingTracker({ analyticsAllowed: true, marketingAllowed: false });

        tracker.trackMarketingEvent('tickets_added', {
            providerTargets: { tiktokPixelId: 'CABC12345' },
            value: 25,
            currency: 'GBP',
            items: [{ ticketTypeId: 'ticket_001', ticketName: 'Adult', quantity: 1, unitPrice: 25 }],
        });

        expect(ttqLoadMock).not.toHaveBeenCalled();
        expect(ttqInstanceMock).not.toHaveBeenCalled();
        expect(ttqTrackMock).not.toHaveBeenCalled();
    });

    it('routes Google Ads purchase conversions when marketing consent is allowed', () => {
        const tracker = createMarketingTracker({ analyticsAllowed: false, marketingAllowed: true });

        tracker.trackMarketingEvent('purchase_completed', {
            providerTargets: {
                googleAds: {
                    conversionId: ' AW-123456789 ',
                    purchaseConversionLabel: ' abcDEFghiJKL ',
                },
            },
            orderId: 'order_123',
            value: 29.2,
            currency: 'GBP',
        });

        expect(gtagMock).toHaveBeenNthCalledWith(2, 'consent', 'update', {
            analytics_storage: 'denied',
            ad_storage: 'granted',
            ad_user_data: 'granted',
            ad_personalization: 'granted',
        });
        expect(gtagMock).toHaveBeenNthCalledWith(3, 'config', 'AW-123456789', {
            send_page_view: false,
        });
        expect(gtagMock).toHaveBeenNthCalledWith(4, 'event', 'conversion', {
            send_to: 'AW-123456789/abcDEFghiJKL',
            value: 29.2,
            currency: 'GBP',
            transaction_id: 'order_123',
        });
    });

    it('configures each Google tag destination only once per page', () => {
        const tracker = createMarketingTracker({ analyticsAllowed: true, marketingAllowed: true });
        const payload = {
            providerTargets: {
                googleAnalyticsMeasurementId: 'G-ABC123',
                googleAds: {
                    conversionId: 'AW-123456789',
                    purchaseConversionLabel: 'abcDEFghiJKL',
                },
            },
            orderId: 'order_123',
            value: 29.2,
            currency: 'GBP',
        };

        tracker.trackMarketingEvent('purchase_completed', payload);
        tracker.trackMarketingEvent('purchase_completed', payload);

        expect(gtagMock.mock.calls.filter((call) => call[0] === 'config')).toEqual([
            ['config', 'G-ABC123', { send_page_view: false }],
            ['config', 'AW-123456789', { send_page_view: false }],
        ]);
    });

    it('does not route Google Ads purchase conversions with analytics consent alone', () => {
        const tracker = createMarketingTracker({ analyticsAllowed: true, marketingAllowed: false });

        tracker.trackMarketingEvent('purchase_completed', {
            providerTargets: {
                googleAds: {
                    conversionId: 'AW-123456789',
                    purchaseConversionLabel: 'abcDEFghiJKL',
                },
            },
            orderId: 'order_123',
            value: 29.2,
            currency: 'GBP',
        });

        expect(gtagMock).not.toHaveBeenCalled();
    });

    it('pushes purchase data layer payload without accidental personal or payment fields', () => {
        const tracker = createMarketingTracker({ analyticsAllowed: false, marketingAllowed: true });

        tracker.trackMarketingEvent('purchase_completed', {
            providerTargets: {},
            eventId: 'dedupe_123',
            orderId: 'order_123',
            publicEventId: 'event_001',
            publicEventTitle: 'Test Event',
            value: 29.2,
            currency: 'GBP',
            items: [{ ticketTypeId: 'ticket_001', ticketName: 'Adult', quantity: 1, unitPrice: 25 }],
            attendeeEmail: 'buyer@example.com',
            paymentIntentId: 'pi_123',
            checkoutSessionId: 'cs_123',
        } as never);

        expect(window.dataLayer).toContainEqual({
            event: 'ht_purchase',
            event_id: 'dedupe_123',
            transaction_id: 'order_123',
            public_event_id: 'event_001',
            public_event_title: 'Test Event',
            value: 29.2,
            currency: 'GBP',
            items: [{ item_id: 'ticket_001', item_name: 'Adult', quantity: 1, price: 25 }],
        });
        expect(JSON.stringify(window.dataLayer)).not.toContain('buyer@example.com');
        expect(JSON.stringify(window.dataLayer)).not.toContain('pi_123');
        expect(JSON.stringify(window.dataLayer)).not.toContain('cs_123');
    });

    it('dedupes purchase data layer pushes by order ID', () => {
        const tracker = createMarketingTracker({ analyticsAllowed: false, marketingAllowed: true });

        tracker.trackMarketingEvent('purchase_completed', {
            providerTargets: {},
            orderId: 'order_123',
            value: 29.2,
            currency: 'GBP',
        });
        tracker.trackMarketingEvent('purchase_completed', {
            providerTargets: {},
            orderId: 'order_123',
            value: 29.2,
            currency: 'GBP',
        });

        const purchaseEvents = (window.dataLayer ?? []).filter(
            (entry) => (
                typeof entry === 'object' &&
                entry !== null &&
                'event' in entry &&
                entry.event === 'ht_purchase'
            ),
        );
        expect(purchaseEvents).toHaveLength(1);
    });
});
