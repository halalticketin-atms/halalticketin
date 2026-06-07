import { expect, test, type Page } from '@playwright/test';

async function mockSignedInProfile(
    page: Page,
    memberships: Array<{ id: string; organizerId: string; status: string }> = [],
) {
    await page.addInitScript(() => {
        window.localStorage.setItem('halal-ticketin-access-token', 'heightspr-test-token');
    });
    await page.route('**/api/v1/auth/me', async (route) => {
        await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
                user: {
                    id: 'heightspr_user',
                    email: 'organiser@example.com',
                    name: 'Amina Khan',
                    avatarUrl: null,
                    gender: null,
                    dateOfBirth: null,
                    homeCountry: null,
                    homeCity: null,
                },
                memberships: memberships.map((membership) => ({
                    ...membership,
                    role: 'owner',
                    eventScope: { mode: 'all', eventIds: [] },
                })),
                isOrganizer: memberships.some((membership) => membership.status !== 'removed'),
                needsOnboarding: memberships.length === 0,
            }),
        });
    });
}

test.describe('HeightsPR organiser signup', () => {
    test('renders the organiser-only progressive portal without the site footer', async ({ page }) => {
        const clientErrors: string[] = [];
        page.on('pageerror', (error) => clientErrors.push(error.message));
        page.on('console', (message) => {
            if (message.type() === 'error') {
                clientErrors.push(message.text());
            }
        });
        await page.goto('/heightspr');

        await expect(page.getByRole('heading', {
            name: 'Your next event deserves a full house.',
        })).toBeVisible();
        await expect(page.getByTestId('heightspr-step-credentials')).toBeVisible();
        await expect(page.getByLabel('Full name')).toBeVisible();
        await expect(page.getByLabel('Email address')).toBeVisible();
        await expect(page.getByLabel('Password')).toBeVisible();
        await expect(page.getByText('For Attendees')).toHaveCount(0);

        await page.getByRole('button', { name: 'Continue', exact: true }).click();
        expect(clientErrors).toEqual([]);
        await expect(page.getByText('Full name is required', { exact: true })).toBeVisible();
    });

    test('allows an authenticated account without an organiser to continue onboarding', async ({ page }) => {
        await mockSignedInProfile(page);
        await page.goto('/heightspr');

        await expect(page.getByLabel('Email address')).toHaveValue('organiser@example.com');
        await expect(page.getByLabel('Email address')).toHaveAttribute('readonly', '');
        await expect(page.getByLabel('Password')).toHaveCount(0);
        await expect(page.getByRole('button', { name: 'Continue with Google' })).toHaveCount(0);
    });

    test('blocks existing organiser members without showing signup fields', async ({ page }) => {
        await mockSignedInProfile(page, [{
            id: 'membership_1',
            organizerId: 'organizer_1',
            status: 'active',
        }]);
        await page.goto('/heightspr');

        await expect(page.getByRole('heading', {
            name: 'Your account already belongs to an organiser.',
        })).toBeVisible();
        await expect(page.getByLabel('Organisation name')).toHaveCount(0);
        await expect(page.getByText('has not been changed or tagged')).toBeVisible();
    });

    test('keeps the regular signup presentation available', async ({ page }) => {
        await page.goto('/register?role=organizer');

        const dialog = page.getByRole('dialog');
        await expect(dialog).toBeVisible();
        await expect(dialog.getByText('Sell Tickets', { exact: true })).toBeVisible();
    });
});
