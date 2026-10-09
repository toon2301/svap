import { expect, type BrowserContext, type Page, type Route } from '@playwright/test';

/** Controlled OAuth transport; only the designated test account's cookie session is real. */
export class GoogleLoginAudit {
  private csrfToken = '';
  private sessionCreated = false;
  private nonce = '';
  private readonly publicOrigin: string;

  private constructor(
    private readonly page: Page,
    private readonly context: BrowserContext,
    private readonly meUrl: string,
  ) {
    this.publicOrigin = new URL(page.url()).origin;
    const apiOrigin = new URL(meUrl);
    const approvedTestOrigin = 'https://stunning-inspiration-svap.up.railway.app';
    if (this.publicOrigin !== approvedTestOrigin || apiOrigin.origin !== approvedTestOrigin
      || apiOrigin.pathname !== '/api/auth/me/') {
      throw new Error('Refusing to send test credentials to an unexpected API origin');
    }
  }

  /** Discover the deployed API from its anonymous /me response, without changing app configuration. */
  static async start(page: Page, context: BrowserContext) {
    const responsePromise = page.waitForResponse(response =>
      new URL(response.url()).pathname.endsWith('/auth/me/'),
    );
    await page.goto('/');
    const response = await responsePromise;
    expect(response.status(), 'The browser must start genuinely anonymous').toBe(401);
    await expect(page.locator('#login-email')).toBeVisible();
    return new GoogleLoginAudit(page, context, response.url());
  }

  /** Preserve the exact deployed API prefix for CSRF, login and logout endpoints. */
  private endpoint(name: string) {
    const url = new URL(this.meUrl);
    url.pathname = url.pathname.replace(/\/auth\/me\/$/, `/auth/${name}/`);
    url.search = '';
    return url.toString();
  }

  /** Fetch CSRF in the same cookie jar; values are never printed or attached to test results. */
  private async primeCsrf() {
    const response = await this.context.request.get(this.endpoint('csrf-token'), {
      headers: { Origin: this.publicOrigin, Referer: `${this.publicOrigin}/` },
    });
    expect(response.status(), 'CSRF setup must succeed').toBe(200);
    const body = await response.json();
    if (typeof body.csrf_token !== 'string' || !body.csrf_token) {
      throw new Error('The test API did not return a usable CSRF token');
    }
    this.csrfToken = body.csrf_token;
  }

  /** Model successful OAuth by creating a fresh, real cookie session through the app's own login API. */
  private async createSession() {
    const email = process.env.E2E_TEST_EMAIL;
    const password = process.env.E2E_TEST_PASSWORD;
    if (!email || !password) throw new Error('Missing designated E2E account credentials');
    await this.primeCsrf();
    const response = await this.context.request.post(this.endpoint('login'), {
      headers: {
        Origin: this.publicOrigin,
        Referer: `${this.publicOrigin}/`,
        'X-CSRFToken': this.csrfToken,
      },
      data: { email, password },
    });
    expect(response.status(), 'Session setup failed; do not retry incorrect credentials').toBe(200);
    this.sessionCreated = true;
    expect(await this.serverSessionStatus(), 'The fresh backend session must already be valid').toBe(200);
  }

  /** Verify server authentication independently of whether React has noticed the new cookies. */
  async serverSessionStatus() {
    const response = await this.context.request.get(this.meUrl, {
      headers: { Origin: this.publicOrigin, Referer: `${this.publicOrigin}/` },
    });
    return response.status();
  }

  /** Control only browser /me probes; the independent backend cookie session remains real. */
  async overrideNextMeStatuses(statuses: number[]) {
    let consumed = 0;
    await this.context.route(this.meUrl, async route => {
      if (route.request().method() !== 'GET' || consumed >= statuses.length) {
        await route.continue();
        return;
      }
      await route.fulfill({
        status: statuses[consumed++],
        contentType: 'application/json',
        body: JSON.stringify({ detail: 'Controlled session probe response' }),
      });
    });
    return () => consumed;
  }

