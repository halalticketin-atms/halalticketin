import { expect, test, type Page } from '@playwright/test';

const organizerId = '550e8400-e29b-41d4-a716-446655440000';
const orderId = '550e8400-e29b-41d4-a716-446655440010';
const eventOneId = '550e8400-e29b-41d4-a716-446655440020';
const eventTwoId = '550e8400-e29b-41d4-a716-446655440021';

const order = {
  id: orderId,
  orderNumber: orderId,
  createdAt: '2026-06-01T10:00:00.000Z',
  attendee: {
    name: 'Amina Buyer',
    email: 'amina@example.com',
  },
  event: {
    id: eventOneId,
    name: 'Workshop A',
  },
  totals: {
    subtotal: 25,
    total: 25,
    net: 25,
    ticketRevenue: 25,
    donationRevenue: 0,
    currency: 'GBP',
    remainingRefundable: 25,
  },
  status: 'completed',
  promo: null,
  items: [
    {
      id: 'item-1',
      ticketTypeId: 'ticket-type-1',
      name: 'General',
      quantity: 1,
      unitPrice: 25,
      organizerFee: 0,
      ticketType: 'standard',
    },
  ],
  paymentMethod: 'Card',
};

const attendees = [
  {
    ticketId: '550e8400-e29b-41d4-a716-446655440030',
    ticketCode: 'TICKET-A',
    ticketTypeId: '550e8400-e29b-41d4-a716-446655440040',
    ticketType: 'General',
    ticketStatus: 'valid',
    checkInStatus: 'not_checked_in',
    orderId,
    orderNumber: orderId,
    orderStatus: 'completed',
    orderCreatedAt: '2026-06-01T10:00:00.000Z',
    buyer: {
      name: 'Amina Buyer',
      email: 'amina@example.com',
    },
    ticketHolder: {
      name: 'Amina Attendee',
      email: 'attendee-a@example.com',
      gender: 'female',
      age: 28,
    },
    event: {
      id: eventOneId,
      name: 'Workshop A',
      startsAt: '2026-07-01T10:00:00.000Z',
    },
    registrationAnswers: [
      {
        questionId: 'diet',
        label: 'Dietary requirements',
        type: 'text',
        options: null,
        value: 'Vegetarian',
      },
    ],
  },
  {
    ticketId: '550e8400-e29b-41d4-a716-446655440031',
    ticketCode: 'TICKET-B',
    ticketTypeId: '550e8400-e29b-41d4-a716-446655440041',
    ticketType: 'Standard',
    ticketStatus: 'valid',
    checkInStatus: 'checked_in',
    orderId: '550e8400-e29b-41d4-a716-446655440011',
    orderNumber: '550e8400-e29b-41d4-a716-446655440011',
    orderStatus: 'completed',
    orderCreatedAt: '2026-06-02T10:00:00.000Z',
    buyer: {
      name: 'Yusuf Buyer',
      email: 'yusuf@example.com',
    },
    ticketHolder: {
      name: 'Yusuf Attendee',
      email: 'attendee-b@example.com',
      gender: 'male',
      age: 31,
    },
    event: {
      id: eventTwoId,
      name: 'Workshop B',
      startsAt: '2026-07-02T10:00:00.000Z',
    },
    registrationAnswers: [
      {
        questionId: 'accessibility',
        label: 'Accessibility needs',
        type: 'text',
        options: null,
        value: 'Step-free access',
      },
    ],
  },
];

const answerFilterQuestions = [
  {
    questionId: 'attendance',
    label: 'Will you attend?',
    type: 'select',
    options: [
      { value: 'Yes', count: 200 },
      { value: 'No', count: 567 },
    ],
  },
  {
    questionId: 'meals',
    label: 'Meal preferences',
    type: 'checkbox',
    options: [
      { value: 'Halal', count: 300 },
      { value: 'Vegetarian', count: 120 },
    ],
  },
];

async function mockOrdersPage(page: Page) {
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
          id: 'user-1',
          email: 'owner@example.com',
          name: 'Owner',
          avatarUrl: null,
        },
        memberships: [
          {
            id: 'membership-1',
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
            name: 'Test Organizer',
            avatarUrl: null,
            defaultTimezone: 'Europe/London',
            defaultCurrency: 'GBP',
            feeTier: 'payg',
            role: 'owner',
            status: 'active',
            membershipId: 'membership-1',
            eventScope: { mode: 'all', eventIds: [] },
          },
        ],
      }),
    }),
  );

  await page.route('**/api/v1/exchange-rates', route =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        base: 'GBP',
        date: '2026-06-07',
        rates: { GBP: 1 },
        currencies: [],
        lastUpdated: '2026-06-07T00:00:00.000Z',
      }),
    }),
  );

  await page.route('**/api/v1/orders/ticket-breakdown?*', route =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ events: [], currency: 'GBP' }),
    }),
  );

  await page.route('**/api/v1/orders/attendees?*', route => {
    const url = new URL(route.request().url());
    const selectedEventId = url.searchParams.get('eventId');
    const answerFilters = JSON.parse(url.searchParams.get('answerFilters') || '{}') as Record<string, string[]>;
    const selectedAttendees = selectedEventId
      ? attendees.filter(attendee => attendee.event.id === selectedEventId)
      : attendees;
    const filteredAttendees = answerFilters.attendance?.includes('Yes')
      ? selectedAttendees.filter(attendee => attendee.event.id === eventOneId)
      : selectedAttendees;

    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        attendees: filteredAttendees,
        total: answerFilters.attendance?.includes('Yes') ? 501 : filteredAttendees.length,
        limit: 500,
        offset: 0,
        answerFilterQuestions: selectedEventId === eventOneId ? answerFilterQuestions : [],
      }),
    });
  });

  await page.route(`**/api/v1/orders/${orderId}`, route =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        ...order,
        totals: {
          ...order.totals,
          remainingTicketRefundable: 25,
          breakdown: {
            ticketSubtotal: 25,
            organizerFeeTotal: 0,
            discount: 0,
            donationTotal: 0,
            platformFee: 0,
            processingFee: 0,
            processingFeeVat: 0,
          },
        },
        tickets: [
          {
            id: attendees[0].ticketId,
            ticketCode: attendees[0].ticketCode,
            ticketTypeId: attendees[0].ticketTypeId,
            ticketType: attendees[0].ticketType,
            attendeeName: attendees[0].ticketHolder.name,
            attendeeEmail: attendees[0].ticketHolder.email,
            status: 'valid',
            paidAmount: 25,
            refundBasePrice: 25,
            refundableAmount: 25,
            registrationAnswers: attendees[0].registrationAnswers,
          },
        ],
      }),
    }),
  );

  await page.route('**/api/v1/orders?*', route =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ orders: [order], total: 1 }),
    }),
  );
}

