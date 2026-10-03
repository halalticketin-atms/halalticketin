import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page, context, baseURL }) => {
    await context.addCookies([{
        name: 'ht_consent', url: baseURL!,
        value: encodeURIComponent(JSON.stringify({ version: 2, analytics: false, marketing: false })),
    }]);
    // All browser API calls, including the contact submission, stay isolated from production.
    await page.route('**/api/v1/**', route => route.fulfill({ status: 200, contentType: 'application/json', body: '{}' }));
});

test('the first FAQ click expands and collapses with normal and reduced motion', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    for (const reducedMotion of ['no-preference', 'reduce'] as const) {
        await page.emulateMedia({ reducedMotion });
        await page.goto('/faq');
        const question = page.getByRole('button', { name: 'Where are my tickets?', exact: true });
        const answer = page.locator('#faq-answer-where-are-my-tickets');
        await expect(question).toHaveAttribute('aria-expanded', 'false');
        await question.click();
        await expect(question).toHaveAttribute('aria-expanded', 'true');
        await expect(answer).toBeVisible();
        await expect(answer).toHaveCSS('opacity', '1');
        await expect(page).toHaveURL(/\/faq#where-are-my-tickets$/);
        await question.click();
        await expect(answer).toHaveCount(0);
        await expect(page).toHaveURL(/\/faq$/);
    }
    expect(errors).toEqual([]);
});

test('the first Contact hint click expands and exits cleanly', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto('/contact');
    const toggle = page.getByRole('button', { name: 'How to reach them', exact: true });
    const caption = page.getByText('Here’s what to look for on the event page', { exact: true });
    await toggle.click();
    await expect(toggle).toHaveAttribute('aria-expanded', 'true');
    await expect(caption).toBeVisible();
    await toggle.click();
    await expect(toggle).toHaveAttribute('aria-expanded', 'false');
    await expect(caption).toHaveCount(0);
    expect(errors).toEqual([]);
});

test('Contact loading and success animations complete after a mocked submission', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    let submissions = 0;
    await page.route('**/api/v1/contact', route => {
        expect(route.request().method()).toBe('POST');
        submissions += 1;
        return route.fulfill({ status: 200, contentType: 'application/json', body: '{"success":true}' });
    });
    await page.goto('/contact');
    await page.getByLabel('First name', { exact: true }).fill('Fixture');
    await page.getByLabel('Last name', { exact: true }).fill('Attendee');
    await page.getByLabel('Email address', { exact: true }).fill('fixture@example.test');
    await page.getByRole('combobox', { name: 'Subject', exact: true }).click();
    await page.getByRole('option', { name: 'General Inquiry', exact: true }).click();
    await page.getByLabel('Message', { exact: true }).fill('This submission is intercepted entirely by the browser test.');
    await page.getByRole('checkbox').check();
    await page.getByRole('button', { name: 'Submit', exact: true }).click();
    await expect(page.locator('[aria-label="Sending message"]')).toBeVisible();
    await expect(page.getByText('Thank you for your message!', { exact: true })).toBeVisible();
    await expect(page.locator('[aria-label="Sending message"]')).toHaveCount(0);
    expect(submissions).toBe(1);
    expect(errors).toEqual([]);
});
