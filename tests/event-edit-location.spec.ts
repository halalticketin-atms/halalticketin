import { expect, test, type Page, type Route } from '@playwright/test';

const organizerId = '550e8400-e29b-41d4-a716-446655440000';
const eventId = '550e8400-e29b-41d4-a716-446655440001';
const ticketId = '550e8400-e29b-41d4-a716-446655440002';
const futureYear = new Date().getUTCFullYear() + 2;
const futureDate = `${futureYear}-06-20`;
const futureStart = `${futureDate}T10:00:00.000Z`;
const futureEnd = `${futureDate}T12:00:00.000Z`;

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
  startDatetime: futureStart,
  endDatetime: futureEnd,
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
  waitlistEnabled: false,
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
  overrides: Record<string, unknown> = {},
) {
  const event = { ...eventFixture(coordinates), ...overrides };
  const patchBodies: unknown[] = [];
  const requestOrder: string[] = [];
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
  await page.route(`**/api/v1/events/${eventId}/tickets`, route => {
    if (route.request().method() === 'PUT') requestOrder.push('tickets');
    return fulfillJson(route, { tickets: [ticket] });
  });
  await page.route(`**/api/v1/events/${eventId}/publish`, async route => {
    publishCalls += 1;
    await fulfillJson(route, { event });
  });
  await page.route(`**/api/v1/events/${eventId}`, async route => {
    if (route.request().method() === 'PATCH') {
      requestOrder.push('event');
      patchBodies.push(route.request().postDataJSON());
      await fulfillJson(route, { event: { ...event, ...route.request().postDataJSON() } });
      return;
    }
    await fulfillJson(route, { event, tickets: [ticket] });
  });
  await page.route(`**/api/v1/organizers/${organizerId}/custom-questions`, route => fulfillJson(route, { questions: [] }));
  await page.route(`**/api/v1/organizers/${organizerId}/credits`, route => fulfillJson(route, { balance: 1000 }));

  return { patchBodies, requestOrder, getPublishCalls: () => publishCalls };
}

async function openLocationStep(page: Page) {
  await page.getByRole('button', { name: 'Venue', exact: true }).click();
  await expect(page.getByPlaceholder('Search for Location')).toBeVisible();
}

const getUpdateEventButton = (page: Page) =>
  page.getByRole('button', { name: 'Update event' });

const recoveredFormData = (coordinates: Coordinates) => ({
  title: 'Recovered Community Gathering',
  description: 'Recovered edits.',
  bannerImageDataUrl: '',
  categories: ['Community'],
  totalCapacity: 100,
  visibility: 'public' as const,
  accessCodeEnabled: false,
  accessCode: '',
  date: futureDate,
  endDate: futureDate,
  isMultiDay: false,
  startTime: '10:00',
  endTime: '12:00',
  timezone: 'Europe/Dublin',
  locationType: 'physical' as const,
  venue: 'Dublin Community Hall',
  address: '',
  city: 'Dublin',
  country: 'Ireland',
  onlineUrl: '',
  absorbFee: false,
  currency: 'EUR',
  refundPolicy: 'No refunds within a week',
  attendeeInfoMode: 'buyer_choice' as const,
  customQuestions: [],
  ...coordinates,
});

const recoveredTicket = {
  id: ticketId,
  name: 'General Admission',
  price: '10.00',
  customFee: '',
  isFree: false,
  type: 'paid' as const,
  quantity: 100,
  minPerOrder: 1,
  maxPerOrder: 10,
  description: '',
  salesStart: '',
  salesStartTime: '',
  salesEnd: '',
  salesEndTime: '',
  hasEarlyBird: false,
  earlyBirdPrice: '',
  earlyBirdEndDate: '',
  visibility: 'public' as const,
  absorbFee: false,
};

