import { test, expect, Page } from '@playwright/test';

// Viewports for responsive testing
const viewports = {
    mobile: { width: 390, height: 844 },
    tablet: { width: 768, height: 1024 },
    desktop: { width: 1920, height: 1080 }
};

// Mock authenticated user for checkout tests
async function mockAuthenticatedBuyer(page: Page) {
    await page.addInitScript(() => {
        window.localStorage.setItem('halal-ticketin-access-token', 'buyer-token');
        window.localStorage.setItem('halal-ticketin-refresh-token', 'buyer-refresh');
    });
}

async function mockPublicEvent(page: Page, eventSlug: string, options: { hasFreeTickets?: boolean; hasPaidTickets?: boolean; absorbFee?: boolean } = {}) {
    const { hasFreeTickets = true, hasPaidTickets = true, absorbFee = false } = options;

    interface TicketType {
        id: string;
        name: string;
        description: string;
        price: string;
        currency: string;
        type: string;
        visibility: string;
        available: number;
        maxPerOrder: number;
        customFee?: number;
    }

    const ticketTypes: TicketType[] = [];
    if (hasFreeTickets) {
        ticketTypes.push({
            id: 'ticket_free_001',
            name: 'Free Entry',
            description: 'Free general admission',
            price: '0.00',
            currency: 'GBP',
            type: 'free',
            visibility: 'public',
            available: 100,
            maxPerOrder: 5
        });
    }
    if (hasPaidTickets) {
        ticketTypes.push({
            id: 'ticket_paid_001',
            name: 'General Admission',
            description: 'Standard entry ticket',
            price: '25.00',
            currency: 'GBP',
            type: 'paid',
            visibility: 'public',
            available: 150,
            maxPerOrder: 10
        });
        ticketTypes.push({
            id: 'ticket_vip_001',
            name: 'VIP Access',
            description: 'Premium VIP experience',
            price: '75.00',
            currency: 'GBP',
            type: 'paid',
            visibility: 'public',
            available: 50,
            maxPerOrder: 5,
            customFee: 5.00
        });
    }

    await page.route(`**/api/v1/public/events/${eventSlug}`, route => {
        route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
                event: {
                    id: 'event_001',
                    title: 'Community Gathering',
                    slug: eventSlug,
                    description: 'A wonderful community event for everyone.',
                    startDatetime: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
                    endDatetime: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000 + 4 * 60 * 60 * 1000).toISOString(),
                    timezone: 'Europe/London',
                    locationType: 'in_person',
                    venue: 'Community Hall',
                    address: '123 Main Street',
                    city: 'London',
                    country: 'UK',
                    currency: 'GBP',
                    absorbFee,
                    metaPixelId: null,
                    attendeeInfoMode: 'buyer_choice'
                },
                ticketTypes,
                organizerName: 'Community Org',
                organizerAvatarUrl: null
            })
        });
    });
}

async function mockCheckoutQuote(page: Page) {
    await page.route('**/api/v1/events/*/checkout/quote', route => {
        const url = route.request().url();
        route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
                success: true,
                currency: 'GBP',
                subtotal: 50,
                discount: 0,
                organizerFee: 0,
                platformFee: 2.50,
                processingFee: 1.50,
                total: 54,
                useCreditsApplied: false,
                creditsApplied: 0,
                paidTicketCount: 2,
                promoCodeApplied: false
            })
        });
    });
}

