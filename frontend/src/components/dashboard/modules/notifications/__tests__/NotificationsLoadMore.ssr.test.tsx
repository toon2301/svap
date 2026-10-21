/** @jest-environment node */

import { renderToString } from 'react-dom/server';

import { NotificationsLoadMore } from '../NotificationsLoadMore';

jest.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ locale: 'sk', t: (_key: string, fallback: string) => fallback }),
}));

describe('NotificationsLoadMore on the server', () => {
  it('renders only the sentinel (no fallback button, no layout-effect warning), so hydration matches', () => {
    const error = jest.spyOn(console, 'error');
    const globals = global as unknown as { IntersectionObserver?: unknown };
    const originalObserver = globals.IntersectionObserver;
    globals.IntersectionObserver = undefined;
    expect(typeof window).toBe('undefined');

    const html = renderToString(
      <NotificationsLoadMore enabled loading={false} failed={false} onLoadMore={jest.fn()} />,
    );

    expect(html).toContain('notifications-load-more-sentinel');
    expect(html).not.toContain('notifications-load-more-fallback');
    expect(html).not.toContain('Zobraziť ďalšie');
    expect(error).not.toHaveBeenCalled();
    error.mockRestore();
    globals.IntersectionObserver = originalObserver;
  });
});
