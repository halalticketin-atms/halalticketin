import { expect, test, type Page } from '@playwright/test';

const organizerId = 'org_credits_visibility';

async function mockAuthenticatedOwner(page: Page) {
  await page.addInitScript(() => {
    window.localStorage.setItem('halal-ticketin-access-token', 'test-access-token');
    window.localStorage.setItem('halal-ticketin-refresh-token', 'test-refresh-token');
  });

  await page.route('**/api/v1/auth/me', route =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        user: {
          id: 'user_123',
          email: 'owner@example.com',
          name: 'Owner',
          avatarUrl: null,
        },
        memberships: [
          {
            id: 'membership_123',
            organizerId,
            role: 'owner',
            status: 'active',
            eventScope: { mode: 'all', eventIds: [] },
          },
        ],
        isOrganizer: true,
      }),
    }),
  );

  await page.route('**/api/v1/organizers', route =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        organizers: [
          {
            id: organizerId,
            name: 'Credit Visibility Org',
            avatarUrl: null,
            bio: null,
            website: null,
            replyToEmail: 'owner@example.com',
            socialLinks: null,
            city: 'London',
            country: 'UK',
            defaultTimezone: 'Europe/London',
            defaultCurrency: 'GBP',
            metaPixelId: null,
            feeTier: 'token',
            charityNumber: null,
            isCharityVerified: false,
            role: 'owner',
            status: 'active',
            membershipId: 'membership_123',
            eventScope: { mode: 'all', eventIds: [] },
          },
        ],
      }),
    }),
  );
}

async function mockDashboardData(page: Page) {
  await page.route('**/api/v1/analytics/overview**', route =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        stats: {
          totalRevenue: 0,
          netRevenue: 0,
          ticketRevenue: 0,
          donationRevenue: 0,
          ticketsSold: 0,
          paidOrders: 0,
          totalEvents: 0,
          currency: 'GBP',
        },
      }),
    }),
  );

  await page.route('**/api/v1/analytics/events-performance**', route =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ events: [] }),
    }),
  );
}

test('organiser billing shows available and used credits, keeping held credits internal', async ({ page }) => {
  await mockAuthenticatedOwner(page);

  await page.route(`**/api/v1/organizers/${organizerId}/credits`, route =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        balance: 96,
        availableBalance: 96,
        usedCredits: 25,
        totalPurchased: 125,
        lastPurchaseAt: '2026-01-01T00:00:00.000Z',
        history: [],
      }),
    }),
  );

  await page.goto(`/dashboard/o/${organizerId}/billing`);
  await page.waitForLoadState('networkidle');

  await expect(page.getByText('Available Credits')).toBeVisible();
  await expect(page.getByRole('heading', { name: '96' })).toBeVisible();
  await expect(page.getByText('Used: 25')).toBeVisible();
  await expect(page.getByText('Available: 96')).toBeVisible();

  // Held credits are an internal backend safety state and must not be customer-facing.
  await expect(page.getByText(/Held/)).toHaveCount(0);

  const overflow = await page.evaluate(() => ({
    bodyWidth: document.body.scrollWidth,
    viewportWidth: window.innerWidth,
  }));
  expect(overflow.bodyWidth).toBeLessThanOrEqual(overflow.viewportWidth + 2);
});

test('organiser billing shows a retryable error when credits fail to load', async ({ page }) => {
  await mockAuthenticatedOwner(page);

  await page.route(`**/api/v1/organizers/${organizerId}/credits`, route =>
    route.fulfill({
      status: 500,
      contentType: 'application/json',
      body: JSON.stringify({ message: 'Unable to load credits' }),
    }),
  );

  await page.goto(`/dashboard/o/${organizerId}/billing`);
  await page.waitForLoadState('networkidle');

  await expect(page.getByRole('heading', { name: /We couldn’t load your credits/i })).toBeVisible();
  await expect(page.getByRole('button', { name: /Try again/i })).toBeVisible();
  await expect(page.getByText('Available Credits')).toHaveCount(0);
  await expect(page.getByText(/Held/)).toHaveCount(0);
});

test('organiser dashboard suppresses low-credit warning when credits fail to load', async ({ page }) => {
  await mockAuthenticatedOwner(page);
  await mockDashboardData(page);

  await page.route(`**/api/v1/organizers/${organizerId}/credits`, route =>
    route.fulfill({
      status: 500,
      contentType: 'application/json',
      body: JSON.stringify({ message: 'Unable to load credits' }),
    }),
  );

  await page.goto(`/dashboard/o/${organizerId}`);
  await page.waitForLoadState('networkidle');

  await expect(page.getByText('Couldn’t load your credit balance')).toBeVisible();
  await expect(page.getByRole('button', { name: /Retry/i })).toBeVisible();
  await expect(page.getByText('Credits running low')).toHaveCount(0);
  await expect(page.getByText(/Held/)).toHaveCount(0);
});

for (const width of [1280, 1440]) {
  test(`desktop organiser switcher gives the workspace identity enough room at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 800 });
    await mockAuthenticatedOwner(page);
    await mockDashboardData(page);

    await page.route(`**/api/v1/organizers/${organizerId}/credits`, route =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ balance: 100, availableBalance: 100, usedCredits: 0 }),
      }),
    );

    await page.goto(`/dashboard/o/${organizerId}`);

    const switcher = page.getByRole('button', { name: /Credit Visibility Org/ });
    await expect(switcher).toBeVisible();
    const switcherBox = await switcher.boundingBox();

    expect(switcherBox).not.toBeNull();
    expect(switcherBox!.width).toBeGreaterThanOrEqual(246);
    expect(switcherBox!.height).toBeGreaterThanOrEqual(56);
  });
}

test('organiser dashboard keeps the desktop switcher out of the mobile layout', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await mockAuthenticatedOwner(page);
  await mockDashboardData(page);

  await page.route(`**/api/v1/organizers/${organizerId}/credits`, route =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ balance: 100, availableBalance: 100, usedCredits: 0 }),
    }),
  );

  await page.goto(`/dashboard/o/${organizerId}`);

  await expect(page.getByRole('button', { name: /Credit Visibility Org/ })).toBeHidden();
  const overflow = await page.evaluate(() => ({
    bodyWidth: document.body.scrollWidth,
    viewportWidth: window.innerWidth,
  }));
  expect(overflow.bodyWidth).toBeLessThanOrEqual(overflow.viewportWidth + 2);
});
