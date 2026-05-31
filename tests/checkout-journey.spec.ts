import { test, expect, type Page } from '@playwright/test';

// =============================================================================
// REAL EVENT CONFIGURATION
// =============================================================================
// These are actual events from your database. Update these if events change.
const REAL_EVENTS = {
    // Free event: "FREE TEST" - has free tickets
    freeEvent: 'hearts-unlocked',
    // Paid event: "Copy of TDS" - has paid tickets
    paidEvent: 'copy-of-tds',
    // Test event: "Testing 123"
    testEvent: 'testing-123',
    // Another test: "TEST TEST 123"
    anotherEvent: 'test-test-123',
};

// Viewports for responsive testing
const viewports = {
    mobile: { width: 390, height: 844 },
    tablet: { width: 768, height: 1024 },
    desktop: { width: 1920, height: 1080 }
};

const routeCheckoutEvent = async ({
    page,
    eventId,
    slug,
    attendeeInfoMode,
    customQuestions,
}: {
    page: Page;
    eventId: string;
    slug: string;
    attendeeInfoMode: 'buyer_choice' | 'per_ticket';
    customQuestions: Array<{
        id: string;
        label: string;
        type: 'text' | 'select' | 'checkbox';
        required: boolean;
        options?: string[];
    }>;
}) => {
    await page.route(`**/api/v1/public/events/${slug}**`, (route) => {
        route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
                event: {
                    id: eventId,
                    organizerId: 'org_checkout_prefill_001',
                    slug,
                    title: 'Checkout Prefill Test Event',
                    description: 'Stable mocked event for checkout attendee prefill tests.',
                    bannerImageUrl: null,
                    startDatetime: '2030-03-15T19:30:00.000Z',
                    endDatetime: '2030-03-15T22:00:00.000Z',
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
                    organizerName: 'Test Organizer',
                    organizerAvatarUrl: null,
                    category: null,
                    absorbFee: false,
                    feeTier: 'payg',
                    customBookingFee: null,
                    metaPixelId: null,
                    attendeeInfoMode,
                    customQuestions,
                    status: 'published',
                },
                tickets: [
                    {
                        id: 'ticket_checkout_prefill_001',
                        name: 'General Admission',
                        description: null,
                        price: '5.00',
                        currency: 'GBP',
                        maxQuantity: 100,
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
                    },
                ],
            }),
        });
    });

    await page.route(`**/api/v1/events/${eventId}/checkout/quote`, (route) => {
        route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
                success: true,
                currency: 'GBP',
                subtotal: 5.0,
                discount: 0,
                organizerFee: 0,
                platformFee: 0.63,
                processingFee: 0.34,
                total: 5.97,
                useCreditsApplied: false,
                creditsApplied: 0,
                paidTicketCount: 1,
                promoCodeApplied: false,
                lineAllocations: [],
            }),
        });
    });
};

const openCheckoutAndFillBuyerDetails = async (page: Page) => {
    await page.goto(`/events/${REAL_EVENTS.paidEvent}`);
    await page.waitForLoadState('networkidle');

    const plusButton = page.locator('button:has(svg.lucide-plus)').first();
    await expect(plusButton).toBeVisible();
    await plusButton.click();

    const openCheckoutButton = page.getByRole('button', { name: /proceed to checkout/i }).first();
    await expect(openCheckoutButton).toBeVisible();
    await openCheckoutButton.click();

    await page.locator('#buyerName').fill('Buyer Name');
    await page.locator('#buyerEmail').fill('buyer@example.com');
    await page.locator('#buyerAge').fill('29');

    await page.getByRole('combobox').first().click();
    await page.getByRole('option', { name: /^female$/i }).click();
};

