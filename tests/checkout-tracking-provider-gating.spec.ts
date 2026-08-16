import { expect, test, type Page } from '@playwright/test';

const eventId = 'event_provider_gating_001';
const eventSlug = 'provider-gating-event';
const organizerId = 'org_provider_gating_001';
const ticketId = 'ticket_provider_gating_001';
const consentCookieValue = encodeURIComponent(
  JSON.stringify({
    analytics: true,
    marketing: true,
    updatedAt: '2026-08-16T12:00:00.000Z',
    version: 2,
  }),
);

type Provider = 'none' | 'meta' | 'tiktok';

function buildEvent(provider: Provider) {
  return {
    id: eventId,
    organizerId,
    slug: eventSlug,
    title: 'Provider Gating Test Event',
    description: 'A fully mocked event for checkout tracking provider gating.',
    bannerImageUrl: null,
    startDatetime: '2030-05-01T18:00:00.000Z',
    endDatetime: '2030-05-01T20:00:00.000Z',
    timezone: 'Europe/London',
    isMultiDay: false,
    locationType: 'in_person',
    venue: 'Mock Community Hall',
    address: '123 Test Street',
    city: 'London',
    country: 'UK',
    onlineUrl: null,
    latitude: null,
    longitude: null,
    currency: 'GBP',
    organizerName: 'Provider Gating Organiser',
    organizerAvatarUrl: null,
    canContactOrganizer: false,
    category: null,
    absorbFee: false,
    feeTier: 'payg',
    customBookingFee: null,
    metaPixelId: provider === 'meta' ? '123456789012345' : null,
    tracking: {
      metaPixelId: provider === 'meta' ? '123456789012345' : null,
      googleAnalyticsMeasurementId: null,
      tiktokPixelId: provider === 'tiktok' ? 'CABC12345' : null,
      googleAds: null,
    },
    status: 'published',
    attendeeInfoMode: 'buyer_choice',
    customQuestions: [],
    totalCapacity: 100,
    ticketsSold: 0,
    remainingCapacity: 100,
    isSoldOut: false,
  };
}

const ticket = {
  id: ticketId,
  name: 'General Admission',
  description: null,
  price: '5.00',
  currency: 'GBP',
  maxQuantity: 10,
  minPerOrder: 1,
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
};

async function routeCheckoutDependencies(page: Page, provider: Provider) {
  // Safety boundary: specific mocks registered below take precedence. Any API
  // request we forgot to mock is aborted instead of reaching a live backend.
  await page.route('**/api/v1/**', async (route) => {
    await route.abort('blockedbyclient');
  });

  await page.route(`**/api/v1/public/events/${eventSlug}*`, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ event: buildEvent(provider), tickets: [ticket] }),
    });
  });

  await page.route(`**/api/v1/public/organizers/${organizerId}`, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        organizer: {
          id: organizerId,
          name: 'Provider Gating Organiser',
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

  await page.route(`**/api/v1/events/${eventId}/checkout/quote`, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        isFreeOrder: false,
        currency: 'GBP',
        subtotal: 5,
        discount: 0,
        organizerFee: 0,
        platformFee: 0,
        processingFee: 0,
        processingFeeVat: 0,
        total: 5,
        useCreditsApplied: false,
        creditsApplied: 0,
        paidTicketCount: 1,
        promoCodeApplied: false,
        lineAllocations: [],
      }),
    });
  });

  await page.route(`**/api/v1/events/${eventId}/checkout/session`, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        orderId: 'order_provider_gating_mock',
        totalAmount: 5,
        currency: 'GBP',
        tickets: [
          {
            id: 'ticket-instance-provider-gating-mock',
            ticketCode: 'MOCK-PROVIDER-GATING',
            ticketType: 'General Admission',
            attendeeName: 'Buyer Name',
            attendeeEmail: 'buyer@example.com',
          },
        ],
      }),
    });
  });

  await page.route('**/api/v1/orders/order_provider_gating_mock/status', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        orderId: 'order_provider_gating_mock',
        status: 'completed',
        totalAmount: 5,
        currency: 'GBP',
        organizerId,
        eventId,
        organizerName: 'Provider Gating Organiser',
        organizerContactEmail: null,
        metaPixelId: provider === 'meta' ? '123456789012345' : null,
        metaEventId: null,
        tiktokEventId: null,
        tracking: {
          googleAnalyticsMeasurementId: null,
          tiktokPixelId: provider === 'tiktok' ? 'CABC12345' : null,
          googleAds: null,
        },
        trackingItems: [],
        tickets: [],
      }),
    });
  });

  await page.route('**/api/v1/exchange-rates', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        base: 'GBP',
        date: '2030-01-01',
        rates: { GBP: 1, EUR: 1.17, USD: 1.27 },
        currencies: ['GBP', 'EUR', 'USD'],
        lastUpdated: '2030-01-01T00:00:00.000Z',
      }),
    });
  });

  await page.route('**/api/v1/consent/events', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ success: true }),
    });
  });

  await page.route('**/gtag/js**', async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/javascript', body: '' });
  });
  await page.route('**connect.facebook.net/**', async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/javascript', body: '' });
  });
  await page.route('**/analytics.tiktok.com/**', async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/javascript', body: '' });
  });
}