for (const width of [1024, 1280]) {
  test(`edit status copy stays inside the wizard header at ${width}px`, async ({ page }) => {
    await mockEditPage(page, { latitude: 53.3498, longitude: -6.2603 });
    await page.setViewportSize({ width, height: 720 });
    await page.goto(`/events/${eventId}/edit`);
    await page.getByLabel('Event Title *').fill(`Updated event at ${width}px`);

    const description = page.getByText('Changes will update this event once you publish.', { exact: true });
    await expect(description).toBeVisible();
    const editBadge = page.getByText('Editing existing event', { exact: true });
    await expect(editBadge).toBeVisible();
    await expect(page.getByText('Unsaved', { exact: true })).toBeVisible();

    const header = description.locator(
      'xpath=ancestor::div[contains(concat(" ", normalize-space(@class), " "), " sticky ")][1]',
    );
    const [descriptionBox, editBadgeBox, headerBox] = await Promise.all([
      description.boundingBox(),
      editBadge.boundingBox(),
      header.boundingBox(),
    ]);

    expect(descriptionBox).not.toBeNull();
    expect(editBadgeBox).not.toBeNull();
    expect(headerBox).not.toBeNull();
    expect(descriptionBox!.y + descriptionBox!.height).toBeLessThanOrEqual(
      headerBox!.y + headerBox!.height,
    );
    expect(descriptionBox!.x).toBeGreaterThan(editBadgeBox!.x + editBadgeBox!.width);
    expect(descriptionBox!.y).toBeLessThan(editBadgeBox!.y + editBadgeBox!.height);
    expect(editBadgeBox!.y).toBeLessThan(descriptionBox!.y + descriptionBox!.height);
  });
}

test('published legacy location permits an unrelated edit without reconfirmation', async ({ page }) => {
  const requests = await mockEditPage(page, { latitude: null, longitude: null });
  await page.goto(`/events/${eventId}/edit`);
  await expect(page.getByLabel('Event Title *')).toBeVisible();
  await page.getByLabel('Event Title *').fill('Updated Community Gathering');
  await page.getByRole('button', { name: 'Update event' }).click();

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
  const requests = await mockEditPage(
    page,
    { latitude: 53.3498, longitude: -6.2603 },
    { address: '1 Main Street', city: 'Dublin' },
  );
  await page.goto(`/events/${eventId}/edit`);
  await openLocationStep(page);
  await page.getByPlaceholder('Search for Location').fill('Changed venue');
  await expect(page.getByLabel('Address (optional override)')).toHaveValue('');
  await expect(page.getByLabel('City')).toHaveValue('');
  await getUpdateEventButton(page).click();

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
  await page.getByRole('button', { name: 'Update event' }).click();

  await expect.poll(() => requests.patchBodies.length).toBe(1);
  await expect.poll(requests.getPublishCalls).toBe(1);
});

test('first published waitlist enable saves the eligible ticket before the event', async ({ page }) => {
  const requests = await mockEditPage(page, { latitude: 53.3498, longitude: -6.2603 });
  await page.goto(`/events/${eventId}/edit`);
  await page.getByRole('button', { name: 'Tickets', exact: true }).click();
  await page.getByRole('switch', { name: 'Enable waitlist for sold-out tickets' }).click();
  await page.getByRole('checkbox', { name: 'Include this ticket in the waitlist' }).click();
  await getUpdateEventButton(page).click();

  await expect.poll(() => requests.requestOrder.length).toBeGreaterThanOrEqual(2);
  expect(requests.requestOrder.slice(0, 2)).toEqual(['tickets', 'event']);
});

test('published numeric ticket blanks are blocked before Update or Preview writes', async ({ page }) => {
  const requests = await mockEditPage(page, { latitude: 53.3498, longitude: -6.2603 });
  await page.goto(`/events/${eventId}/edit`);
  await page.getByRole('button', { name: 'Tickets', exact: true }).click();
  await page.getByLabel('Ticket price').fill('');
  await page.getByLabel('Ticket quantity').fill('');

  await getUpdateEventButton(page).click();
  await expect(page.getByText('Enter a valid price for this paid ticket.').first()).toBeVisible();
  await expect(page.getByText('Enter a ticket quantity of at least 1.').first()).toBeVisible();
  expect(requests.requestOrder).toHaveLength(0);

  await page.getByRole('button', { name: 'Close toast' }).click();

  let popupCount = 0;
  page.on('popup', popup => {
    popupCount += 1;
    void popup.close();
  });
  await page.getByRole('button', { name: 'Preview event' }).click();
  expect(popupCount).toBe(0);
  expect(requests.requestOrder).toHaveLength(0);
});

