import { expect, test, type Page } from '@playwright/test';

const consentCookieValue = encodeURIComponent(
  JSON.stringify({
    analytics: true,
    marketing: true,
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
      tiktokPixelId: 'CABC12345',
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
  metaPixelId: '123456789012345',
  metaEventId: 'meta_event_123',
  tiktokEventId: 'tiktok_event_123',
  tracking: {
    googleAnalyticsMeasurementId: 'G-ABC123',
    tiktokPixelId: 'CABC12345',
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

async function stubBrowserTracking(page: Page) {
  await page.addInitScript(() => {
    const gtagCalls: unknown[][] = [];
    const fbqCalls: unknown[][] = [];
    const gtag = (...args: unknown[]) => {
      gtagCalls.push(args);
    };
    const fbq = (...args: unknown[]) => {
      fbqCalls.push(args);
    };
    (fbq as typeof fbq & { queue?: unknown[][]; push?: typeof fbq; callMethod?: typeof fbq }).queue = fbqCalls;
    (fbq as typeof fbq & { queue?: unknown[][]; push?: typeof fbq; callMethod?: typeof fbq }).push = fbq;
    (fbq as typeof fbq & { queue?: unknown[][]; push?: typeof fbq; callMethod?: typeof fbq }).callMethod = fbq;

    (
      window as typeof window & {
        dataLayer?: unknown[];
        gtag?: typeof gtag;
        fbq?: typeof fbq;
        _fbq?: typeof fbq;
        __gtagCalls?: unknown[][];
        __fbqCalls?: unknown[][];
      }
    ).dataLayer = [];
    (
      window as typeof window & {
        dataLayer?: unknown[];
        gtag?: typeof gtag;
        fbq?: typeof fbq;
        _fbq?: typeof fbq;
        __gtagCalls?: unknown[][];
        __fbqCalls?: unknown[][];
      }
    ).gtag = gtag;
    (
      window as typeof window & {
        dataLayer?: unknown[];
        gtag?: typeof gtag;
        fbq?: typeof fbq;
        _fbq?: typeof fbq;
        __gtagCalls?: unknown[][];
        __fbqCalls?: unknown[][];
      }
    ).fbq = fbq;
    (
      window as typeof window & {
        dataLayer?: unknown[];
        gtag?: typeof gtag;
        fbq?: typeof fbq;
        _fbq?: typeof fbq;
        __gtagCalls?: unknown[][];
        __fbqCalls?: unknown[][];
      }
    )._fbq = fbq;
    (
      window as typeof window & {
        dataLayer?: unknown[];
        gtag?: typeof gtag;
        fbq?: typeof fbq;
        _fbq?: typeof fbq;
        __gtagCalls?: unknown[][];
        __fbqCalls?: unknown[][];
      }
    ).__gtagCalls = gtagCalls;
    (
      window as typeof window & {
        dataLayer?: unknown[];
        gtag?: typeof gtag;
        fbq?: typeof fbq;
        _fbq?: typeof fbq;
        __gtagCalls?: unknown[][];
        __fbqCalls?: unknown[][];
      }
    ).__fbqCalls = fbqCalls;
  });
}

async function routeTrackingDependencies(page: Page) {
  await page.route('**/gtag/js**', async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/javascript', body: '' });
  });

  await page.route('**connect.facebook.net/**', async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/javascript', body: '' });
  });

  await page.route('**analytics.tiktok.com/**', async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/javascript', body: '' });
  });

  await page.route('**/api/v1/consent/events', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ success: true }),
    });
  });
}

async function routeOrganizer(page: Page) {
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
}

async function routeQuote(page: Page) {
  await page.route('**/api/v1/events/event_001/checkout/quote', async (route) => {
    const request = route.request().postDataJSON() as { items?: Array<{ quantity?: number }> } | null;
    const quantity = request?.items?.reduce((sum, item) => sum + (item.quantity ?? 0), 0) ?? 0;
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(buildQuotePayload(quantity || 1)),
    });
  });
}

async function getHtDataLayerEvents(page: Page) {
  return page.evaluate(() => {
    const dataLayer = (window as typeof window & { dataLayer?: unknown[] }).dataLayer ?? [];
    return dataLayer.filter((entry): entry is Record<string, unknown> => (
      Boolean(entry) &&
      typeof entry === 'object' &&
      !Array.isArray(entry) &&
      typeof (entry as Record<string, unknown>).event === 'string' &&
      ((entry as Record<string, unknown>).event as string).startsWith('ht_')
    ));
  });
}