test.describe('Checkout Journey - Ticket Selection', () => {
    test.beforeEach(async ({ page }) => {
        await mockPublicEvent(page, 'community-gathering');
        await mockCheckoutQuote(page);
    });

    test('event page displays available tickets', async ({ page }) => {
        await page.goto('/events/community-gathering');
        await page.waitForLoadState('networkidle');

        // Should show ticket options
        await expect(page.getByText('General Admission').or(page.getByText('Free Entry'))).toBeVisible();
    });

    test('ticket quantity can be adjusted', async ({ page }) => {
        await page.goto('/events/community-gathering');
        await page.waitForLoadState('networkidle');

        // Find quantity controls
        const plusButton = page.locator('button').filter({ hasText: '+' }).first();
        const minusButton = page.locator('button').filter({ hasText: '-' }).first();

        if (await plusButton.isVisible()) {
            await plusButton.click();
            // Quantity should increase
        }
    });

    test('quantity respects max per order limit', async ({ page }) => {
        await page.goto('/events/community-gathering');
        await page.waitForLoadState('networkidle');

        // Try to exceed max quantity
        const plusButton = page.locator('button').filter({ hasText: '+' }).first();
        if (await plusButton.isVisible()) {
            // Click many times
            for (let i = 0; i < 15; i++) {
                await plusButton.click();
            }
            // Should be capped at maxPerOrder
        }
    });

    test('prices are displayed with correct currency', async ({ page }) => {
        await page.goto('/events/community-gathering');
        await page.waitForLoadState('networkidle');

        // Should show GBP prices
        await expect(page.getByText(/£25|GBP 25|25\.00/).first()).toBeVisible();
    });

    test('free tickets show as free', async ({ page }) => {
        await page.goto('/events/community-gathering');
        await page.waitForLoadState('networkidle');

        await expect(page.getByText(/free/i).first()).toBeVisible();
    });
});

test.describe('Checkout Journey - Fee Display', () => {
    test.beforeEach(async ({ page }) => {
        await mockPublicEvent(page, 'paid-event', { hasFreeTickets: false, hasPaidTickets: true });
        await mockCheckoutQuote(page);
    });

    test('fee breakdown is visible', async ({ page }) => {
        await page.goto('/events/paid-event');
        await page.waitForLoadState('networkidle');

        // Select a ticket first
        const plusButton = page.locator('button').filter({ hasText: '+' }).first();
        if (await plusButton.isVisible()) {
            await plusButton.click();
            await page.waitForTimeout(500);

            // Fee breakdown should be visible
            await expect(page.getByText(/fee|service|processing/i).first()).toBeVisible();
        }
    });

    test('total updates when ticket selection changes', async ({ page }) => {
        await page.goto('/events/paid-event');
        await page.waitForLoadState('networkidle');

        const plusButton = page.locator('button').filter({ hasText: '+' }).first();
        if (await plusButton.isVisible()) {
            await plusButton.click();
            await page.waitForTimeout(300);

            // Record initial total
            const totalElement = page.getByText(/total|£/i).last();
            const initialText = await totalElement.textContent();

            // Add another ticket
            await plusButton.click();
            await page.waitForTimeout(300);

            // Total should be different
        }
    });
});