test('published invalid location is blocked through Update event', async ({ page }) => {
  const requests = await mockEditPage(page, { latitude: null, longitude: null });
  await page.goto(`/events/${eventId}/edit`);
  await openLocationStep(page);
  await page.getByPlaceholder('Search for Location').fill('Changed venue');
  await getUpdateEventButton(page).click();

  await expect(page.getByText('Address is required when entering a venue manually.').first()).toBeVisible();
  expect(requests.patchBodies).toHaveLength(0);
});

test('minimum-age validation clears when the organiser corrects the field', async ({ page }) => {
  const requests = await mockEditPage(page, { latitude: null, longitude: null });
  await page.goto(`/events/${eventId}/edit`);
  await page.getByRole('button', { name: 'Tickets', exact: true }).click();
  await page.getByRole('button', { name: 'Attendee Info', exact: true }).click();

  const minimumAgeInput = page.getByLabel('Minimum attendee age');
  await expect(minimumAgeInput).toBeVisible();
  const minimumAgeError = page.locator('main').getByText('Enter a minimum age from 0 to 120.');
  await minimumAgeInput.fill('-1');
  await expect(minimumAgeError).toHaveCount(0);

  await getUpdateEventButton(page).click();
  await expect(minimumAgeError.first()).toBeVisible();
  expect(requests.patchBodies).toHaveLength(0);

  await minimumAgeInput.fill('18');
  await expect(minimumAgeError).toHaveCount(0);
  await expect(minimumAgeInput).toHaveAttribute('aria-invalid', 'false');
});

test('published invalid location is blocked through Preview', async ({ page }) => {
  const requests = await mockEditPage(page, { latitude: null, longitude: null });
  await page.goto(`/events/${eventId}/edit`);
  await openLocationStep(page);
  await page.getByPlaceholder('Search for Location').fill('Changed venue');

  let popupCount = 0;
  page.on('popup', popup => {
    popupCount += 1;
    void popup.close();
  });
  await page.getByRole('button', { name: 'Preview event' }).click();

  await expect(page.getByText('Address is required when entering a venue manually.').first()).toBeVisible();
  expect(popupCount).toBe(0);
  expect(requests.patchBodies).toHaveLength(0);
});

for (const field of ['address', 'city'] as const) {
  test(`editing ${field} after a coordinate-backed selection clears stale coordinates`, async ({ page }) => {
    const requests = await mockEditPage(
      page,
      { latitude: 51.5074, longitude: -0.1278 },
      { venue: 'London Hall', address: '1 London Road', city: 'London', country: 'United Kingdom' },
    );
    await page.goto(`/events/${eventId}/edit`);
    await openLocationStep(page);
    await page.getByLabel(field === 'address' ? 'Address (optional override)' : 'City').fill(
      field === 'address' ? '10 Deansgate' : 'Manchester',
    );
    await getUpdateEventButton(page).click();

    await expect.poll(() => requests.patchBodies.length).toBe(1);
    expect(requests.patchBodies[0]).toMatchObject({
      venue: 'London Hall',
      address: field === 'address' ? '10 Deansgate' : '1 London Road',
      city: field === 'city' ? 'Manchester' : 'London',
      country: 'United Kingdom',
      latitude: null,
      longitude: null,
    });
  });
}

test('recovered unchanged location preserves the server coordinate pair', async ({ page }) => {
  await page.addInitScript(({ storageKey, snapshot }) => {
    window.sessionStorage.setItem(storageKey, JSON.stringify(snapshot));
  }, {
    storageKey: `halalticketin:event-edit-recovery:${eventId}`,
    snapshot: {
      version: 1,
      eventId,
      savedAt: Date.UTC(futureYear, 0, 1),
      currentStep: 1,
      currentSubStep: 'title',
      draft: {
        eventId,
        eventStatus: 'published',
        formData: recoveredFormData({ latitude: null, longitude: null }),
        tickets: [recoveredTicket],
        promoCodes: [],
        currentStep: 1,
        currentSubStep: 'title',
      },
    },
  });
  const requests = await mockEditPage(
    page,
    { latitude: 53.3498, longitude: -6.2603 },
    { address: null, city: 'Dublin' },
  );
  await page.goto(`/events/${eventId}/edit`);
  await expect(page.getByLabel('Event Title *')).toHaveValue('Recovered Community Gathering');
  await getUpdateEventButton(page).click();

  await expect.poll(() => requests.patchBodies.length).toBe(1);
  expect(requests.patchBodies[0]).toMatchObject({ latitude: 53.3498, longitude: -6.2603 });
});