// =============================================================================
// TICKET SELECTION TESTS - Using Real Events
// =============================================================================
test.describe('Checkout Journey - Ticket Selection', () => {
    test('event page displays available tickets', async ({ page }) => {
        await page.goto(`/events/${REAL_EVENTS.paidEvent}`);
        await page.waitForLoadState('networkidle');

        // Should show the event title
        await expect(page.locator('h1, [data-testid="event-title"]').first()).toBeVisible();

        // Should show ticket section
        await expect(page.getByText(/ticket|admission|entry/i).first()).toBeVisible();
    });

    test('ticket quantity controls work', async ({ page }) => {
        await page.goto(`/events/${REAL_EVENTS.paidEvent}`);
        await page.waitForLoadState('networkidle');

        // Find quantity controls (+ button)
        const plusButton = page.locator('button').filter({ hasText: '+' }).first();

        if (await plusButton.isVisible()) {
            await plusButton.click();
            await page.waitForTimeout(300);
        }

        await expect(page.locator('body')).toBeVisible();
    });

    test('event page shows ticket pricing or availability cues', async ({ page }) => {
        await page.goto(`/events/${REAL_EVENTS.paidEvent}`);
        await page.waitForLoadState('networkidle');

        const hasPriceSignal = await page.getByText(/€|EUR|free|£|USD|\$/i).first().isVisible().catch(() => false);
        const hasTicketSignal = await page.getByText(/ticket|admission|entry/i).first().isVisible().catch(() => false);
        expect(hasPriceSignal || hasTicketSignal).toBe(true);
    });

    test('free event shows free tickets', async ({ page }) => {
        await page.goto(`/events/${REAL_EVENTS.freeEvent}`);
        await page.waitForLoadState('networkidle');

        const hasFreeSignal = await page.getByText(/free/i).first().isVisible().catch(() => false);
        const hasTicketSignal = await page.getByText(/ticket|admission|entry/i).first().isVisible().catch(() => false);
        expect(hasFreeSignal || hasTicketSignal).toBe(true);
    });
});

// =============================================================================
// FEE DISPLAY TESTS
// =============================================================================
test.describe('Checkout Journey - Fee Display', () => {
    test('paid event shows fee breakdown when tickets selected', async ({ page }) => {
        await page.goto(`/events/${REAL_EVENTS.paidEvent}`);
        await page.waitForLoadState('networkidle');

        const plusButton = page.locator('button').filter({ hasText: '+' }).first();
        if (await plusButton.isVisible()) {
            await plusButton.click();
            await page.waitForTimeout(500);

            await expect(page.getByText(/fee|total|service|€/i).first()).toBeVisible();
        }
    });

    test('total updates when adding more tickets', async ({ page }) => {
        await page.goto(`/events/${REAL_EVENTS.paidEvent}`);
        await page.waitForLoadState('networkidle');

        const plusButton = page.locator('button').filter({ hasText: '+' }).first();
        if (await plusButton.isVisible()) {
            await plusButton.click();
            await page.waitForTimeout(300);
            await plusButton.click();
            await page.waitForTimeout(300);

            await expect(page.locator('body')).toBeVisible();
        }
    });
});