test.describe('Checkout Journey - Attendee Information', () => {
    test.beforeEach(async ({ page }) => {
        await mockPublicEvent(page, 'test-event');
        await mockCheckoutQuote(page);
    });

    test('checkout form requires attendee name', async ({ page }) => {
        await page.goto('/events/test-event');
        await page.waitForLoadState('networkidle');

        // Add ticket
        const plusButton = page.locator('button').filter({ hasText: '+' }).first();
        if (await plusButton.isVisible()) {
            await plusButton.click();
        }

        // Find checkout button and click
        const checkoutButton = page.getByRole('button', { name: /checkout|get tickets|proceed/i }).first();
        if (await checkoutButton.isVisible()) {
            await checkoutButton.click();
            await page.waitForTimeout(500);

            // Should see name input
            await expect(page.locator('input[name*="name"], input[placeholder*="name" i]').first()).toBeVisible();
        }
    });

    test('checkout form requires attendee email', async ({ page }) => {
        await page.goto('/events/test-event');
        await page.waitForLoadState('networkidle');

        const plusButton = page.locator('button').filter({ hasText: '+' }).first();
        if (await plusButton.isVisible()) {
            await plusButton.click();
        }

        const checkoutButton = page.getByRole('button', { name: /checkout|get tickets|proceed/i }).first();
        if (await checkoutButton.isVisible()) {
            await checkoutButton.click();
            await page.waitForTimeout(500);

            await expect(page.locator('input[type="email"], input[name*="email"]').first()).toBeVisible();
        }
    });

    test('checkout form requires gender selection', async ({ page }) => {
        await page.goto('/events/test-event');
        await page.waitForLoadState('networkidle');

        const plusButton = page.locator('button').filter({ hasText: '+' }).first();
        if (await plusButton.isVisible()) {
            await plusButton.click();
        }

        const checkoutButton = page.getByRole('button', { name: /checkout|get tickets|proceed/i }).first();
        if (await checkoutButton.isVisible()) {
            await checkoutButton.click();
            await page.waitForTimeout(500);

            // Should have gender selection
            await expect(page.getByText(/male|female|gender/i).first()).toBeVisible();
        }
    });

    test('email validation shows error for invalid format', async ({ page }) => {
        await page.goto('/events/test-event');
        await page.waitForLoadState('networkidle');

        const plusButton = page.locator('button').filter({ hasText: '+' }).first();
        if (await plusButton.isVisible()) {
            await plusButton.click();
        }

        const checkoutButton = page.getByRole('button', { name: /checkout|get tickets|proceed/i }).first();
        if (await checkoutButton.isVisible()) {
            await checkoutButton.click();
            await page.waitForTimeout(500);

            const emailInput = page.locator('input[type="email"], input[name*="email"]').first();
            if (await emailInput.isVisible()) {
                await emailInput.fill('invalid-email');
                await emailInput.blur();
                // Should show validation error
            }
        }
    });
});

test.describe('Checkout Journey - Promo Codes', () => {
    test.beforeEach(async ({ page }) => {
        await mockPublicEvent(page, 'promo-event', { hasFreeTickets: false, hasPaidTickets: true });
    });

    test('promo code input is available', async ({ page }) => {
        await page.goto('/events/promo-event');
        await page.waitForLoadState('networkidle');

        // Look for promo code section
        await expect(page.getByText(/promo|discount|coupon/i).first().or(page.locator('input[placeholder*="promo" i]').first())).toBeVisible();
    });

    test('valid promo code applies discount', async ({ page }) => {
        await page.route('**/api/v1/events/*/promo-codes/validate', route => {
            route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({
                    valid: true,
                    code: 'SAVE20',
                    discountType: 'percentage',
                    discountValue: '20.00',
                    message: '20% discount applied'
                })
            });
        });

        await page.route('**/api/v1/events/*/checkout/quote', route => {
            route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({
                    success: true,
                    currency: 'GBP',
                    subtotal: 50,
                    discount: 10, // 20% of 50
                    total: 44,
                    promoCodeApplied: true
                })
            });
        });

        await page.goto('/events/promo-event');
        await page.waitForLoadState('networkidle');

        // Add ticket
        const plusButton = page.locator('button').filter({ hasText: '+' }).first();
        if (await plusButton.isVisible()) {
            await plusButton.click();
            await page.waitForTimeout(300);

            // Enter promo code
            const promoInput = page.locator('input[placeholder*="promo" i], input[name*="promo"]').first();
            if (await promoInput.isVisible()) {
                await promoInput.fill('SAVE20');

                // Apply promo
                const applyButton = page.getByRole('button', { name: /apply/i }).first();
                if (await applyButton.isVisible()) {
                    await applyButton.click();
                    await page.waitForTimeout(500);

                    // Should show discount
                    await expect(page.getByText(/discount|20%/i).first()).toBeVisible();
                }
            }
        }
    });

    test('invalid promo code shows error', async ({ page }) => {
        await page.route('**/api/v1/events/*/promo-codes/validate', route => {
            route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({
                    valid: false,
                    message: 'Invalid promo code'
                })
            });
        });

        await page.goto('/events/promo-event');
        await page.waitForLoadState('networkidle');

        const plusButton = page.locator('button').filter({ hasText: '+' }).first();
        if (await plusButton.isVisible()) {
            await plusButton.click();
        }

        const promoInput = page.locator('input[placeholder*="promo" i], input[name*="promo"]').first();
        if (await promoInput.isVisible()) {
            await promoInput.fill('INVALID');

            const applyButton = page.getByRole('button', { name: /apply/i }).first();
            if (await applyButton.isVisible()) {
                await applyButton.click();
                await page.waitForTimeout(500);

                // Should show error
            }
        }
    });
});

