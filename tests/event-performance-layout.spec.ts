import { expect, test, type Page } from '@playwright/test';

const organizerId = 'org_event_layout';

async function mockDashboard(page: Page) {
  await page.addInitScript(() => {
    window.localStorage.setItem('halal-ticketin-access-token', 'test-access-token');
    window.localStorage.setItem('halal-ticketin-refresh-token', 'test-refresh-token');
  });

  await page.route('**/api/v1/auth/me', route =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        user: { id: 'user_layout', email: 'owner@example.com', name: 'Amina', avatarUrl: null },
        memberships: [
          {
            id: 'membership_layout',
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
            name: 'Dublin Community Events',
            avatarUrl: null,
            bio: null,
            website: null,
            replyToEmail: 'owner@example.com',
            socialLinks: null,
            city: 'Dublin',
            country: 'Ireland',
            defaultTimezone: 'Europe/Dublin',
            defaultCurrency: 'EUR',
            metaPixelId: null,
            feeTier: 'payg',
            charityNumber: null,
            isCharityVerified: false,
            role: 'owner',
            status: 'active',
            membershipId: 'membership_layout',
            eventScope: { mode: 'all', eventIds: [] },
          },
        ],
      }),
    }),
  );

  await page.route('**/api/v1/analytics/overview**', route =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        stats: {
          totalRevenue: 4826,
          netRevenue: 4826,
          ticketsSold: 184,
          paidOrders: 126,
          totalEvents: 1,
          activeEvents: 1,
          currency: 'EUR',
        },
      }),
    }),
  );

  await page.route('**/api/v1/analytics/events-performance**', route =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        events: [
          {
            id: 'event_layout',
            slug: 'summer-community-gathering',
            title: 'Summer Community Gathering',
            startDatetime: '2026-08-30T17:30:00.000Z',
            venue: 'The Convention Centre',
            city: 'Dublin',
            bannerImageUrl: '/images/mock-event-poster.png',
            ticketsSold: 184,
            donationCount: 12,
            totalTickets: 250,
            revenue: 4826,
            ticketRevenue: 4426,
            donationRevenue: 400,
            currency: 'EUR',
            status: 'published',
            displayStatus: 'published',
            salesTrend: [4, 8, 12, 18, 22, 30],
            trendPercentage: 18,
            weeklySales: [
              { weekStart: '2026-06-08', ticketsSold: 12, revenue: 300 },
              { weekStart: '2026-06-15', ticketsSold: 18, revenue: 450 },
              { weekStart: '2026-06-22', ticketsSold: 27, revenue: 675 },
              { weekStart: '2026-06-29', ticketsSold: 36, revenue: 900 },
            ],
            ticketTypeBreakdown: [
              { id: 'adult', name: 'Adult', sold: 118, total: 150, revenue: 3540 },
              { id: 'family', name: 'Family', sold: 66, total: 100, revenue: 886 },
            ],
          },
        ],
      }),
    }),
  );

  await page.route(`**/api/v1/organizers/${organizerId}/credits`, route =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ balance: 0, availableBalance: 0, usedCredits: 0 }),
    }),
  );
}

test('desktop event summary keeps the poster and details aligned to equal height', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1100 });
  await mockDashboard(page);
  await page.goto(`/dashboard/o/${organizerId}`);
  await page.getByRole('heading', { name: 'Summer Community Gathering' }).waitFor();

  const card = page.getByTestId('event-performance-card');
  const poster = card.getByTestId('event-performance-poster');
  const details = card.getByTestId('event-performance-details');
  const [posterBox, detailsBox] = await Promise.all([poster.boundingBox(), details.boundingBox()]);

  expect(posterBox).not.toBeNull();
  expect(detailsBox).not.toBeNull();
  expect(posterBox!.x).toBeLessThan(detailsBox!.x);
  expect(Math.abs(posterBox!.height - detailsBox!.height)).toBeLessThanOrEqual(2);

  // The weekly trend renders a visible path connecting its points immediately.
  const lineCurve = card.locator('.recharts-line-curve').first();
  await expect(lineCurve).toBeVisible();
  const curve = await lineCurve.evaluate(node => {
    return {
      d: node.getAttribute('d') ?? '',
      stroke: getComputedStyle(node).stroke,
    };
  });
  expect(curve.d.split(/(?=[CL])/).length).toBeGreaterThanOrEqual(3);
  expect(curve.stroke).not.toBe('none');

  await page.waitForFunction(() =>
    Array.from(document.images).every(image => image.complete),
  );
  await page.screenshot({ path: 'test-results/event-overview-desktop.png', fullPage: true });
});

test('mobile event summary keeps its stacked layout without horizontal overflow', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await mockDashboard(page);
  await page.goto(`/dashboard/o/${organizerId}`);
  await page.getByRole('heading', { name: 'Summer Community Gathering' }).waitFor();

  const card = page.getByTestId('event-performance-card');
  const [posterBox, detailsBox] = await Promise.all([
    card.getByTestId('event-performance-poster').boundingBox(),
    card.getByTestId('event-performance-details').boundingBox(),
  ]);

  expect(posterBox).not.toBeNull();
  expect(detailsBox).not.toBeNull();
  expect(Math.abs(posterBox!.x - detailsBox!.x)).toBeLessThanOrEqual(2);
  expect(detailsBox!.y).toBeGreaterThanOrEqual(posterBox!.y + posterBox!.height - 2);

  const overflow = await page.evaluate(() => document.body.scrollWidth - window.innerWidth);
  expect(overflow).toBeLessThanOrEqual(2);

});
