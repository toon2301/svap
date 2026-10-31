import fs from 'node:fs';
import path from 'node:path';
import type { Root } from 'react-dom/client';
import { expect, test } from '../support/diagnostic-test';

type Counts = {
  clicks: number; clickCapture: number; pointerDown: number;
  touchEnd: number; pointerHandler: number; defaultPrevented: boolean;
};
type ProbeWindow = Window & {
  React: typeof import('react');
  ReactDOM: typeof import('react-dom') & typeof import('react-dom/client');
  __propertyRoot?: Root; __propertyButton?: HTMLButtonElement | null; __propertyCounts: Counts;
};
const variants = [
  { name: 'plain', tabIndex: false, prevent: false },
  { name: 'tabindex', tabIndex: true, prevent: false },
  { name: 'prevent', tabIndex: false, prevent: true },
  { name: 'both', tabIndex: true, prevent: true },
] as const;

test('izolovaná matica jazykových vlastností a skutočných vstupných udalostí', async ({ page, isMobile }, testInfo) => {
  const react = fs.readFileSync(path.resolve(__dirname, '../../node_modules/react/umd/react.production.min.js'), 'utf8');
  const reactDom = fs.readFileSync(path.resolve(__dirname, '../../node_modules/react-dom/umd/react-dom.production.min.js'), 'utf8');
  let blocked = 0;
  await page.context().route('**/*', async (route) => {
    const url = new URL(route.request().url());
    if (url.hostname !== 'diagnostic.invalid') { blocked += 1; await route.abort(); return; }
    if (url.pathname === '/react.js' || url.pathname === '/react-dom.js') {
      await route.fulfill({ contentType: 'application/javascript', body: url.pathname === '/react.js' ? react : reactDom });
      return;
    }
    await route.fulfill({ contentType: 'text/html', body: `<!doctype html><html><head>
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <style>body{margin:16px}button{width:100%;height:48px;padding:16px;font-size:16px;-webkit-tap-highlight-color:transparent}</style>
      </head><body><main id="fixture"></main><script src="/react.js"></script><script src="/react-dom.js"></script></body></html>` });
  });
  await page.goto('/experiment');
  expect(await page.evaluate(() => document.documentElement.clientWidth)).toBe(page.viewportSize()!.width);
  await page.evaluate(() => {
    const w = window as unknown as ProbeWindow;
    const relevant = (event: Event) => event.target instanceof Node && Boolean(w.__propertyButton?.contains(event.target));
    document.addEventListener('pointerdown', (event) => {
      if (relevant(event)) w.__propertyCounts.pointerDown += 1;
    }, { capture: true, passive: true });
    document.addEventListener('pointerdown', (event) => {
      if (relevant(event)) w.__propertyCounts.defaultPrevented = event.defaultPrevented;
    }, { passive: true });
    document.addEventListener('touchend', (event) => {
      if (relevant(event)) w.__propertyCounts.touchEnd += 1;
    }, { capture: true, passive: true });
    document.addEventListener('click', (event) => {
      if (relevant(event)) w.__propertyCounts.clickCapture += 1;
    }, { capture: true, passive: true });
  });
  let records = 0, failedActions = 0;
  for (const implementation of ['native', 'react'] as const) {
    for (let round = 1; round <= 3; round += 1) {
      const ordered = round === 2 ? [...variants].reverse() : variants;
      for (const variant of ordered) for (const gesture of isMobile ? ['tap', 'click'] as const : ['click'] as const) {
        await page.evaluate(({ implementation, tabIndex, prevent, key }) => {
          const w = window as unknown as ProbeWindow;
          const mount = document.getElementById('fixture')!;
          const counts: Counts = { clicks: 0, clickCapture: 0, pointerDown: 0, touchEnd: 0, pointerHandler: 0, defaultPrevented: false };
          w.__propertyCounts = counts;
          const down = (event: { preventDefault(): void }) => { counts.pointerHandler += 1; event.preventDefault(); };
          if (implementation === 'native') {
            const button = document.createElement('button');
            button.type = 'button'; button.textContent = 'Jazyk';
            if (tabIndex) button.tabIndex = -1;
            if (prevent) button.onpointerdown = down;
            button.onclick = () => { counts.clicks += 1; };
            mount.replaceChildren(button); w.__propertyButton = button;
          } else {
            if (!w.__propertyRoot) { mount.replaceChildren(); w.__propertyRoot = w.ReactDOM.createRoot(mount); }
            w.ReactDOM.flushSync(() => w.__propertyRoot!.render(w.React.createElement('button', {
              key, type: 'button', tabIndex: tabIndex ? -1 : undefined,
              onPointerDown: prevent ? down : undefined,
              onClick: () => { counts.clicks += 1; },
              ref: (button: HTMLButtonElement | null) => { w.__propertyButton = button; },
            }, 'Jazyk')));
          }
        }, { implementation, tabIndex: variant.tabIndex, prevent: variant.prevent, key: `${round}-${variant.name}-${gesture}` });
        const button = page.locator('#fixture > button');
        expect(await button.evaluate((element) => element.tabIndex)).toBe(variant.tabIndex ? -1 : 0);
        let actionCompleted = true;
        try { if (gesture === 'tap') await button.tap(); else await button.click(); }
        catch { actionCompleted = false; failedActions += 1; }
        // Pevné meracie okno pokusu, nie predĺženie času produkčnej asercie.
        await page.waitForTimeout(500);
        const counts = await page.evaluate(() => (window as unknown as ProbeWindow).__propertyCounts);
        const result = { project: testInfo.project.name, implementation, variant: variant.name, gesture, round, actionCompleted, ...counts };
        console.log(`[E2E-PROPERTIES] ${JSON.stringify(result)}`);
        records += 1;
      }
    }
  }
  expect(records).toBe(isMobile ? 48 : 24);
  expect(failedActions).toBe(0);
  expect(blocked).toBe(0);
});
