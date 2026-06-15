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
  metaPixelId: '123456789012345',
  metaEventId: 'meta_event_123',
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

async function stubFbq(page: Page) {
  await page.addInitScript(() => {
    const calls: unknown[][] = [];
    const realNow = Date.now.bind(Date);
    let nowOffset = 0;
    const fbq = (...args: unknown[]) => {
      calls.push(args);
    };
    (fbq as typeof fbq & { queue?: unknown[][]; push?: typeof fbq; callMethod?: typeof fbq }).queue = calls;
    (fbq as typeof fbq & { queue?: unknown[][]; push?: typeof fbq; callMethod?: typeof fbq }).push = fbq;
    (fbq as typeof fbq & { queue?: unknown[][]; push?: typeof fbq; callMethod?: typeof fbq }).callMethod = fbq;
    (window as typeof window & { fbq?: typeof fbq; _fbq?: typeof fbq; __fbqCalls?: unknown[][] }).fbq = fbq;
    (window as typeof window & { fbq?: typeof fbq; _fbq?: typeof fbq; __fbqCalls?: unknown[][] })._fbq = fbq;
    (
      window as typeof window & {
        __fbqCalls?: unknown[][];
        __setNowOffset?: (offsetMs: number) => void;
      }
    ).__fbqCalls = calls;
    Date.now = () => realNow() + nowOffset;
    (
      window as typeof window & {
        __setNowOffset?: (offsetMs: number) => void;
      }
    ).__setNowOffset = (offsetMs: number) => {
      nowOffset = offsetMs;
    };
  });
}

async function getFbqCalls(page: Page) {
  return page.evaluate(() => ((window as typeof window & { __fbqCalls?: unknown[][] }).__fbqCalls ?? []));
}

async function setNowOffset(page: Page, offsetMs: number) {
  await page.evaluate((value) => {
    const testWindow = window as typeof window & { __setNowOffset?: (offset: number) => void };
    testWindow.__setNowOffset?.(value);
  }, offsetMs);
}