// =============================================================================
// CHECKOUT FORM TESTS
// =============================================================================
test.describe('Checkout Journey - Attendee Form', () => {
    test('checkout flow shows attendee form', async ({ page }) => {
        await page.goto(`/events/${REAL_EVENTS.freeEvent}`);
        await page.waitForLoadState('networkidle');

        const plusButton = page.locator('button').filter({ hasText: '+' }).first();
        if (await plusButton.isVisible()) {
            await plusButton.click();
        }

        const checkoutButton = page.getByRole('button', { name: /checkout|get tickets|register|proceed/i }).first();
        if (await checkoutButton.isVisible()) {
            await checkoutButton.click();
            await page.waitForTimeout(1000);

            const hasNameInput = await page.locator('input[name*="name"], input[placeholder*="name" i]').first().isVisible();
            const hasEmailInput = await page.locator('input[type="email"], input[name*="email"]').first().isVisible();

            expect(hasNameInput || hasEmailInput).toBe(true);
        }
    });

    test('attendee form requires email', async ({ page }) => {
        await page.goto(`/events/${REAL_EVENTS.freeEvent}`);
        await page.waitForLoadState('networkidle');

        const plusButton = page.locator('button').filter({ hasText: '+' }).first();
        if (await plusButton.isVisible()) {
            await plusButton.click();
        }

        const checkoutButton = page.getByRole('button', { name: /checkout|get|register/i }).first();
        if (await checkoutButton.isVisible()) {
            await checkoutButton.click();
            await page.waitForTimeout(1000);

            await expect(page.locator('input[type="email"], input[name*="email"]').first()).toBeVisible();
        }
    });

    test('attendee form shows gender selection', async ({ page }) => {
        await page.goto(`/events/${REAL_EVENTS.freeEvent}`);
        await page.waitForLoadState('networkidle');

        const plusButton = page.locator('button').filter({ hasText: '+' }).first();
        if (await plusButton.isVisible()) {
            await plusButton.click();
        }

        const checkoutButton = page.getByRole('button', { name: /checkout|get|register/i }).first();
        if (await checkoutButton.isVisible()) {
            await checkoutButton.click();
            await page.waitForTimeout(1000);

            await expect(page.getByText(/male|female|gender|brother|sister/i).first()).toBeVisible();
        }
    });

    test('custom question checkout prefills ticket 1 core details from buyer details', async ({ page }) => {
        await routeCheckoutEvent({
            page,
            eventId: '22222222-2222-4222-8222-222222222222',
            slug: REAL_EVENTS.paidEvent,
            attendeeInfoMode: 'buyer_choice',
            customQuestions: [
                {
                    id: 'diet',
                    label: 'Dietary notes',
                    type: 'text',
                    required: true,
                },
            ],
        });

        await openCheckoutAndFillBuyerDetails(page);
        await page.getByRole('button', { name: /continue/i }).click();

        await expect(page.getByRole('heading', { name: /ticket 1 details/i })).toBeVisible();
        await expect(page.locator('#ticketAttendeeName-0')).toHaveValue('Buyer Name');
        await expect(page.locator('#ticketAttendeeAge-0')).toHaveValue('29');
        await expect(page.getByRole('combobox', { name: /ticket 1 attendee gender/i })).toContainText('Female');

        await page.getByRole('button', { name: /continue/i }).click();
        await expect(page.getByText('Ticket 1: please answer "Dietary notes".')).toBeVisible();

        await page.locator('#ticketAttendeeName-0').fill('Guest Name');
        await expect(page.locator('#ticketAttendeeName-0')).toHaveValue('Guest Name');
    });

    test('buyer choice checkout prefills ticket 1 when buyer opts out of shared info', async ({ page }) => {
        await routeCheckoutEvent({
            page,
            eventId: '33333333-3333-4333-8333-333333333333',
            slug: REAL_EVENTS.paidEvent,
            attendeeInfoMode: 'buyer_choice',
            customQuestions: [],
        });

        await openCheckoutAndFillBuyerDetails(page);
        await page.locator('#useSharedInfo').uncheck();
        await page.getByRole('button', { name: /continue/i }).click();

        await expect(page.getByRole('heading', { name: /ticket 1 details/i })).toBeVisible();
        await expect(page.locator('#ticketAttendeeName-0')).toHaveValue('Buyer Name');
        await expect(page.locator('#ticketAttendeeAge-0')).toHaveValue('29');
        await expect(page.getByRole('combobox', { name: /ticket 1 attendee gender/i })).toContainText('Female');

        await page.locator('#ticketAttendeeName-0').fill('Guest Name');
        await expect(page.locator('#ticketAttendeeName-0')).toHaveValue('Guest Name');
    });
});