test.describe('Halal Ticketin data layer smoke', () => {
  test.beforeEach(async ({ page }) => {
    await stubBrowserTracking(page);
    await routeTrackingDependencies(page);
  });

  test('pushes event-detail data layer events only after optional consent', async ({ page, context }) => {
    await context.clearCookies();
    await page.route('**/api/v1/public/events/test-event', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(eventPayload),
      });
    });
    await routeOrganizer(page);
    await routeQuote(page);

    await page.goto('/events/test-event');
    await page.waitForLoadState('networkidle');

    expect(await getHtDataLayerEvents(page)).toHaveLength(0);

    await page.getByRole('button', { name: /accept all/i }).click();

    await expect.poll(async () => {
      const events = await getHtDataLayerEvents(page);
      return events.filter((event) => event.event === 'ht_event_viewed').length;
    }).toBe(1);

    expect(await getHtDataLayerEvents(page)).toContainEqual({
      event: 'ht_event_viewed',
      organizer_id: 'org_123',
      public_event_id: 'event_001',
      public_event_title: 'Test Event',
      currency: 'GBP',
    });

    const ticketCard = page
      .locator('h4:has-text("General Admission")')
      .locator('xpath=ancestor::div[contains(@class,"justify-between")][1]');
    await ticketCard.locator('button').nth(1).click();

    await expect.poll(async () => {
      const events = await getHtDataLayerEvents(page);
      return events.filter((event) => event.event === 'ht_tickets_added').length;
    }).toBe(1);

    await page.getByRole('button', { name: /proceed to checkout/i }).click();

    await expect.poll(async () => {
      const events = await getHtDataLayerEvents(page);
      return events.filter((event) => event.event === 'ht_checkout_started').length;
    }).toBe(1);

    const events = await getHtDataLayerEvents(page);
    expect(events.find((event) => event.event === 'ht_tickets_added')).toMatchObject({
      organizer_id: 'org_123',
      public_event_id: 'event_001',
      public_event_title: 'Test Event',
      value: 25,
      currency: 'GBP',
      items: [{ item_id: 'ticket_001', item_name: 'General Admission', quantity: 1, price: 25 }],
    });
    expect(events.find((event) => event.event === 'ht_checkout_started')).toMatchObject({
      organizer_id: 'org_123',
      public_event_id: 'event_001',
      public_event_title: 'Test Event',
      value: 29.2,
      currency: 'GBP',
    });
  });

  test('pushes one purchase data layer event per order and omits personal/payment details', async ({ page, context }) => {
    await context.addCookies([
      {
        name: 'ht_consent',
        value: consentCookieValue,
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
      const events = await getHtDataLayerEvents(page);
      return events.filter((event) => event.event === 'ht_purchase').length;
    }).toBe(1);

    const purchase = (await getHtDataLayerEvents(page)).find((event) => event.event === 'ht_purchase');
    expect(purchase).toMatchObject({
      event: 'ht_purchase',
      event_id: 'meta_event_123',
      transaction_id: 'order_123',
      organizer_id: 'org_123',
      public_event_id: 'event_001',
      value: 29.2,
      currency: 'GBP',
      items: [
        {
          item_id: 'ticket_001',
          item_name: 'General Admission',
          quantity: 1,
          price: 25,
        },
      ],
    });
    expect(JSON.stringify(purchase)).not.toContain('buyer@example.com');
    expect(JSON.stringify(purchase)).not.toContain('contact@example.com');
    expect(JSON.stringify(purchase)).not.toContain('ticket_instance_001');
    expect(JSON.stringify(purchase)).not.toContain('session');
    expect(JSON.stringify(purchase)).not.toContain('payment');

    await page.reload();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    expect((await getHtDataLayerEvents(page)).filter((event) => event.event === 'ht_purchase')).toHaveLength(0);
  });

  test('pushes itemized purchase data layer payload for Google Ads only orders', async ({ page, context }) => {
    await context.addCookies([
      {
        name: 'ht_consent',
        value: consentCookieValue,
        domain: '127.0.0.1',
        path: '/',
      },
    ]);

    await page.route('**/api/v1/orders/order_123/status', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          ...successOrderPayload,
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
        }),
      });
    });

    await page.goto('/checkout/success?order_id=order_123');
    await page.waitForLoadState('networkidle');

    await expect.poll(async () => {
      const events = await getHtDataLayerEvents(page);
      return events.filter((event) => event.event === 'ht_purchase').length;
    }).toBe(1);

    const purchase = (await getHtDataLayerEvents(page)).find((event) => event.event === 'ht_purchase');
    expect(purchase).toMatchObject({
      event: 'ht_purchase',
      event_id: 'order_123',
      transaction_id: 'order_123',
      organizer_id: 'org_123',
      public_event_id: 'event_001',
      value: 29.2,
      currency: 'GBP',
      items: [
        {
          item_id: 'ticket_001',
          item_name: 'General Admission',
          quantity: 1,
          price: 25,
        },
      ],
    });
  });
});
