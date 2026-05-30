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

test('organiser billing shows available, held, and used credits separately', async ({ page }) => {
  await mockAuthenticatedOwner(page);

  await page.route(`**/api/v1/organizers/${organizerId}/credits`, route =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        balance: 96,
        availableBalance: 96,
        heldCredits: 4,
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
  await expect(page.getByText('Held: 4')).toBeVisible();
  await expect(page.getByText('Available: 96')).toBeVisible();

  const overflow = await page.evaluate(() => ({
    bodyWidth: document.body.scrollWidth,
    viewportWidth: window.innerWidth,
  }));
  expect(overflow.bodyWidth).toBeLessThanOrEqual(overflow.viewportWidth + 2);
});
