import { expect, test } from '../support/diagnostic-test';
import { observeLanguageTaps } from '../support/language-tap-diagnostics';

const locales = ['sk', 'cs', 'en', 'de', 'pl', 'hu'] as const;
const labels = { sk: 'sk', cs: 'cs', en: 'en', de: 'de', pl: 'pl', hu: 'hu' };

test('pasívne udalosti, zrušenie gesta, súkromie, limit a nová stránka', async ({ page, isMobile }, testInfo) => {
  console.log('[LANGUAGE-TAP-SELFTEST-STAGE] phase=start');
  let blocked = 0;
  await page.context().route('**/*', async (route) => {
    if (new URL(route.request().url()).hostname !== 'diagnostic.invalid') {
      blocked += 1; await route.abort(); return;
    }
    await route.fulfill({ contentType: 'text/html', body: `<!doctype html><html><head>
      <meta name="viewport" content="width=device-width, initial-scale=1"></head><body>
      <div class="fixed top-0 left-0 right-0"><div class="grid h-12"><button aria-label="sk">Back</button></div></div>
      <main data-dashboard-main><div class="block lg:hidden">${locales.map((locale, index) => (
        `<button style="display:block;height:45px" data-choice="${locale}">${locale}${index === 0 ? '<svg></svg>' : ''}</button>`
      )).join('')}</div></main><button id="unrelated">DO_NOT_PUBLISH</button>
      <script>
        localStorage.setItem('appLocale', 'sk');
        document.querySelectorAll('[data-choice]').forEach(button => button.addEventListener('click', () => {
          const locale = button.getAttribute('data-choice');
          localStorage.setItem('appLocale', locale);
          document.querySelector('[aria-label]').setAttribute('aria-label', locale);
          document.querySelectorAll('[data-choice] svg').forEach(svg => svg.remove());
          button.insertAdjacentHTML('beforeend', '<svg></svg>');
        }));
      </script></body></html>` });
  });
  const blocks: string[] = [];
  const finish = await observeLanguageTaps(page, { attach: async (name, options) => {
    blocks.push(options?.body?.toString() ?? '');
    await testInfo.attach(name, options);
  } }, labels);
  await page.goto('/dashboard/language');
  expect(await page.evaluate(() => document.documentElement.clientWidth)).toBe(page.viewportSize()!.width);
  const czech = page.locator('[data-choice="cs"]');
  if (isMobile) await czech.tap(); else await czech.click();
  await finish('before-reload');
  expect(blocks[0]).toContain('snapshot=available stored=cs selected=cs backMatchesStored=1');
  expect(blocks[0]).toMatch(/phase=bubble kind=click choice=cs stored=cs prevented=false trusted=true/);
  if (isMobile) expect(blocks[0]).toContain('kind=touchstart');
  expect(blocks[0]).not.toContain('DO_NOT_PUBLISH');
  console.log('[LANGUAGE-TAP-SELFTEST-STAGE] phase=gesture');

  await page.evaluate(() => {
    const button = document.querySelector('[data-choice="de"]')!;
    button.addEventListener('pointerdown', (event) => event.preventDefault(), { once: true });
    button.dispatchEvent(new Event('pointerdown', { bubbles: true, cancelable: true }));
  });
  await finish();
  expect(blocks[1]).toMatch(/phase=capture kind=pointerdown choice=de stored=cs prevented=false trusted=false/);
  expect(blocks[1]).toMatch(/phase=bubble kind=pointerdown choice=de stored=cs prevented=true trusted=false/);
  console.log('[LANGUAGE-TAP-SELFTEST-STAGE] phase=cancel');
  await page.locator('#unrelated').click();
  await finish();
  expect(blocks[2]).toBe(blocks[1]);
  console.log('[LANGUAGE-TAP-SELFTEST-STAGE] phase=unrelated');

  await page.evaluate(() => {
    const button = document.querySelector('[data-choice="en"]')!;
    for (let index = 0; index < 100; index += 1) {
      button.dispatchEvent(new Event('pointerdown', { bubbles: true, cancelable: true }));
    }
  });
  await finish();
  expect(blocks[3]).toContain('events=80');
  expect(blocks[3].split('\n')).toHaveLength(82);
  expect(blocks[3]).not.toContain('DO_NOT_PUBLISH');
  console.log('[LANGUAGE-TAP-SELFTEST-STAGE] phase=limit');
  await page.reload();
  await finish();
  expect(blocks[4]).toContain('snapshot=available stored=sk selected=sk backMatchesStored=1 events=0 dropped=0');
  expect(blocked).toBe(0);
  console.log('[LANGUAGE-TAP-SELFTEST-STAGE] phase=reload');
});