async function submitCheckout(page: Page) {
  const ticketCard = page
    .locator('h4:has-text("General Admission")')
    .locator('xpath=ancestor::div[contains(@class,"justify-between")][1]');
  await expect(ticketCard).toBeVisible();
  await ticketCard.locator('button').nth(1).click();

  const openCheckoutButton = page.getByRole('button', { name: /proceed to checkout/i });
  await expect(openCheckoutButton).toBeVisible();
  await openCheckoutButton.click();

  await page.locator('#buyerName').fill('Buyer Name');
  await page.locator('#buyerEmail').fill('buyer@example.com');
  await page.locator('#buyerAge').fill('29');
  await page.getByRole('combobox').first().click();
  await page.getByRole('option', { name: /^male$/i }).click();
  await page.getByRole('button', { name: /^continue$/i }).click();

  const submitButton = page.getByRole('button', { name: /pay .* now/i });
  await expect(submitButton).toBeEnabled();

  const sessionRequestPromise = page.waitForRequest((request) => {
    return request.url().includes(`/api/v1/events/${eventId}/checkout/session`);
  });
  const sessionResponsePromise = page.waitForResponse((response) =>
    response.url().includes(`/api/v1/events/${eventId}/checkout/session`),
  );

  await submitButton.click();
  const sessionRequest = await sessionRequestPromise;
  expect((await sessionResponsePromise).status()).toBe(200);

  return sessionRequest.postDataJSON() as Record<string, unknown>;
}

async function preparePage(page: Page, provider: Provider, query = 'utm_source=newsletter&utm_medium=email&utm_campaign=summer-2026') {
  await routeCheckoutDependencies(page, provider);
  await page.goto(`/events/${eventSlug}?${query}#tickets`);
  await page.waitForLoadState('networkidle');
}

test.describe('Checkout tracking provider gating browser flow', () => {
  test.beforeEach(async ({ context }) => {
    await context.clearCookies();
    await context.addCookies([
      {
        name: 'ht_consent',
        value: consentCookieValue,
        domain: '127.0.0.1',
        path: '/',
      },
      {
        name: '_fbp',
        value: 'fb.1.1700000000000.1234567890',
        domain: '127.0.0.1',
        path: '/',
      },
      {
        name: '_fbc',
        value: 'fb.1.1700000000000.long-browser-click-id',
        domain: '127.0.0.1',
        path: '/',
      },
      {
        name: '_ttp',
        value: 'ttp_cookie_provider_gating',
        domain: '127.0.0.1',
        path: '/',
      },
    ]);
  });

  test('submits no provider identifiers when consent is granted but the event has no providers', async ({ page }) => {
    await preparePage(page, 'none');
    const payload = await submitCheckout(page);

    expect(payload).not.toBeNull();
    expect(payload).toMatchObject({
      items: [{ ticketTypeId: ticketId, quantity: 1 }],
      tracking: {
        marketingConsent: false,
        utmSource: 'newsletter',
        utmMedium: 'email',
        utmCampaign: 'summer-2026',
      },
    });

    const tracking = payload?.tracking as Record<string, unknown>;
    expect(tracking).not.toHaveProperty('fbp');
    expect(tracking).not.toHaveProperty('fbc');
    expect(tracking).not.toHaveProperty('fbclid');
    expect(tracking).not.toHaveProperty('ttclid');
    expect(tracking).not.toHaveProperty('ttp');
  });

  test('submits Meta identifiers only when the event has a Meta target', async ({ page }) => {
    await preparePage(
      page,
      'meta',
      'utm_source=newsletter&utm_medium=email&utm_campaign=summer-2026&fbclid=browser-click-123&ttclid=tiktok-click-456',
    );
    const payload = await submitCheckout(page);

    expect(payload).toMatchObject({
      tracking: {
        marketingConsent: true,
        fbp: 'fb.1.1700000000000.1234567890',
        fbc: 'fb.1.1700000000000.long-browser-click-id',
        fbclid: 'browser-click-123',
        utmSource: 'newsletter',
        utmMedium: 'email',
        utmCampaign: 'summer-2026',
      },
    });
    const tracking = payload?.tracking as Record<string, unknown>;
    expect(tracking).not.toHaveProperty('ttclid');
    expect(tracking).not.toHaveProperty('ttp');
  });

  test('submits TikTok identifiers only when the event has a TikTok target', async ({ page }) => {
    await preparePage(
      page,
      'tiktok',
      'utm_source=newsletter&utm_medium=email&utm_campaign=summer-2026&fbclid=meta-click-123&ttclid=tiktok-click-456',
    );
    const payload = await submitCheckout(page);

    expect(payload).toMatchObject({
      tracking: {
        marketingConsent: true,
        ttclid: 'tiktok-click-456',
        ttp: 'ttp_cookie_provider_gating',
        utmSource: 'newsletter',
        utmMedium: 'email',
        utmCampaign: 'summer-2026',
      },
    });
    const tracking = payload?.tracking as Record<string, unknown>;
    expect(tracking).not.toHaveProperty('fbp');
    expect(tracking).not.toHaveProperty('fbc');
    expect(tracking).not.toHaveProperty('fbclid');
  });
});
