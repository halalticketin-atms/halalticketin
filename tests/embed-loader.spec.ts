import { test, expect } from '@playwright/test';

test('embed loader injects iframe', async ({ page }) => {
    const baseURL = test.info().project.use.baseURL ?? 'http://127.0.0.1:3000';

    await page.route('**/api/v1/public/events/prayer-event', (route) => {
        route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
                event: {
                    id: 'event_prayer_002',
                    organizerId: 'org_002',
                    slug: 'prayer-event',
                    title: 'Prayer Event',
                    description: null,
                    bannerImageUrl: null,
                    startDatetime: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
                    endDatetime: null,
                    timezone: 'Europe/London',
                    isMultiDay: false,
                    locationType: 'online',
                    venue: null,
                    address: null,
                    city: null,
                    country: null,
                    onlineUrl: null,
                    latitude: null,
                    longitude: null,
                    currency: 'GBP',
                    refundPolicy: null,
                    organizerName: 'Prayer Org',
                    organizerAvatarUrl: null,
                    category: null,
                    absorbFee: false,
                    feeTier: 'payg',
                    customBookingFee: null,
                    metaPixelId: null,
                    attendeeInfoMode: 'buyer_choice',
                    customQuestions: null,
                },
                tickets: [
                    {
                        id: 'ticket_002',
                        name: 'General Admission',
                        description: null,
                        price: '10.00',
                        currency: 'GBP',
                        maxQuantity: 100,
                        minPerOrder: 1,
                        maxPerOrder: 4,
                        type: 'paid',
                        salesStart: null,
                        salesEnd: null,
                        earlyBirdPrice: null,
                        earlyBirdEndDate: null,
                    },
                ],
            }),
        });
    });

    await page.route('**/api/v1/exchange-rates', (route) => {
        route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
                base: 'GBP',
                date: new Date().toISOString(),
                rates: { GBP: 1 },
                currencies: { GBP: { symbol: '£', name: 'British Pound' } },
                lastUpdated: new Date().toISOString(),
            }),
        });
    });

    await page.setContent(`
        <html>
          <head></head>
          <body>
            <div id="halal-ticketin-checkout" data-event-slug="prayer-event"></div>
            <script src="${baseURL}/embed/checkout.js"></script>
          </body>
        </html>
    `);

    const frame = page.locator('iframe[title="Halal Ticketin Checkout"]');
    await expect(frame).toBeVisible();
    await expect(frame).toHaveAttribute('src', new RegExp('/embed/checkout/prayer-event\\?theme=light'));
});
