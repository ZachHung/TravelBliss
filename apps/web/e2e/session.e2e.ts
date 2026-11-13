import { expect, test, type Page } from '@playwright/test';

// One unique user per run: username, email and phone are unique in the database
const id = Date.now().toString().slice(-8);
const user = { username: `e2e${id}`, phone: `09${id}`, password: 'secret1234' };

// The web server is up before the API finishes connecting; wait until the API answers
test.beforeAll(async ({ request }) => {
  await expect
    .poll(
      async () =>
        (
          await request
            .post('http://localhost:8000/', { data: { query: '{ __typename }' } })
            .catch(() => null)
        )?.ok() ?? false,
      { timeout: 60_000 }
    )
    .toBe(true);
});

const signIn = async (page: Page, remember: boolean) => {
  // The URL changes before the lazy page renders (router transitions keep the old page up), so wait for the form
  await expect(page.getByRole('heading', { name: 'Sign In' })).toBeVisible();
  await page.getByLabel('Phone Number').fill(user.phone);
  await page.getByRole('textbox', { name: 'Password', exact: true }).fill(user.password);
  if (remember) {
    await page.getByLabel('Remember Me').check();
  }
  await page.getByRole('button', { name: 'Sign In' }).click();
};

test('register, sign in, survive a reload, sign out, and return to the page you came from', async ({
  page,
}) => {
  await test.step('register through the birthday picker', async () => {
    await page.goto('/register');
    await page.getByLabel('Full Name').fill('End To End');
    await page.getByLabel('Username').fill(user.username);
    await page.getByLabel('Phone Number').fill(user.phone);
    await page.getByLabel('Email').fill(`${user.username}@example.com`);
    await page.getByRole('button', { name: /birthday/i }).click();
    await page.getByRole('button', { name: '2000' }).click();
    await page.getByRole('button', { name: 'Mar' }).click();
    await page.getByRole('button', { name: '12 March 2000' }).click();
    await page.getByRole('textbox', { name: 'Password', exact: true }).fill(user.password);
    await page.getByLabel('Confirm password').fill(user.password);
    await page.getByRole('button', { name: 'Submit' }).click();
    await expect(page).toHaveURL(/\/sign-in$/);
  });

  await test.step('sign in, remembered', async () => {
    await signIn(page, true);
    await expect(page.getByRole('button', { name: 'Sign out' })).toBeVisible();
    await expect(page).toHaveURL(/\/$/);
  });

  await test.step('reload a protected page without any guest UI flashing', async () => {
    await page.goto('/protected');
    await expect(page.getByText('Protected', { exact: true })).toBeVisible();
    // Runs before the app on the reload: records any moment the guest UI (sign-in link or page) appears
    await page.addInitScript(() => {
      const w = window as unknown as { sawGuestUi: boolean };
      w.sawGuestUi = false;
      new MutationObserver(() => {
        if (location.pathname === '/sign-in' || document.querySelector('a[href="/sign-in"]')) {
          w.sawGuestUi = true;
        }
      }).observe(document, { childList: true, subtree: true });
    });
    await page.reload();
    await expect(page.getByText('Protected', { exact: true })).toBeVisible();
    expect(
      await page.evaluate(() => (window as unknown as { sawGuestUi: boolean }).sawGuestUi)
    ).toBe(false);
  });

  await test.step('sign out, then sign in from a protected page and land back on it', async () => {
    await page.getByRole('button', { name: 'Sign out' }).click();
    await page.goto('/protected');
    await expect(page).toHaveURL(/\/sign-in$/);
    await signIn(page, false);
    await expect(page).toHaveURL(/\/protected$/);
    await expect(page.getByText('Protected', { exact: true })).toBeVisible();
  });
});
