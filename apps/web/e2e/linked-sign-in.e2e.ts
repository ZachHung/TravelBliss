import { expect, test, type Page } from '@playwright/test';

// The Dev provider (NODE_ENV=local, as pnpm dev:local runs) stands in for Google: same start mutation, state cookie,
// callback, session and refresh on page load, with a consent form on the API instead of Google's page
const id = Date.now().toString().slice(-8);
const profile = {
  providerUserId: `e2e-${id}`,
  email: `linked${id}@example.com`,
  fullName: 'Linked User',
};
const password = 'x'.repeat(10);

test.beforeAll(async ({ request }) => {
  await expect
    .poll(
      async () =>
        (
          await request
            .post('http://localhost:8000/', { data: { query: '{ linkedSignInProviders }' } })
            .catch(() => null)
        )?.ok() ?? false,
      { timeout: 60_000 }
    )
    .toBe(true);
});

/** Through the Dev provider's consent page and back, as a provider redirect would go. */
const continueWithDev = async (page: Page) => {
  await page.goto('/sign-in');
  await page.getByRole('button', { name: 'Continue with Dev test user' }).click();
  await expect(page.getByRole('heading', { name: 'Dev sign-in' })).toBeVisible();
  await page.getByLabel('Provider user id').fill(profile.providerUserId);
  await page.getByLabel('Full name').fill(profile.fullName);
  await page.getByLabel(/^Email/).fill(profile.email);
  await page.getByRole('button', { name: 'Continue' }).click();
};

test('sign in through a provider, set a password, disconnect, and be refused by email next time', async ({
  page,
}) => {
  await test.step('a first sign-in creates the user and signs in', async () => {
    await continueWithDev(page);
    await expect(page).toHaveURL('http://localhost:5173/');
    await expect(page.getByRole('button', { name: 'Sign out' })).toBeVisible();
  });

  await test.step('the only way in cannot be disconnected', async () => {
    await page.getByRole('link', { name: 'Account' }).click();
    await expect(page.getByText('Connected')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Disconnect Dev test user' })).toBeDisabled();
  });

  await test.step('after setting a password it can', async () => {
    await page.getByLabel('New password').fill(password);
    await page.getByLabel('Confirm password').fill(password);
    await page.getByRole('button', { name: 'Set password' }).click();
    await expect(page.getByRole('heading', { name: 'Set a password' })).toBeHidden();
    await page.getByRole('button', { name: 'Disconnect Dev test user' }).click();
    await expect(page.getByRole('button', { name: 'Connect Dev test user' })).toBeVisible();
  });

  await test.step('signed out, the same provider account is refused: its email now belongs to a user', async () => {
    await page.getByRole('button', { name: 'Sign out' }).click();
    await continueWithDev(page);
    await expect(page).toHaveURL(/\/sign-in\?error=EMAIL_TAKEN_SIGN_IN_TO_LINK$/);
    await expect(page.getByText(/an account with this email already exists/i)).toBeVisible();
  });
});
