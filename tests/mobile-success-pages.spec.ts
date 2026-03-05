import { expect, test, type Page } from '@playwright/test';

async function getOverflowInfo(page: Page) {
  return page.evaluate(() => ({
    bodyWidth: document.body.scrollWidth,
    viewportWidth: window.innerWidth,
    hasOverflow: document.body.scrollWidth > window.innerWidth,
  }));
}

test.describe('Mobile success pages', () => {
  test('updated event success page stays within the mobile viewport', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });

    await page.addInitScript(() => {
      window.localStorage.setItem('halal-ticketin-access-token', 'test-access-token');
      window.localStorage.setItem('halal-ticketin-refresh-token', 'test-refresh-token');
    });

    await page.route('**/api/v1/auth/me', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          user: { id: 'user_1', email: 'test@example.com' },
          memberships: [
            {
              organizerId: 'org_123',
              role: 'owner',
              status: 'active',
            },
          ],
          isOrganizer: true,
        }),
      });
    });

    await page.route('**/api/v1/organizers', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          organizers: [
            {
              id: 'org_123',
              name: 'Test Organizer',
              avatarUrl: null,
              bio: null,
              website: null,
              replyToEmail: null,
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
              membershipId: 'membership_123',
              eventScope: {
                mode: 'all',
                eventIds: [],
              },
            },
          ],
        }),
      });
    });

    await page.goto(
      '/events/published?title=Copy%20of%20UNAPOLOGETIC%3A%20Sonny%20Bill%20Williams&date=2026-04-16&time=00%3A00&venue=RDS%20Hall%207%20(Concert%20Hall)&city=Dublin&slug=copy-of-unapologetic-sonny-bill-williams&private=true&mode=updated&organizer=org_123'
    );
    await page.waitForLoadState('networkidle');

    await expect(page.getByRole('heading', { name: 'Updated!' })).toBeVisible();
    await expect(page.getByText(/Share your event/i)).toBeVisible();

    const overflow = await getOverflowInfo(page);
    expect(overflow.hasOverflow).toBe(false);
    expect(overflow.bodyWidth).toBeLessThanOrEqual(overflow.viewportWidth + 2);
  });

  test('checkout success page shows visible ticket downloads on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });

    await page.route('**/api/v1/orders/order_123/status', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          orderId: 'order_123',
          status: 'completed',
          totalAmount: 25,
          currency: 'EUR',
          organizerId: 'org_123',
          eventId: 'event_123',
          organizerName: 'GUM Events',
          organizerContactEmail: 'info@growingupmuslimevents.com',
          metaPixelId: null,
          tickets: [
            {
              id: 'ticket_1',
              ticketCode: 'TICKET-ABC-123',
              ticketType: 'General Admission',
              attendeeName: 'Test Guest',
              attendeeEmail: 'guest@example.com',
            },
          ],
        }),
      });
    });

    await page.goto('/checkout/success?order_id=order_123');
    await page.waitForLoadState('networkidle');

    await expect(page.getByRole('heading', { name: /Your Tickets/i })).toBeVisible();

    const downloadButton = page.getByRole('button', { name: /QR Code/i }).first();
    await expect(downloadButton).toBeVisible();

    const downloadButtonBox = await downloadButton.boundingBox();
    expect(downloadButtonBox).not.toBeNull();
    expect(downloadButtonBox!.width).toBeGreaterThan(240);
    expect(downloadButtonBox!.height).toBeGreaterThan(36);

    const overflow = await getOverflowInfo(page);
    expect(overflow.hasOverflow).toBe(false);
    expect(overflow.bodyWidth).toBeLessThanOrEqual(overflow.viewportWidth + 2);
  });
});
