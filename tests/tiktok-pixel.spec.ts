import { expect, test, type Page } from '@playwright/test';

const marketingConsentCookieValue = encodeURIComponent(
  JSON.stringify({
    analytics: false,
    marketing: true,
    updatedAt: '2026-04-12T12:00:00.000Z',
    version: 2,
  }),
);

function buildEventPayload({
  slug,
  eventId,
  organizerId,
  title,
  tiktokPixelId,
}: {
  slug: string;
  eventId: string;
  organizerId: string;
  title: string;
  tiktokPixelId: string;
}) {
  return {
    event: {
      id: eventId,
      organizerId,
      title,
      slug,
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
        tiktokPixelId,
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
}

function buildQuotePayload(quantity: number) {
  const subtotal = 25 * quantity;
  const platformFee = 3 * quantity;
  const processingFee = 1 * quantity;
  const processingFeeVat = 0.2 * quantity;

  return {
    success: true,
    currency: 'GBP',
    subtotal,
    discount: 0,
    organizerFee: 0,
    platformFee,
    processingFee,
    processingFeeVat,
    total: subtotal + platformFee + processingFee + processingFeeVat,
    useCreditsApplied: false,
    creditsApplied: 0,
    paidTicketCount: quantity,
    promoCodeApplied: false,
    lineAllocations: [
      {
        lineIndex: 0,
        ticketTypeId: 'ticket_001',
        requestedQuantity: quantity,
        promoCoveredQuantity: 0,
        creditCoveredQuantity: 0,
        feeBearingQuantity: quantity,
        organizerFeePerCreditUnit: 0,
      },
    ],
  };
}

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
  tiktokEventId: 'tiktok_event_123',
  tracking: {
    googleAnalyticsMeasurementId: null,
    tiktokPixelId: 'CABC12345',
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

async function routeTikTok(page: Page, scriptRequests: string[]) {
  await page.route('**analytics.tiktok.com/**', async (route) => {
    scriptRequests.push(route.request().url());
    await route.fulfill({
      status: 200,
      contentType: 'application/javascript',
      body: '',
    });
  });
}

async function routeConsentEvents(page: Page) {
  await page.route('**/api/v1/consent/events', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ success: true }),
    });
  });
}

async function routeOrganizer(page: Page, organizerId: string) {
  await page.route(`**/api/v1/public/organizers/${organizerId}`, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        organizer: {
          id: organizerId,
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
}

async function routeQuote(page: Page, eventId = 'event_001') {
  await page.route(`**/api/v1/events/${eventId}/checkout/quote`, async (route) => {
    const request = route.request().postDataJSON() as { items?: Array<{ quantity?: number }> } | null;
    const quantity = request?.items?.reduce((sum, item) => sum + (item.quantity ?? 0), 0) ?? 0;
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(buildQuotePayload(quantity || 1)),
    });
  });
}

async function getTikTokPixelEvents(page: Page, pixelId: string) {
  return page.evaluate((targetPixelId) => {
    const ttq = (window as typeof window & {
      ttq?: { _i?: Record<string, unknown[]> };
    }).ttq;
    return ttq?._i?.[targetPixelId] ?? [];
  }, pixelId);
}

async function getTikTokRootCalls(page: Page) {
  return page.evaluate(() => {
    const ttq = (window as typeof window & { ttq?: unknown[] }).ttq;
    return Array.isArray(ttq) ? ttq : [];
  });
}