  /** Replace only OAuth/callback transport in this browser context; no request is sent to Google. */
  async openPopup(createServerSession: boolean) {
    await this.context.route(url => url.pathname === '/auth/callback', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'text/html',
        body: '<!doctype html><title>Controlled OAuth callback</title><p>Test callback ready</p>',
      });
    });
    await this.context.route(url => url.pathname.endsWith('/oauth/google/login/'), async (route: Route) => {
      const callback = new URL(route.request().url()).searchParams.get('callback');
      if (!callback || new URL(callback).origin !== this.publicOrigin) {
        throw new Error('The controlled callback must use the app origin');
      }
      if (createServerSession) await this.createSession();
      const callbackUrl = new URL(callback);
      callbackUrl.searchParams.set('oauth', 'success');
      await route.fulfill({
        status: 200,
        contentType: 'text/html',
        body: `<!doctype html><script>location.replace(${JSON.stringify(callbackUrl.toString())})</script>`,
      });
    });

    const popupPromise = this.page.waitForEvent('popup');
    await this.page.getByRole('button', { name: /Google/i }).click();
    this.nonce = await this.page.evaluate(() => sessionStorage.getItem('oauth_nonce') ?? '');
    if (!this.nonce) throw new Error('Google login did not create a completion nonce');
    const popup = await popupPromise;
    await popup.waitForURL(url => url.origin === this.publicOrigin && url.pathname === '/auth/callback');
    await popup.waitForLoadState('domcontentloaded');
    return popup;
  }

  /** Send a valid success before closure to prove the control path works in this engine. */
  async sendSuccess(popup: Page) {
    await popup.evaluate(({ nonce, origin }) => {
      if (!window.opener) throw new Error('Controlled callback has no opener');
      window.opener.postMessage({ type: 'OAUTH_SUCCESS', nonce }, origin);
    }, { nonce: this.nonce, origin: this.publicOrigin });
  }

  /** Inject an already queued completion after closure, with the original valid nonce and origin. */
  async deliverLateSuccess() {
    await this.page.evaluate(nonce => {
      window.dispatchEvent(new MessageEvent('message', {
        origin: window.location.origin,
        data: { type: 'OAUTH_SUCCESS', nonce },
      }));
    }, this.nonce);
  }

  /** Allow the popup polling to finish without assuming recovery requires an enabled login button. */
  async waitForCompletionOrUnlock() {
    await expect.poll(async () => {
      if (new URL(this.page.url()).pathname.startsWith('/dashboard')) return true;
      const button = this.page.getByRole('button', { name: /Google/i });
      return await button.isVisible() && await button.isEnabled();
    }, { timeout: 10_000 }).toBe(true);
  }

  /** Collect only non-secret symptom data; never store OAuth nonce, cookies or account details. */
  async observePage() {
    const button = this.page.getByRole('button', { name: /Google/i });
    // Next.js has its own empty route-announcer alert outside the login card.
    // Count actual authentication errors, not that framework accessibility node.
    const loginCard = this.page.locator('div:has(> form:has(#login-email))');
    return {
      path: new URL(this.page.url()).pathname,
      googleButtonEnabled: await button.isVisible() && await button.isEnabled(),
      alertCount: await loginCard.getByRole('alert').count(),
    };
  }

  /** Blacklist only this test context's fresh session; leave other accounts and content untouched. */
  async cleanupSession() {
    if (!this.sessionCreated) return;
    try {
      await this.primeCsrf();
      const response = await this.context.request.post(this.endpoint('logout'), {
        headers: {
          Origin: this.publicOrigin,
          Referer: `${this.publicOrigin}/`,
          'X-CSRFToken': this.csrfToken,
        },
        data: {},
      });
      expect(response.status(), 'The test session must be invalidated during cleanup').toBe(200);
      this.sessionCreated = false;
    } finally {
      // Playwright also collects an ARIA error context independently of trace.
      // Do not leave an authenticated dashboard in that automatic snapshot.
      if (!this.page.isClosed()) await this.page.goto('about:blank');
    }
  }
}
