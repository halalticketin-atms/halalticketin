import { expect, test, type Page } from '@playwright/test';

const marketingConsentCookieValue = encodeURIComponent(
  JSON.stringify({
    analytics: false,
    marketing: true,
    updatedAt: '2026-04-12T12:00:00.000Z',
    version: 2,
  }),
);

const analyticsOnlyConsentCookieValue = encodeURIComponent(
  JSON.stringify({
    analytics: true,
    marketing: false,
    updatedAt: '2026-04-12T12:00:00.000Z',
    version: 2,
  }),
);

const googleAdsOnlyEventPayload = {
  event: {
    id: 'event_001',
    organizerId: 'org_123',
    title: 'Test Event',
    slug: 'test-event',
    description: 'A wonderful test event for the community.',
    startDatetime: '2026-05-01T18:00:00.000Z',
    endDatetime: '2026-05-01T20:00:00.000Z',
    timezone: 'Europe/London',
    locationType: 'in_person',
    venue: 'Community Hall',
    address: '123 Test Street',
    city: 'London',
    country: 'UK',
    currency: 'GBP',
    organizerName: 'Test Organizer',
    organizerAvatarUrl: null,
    canContactOrganizer: true,
    category: 'Conference',
    absorbFee: false,
    feeTier: 'payg',
    customBookingFee: null,
    metaPixelId: null,
    tracking: {
      metaPixelId: null,
      googleAnalyticsMeasurementId: null,
      tiktokPixelId: null,
      googleAds: {
        conversionId: 'AW-123456789',
        purchaseConversionLabel: 'abcDEFghiJKL',
      },
    },
    status: 'published',
    attendeeInfoMode: 'buyer_only',
    customQuestions: [],
    totalCapacity: 100,
    ticketsSold: 0,
    remainingCapacity: 100,
    isSoldOut: false,
    isFavorited: null,
  },
  tickets: [
    {
      id: 'ticket_001',
      name: 'General Admission',
      description: null,
      price: '25.00',
      currency: 'GBP',
      maxQuantity: 10,
      minPerOrder: null,
      maxPerOrder: 10,
      type: 'paid',
      visibility: 'public',
      salesStart: null,
      salesEnd: null,
      customFee: null,
      absorbFee: false,
      earlyBirdPrice: null,
      earlyBirdEndDate: null,
      ticketsSold: 0,
      remainingQuantity: 10,
      isSoldOut: false,
      soldOutReason: null,
    },
  ],
};

const successOrderPayload = {
  orderId: 'order_123',
  status: 'completed',
  totalAmount: 29.2,
  currency: 'GBP',
  organizerId: 'org_123',
  eventId: 'event_001',
  organizerName: 'Test Organizer',
  organizerContactEmail: 'contact@example.com',
  metaPixelId: null,
  metaEventId: null,
  tiktokEventId: null,
  tracking: {
    googleAnalyticsMeasurementId: null,
    tiktokPixelId: null,
    googleAds: {
      conversionId: 'AW-123456789',
      purchaseConversionLabel: 'abcDEFghiJKL',
    },
  },
  trackingItems: [
    {
      ticketTypeId: 'ticket_001',
      ticketName: 'General Admission',
      quantity: 1,
      unitPrice: 25,
    },
  ],
  tickets: [
    {
      id: 'ticket_instance_001',
      ticketCode: 'TICKET-001',
      ticketType: 'General Admission',
      attendeeName: 'Buyer Name',
      attendeeEmail: 'buyer@example.com',
    },
  ],
};

async function stubGtag(page: Page) {
  await page.addInitScript(() => {
    const calls: unknown[][] = [];
    const gtag = (...args: unknown[]) => {
      calls.push(args);
    };
    (
      window as typeof window & {
        dataLayer?: unknown[];
        gtag?: typeof gtag;
        __gtagCalls?: unknown[][];
      }
    ).dataLayer = [];
    (
      window as typeof window & {
        dataLayer?: unknown[];
        gtag?: typeof gtag;
        __gtagCalls?: unknown[][];
      }
    ).gtag = gtag;
    (
      window as typeof window & {
        dataLayer?: unknown[];
        gtag?: typeof gtag;
        __gtagCalls?: unknown[][];
      }
    ).__gtagCalls = calls;
  });
}

