import { test, expect } from '@playwright/test';

const organizerId = '550e8400-e29b-41d4-a716-446655440000';
const eventId = '550e8400-e29b-41d4-a716-446655440001';

test('check-in scanner mounts on mobile view', async ({ page }) => {
  await page.addInitScript(({ accessToken, refreshToken }) => {
    window.localStorage.setItem('halal-ticketin-access-token', accessToken);
    window.localStorage.setItem('halal-ticketin-refresh-token', refreshToken);
  }, { accessToken: 'test-token', refreshToken: 'test-refresh-token' });

  await page.route('**/api/v1/auth/me', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        user: {
          id: 'user_123',
          email: 'test@example.com',
          name: 'Test User',
          avatarUrl: null,
          gender: null,
          dateOfBirth: null,
          homeCountry: null,
          homeCity: null,
        },
        memberships: [
          {
            id: 'membership_1',
            organizerId,
            role: 'admin',
            status: 'active',
            eventScope: { mode: 'all', eventIds: [] },
          },
        ],
        isOrganizer: true,
      }),
    })
  );

  await page.route('**/api/v1/organizers', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        organizers: [
          {
            id: organizerId,
            name: 'Test Organizer',
            avatarUrl: null,
            bio: null,
            website: null,
            replyToEmail: null,
            socialLinks: null,
            city: null,
            country: null,
            defaultTimezone: 'UTC',
            defaultCurrency: 'USD',
            metaPixelId: null,
            feeTier: 'payg',
            role: 'admin',
            status: 'active',
            membershipId: 'membership_1',
            eventScope: { mode: 'all', eventIds: [] },
          },
        ],
      }),
    })
  );

  await page.route(`**/api/v1/organizers/${organizerId}/events**`, (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        events: [
          {
            id: eventId,
            organizerId,
            title: 'Sample Event',
            description: null,
            bannerImageUrl: null,
            status: 'published',
            startDatetime: new Date().toISOString(),
            endDatetime: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
            timezone: 'UTC',
            isMultiDay: false,
            locationType: 'in_person',
            venue: null,
            address: null,
            city: null,
            country: null,
            onlineUrl: null,
            latitude: null,
            longitude: null,
            currency: 'USD',
            refundPolicy: null,
            isListedPublicly: true,
            slug: 'sample-event',
            category: null,
            feeTier: 'payg',
            customBookingFee: null,
            absorbFee: false,
            attendeeInfoMode: 'per_ticket',
            customQuestions: null,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        ],
      }),
    })
  );

  await page.route(`**/api/v1/events/${eventId}/check-in/tickets**`, (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ tickets: [] }),
    })
  );

  await page.route(`**/api/v1/events/${eventId}/check-in/stats**`, (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        totalTickets: 0,
        checkedIn: 0,
        notCheckedIn: 0,
        percentage: 0,
      }),
    })
  );

  await page.goto(`/dashboard/o/${organizerId}/check-in?event=${eventId}&mode=scan`);
  await page.waitForLoadState('networkidle');

  await expect(page.getByTestId('qr-scanner')).toBeVisible();
});