test('recovered changed text cannot save with the stale server coordinate pair', async ({ page }) => {
  await page.addInitScript(({ storageKey, snapshot }) => {
    window.sessionStorage.setItem(storageKey, JSON.stringify(snapshot));
  }, {
    storageKey: `halalticketin:event-edit-recovery:${eventId}`,
    snapshot: {
      version: 1,
      eventId,
      savedAt: Date.UTC(futureYear, 0, 1),
      currentStep: 3,
      currentSubStep: 'location',
      draft: {
        eventId,
        eventStatus: 'published',
        formData: {
          ...recoveredFormData({ latitude: 53.3498, longitude: -6.2603 }),
          venue: 'Manchester Hall',
          address: '10 Deansgate',
          city: 'Manchester',
          country: 'United Kingdom',
        },
        tickets: [recoveredTicket],
        promoCodes: [],
        currentStep: 3,
        currentSubStep: 'location',
      },
    },
  });
  const requests = await mockEditPage(
    page,
    { latitude: 53.3498, longitude: -6.2603 },
    {
      venue: 'Dublin Community Hall',
      address: '1 Main Street',
      city: 'Dublin',
      country: 'Ireland',
    },
  );
  await page.goto(`/events/${eventId}/edit`);
  await expect(page.getByPlaceholder('Search for Location')).toHaveValue('Manchester Hall');
  await getUpdateEventButton(page).click();

  await expect(page.getByText(/select the updated venue/i).first()).toBeVisible();
  expect(requests.patchBodies).toHaveLength(0);
  expect(requests.getPublishCalls()).toBe(0);
});

test('accepts a published manual location with a null coordinate pair', async ({ page }) => {
  const requests = await mockEditPage(
    page,
    { latitude: null, longitude: null },
    { address: '1 Main Street', city: 'Dublin' },
  );
  await page.goto(`/events/${eventId}/edit`);
  await page.getByLabel('Event Title *').fill('Updated manual event');
  await getUpdateEventButton(page).click();

  await expect.poll(() => requests.patchBodies.length).toBe(1);
  expect(requests.patchBodies[0]).toMatchObject({ latitude: null, longitude: null });
});

test('accepts 0,0 as a published coordinate pair', async ({ page }) => {
  const requests = await mockEditPage(
    page,
    { latitude: 0, longitude: 0 },
    { address: null, city: null },
  );
  await page.goto(`/events/${eventId}/edit`);
  await page.getByLabel('Event Title *').fill('Zero coordinate event');
  await getUpdateEventButton(page).click();

  await expect.poll(() => requests.patchBodies.length).toBe(1);
  expect(requests.patchBodies[0]).toMatchObject({ latitude: 0, longitude: 0 });
});

test('online published events validate only the online location half', async ({ page }) => {
  const requests = await mockEditPage(page, { latitude: null, longitude: null }, {
    locationType: 'online',
    venue: null,
    address: null,
    city: null,
    country: null,
    onlineUrl: 'https://example.com/live',
  });
  await page.goto(`/events/${eventId}/edit`);
  await page.getByLabel('Event Title *').fill('Updated online event');
  await getUpdateEventButton(page).click();

  await expect.poll(() => requests.patchBodies.length).toBe(1);
  expect(requests.patchBodies[0]).toMatchObject({
    locationType: 'online',
    venue: null,
    latitude: null,
    longitude: null,
    onlineUrl: 'https://example.com/live',
  });
});

test('hybrid published events require both physical and online location halves', async ({ page }) => {
  const requests = await mockEditPage(page, { latitude: 53.3498, longitude: -6.2603 }, {
    locationType: 'hybrid',
    address: null,
    city: null,
    onlineUrl: null,
  });
  await page.goto(`/events/${eventId}/edit`);
  await getUpdateEventButton(page).click();

  await expect(page.getByText('Online URL is required for online or hybrid events.').first()).toBeVisible();
  expect(requests.patchBodies).toHaveLength(0);
});