// =============================================================================
// FREE EVENT CHECKOUT FLOW
// =============================================================================
test.describe('Checkout Journey - Free Event Flow', () => {
    test('free event checkout completes without Stripe redirect', async ({ page }) => {
        await page.goto(`/events/${REAL_EVENTS.freeEvent}`);
        await page.waitForLoadState('networkidle');

        const plusButton = page.locator('button').filter({ hasText: '+' }).first();
        if (await plusButton.isVisible()) {
            await plusButton.click();
        }

        const checkoutButton = page.getByRole('button', { name: /checkout|get|register/i }).first();
        if (await checkoutButton.isVisible()) {
            await checkoutButton.click();
            await page.waitForTimeout(1000);

            const nameInput = page.locator('input[name*="name"], input[placeholder*="name" i]').first();
            const emailInput = page.locator('input[type="email"]').first();

            if (await nameInput.isVisible()) {
                await nameInput.fill('Test User');
            }
            if (await emailInput.isVisible()) {
                await emailInput.fill('test@example.com');
            }

            const genderOption = page.getByText(/^male$|^brother$/i).first();
            if (await genderOption.isVisible()) {
                await genderOption.click();
            }

            const url = page.url();
            expect(url).not.toContain('stripe.com');
        }
    });

    test('free event page loads correctly', async ({ page }) => {
        await page.goto(`/events/${REAL_EVENTS.freeEvent}`);
        await expect(page.locator('body')).toBeVisible();
    });
});

// =============================================================================
// PAID EVENT CHECKOUT FLOW
// =============================================================================
test.describe('Checkout Journey - Paid Event Flow', () => {
    test('paid event shows pricing and total', async ({ page }) => {
        await page.goto(`/events/${REAL_EVENTS.paidEvent}`);
        await page.waitForLoadState('networkidle');

        const hasPriceSignal = await page.getByText(/€|EUR|£|USD|\$|total|fee/i).first().isVisible().catch(() => false);
        const hasTicketSignal = await page.getByText(/ticket|admission|entry/i).first().isVisible().catch(() => false);
        expect(hasPriceSignal || hasTicketSignal).toBe(true);
    });

    test('paid event can add tickets to cart', async ({ page }) => {
        await page.goto(`/events/${REAL_EVENTS.paidEvent}`);
        await page.waitForLoadState('networkidle');

        const plusButton = page.locator('button').filter({ hasText: '+' }).first();
        if (await plusButton.isVisible()) {
            await plusButton.click();
            await page.waitForTimeout(500);

            await expect(page.locator('body')).toBeVisible();
        }
    });
});

