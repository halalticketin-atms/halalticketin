import { expect, test, type Page, type Route } from '@playwright/test';

const organizerId = '550e8400-e29b-41d4-a716-446655440000';
const eventId = '550e8400-e29b-41d4-a716-446655440001';
const ticketId = '550e8400-e29b-41d4-a716-446655440002';

type Coordinates = { latitude: number | null; longitude: number | null };

const eventFixture = (coordinates: Coordinates) => ({
  id: eventId,
  organizerId,
  title: 'Community Gathering',
  description: 'A published community event.',
  bannerImageUrl: null,
  status: 'published',
  cancelledAt: null,
  cancellationReason: null,
  cancellationNotes: null,
  startDatetime: '2027-06-20T10:00:00.000Z',
  endDatetime: '2027-06-20T12:00:00.000Z',
  timezone: 'Europe/Dublin',
  isMultiDay: false,
  locationType: 'in_person',
  venue: 'Dublin Community Hall',
  address: null,
  city: 'Dublin',
  country: 'Ireland',
  onlineUrl: null,
  currency: 'EUR',
  refundPolicy: 'No refunds within a week',
  isListedPublicly: true,
  isPubliclyAccessible: true,
  hasAccessPassword: false,
  slug: 'community-gathering',
  category: 'Community',
  feeTier: 'payg',
  customBookingFee: null,
  absorbFee: false,
  attendeeInfoMode: 'buyer_choice',
  customQuestions: [],
  totalCapacity: 100,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-06-20T10:00:00.000Z',
  ...coordinates,
});

const ticket = {
  id: ticketId,
  eventId,
  name: 'General Admission',
  description: null,
  price: '10.00',
  currency: 'EUR',
  maxQuantity: 100,
  minPerOrder: 1,
  maxPerOrder: 10,
  type: 'paid',
  visibility: 'public',
  salesStart: null,
  salesEnd: null,
  absorbFee: null,
  customFee: null,
  earlyBirdPrice: null,
  earlyBirdEndDate: null,
};

async function fulfillJson(route: Route, body: unknown) {
  await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });
}

async function mockEditPage(
  page: Page,
  coordinates: Coordinates,
  overrides: Partial<ReturnType<typeof eventFixture>> = {},
) {
  const event = { ...eventFixture(coordinates), ...overrides };
  const patchBodies: unknown[] = [];
  let publishCalls = 0;

  await page.addInitScript(() => {
    window.localStorage.setItem('halal-ticketin-access-token', 'test-access-token');
    window.localStorage.setItem('halal-ticketin-refresh-token', 'test-refresh-token');
  });

  await page.route('**/api/v1/auth/me', route => fulfillJson(route, {
    user: { id: 'user-123', email: 'organizer.test+mobile@halalticketin.com', name: 'Test Organiser' },
    memberships: [{
      id: 'membership-123', organizerId, role: 'owner', status: 'active',
      eventScope: { mode: 'all', eventIds: [] },
    }],
    isOrganizer: true,
  }));
  await page.route('**/api/v1/organizers', route => fulfillJson(route, { organizers: [{
    id: organizerId,
    name: 'Test Organiser',
    avatarUrl: null,
    bio: null,
    website: null,
    replyToEmail: 'organizer.test+mobile@halalticketin.com',
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
    membershipId: 'membership-123',
    eventScope: { mode: 'all', eventIds: [] },
  }] }));
  await page.route('**/api/v1/exchange-rates**', route => fulfillJson(route, { base: 'GBP', rates: { GBP: 1, EUR: 1.18 } }));
  await page.route(`**/api/v1/events/${eventId}/promo-codes`, route => fulfillJson(route, { promoCodes: [] }));
  await page.route(`**/api/v1/events/${eventId}/tickets`, route => fulfillJson(route, { tickets: [ticket] }));
  await page.route(`**/api/v1/events/${eventId}/publish`, async route => {
    publishCalls += 1;
    await fulfillJson(route, { event });
  });
  await page.route(`**/api/v1/events/${eventId}`, async route => {
    if (route.request().method() === 'PATCH') {
      patchBodies.push(route.request().postDataJSON());
      await fulfillJson(route, { event: { ...event, ...route.request().postDataJSON() } });
      return;
    }
    await fulfillJson(route, { event, tickets: [ticket] });
  });
  await page.route(`**/api/v1/organizers/${organizerId}/custom-questions`, route => fulfillJson(route, { questions: [] }));
  await page.route(`**/api/v1/organizers/${organizerId}/credits`, route => fulfillJson(route, { balance: 1000 }));

  return { patchBodies, getPublishCalls: () => publishCalls };
}

test('published legacy location permits an unrelated edit without reconfirmation', async ({ page }) => {
  const requests = await mockEditPage(page, { latitude: null, longitude: null });
  await page.goto(`/events/${eventId}/edit`);
  await expect(page.getByLabel('Event Title *')).toBeVisible();
  await page.getByLabel('Event Title *').fill('Updated Community Gathering');
  await page.getByRole('button', { name: 'Update Event' }).click();

  await expect.poll(() => requests.patchBodies.length).toBe(1);
  expect(requests.patchBodies[0]).toMatchObject({
    title: 'Updated Community Gathering',
    venue: 'Dublin Community Hall',
    address: null,
    city: 'Dublin',
    latitude: null,
    longitude: null,
  });
  await expect.poll(requests.getPublishCalls).toBe(1);
  await expect(page.getByText('Address is required when entering a venue manually.')).toHaveCount(0);
});

test('changing venue text invalidates a stale legacy location', async ({ page }) => {
  const requests = await mockEditPage(page, { latitude: null, longitude: null });
  await page.goto(`/events/${eventId}/edit`);
  await page.getByRole('button', { name: 'Venue', exact: true }).click();
  await page.getByPlaceholder('Search for Location').fill('Changed venue');
  await page.getByRole('button', { name: 'Update Event' }).click();

  await expect(page.getByText('Address is required when entering a venue manually.').first()).toBeVisible();
  expect(requests.patchBodies).toHaveLength(0);
  expect(requests.getPublishCalls()).toBe(0);
});

test('published coordinate-backed location permits an unrelated edit with empty address and city', async ({ page }) => {
  const requests = await mockEditPage(
    page,
    { latitude: 53.3498, longitude: -6.2603 },
    { address: null, city: null },
  );
  await page.goto(`/events/${eventId}/edit`);
  await page.getByLabel('Event Title *').fill('Coordinate-backed Event');
  await page.getByRole('button', { name: 'Update Event' }).click();

  await expect.poll(() => requests.patchBodies.length).toBe(1);
  await expect.poll(requests.getPublishCalls).toBe(1);
});
