import { test, expect } from '@playwright/test';

test('embed checkout page renders ticket widget shell', async ({ page }) => {
    await page.route('**/api/v1/public/events/prayer-event', (route) => {
        route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
                event: {
                    id: 'event_prayer_001',
                    organizerId: 'org_001',
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
                        id: 'ticket_001',
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

    await page.goto('/embed/checkout/prayer-event');

    await expect(page.getByTestId('embed-checkout-shell')).toBeVisible();
    await expect(page.getByText('General Admission')).toBeVisible();
});
