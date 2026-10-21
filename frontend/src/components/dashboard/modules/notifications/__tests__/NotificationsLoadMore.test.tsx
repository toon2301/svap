import { act, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';

import { NotificationsLoadMore } from '../NotificationsLoadMore';

jest.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ locale: 'sk', t: (_key: string, fallback: string) => fallback }),
}));

type Spy = {
  node: Element;
  root: Element | null;
  rootMargin: string;
  disconnected: boolean;
  fire: () => void;
};
const spies: Spy[] = [];
const originalIO = (global as unknown as { IntersectionObserver: unknown }).IntersectionObserver;

class SpyObserver {
  private cb: IntersectionObserverCallback;
  private opts: IntersectionObserverInit;
  private mine: Spy[] = [];
  constructor(cb: IntersectionObserverCallback, opts: IntersectionObserverInit = {}) {
    this.cb = cb;
    this.opts = opts;
  }
  observe = (node: Element) => {
    const spy: Spy = {
      node,
      root: (this.opts.root as Element | null) ?? null,
      rootMargin: this.opts.rootMargin ?? '',
      disconnected: false,
      fire: () =>
        this.cb(
          [{ isIntersecting: true } as IntersectionObserverEntry],
          this as unknown as IntersectionObserver,
        ),
    };
    this.mine.push(spy);
    spies.push(spy);
  };
  disconnect = () =>
    this.mine.forEach((s) => {
      s.disconnected = true;
    });
  unobserve = () => undefined;
  takeRecords = () => [];
}
const live = () => spies.filter((s) => !s.disconnected);

beforeEach(() => {
  spies.length = 0;
  (global as unknown as { IntersectionObserver: unknown }).IntersectionObserver = SpyObserver;
});
afterEach(() => {
  (global as unknown as { IntersectionObserver: unknown }).IntersectionObserver = originalIO;
});

describe('NotificationsLoadMore', () => {
  it('watches a hidden sentinel with a 400px lead and calls onLoadMore on intersection', () => {
    const onLoadMore = jest.fn();
    render(<NotificationsLoadMore enabled loading={false} onLoadMore={onLoadMore} />);
    expect(screen.getByTestId('notifications-load-more-sentinel')).toHaveAttribute(
      'aria-hidden',
      'true',
    );
    expect(live()).toHaveLength(1);
    expect(live()[0].rootMargin).toBe('400px');
    act(() => live()[0].fire());
    expect(onLoadMore).toHaveBeenCalledTimes(1);
  });

  it.each([
    ['auto', true],
    ['scroll', true],
    ['overlay', true],
    ['visible', false],
    ['hidden', false],
  ])('uses the nearest overflow-y:%s ancestor as root = %s', (overflowY, isRoot) => {
    const { container } = render(
      <div data-testid="outer" style={{ overflowY: 'auto' }}>
        <div data-testid="inner" style={{ overflowY: overflowY as string }}>
          <NotificationsLoadMore enabled loading={false} onLoadMore={jest.fn()} />
        </div>
      </div>,
    );
    const expected = isRoot
      ? screen.getByTestId('inner')
      : container.querySelector('[data-testid="outer"]');
    expect(live()[0].root).toBe(expected);
  });

  it('falls back to the viewport (null) when no ancestor scrolls', () => {
    render(<NotificationsLoadMore enabled loading={false} onLoadMore={jest.fn()} />);
    expect(live()[0].root).toBeNull();
  });

  it('does not watch while disabled and creates a new observer when re-enabled', () => {
    const { rerender } = render(
      <NotificationsLoadMore enabled={false} loading={false} onLoadMore={jest.fn()} />,
    );
    expect(live()).toHaveLength(0);
    rerender(<NotificationsLoadMore enabled loading={false} onLoadMore={jest.fn()} />);
    expect(live()).toHaveLength(1);
    rerender(<NotificationsLoadMore enabled={false} loading onLoadMore={jest.fn()} />);
    expect(live()).toHaveLength(0);
    expect(spies).toHaveLength(1);
    rerender(<NotificationsLoadMore enabled loading={false} onLoadMore={jest.fn()} />);
    expect(spies).toHaveLength(2);
  });

  it('shows two skeleton rows and an sr-only status only while loading', () => {
    const { rerender } = render(
      <NotificationsLoadMore enabled={false} loading onLoadMore={jest.fn()} />,
    );
    expect(screen.getAllByTestId('notification-skeleton-row')).toHaveLength(2);
    expect(screen.getByRole('status')).toHaveTextContent('Načítavam…');
    rerender(<NotificationsLoadMore enabled loading={false} onLoadMore={jest.fn()} />);
    expect(screen.queryAllByTestId('notification-skeleton-row')).toHaveLength(0);
    expect(screen.getByRole('status')).toBeEmptyDOMElement();
  });

  it('does not throw without IntersectionObserver', () => {
    (global as unknown as { IntersectionObserver?: unknown }).IntersectionObserver = undefined;
    expect(() =>
      render(<NotificationsLoadMore enabled loading={false} onLoadMore={jest.fn()} />),
    ).not.toThrow();
  });
});
