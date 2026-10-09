import { expect, test } from '@playwright/test';
import { GoogleLoginAudit } from './helpers/googleLoginAudit';

// Live Railway app/backend, designated test account only. OAuth transport is
// controlled: this is NOT a real Google-provider or physical-iPhone test.
// No content is created or deleted, and no credentials/cookies are recorded.
test.use({ storageState: { cookies: [], origins: [] }, trace: 'off', screenshot: 'off', video: 'off' });

test('valid completion before popup closure opens the dashboard', async ({ page, context }) => {
  const audit = await GoogleLoginAudit.start(page, context);
  try {
    const popup = await audit.openPopup(true);
    await audit.sendSuccess(popup);
    await expect(page).toHaveURL(/\/dashboard(?:\/|$)/);
    await expect(page.locator('[data-dashboard-main]')).toBeVisible();
    expect(await audit.serverSessionStatus()).toBe(200);
    if (!popup.isClosed()) await popup.close();
  } finally {
    await audit.cleanupSession();
  }
});

test('cancelling without a server login stays anonymous and unlocks Google', async ({ page, context }) => {
  const audit = await GoogleLoginAudit.start(page, context);
  const popup = await audit.openPopup(false);
  await popup.close();
  await audit.waitForCompletionOrUnlock();

  expect(await audit.serverSessionStatus()).toBe(401);
  expect(await audit.observePage()).toEqual({ path: '/', googleButtonEnabled: true, alertCount: 0 });
  await expect(page.locator('[data-dashboard-main]')).toHaveCount(0);
});

test('delayed cookie visibility recovers after two anonymous probes without a callback', async ({ page, context }) => {
  const audit = await GoogleLoginAudit.start(page, context);
  try {
    const consumed = await audit.overrideNextMeStatuses([401, 401]);
    const popup = await audit.openPopup(true);
    await popup.close();
    await expect(page).toHaveURL(/\/dashboard(?:\/|$)/);
    await expect(page.locator('[data-dashboard-main]')).toBeVisible();
    expect(consumed()).toBe(2);
    expect(await audit.serverSessionStatus()).toBe(200);
  } finally {
    await audit.cleanupSession();
  }
});

for (const status of [500, 429]) {
  test(`a recovery probe returning ${status} shows an error instead of cancellation or unverified success`, async ({ page, context }) => {
    const audit = await GoogleLoginAudit.start(page, context);
    try {
      const consumed = await audit.overrideNextMeStatuses([status]);
      const popup = await audit.openPopup(true);
      await popup.close();
      const alerts = page.locator('div:has(> form:has(#login-email))').getByRole('alert');
      await expect(alerts).toHaveCount(1);
      await expect(alerts).toBeVisible();
      expect((await alerts.innerText()).trim()).not.toBe('');
      await expect(page.getByRole('button', { name: /Google/i })).toBeEnabled();
      expect(consumed()).toBe(1);
      expect(new URL(page.url()).pathname).toBe('/');
      await expect(page.locator('[data-dashboard-main]')).toHaveCount(0);
      expect(await audit.serverSessionStatus()).toBe(200);
    } finally {
      await audit.cleanupSession();
    }
  });
}

for (const delivery of ['missing', 'late'] as const) {
  test(`${delivery} completion must not require reload to recognise a fresh server session`, async ({ page, context }, testInfo) => {
    const audit = await GoogleLoginAudit.start(page, context);
    try {
      const popup = await audit.openPopup(true);
      await popup.close();
      await audit.waitForCompletionOrUnlock();
      if (delivery === 'late') await audit.deliverLateSuccess();

      // Give a valid late message its normal chance to complete. This timeout is
      // deliberately caught so we can still prove server validity + reload recovery.
      await expect(page).toHaveURL(/\/dashboard(?:\/|$)/, { timeout: 5000 }).catch(() => {});
      const beforeReload = await audit.observePage();
      const backendStatus = await audit.serverSessionStatus();
      expect(backendStatus, 'This is a valid new server session, not a failed login').toBe(200);

      await page.reload();
      await expect(page).toHaveURL(/\/dashboard(?:\/|$)/);
      await expect(page.locator('[data-dashboard-main]')).toBeVisible();

      await testInfo.attach('oauth-completion-evidence', {
        contentType: 'application/json',
        body: Buffer.from(JSON.stringify({
          engine: testInfo.project.name,
          delivery,
          anonymousStatusBeforeLogin: 401,
          backendStatusBeforeReload: backendStatus,
          beforeReload,
          pathAfterReload: new URL(page.url()).pathname,
          dashboardVisibleAfterReload: true,
        }, null, 2)),
      });

      // Remain genuinely red until the app recovers automatically. Do not mark
      // this expected-failure or assert the undesirable behavior as a passing test.
      expect(beforeReload).toEqual({ path: '/dashboard', googleButtonEnabled: false, alertCount: 0 });
    } finally {
      await audit.cleanupSession();
    }
  });
}