test.describe('Meta Pixel smoke', () => {
  test.beforeEach(async ({ page, context }) => {
    await stubFbq(page);

    await context.addCookies([
      {
        name: 'ht_consent',
        value: consentCookieValue,
        domain: '127.0.0.1',
        path: '/',
      },
    ]);

    await page.route('**connect.facebook.net/**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/javascript',
        body: '',
      });
    });

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

    await page.route('**/api/v1/events/event_001/checkout/quote', async (route) => {
      const request = route.request().postDataJSON() as { items?: Array<{ quantity?: number }> } | null;
      const quantity = request?.items?.reduce((sum, item) => sum + (item.quantity ?? 0), 0) ?? 0;
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(buildQuotePayload(quantity || 1)),
      });
    });

    await page.route('**/api/v1/orders/order_123/status', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(successOrderPayload),
      });
    });
  });

  test('fires PageView, ViewContent, AddToCart, and deduped InitiateCheckout after consent', async ({ page, context }) => {
    await context.clearCookies();
    await page.goto('/events/test-event');
    await page.waitForLoadState('networkidle');
    await expect.poll(async () => {
      const calls = await getFbqCalls(page);
      return calls.filter((call) => call[0] === 'trackSingle').length;
    }).toBe(0);

    await page.getByRole('button', { name: /accept all/i }).click();
    await expect.poll(async () => (await getFbqCalls(page)).length).toBeGreaterThan(0);

    const ticketCard = page
      .locator('h4:has-text("General Admission")')
      .locator('xpath=ancestor::div[contains(@class,"justify-between")][1]');

    await ticketCard.locator('button').nth(1).click();
    await expect.poll(async () => {
      const calls = await getFbqCalls(page);
      return calls.filter((call) => call[0] === 'trackSingle' && call[2] === 'AddToCart').length;
    }).toBeGreaterThan(0);

    await page.getByRole('button', { name: /proceed to checkout/i }).click();
    await expect.poll(async () => {
      const calls = await getFbqCalls(page);
      return calls.filter((call) => call[0] === 'trackSingle' && call[2] === 'InitiateCheckout').length;
    }).toBe(1);

    await page.getByRole('button', { name: /close checkout/i }).click();
    await page.getByRole('button', { name: /proceed to checkout/i }).click();
    await expect.poll(async () => {
      const calls = await getFbqCalls(page);
      return calls.filter((call) => call[0] === 'trackSingle' && call[2] === 'InitiateCheckout').length;
    }).toBe(1);

    await page.getByRole('button', { name: /close checkout/i }).click();
    await ticketCard.locator('button').nth(1).click();
    await page.getByRole('button', { name: /proceed to checkout/i }).click();
    await expect.poll(async () => {
      const calls = await getFbqCalls(page);
      return calls.filter((call) => call[0] === 'trackSingle' && call[2] === 'InitiateCheckout').length;
    }).toBe(2);

    const calls = await getFbqCalls(page);

    expect(calls).toEqual(
      expect.arrayContaining([
        ['consent', 'grant'],
        ['init', '123456789012345'],
        [
          'trackSingle',
          '123456789012345',
          'PageView',
          {
            page_path: '/events/test-event',
          },
        ],
        [
          'trackSingle',
          '123456789012345',
          'ViewContent',
          {
            currency: 'GBP',
            content_type: 'product',
            content_ids: ['event_001'],
            content_name: 'Test Event',
          },
        ],
      ]),
    );

    const addToCartCalls = calls.filter((call) => call[0] === 'trackSingle' && call[2] === 'AddToCart');
    expect(addToCartCalls).toContainEqual([
      'trackSingle',
      '123456789012345',
      'AddToCart',
      {
        value: 25,
        currency: 'GBP',
        num_items: 1,
        content_ids: ['event_001'],
        content_type: 'product',
        contents: [
          {
            id: 'ticket_001',
            quantity: 1,
            item_price: 25,
          },
        ],
      },
    ]);

    const initiateCheckoutCalls = calls.filter((call) => call[0] === 'trackSingle' && call[2] === 'InitiateCheckout');
    expect(initiateCheckoutCalls).toContainEqual([
      'trackSingle',
      '123456789012345',
      'InitiateCheckout',
      {
        value: 29.2,
        currency: 'GBP',
        num_items: 1,
        content_ids: ['event_001'],
        content_type: 'product',
        contents: [
          {
            id: 'ticket_001',
            quantity: 1,
            item_price: 25,
          },
        ],
      },
    ]);
    expect(initiateCheckoutCalls).toContainEqual([
      'trackSingle',
      '123456789012345',
      'InitiateCheckout',
      {
        value: 58.4,
        currency: 'GBP',
        num_items: 2,
        content_ids: ['event_001'],
        content_type: 'product',
        contents: [
          {
            id: 'ticket_001',
            quantity: 2,
            item_price: 25,
          },
        ],
      },
    ]);
  });

  test('fires InitiateCheckout on checkout entry even while quote is still pending', async ({ page, context }) => {
    await page.unroute('**/api/v1/events/event_001/checkout/quote');
    await page.route('**/api/v1/events/event_001/checkout/quote', async (route) => {
      const request = route.request().postDataJSON() as { items?: Array<{ quantity?: number }> } | null;
      const quantity = request?.items?.reduce((sum, item) => sum + (item.quantity ?? 0), 0) ?? 0;
      await new Promise((resolve) => setTimeout(resolve, 2500));
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(buildQuotePayload(quantity || 1)),
      });
    });

    await context.clearCookies();
    await page.goto('/events/test-event');
    await page.waitForLoadState('networkidle');
    await page.getByRole('button', { name: /accept all/i }).click();

    const ticketCard = page
      .locator('h4:has-text("General Admission")')
      .locator('xpath=ancestor::div[contains(@class,"justify-between")][1]');

    await ticketCard.locator('button').nth(1).click();
    await page.getByRole('button', { name: /proceed to checkout/i }).click();

    await expect.poll(async () => {
      const calls = await getFbqCalls(page);
      return calls.filter((call) => call[0] === 'trackSingle' && call[2] === 'InitiateCheckout').length;
    }).toBe(1);

    const calls = await getFbqCalls(page);
    expect(calls).toContainEqual([
      'trackSingle',
      '123456789012345',
      'InitiateCheckout',
      {
        value: 25,
        currency: 'GBP',
        num_items: 1,
        content_ids: ['event_001'],
        content_type: 'product',
        contents: [
          {
            id: 'ticket_001',
            quantity: 1,
            item_price: 25,
          },
        ],
      },
    ]);

    await expect(page.getByText('£29.20').first()).toBeVisible();
    await expect.poll(async () => {
      const nextCalls = await getFbqCalls(page);
      return nextCalls.filter((call) => call[0] === 'trackSingle' && call[2] === 'InitiateCheckout').length;
    }).toBe(1);
  });

  test('does not emit a stale InitiateCheckout when cart changes before fallback', async ({ page, context }) => {
    await page.unroute('**/api/v1/events/event_001/checkout/quote');
    await page.route('**/api/v1/events/event_001/checkout/quote', async (route) => {
      const request = route.request().postDataJSON() as { items?: Array<{ quantity?: number }> } | null;
      const quantity = request?.items?.reduce((sum, item) => sum + (item.quantity ?? 0), 0) ?? 0;
      await new Promise((resolve) => setTimeout(resolve, 2500));
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(buildQuotePayload(quantity || 1)),
      });
    });

    await context.clearCookies();
    await page.goto('/events/test-event');
    await page.waitForLoadState('networkidle');
    await page.getByRole('button', { name: /accept all/i }).click();

    const ticketCard = page
      .locator('h4:has-text("General Admission")')
      .locator('xpath=ancestor::div[contains(@class,"justify-between")][1]');

    await ticketCard.locator('button').nth(1).click();
    await page.getByRole('button', { name: /proceed to checkout/i }).click();
    await page.getByRole('button', { name: /close checkout/i }).click();
    await ticketCard.locator('button').nth(1).click();
    await page.waitForTimeout(2300);

    let calls = await getFbqCalls(page);
    expect(calls.filter((call) => call[0] === 'trackSingle' && call[2] === 'InitiateCheckout')).toHaveLength(0);

    await page.getByRole('button', { name: /proceed to checkout/i }).click();
    await expect.poll(async () => {
      calls = await getFbqCalls(page);
      return calls.filter((call) => call[0] === 'trackSingle' && call[2] === 'InitiateCheckout').length;
    }).toBe(1);

    const initiateCheckoutCall = calls.find(
      (call) => call[0] === 'trackSingle' && call[2] === 'InitiateCheckout',
    );
    expect(initiateCheckoutCall).toEqual([
      'trackSingle',
      '123456789012345',
      'InitiateCheckout',
      expect.objectContaining({
        currency: 'GBP',
        num_items: 2,
        content_ids: ['event_001'],
        content_type: 'product',
        contents: [
          {
            id: 'ticket_001',
            quantity: 2,
            item_price: 25,
          },
        ],
      }),
    ]);
    const initiateCheckoutPayload = initiateCheckoutCall?.[3] as { value?: number } | undefined;
    expect([50, 58.4]).toContain(initiateCheckoutPayload?.value);
  });

  test('falls back to subtotal when the matching quote is stale', async ({ page, context }) => {
    await page.unroute('**/api/v1/events/event_001/checkout/quote');
    await page.route('**/api/v1/events/event_001/checkout/quote', async (route) => {
      const request = route.request().postDataJSON() as { items?: Array<{ quantity?: number }> } | null;
      const quantity = request?.items?.reduce((sum, item) => sum + (item.quantity ?? 0), 0) ?? 0;
      await new Promise((resolve) => setTimeout(resolve, 2500));
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(buildQuotePayload(quantity || 1)),
      });
    });

    await context.clearCookies();
    await page.goto('/events/test-event');
    await page.waitForLoadState('networkidle');
    await page.getByRole('button', { name: /accept all/i }).click();

    const ticketCard = page
      .locator('h4:has-text("General Admission")')
      .locator('xpath=ancestor::div[contains(@class,"justify-between")][1]');

    await ticketCard.locator('button').nth(1).click();
    await page.waitForTimeout(600);
    await setNowOffset(page, 180000);
    await page.getByRole('button', { name: /proceed to checkout/i }).click();

    await expect.poll(async () => {
      const calls = await getFbqCalls(page);
      return calls.filter((call) => call[0] === 'trackSingle' && call[2] === 'InitiateCheckout').length;
    }).toBe(1);

    const calls = await getFbqCalls(page);
    expect(calls).toContainEqual([
      'trackSingle',
      '123456789012345',
      'InitiateCheckout',
      {
        value: 25,
        currency: 'GBP',
        num_items: 1,
        content_ids: ['event_001'],
        content_type: 'product',
        contents: [
          {
            id: 'ticket_001',
            quantity: 1,
            item_price: 25,
          },
        ],
      },
    ]);

    await expect(page.getByText('£29.20').first()).toBeVisible();
    await expect.poll(async () => {
      const nextCalls = await getFbqCalls(page);
      return nextCalls.filter((call) => call[0] === 'trackSingle' && call[2] === 'InitiateCheckout').length;
    }).toBe(1);
  });

  test('fires Purchase on the success page with eventID', async ({ page }) => {
    await page.goto('/checkout/success?order_id=order_123');
    await page.waitForLoadState('networkidle');

    await expect.poll(async () => {
      const calls = await getFbqCalls(page);
      return calls.filter((call) => call[0] === 'trackSingle' && call[2] === 'Purchase').length;
    }).toBe(1);

    const calls = await getFbqCalls(page);
    expect(calls).toContainEqual([
      'trackSingle',
      '123456789012345',
      'Purchase',
      {
        value: 29.2,
        currency: 'GBP',
        content_type: 'product',
        num_items: 1,
        content_ids: ['event_001'],
      },
      {
        eventID: 'meta_event_123',
      },
    ]);
  });
});