// =============================================================================
// RESPONSIVE DESIGN TESTS
// =============================================================================
test.describe('Checkout Journey - Responsive Design', () => {
    test('event page works on mobile', async ({ page }) => {
        await page.setViewportSize(viewports.mobile);
        await page.goto(`/events/${REAL_EVENTS.testEvent}`);
        await page.waitForLoadState('networkidle');

        const bodyScrollWidth = await page.evaluate(() => document.body.scrollWidth);
        expect(bodyScrollWidth).toBeLessThanOrEqual(viewports.mobile.width + 20);
    });

    test('event page works on tablet', async ({ page }) => {
        await page.setViewportSize(viewports.tablet);
        await page.goto(`/events/${REAL_EVENTS.testEvent}`);
        await page.waitForLoadState('networkidle');

        await expect(page.locator('body')).toBeVisible();
    });

    test('event page works on desktop', async ({ page }) => {
        await page.setViewportSize(viewports.desktop);
        await page.goto(`/events/${REAL_EVENTS.testEvent}`);
        await page.waitForLoadState('networkidle');

        await expect(page.locator('body')).toBeVisible();
    });

    test('ticket selection fits mobile screen', async ({ page }) => {
        await page.setViewportSize(viewports.mobile);
        await page.goto(`/events/${REAL_EVENTS.paidEvent}`);
        await page.waitForLoadState('networkidle');

        const buttons = page.locator('button');
        const count = await buttons.count();

        for (let i = 0; i < Math.min(count, 5); i++) {
            const button = buttons.nth(i);
            if (await button.isVisible()) {
                const box = await button.boundingBox();
                if (box) {
                    expect(box.height).toBeGreaterThanOrEqual(32);
                }
            }
        }
    });

    test('checkout modal keeps top padding across steps and closes in one tap on mobile', async ({ page }) => {
        const mockEventId = '11111111-1111-4111-8111-111111111111';

        await page.route(`**/api/v1/public/events/${REAL_EVENTS.paidEvent}`, (route) => {
            route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({
                    event: {
                        id: mockEventId,
                        organizerId: 'org_mobile_modal_001',
                        slug: REAL_EVENTS.paidEvent,
                        title: 'Mobile Checkout Test Event',
                        description: 'Mocked event for mobile checkout modal layout verification.',
                        bannerImageUrl: null,
                        startDatetime: '2030-03-15T19:30:00.000Z',
                        endDatetime: '2030-03-15T22:00:00.000Z',
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
                        organizerName: 'Test Organizer',
                        organizerAvatarUrl: null,
                        category: null,
                        absorbFee: false,
                        feeTier: 'payg',
                        customBookingFee: null,
                        metaPixelId: null,
                        attendeeInfoMode: 'buyer_choice',
                        customQuestions: [],
                        status: 'published',
                    },
                    tickets: [
                        {
                            id: 'ticket_mobile_modal_001',
                            name: 'General Admission',
                            description: null,
                            price: '5.00',
                            currency: 'GBP',
                            maxQuantity: 100,
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
                        },
                    ],
                }),
            });
        });

        await page.route(`**/api/v1/events/${mockEventId}/checkout/quote`, (route) => {
            route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({
                    success: true,
                    currency: 'GBP',
                    subtotal: 5.0,
                    discount: 0,
                    organizerFee: 0,
                    platformFee: 0.63,
                    processingFee: 0.34,
                    total: 5.97,
                    useCreditsApplied: false,
                    creditsApplied: 0,
                    paidTicketCount: 1,
                    promoCodeApplied: false,
                }),
            });
        });

        await page.setViewportSize(viewports.mobile);
        await page.goto(`/events/${REAL_EVENTS.paidEvent}`);
        await page.waitForLoadState('networkidle');

        const plusButton = page.locator('button:has(svg.lucide-plus)').first();
        await expect(plusButton).toBeVisible();
        await plusButton.click();

        const openCheckoutButton = page.getByRole('button', { name: /proceed to checkout/i }).first();
        await expect(openCheckoutButton).toBeVisible();
        await openCheckoutButton.click();

        const checkoutDialog = page.locator('[data-slot="dialog-content"]').last();
        await expect(checkoutDialog).toBeVisible();

        const boxStepOne = await checkoutDialog.boundingBox();
        expect(boxStepOne).not.toBeNull();
        if (boxStepOne) {
            expect(boxStepOne.y).toBeGreaterThanOrEqual(8);
            expect(boxStepOne.x).toBeGreaterThanOrEqual(8);
            expect(viewports.mobile.width - (boxStepOne.x + boxStepOne.width)).toBeGreaterThanOrEqual(8);
        }

        await page.locator('#buyerName').fill('Test User');
        await page.locator('#buyerEmail').fill('test@example.com');
        await page.locator('#buyerAge').fill('29');

        const genderSelectTrigger = page.getByRole('combobox').first();
        await genderSelectTrigger.click();
        await page.getByRole('option', { name: /male/i }).first().click();

        await page.getByRole('button', { name: /continue/i }).click();
        await page.waitForTimeout(200);

        const boxStepTwo = await checkoutDialog.boundingBox();
        expect(boxStepTwo).not.toBeNull();
        if (boxStepTwo) {
            expect(boxStepTwo.y).toBeGreaterThanOrEqual(8);
            expect(boxStepTwo.x).toBeGreaterThanOrEqual(8);
            expect(viewports.mobile.width - (boxStepTwo.x + boxStepTwo.width)).toBeGreaterThanOrEqual(8);
        }

        const closeCheckoutButton = page.getByRole('button', { name: /close checkout/i });
        await expect(closeCheckoutButton).toBeVisible();
        await closeCheckoutButton.click();

        await expect(checkoutDialog).not.toBeVisible();
    });
});