async function getGtagCalls(page: Page) {
  return page.evaluate(() => ((window as typeof window & { __gtagCalls?: unknown[][] }).__gtagCalls ?? []));
}

async function routeTrackingDependencies(page: Page) {
  await page.route('**/gtag/js**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/javascript',
      body: '',
    });
  });

  await page.route('**/api/v1/consent/events', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ success: true }),
    });
  });
}

async function routeOrderStatus(page: Page) {
  await page.route('**/api/v1/orders/order_123/status', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(successOrderPayload),
    });
  });
}

test.describe('Google Ads conversion smoke', () => {
  test.beforeEach(async ({ page }) => {
    await stubGtag(page);
    await routeTrackingDependencies(page);
    await routeOrderStatus(page);
  });

  test('requests marketing consent on an event configured only for Google Ads', async ({ page, context }) => {
    await context.clearCookies();

    await page.route('**/api/v1/public/events/test-event', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(googleAdsOnlyEventPayload),
      });
    });

    await page.route('**/api/v1/public/organizers/org_123', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          organizer: {
            id: 'org_123',
            name: 'Test Organizer',
            bio: null,
            avatarUrl: null,
            website: null,
            socialLinks: null,
            city: 'London',
            country: 'UK',
            followerCount: 0,
          },
          upcomingEvents: [],
          pastEvents: [],
        }),
      });
    });

    await page.goto('/events/test-event');

    await expect(page.getByRole('button', { name: /accept all/i })).toBeVisible();
  });

  test('fires purchase conversion after marketing consent is accepted', async ({ page, context }) => {
    await context.clearCookies();

    await page.goto('/checkout/success?order_id=order_123');
    await page.waitForLoadState('networkidle');

    expect((await getGtagCalls(page)).filter((call) => call[0] === 'event')).toHaveLength(0);

    await page.getByRole('button', { name: /accept all/i }).click();

    await expect.poll(async () => {
      const calls = await getGtagCalls(page);
      return calls.filter((call) => call[0] === 'event' && call[1] === 'conversion').length;
    }).toBe(1);

    expect(await getGtagCalls(page)).toContainEqual([
      'config',
      'AW-123456789',
      {
        send_page_view: false,
      },
    ]);
    expect(await getGtagCalls(page)).toContainEqual([
      'event',
      'conversion',
      {
        send_to: 'AW-123456789/abcDEFghiJKL',
        value: 29.2,
        currency: 'GBP',
        transaction_id: 'order_123',
      },
    ]);
  });

  test('fires purchase conversion once across refreshes', async ({ page, context }) => {
    await context.addCookies([
      {
        name: 'ht_consent',
        value: marketingConsentCookieValue,
        domain: '127.0.0.1',
        path: '/',
      },
    ]);

    await page.goto('/checkout/success?order_id=order_123');
    await page.waitForLoadState('networkidle');

    await expect.poll(async () => {
      const calls = await getGtagCalls(page);
      return calls.filter((call) => call[0] === 'event' && call[1] === 'conversion').length;
    }).toBe(1);

    await page.reload();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    const callsAfterReload = await getGtagCalls(page);
    expect(callsAfterReload.filter((call) => call[0] === 'event' && call[1] === 'conversion')).toHaveLength(0);
  });

  test('does not fire purchase conversion with analytics consent alone', async ({ page, context }) => {
    await context.addCookies([
      {
        name: 'ht_consent',
        value: analyticsOnlyConsentCookieValue,
        domain: '127.0.0.1',
        path: '/',
      },
    ]);

    await page.goto('/checkout/success?order_id=order_123');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    const calls = await getGtagCalls(page);
    expect(calls.filter((call) => call[0] === 'event' && call[1] === 'conversion')).toHaveLength(0);
  });
});