test.describe('TikTok Pixel smoke', () => {
  test.beforeEach(async ({ page }) => {
    await routeConsentEvents(page);
  });

  test('loads TikTok only after marketing consent and sends event-page checkout events', async ({ page, context }) => {
    const scriptRequests: string[] = [];
    await routeTikTok(page, scriptRequests);
    await context.clearCookies();

    await page.route('**/api/v1/public/events/test-event', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(buildEventPayload({
          slug: 'test-event',
          eventId: 'event_001',
          organizerId: 'org_123',
          title: 'Test Event',
          tiktokPixelId: 'CABC12345',
        })),
      });
    });
    await routeOrganizer(page, 'org_123');
    await routeQuote(page);

    await page.goto('/events/test-event');
    await page.waitForLoadState('networkidle');

    expect(scriptRequests).toHaveLength(0);
    expect(await getTikTokPixelEvents(page, 'CABC12345')).toHaveLength(0);

    await page.getByRole('button', { name: /accept all/i }).click();

    await expect.poll(async () => {
      const calls = await getTikTokPixelEvents(page, 'CABC12345');
      return calls.filter((call) => Array.isArray(call) && call[0] === 'track' && call[1] === 'ViewContent').length;
    }).toBe(1);
    expect(scriptRequests.some((url) => url.includes('sdkid=CABC12345'))).toBe(true);

    const ticketCard = page
      .locator('h4:has-text("General Admission")')
      .locator('xpath=ancestor::div[contains(@class,"justify-between")][1]');
    await ticketCard.locator('button').nth(1).click();

    await expect.poll(async () => {
      const calls = await getTikTokPixelEvents(page, 'CABC12345');
      return calls.filter((call) => Array.isArray(call) && call[0] === 'track' && call[1] === 'AddToCart').length;
    }).toBe(1);

    await page.getByRole('button', { name: /proceed to checkout/i }).click();

    await expect.poll(async () => {
      const calls = await getTikTokPixelEvents(page, 'CABC12345');
      return calls.filter((call) => Array.isArray(call) && call[0] === 'track' && call[1] === 'InitiateCheckout').length;
    }).toBe(1);
  });

  test('fires TikTok Purchase once with event_id on checkout success', async ({ page, context }) => {
    const scriptRequests: string[] = [];
    await routeTikTok(page, scriptRequests);
    await context.addCookies([
      {
        name: 'ht_consent',
        value: marketingConsentCookieValue,
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
      const calls = await getTikTokPixelEvents(page, 'CABC12345');
      return calls.filter((call) => Array.isArray(call) && call[0] === 'track' && call[1] === 'Purchase').length;
    }).toBe(1);

    expect(await getTikTokPixelEvents(page, 'CABC12345')).toContainEqual([
      'track',
      'Purchase',
      {
        content_type: 'product',
        value: 29.2,
        currency: 'GBP',
        contents: [
          {
            content_id: 'ticket_001',
            content_name: 'General Admission',
            quantity: 1,
            price: 25,
          },
        ],
        order_id: 'order_123',
      },
      {
        event_id: 'tiktok_event_123',
      },
    ]);
    expect(scriptRequests.some((url) => url.includes('sdkid=CABC12345'))).toBe(true);

    await page.reload();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    const callsAfterReload = await getTikTokPixelEvents(page, 'CABC12345');
    expect(callsAfterReload.filter((call) => Array.isArray(call) && call[0] === 'track' && call[1] === 'Purchase')).toHaveLength(0);
  });

  test('revokes TikTok consent and clears TikTok identifiers when marketing is disabled', async ({ page, context }) => {
    const scriptRequests: string[] = [];
    await routeTikTok(page, scriptRequests);
    await context.addCookies([
      {
        name: 'ht_consent',
        value: marketingConsentCookieValue,
        domain: '127.0.0.1',
        path: '/',
      },
      {
        name: '_ttp',
        value: 'ttp_cookie_123',
        domain: '127.0.0.1',
        path: '/',
      },
      {
        name: '_tt_enable_cookie',
        value: '1',
        domain: '127.0.0.1',
        path: '/',
      },
    ]);
    await page.route('**/api/v1/public/events/test-event', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(buildEventPayload({
          slug: 'test-event',
          eventId: 'event_001',
          organizerId: 'org_123',
          title: 'Test Event',
          tiktokPixelId: 'CABC12345',
        })),
      });
    });
    await routeOrganizer(page, 'org_123');
    await routeQuote(page);

    await page.goto('/events/test-event');
    await page.waitForLoadState('networkidle');
    await page.getByRole('button', { name: 'Manage cookies' }).click();
    await page.getByRole('switch', { name: 'Marketing storage' }).click();
    await page.getByRole('button', { name: 'Save preferences' }).click();

    await expect.poll(async () => {
      const calls = await getTikTokRootCalls(page);
      return calls.some((call) => Array.isArray(call) && call[0] === 'revokeConsent');
    }).toBe(true);
    expect(await getTikTokRootCalls(page)).toContainEqual(['disableCookie']);

    const cookies = await context.cookies();
    expect(cookies.some((cookie) => cookie.name === '_ttp')).toBe(false);
    expect(cookies.some((cookie) => cookie.name === '_tt_enable_cookie')).toBe(false);
  });

  test('targets the current event pixel after navigating between events', async ({ page, context }) => {
    const scriptRequests: string[] = [];
    await routeTikTok(page, scriptRequests);
    await context.addCookies([
      {
        name: 'ht_consent',
        value: marketingConsentCookieValue,
        domain: '127.0.0.1',
        path: '/',
      },
    ]);

    await page.route('**/api/v1/public/events/test-event', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(buildEventPayload({
          slug: 'test-event',
          eventId: 'event_001',
          organizerId: 'org_123',
          title: 'First Event',
          tiktokPixelId: 'CABC12345',
        })),
      });
    });
    await page.route('**/api/v1/public/events/second-event', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(buildEventPayload({
          slug: 'second-event',
          eventId: 'event_002',
          organizerId: 'org_456',
          title: 'Second Event',
          tiktokPixelId: 'CSECOND999',
        })),
      });
    });
    await routeOrganizer(page, 'org_123');
    await routeOrganizer(page, 'org_456');

    await page.goto('/events/test-event');
    await page.waitForLoadState('networkidle');
    await expect.poll(async () => {
      const calls = await getTikTokPixelEvents(page, 'CABC12345');
      return calls.filter((call) => Array.isArray(call) && call[0] === 'track' && call[1] === 'ViewContent').length;
    }).toBe(1);

    await page.goto('/events/second-event');
    await page.waitForLoadState('networkidle');
    await expect.poll(async () => {
      const calls = await getTikTokPixelEvents(page, 'CSECOND999');
      return calls.filter((call) => Array.isArray(call) && call[0] === 'track' && call[1] === 'ViewContent').length;
    }).toBe(1);

    expect(scriptRequests.filter((url) => url.includes('sdkid=CABC12345'))).toHaveLength(1);
    expect(scriptRequests.filter((url) => url.includes('sdkid=CSECOND999'))).toHaveLength(1);
    expect(await getTikTokPixelEvents(page, 'CABC12345')).toHaveLength(0);
  });
});