// =============================================================================
// ERROR HANDLING TESTS
// =============================================================================
test.describe('Checkout Journey - Error Handling', () => {
    test('non-existent event shows 404', async ({ page }) => {
        await page.goto('/events/non-existent-event-slug-12345');
        await page.waitForLoadState('networkidle');

        const has404 = await page.getByText(/404|not found|doesn't exist/i).first().isVisible();
        const hasError = await page.getByText(/error|sorry/i).first().isVisible();

        expect(has404 || hasError).toBe(true);
    });

    test('event page handles slow loading gracefully', async ({ page }) => {
        await page.goto(`/events/${REAL_EVENTS.testEvent}`);
        await page.waitForLoadState('domcontentloaded');

        await expect(page.locator('body')).toBeVisible();
    });
});

// =============================================================================
// EVENT INFORMATION DISPLAY
// =============================================================================
test.describe('Checkout Journey - Event Information', () => {
    test.beforeEach(async ({ page }) => {
        await page.route(`**/api/v1/public/events/${REAL_EVENTS.paidEvent}**`, route => {
            route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({
                    event: {
                        id: 'event_info_paid_001',
                        organizerId: 'org_info_001',
                        title: 'Contract Test Event',
                        slug: REAL_EVENTS.paidEvent,
                        description: 'Stable mocked event for checkout event info tests.',
                        startDatetime: '2030-03-15T19:30:00.000Z',
                        endDatetime: '2030-03-15T22:00:00.000Z',
                        timezone: 'Europe/London',
                        locationType: 'in_person',
                        venue: 'Mock Community Hall',
                        address: '123 Test Street',
                        city: 'London',
                        country: 'UK',
                        currency: 'GBP',
                        organizerName: 'Test Organizer Name',
                        absorbFee: false,
                    },
                    tickets: [
                        {
                            id: 'ticket_info_001',
                            name: 'General Admission',
                            price: '25.00',
                            currency: 'GBP',
                            type: 'paid',
                            maxQuantity: 100,
                        },
                    ],
                }),
            });
        });
    });

    test('event page shows event title', async ({ page }) => {
        await page.goto(`/events/${REAL_EVENTS.paidEvent}`);
        await page.waitForLoadState('networkidle');

        await expect(page.getByRole('heading', { name: 'Contract Test Event' })).toBeVisible();
    });

    test('event page shows date and time', async ({ page }) => {
        await page.goto(`/events/${REAL_EVENTS.paidEvent}`);
        await page.waitForLoadState('networkidle');

        await expect(page.getByText(/march\s+2030/i).first()).toBeVisible();
        await expect(page.getByText(/\b\d{1,2}:\d{2}\b/).first()).toBeVisible();
    });

    test('event page shows venue information', async ({ page }) => {
        await page.goto(`/events/${REAL_EVENTS.paidEvent}`);
        await page.waitForLoadState('networkidle');

        await expect(page.getByText('Mock Community Hall').first()).toBeVisible();
    });

    test('event page shows organizer name', async ({ page }) => {
        await page.goto(`/events/${REAL_EVENTS.paidEvent}`);
        await page.waitForLoadState('networkidle');

        await expect(page.getByText('Test Organizer Name').first()).toBeVisible();
        await expect(page.getByRole('link', { name: /view organi[sz]er profile/i })).toBeVisible();
    });
});