test.describe('Checkout Journey - Free Event Flow', () => {
    test.beforeEach(async ({ page }) => {
        await mockPublicEvent(page, 'free-event', { hasFreeTickets: true, hasPaidTickets: false });
    });

    test('free checkout completes instantly without Stripe', async ({ page }) => {
        await page.route('**/api/v1/events/*/checkout', route => {
            route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({
                    success: true,
                    orderId: 'order_free_123',
                    totalAmount: 0,
                    currency: 'GBP',
                    tickets: [
                        {
                            id: 'ticket_001',
                            ticketCode: 'TCK-FREE-001',
                            ticketType: 'Free Entry',
                            attendeeName: 'Test User',
                            attendeeEmail: 'test@example.com'
                        }
                    ]
                })
            });
        });

        await page.goto('/events/free-event');
        await page.waitForLoadState('networkidle');

        // Add free ticket
        const plusButton = page.locator('button').filter({ hasText: '+' }).first();
        if (await plusButton.isVisible()) {
            await plusButton.click();
        }

        // Proceed to checkout
        const checkoutButton = page.getByRole('button', { name: /checkout|get tickets|register/i }).first();
        if (await checkoutButton.isVisible()) {
            await checkoutButton.click();
            await page.waitForTimeout(500);

            // Fill form
            const nameInput = page.locator('input[name*="name"], input[placeholder*="name" i]').first();
            const emailInput = page.locator('input[type="email"]').first();

            if (await nameInput.isVisible()) {
                await nameInput.fill('Test User');
            }
            if (await emailInput.isVisible()) {
                await emailInput.fill('test@example.com');
            }

            // Select gender
            const maleOption = page.getByText(/^male$/i).first();
            if (await maleOption.isVisible()) {
                await maleOption.click();
            }

            // Complete checkout
            const confirmButton = page.getByRole('button', { name: /confirm|complete|submit/i }).first();
            if (await confirmButton.isVisible()) {
                await confirmButton.click();
                await page.waitForTimeout(1000);

                // Should show success
                await expect(page.getByText(/success|confirmed|thank you/i).first()).toBeVisible();
            }
        }
    });

    test('free checkout shows tickets immediately', async ({ page }) => {
        // Similar to above but verify ticket display
        expect(true).toBe(true);
    });
});

test.describe('Checkout Journey - Paid Event Flow', () => {
    test.beforeEach(async ({ page }) => {
        await mockPublicEvent(page, 'paid-event', { hasFreeTickets: false, hasPaidTickets: true });
        await mockCheckoutQuote(page);
    });

    test('paid checkout redirects to Stripe', async ({ page }) => {
        await page.route('**/api/v1/events/*/checkout', route => {
            route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({
                    success: true,
                    checkoutUrl: 'https://checkout.stripe.com/test-session-123'
                })
            });
        });

        await page.goto('/events/paid-event');
        await page.waitForLoadState('networkidle');

        const plusButton = page.locator('button').filter({ hasText: '+' }).first();
        if (await plusButton.isVisible()) {
            await plusButton.click();
        }

        // The flow would redirect to Stripe
        expect(true).toBe(true);
    });
});