test.beforeEach(async ({ page }) => {
  await mockOrdersPage(page);
  await page.goto(`/dashboard/o/${organizerId}/orders`);
  await page.waitForLoadState('networkidle');
});

test('attendees view keeps answers scoped to the selected event', async ({ page }) => {
  await page.getByRole('button', { name: 'Attendees' }).click();

  const visibleText = (text: string) =>
    page.getByText(text, { exact: true }).filter({ visible: true });

  await expect(visibleText('Amina Attendee')).toBeVisible();
  await expect(visibleText('Yusuf Attendee')).toBeVisible();

  if ((page.viewportSize()?.width ?? 0) >= 768) {
    await expect(page.getByRole('columnheader', { name: 'Answers' })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Dietary requirements' })).toHaveCount(0);
  }

  await page.locator('[data-slot="dropdown-menu-trigger"]').filter({ hasText: 'Events' }).click();
  await page.getByText('Workshop A', { exact: true }).last().click();
  await page.keyboard.press('Escape');

  await expect(visibleText('Amina Attendee')).toBeVisible();
  await expect(visibleText('Yusuf Attendee')).toHaveCount(0);

  if ((page.viewportSize()?.width ?? 0) >= 768) {
    await expect(page.locator('th').filter({ hasText: 'Dietary requirements' })).toBeVisible();
    await expect(visibleText('Vegetarian')).toBeVisible();
    await expect(page.locator('th').filter({ hasText: 'Accessibility needs' })).toHaveCount(0);
  }
});

test('order details exposes ticket-level registration answers', async ({ page }) => {
  await page.getByText('Amina Buyer').first().click();

  await expect(page.getByRole('tab', { name: 'Details' })).toBeVisible();
  await expect(page.getByRole('tab', { name: 'Answers' })).toBeVisible();
  await expect(page.getByRole('tab', { name: 'Refund' })).toBeVisible();

  await page.getByRole('tab', { name: 'Answers' }).click();
  await expect(page.getByText('Dietary requirements')).toBeVisible();
  await expect(page.getByText('Vegetarian')).toBeVisible();
});

test('answer filters appear for one event and are sent with pagination-safe requests', async ({ page }) => {
  await page.getByRole('button', { name: 'Attendees' }).click();
  await page.locator('[data-slot="dropdown-menu-trigger"]').filter({ hasText: 'Events' }).click();
  await page.getByText('Workshop A', { exact: true }).last().click();
  await page.keyboard.press('Escape');

  await expect(page.getByRole('button', { name: /Will you attend/ })).toBeVisible();
  await page.getByRole('button', { name: /Will you attend/ }).click();
  const filteredRequest = page.waitForRequest(request => {
    const url = new URL(request.url());
    return url.pathname.endsWith('/api/v1/orders/attendees')
      && url.searchParams.get('answerFilters') !== null;
  });
  await page.getByRole('menuitemcheckbox', { name: /Yes.*200/ }).click();

  const request = await filteredRequest;
  await page.keyboard.press('Escape');
  expect(JSON.parse(new URL(request.url()).searchParams.get('answerFilters') || '{}')).toEqual({
    attendance: ['Yes'],
  });
  expect(new URL(request.url()).searchParams.get('offset')).toBe('0');

  const loadMoreRequest = page.waitForRequest(nextRequest => {
    const url = new URL(nextRequest.url());
    return url.pathname.endsWith('/api/v1/orders/attendees')
      && url.searchParams.get('offset') === '1';
  });
  await expect(page.getByRole('button', { name: /Load more/ })).toBeVisible();
  await page.getByRole('button', { name: /Load more/ }).click();
  const nextRequest = await loadMoreRequest;
  expect(JSON.parse(new URL(nextRequest.url()).searchParams.get('answerFilters') || '{}')).toEqual({
    attendance: ['Yes'],
  });
});

test('answer filters clear and hide when event selection becomes incompatible', async ({ page }) => {
  await page.getByRole('button', { name: 'Attendees' }).click();
  await page.locator('[data-slot="dropdown-menu-trigger"]').filter({ hasText: 'Events' }).click();
  await page.getByText('Workshop A', { exact: true }).last().click();
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: /Will you attend/ }).click();
  await page.getByRole('menuitemcheckbox', { name: /Yes.*200/ }).click();
  await page.keyboard.press('Escape');

  await page.locator('[data-slot="dropdown-menu-trigger"]').filter({ hasText: 'Events' }).click();
  await page.getByText('Workshop B', { exact: true }).last().click();
  await page.keyboard.press('Escape');

  await expect(page.getByRole('button', { name: /Will you attend/ })).toHaveCount(0);
});
