import { expect, test, type Page } from '@playwright/test';

const analyticsConsentCookieValue = encodeURIComponent(
  JSON.stringify({
    analytics: true,
    marketing: false,
    updatedAt: '2026-04-12T12:00:00.000Z',
    version: 2,
  }),
);

const eventPayload = {
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
    metaPixelId: '123456789012345',
    tracking: {
      metaPixelId: '123456789012345',
      googleAnalyticsMeasurementId: 'G-ABC123',
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
  tracking: {
    googleAnalyticsMeasurementId: 'G-ABC123',
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

async function stubFbq(page: Page) {
  await page.addInitScript(() => {
    const calls: unknown[][] = [];
    const fbq = (...args: unknown[]) => {
      calls.push(args);
    };
    (fbq as typeof fbq & { queue?: unknown[][]; push?: typeof fbq; callMethod?: typeof fbq }).queue = calls;
    (fbq as typeof fbq & { queue?: unknown[][]; push?: typeof fbq; callMethod?: typeof fbq }).push = fbq;
    (fbq as typeof fbq & { queue?: unknown[][]; push?: typeof fbq; callMethod?: typeof fbq }).callMethod = fbq;
    (window as typeof window & { fbq?: typeof fbq; _fbq?: typeof fbq; __fbqCalls?: unknown[][] }).fbq = fbq;
    (window as typeof window & { fbq?: typeof fbq; _fbq?: typeof fbq; __fbqCalls?: unknown[][] })._fbq = fbq;
    (window as typeof window & { fbq?: typeof fbq; _fbq?: typeof fbq; __fbqCalls?: unknown[][] }).__fbqCalls = calls;
  });
}

async function getGtagCalls(page: Page) {
  return page.evaluate(() => ((window as typeof window & { __gtagCalls?: unknown[][] }).__gtagCalls ?? []));
}

async function getFbqCalls(page: Page) {
  return page.evaluate(() => ((window as typeof window & { __fbqCalls?: unknown[][] }).__fbqCalls ?? []));
}

async function routeTrackingDependencies(page: Page) {
  await page.route('**/gtag/js**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/javascript',
      body: '',
    });
  });

  await page.route('**connect.facebook.net/**', async (route) => {
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

test.describe('GA4 tracking smoke', () => {
  test.beforeEach(async ({ page }) => {
    await stubGtag(page);
    await stubFbq(page);
    await routeTrackingDependencies(page);
  });

  test('gates GA4 event detail hits on analytics consent and coexists with Meta', async ({ page, context }) => {
    await context.clearCookies();

    await page.route('**/api/v1/public/events/test-event', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(eventPayload),
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
    await page.waitForLoadState('networkidle');

    expect((await getGtagCalls(page)).filter((call) => call[0] === 'event')).toHaveLength(0);

    await page.getByRole('button', { name: /accept all/i }).click();

    await expect.poll(async () => {
      const calls = await getGtagCalls(page);
      return calls.filter((call) => call[0] === 'event' && call[1] === 'view_item').length;
    }).toBe(1);

    const gtagCalls = await getGtagCalls(page);
    expect(gtagCalls).toContainEqual([
      'config',
      'G-ABC123',
      {
        send_page_view: false,
      },
    ]);
    expect(gtagCalls).toContainEqual([
      'event',
      'view_item',
      {
        send_to: 'G-ABC123',
        currency: 'GBP',
        items: [
          {
            item_id: 'event_001',
            item_name: 'Test Event',
          },
        ],
      },
    ]);

    const fbqCalls = await getFbqCalls(page);
    expect(fbqCalls).toContainEqual(['init', '123456789012345']);
    expect(fbqCalls).toContainEqual([
      'trackSingle',
      '123456789012345',
      'ViewContent',
      {
        currency: 'GBP',
        content_type: 'product',
        content_ids: ['event_001'],
        content_name: 'Test Event',
      },
    ]);
  });

  test('fires a GA4 purchase once with transaction_id on checkout success', async ({ page, context }) => {
    await context.addCookies([
      {
        name: 'ht_consent',
        value: analyticsConsentCookieValue,
        domain: '127.0.0.1',
        path: '/',
      },
    ]);

    await page.route('**/api/v1/orders/order_123/status', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(successOrderPayload),
      });
    });

    await page.goto('/checkout/success?order_id=order_123');
    await page.waitForLoadState('networkidle');

    await expect.poll(async () => {
      const calls = await getGtagCalls(page);
      return calls.filter((call) => call[0] === 'event' && call[1] === 'purchase').length;
    }).toBe(1);

    expect(await getGtagCalls(page)).toContainEqual([
      'event',
      'purchase',
      {
        send_to: 'G-ABC123',
        currency: 'GBP',
        value: 29.2,
        items: [
          {
            item_id: 'ticket_001',
            item_name: 'General Admission',
            quantity: 1,
            price: 25,
          },
        ],
        transaction_id: 'order_123',
      },
    ]);

    await page.reload();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    const callsAfterReload = await getGtagCalls(page);
    expect(callsAfterReload.filter((call) => call[0] === 'event' && call[1] === 'purchase')).toHaveLength(0);
  });
});