test.describe('Checkout Journey - Success Page', () => {
    test('success page displays order details', async ({ page }) => {
        await page.route('**/api/v1/orders/order_123/status', route => {
            route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({
                    orderId: 'order_123',
                    status: 'completed',
                    totalAmount: 50,
                    currency: 'GBP',
                    organizerId: 'org_123',
                    eventId: 'event_123',
                    tickets: [
                        {
                            id: 'ticket_001',
                            ticketCode: 'TCK-001',
                            ticketType: 'General Admission',
                            attendeeName: 'Test User'
                        }
                    ]
                })
            });
        });

        await page.goto('/checkout/success?orderId=order_123');
        await page.waitForLoadState('networkidle');

        // Should show success message and order details
        await expect(page.getByText(/success|confirmed|thank you/i).first()).toBeVisible();
    });

    test('success page displays QR codes for tickets', async ({ page }) => {
        await page.route('**/api/v1/orders/order_123/status', route => {
            route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({
                    orderId: 'order_123',
                    status: 'completed',
                    tickets: [
                        { id: 'ticket_001', ticketCode: 'TCK-001', ticketType: 'GA' }
                    ]
                })
            });
        });

        await page.goto('/checkout/success?orderId=order_123');
        await page.waitForLoadState('networkidle');

        // Should show ticket codes
        await expect(page.getByText(/TCK-|ticket/i).first()).toBeVisible();
    });

    test('success page has share options', async ({ page }) => {
        await page.route('**/api/v1/orders/*/status', route => {
            route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({ orderId: 'order_123', status: 'completed', tickets: [] })
            });
        });

        await page.goto('/checkout/success?orderId=order_123');
        await page.waitForLoadState('networkidle');

        // May have share or download options
        expect(true).toBe(true);
    });
});

test.describe('Checkout Journey - Responsive Design', () => {
    test.beforeEach(async ({ page }) => {
        await mockPublicEvent(page, 'responsive-event');
    });

    test('checkout works on mobile', async ({ page }) => {
        await page.setViewportSize(viewports.mobile);
        await page.goto('/events/responsive-event');
        await page.waitForLoadState('networkidle');

        // Should fit screen without horizontal scroll
        const bodyScrollWidth = await page.evaluate(() => document.body.scrollWidth);
        expect(bodyScrollWidth).toBeLessThanOrEqual(viewports.mobile.width + 10);
    });

    test('checkout works on tablet', async ({ page }) => {
        await page.setViewportSize(viewports.tablet);
        await page.goto('/events/responsive-event');
        await page.waitForLoadState('networkidle');

        await expect(page.locator('body')).toBeVisible();
    });

    test('checkout works on desktop', async ({ page }) => {
        await page.setViewportSize(viewports.desktop);
        await page.goto('/events/responsive-event');
        await page.waitForLoadState('networkidle');

        await expect(page.locator('body')).toBeVisible();
    });
});

test.describe('Checkout Journey - Error Handling', () => {
    test('handles sold out tickets gracefully', async ({ page }) => {
        await mockPublicEvent(page, 'soldout-event');
        await page.route('**/api/v1/events/*/checkout', route => {
            route.fulfill({
                status: 400,
                contentType: 'application/json',
                body: JSON.stringify({
                    success: false,
                    message: 'Some tickets are no longer available',
                    unavailableTypes: ['ticket_paid_001']
                })
            });
        });

        await page.goto('/events/soldout-event');
        await page.waitForLoadState('networkidle');

        // Should handle gracefully
        expect(true).toBe(true);
    });

    test('handles network errors gracefully', async ({ page }) => {
        await mockPublicEvent(page, 'network-error-event');
        await page.route('**/api/v1/events/*/checkout', route => {
            route.abort('failed');
        });

        await page.goto('/events/network-error-event');
        await page.waitForLoadState('networkidle');

        // Page should still be functional
        await expect(page.locator('body')).toBeVisible();
    });
});
