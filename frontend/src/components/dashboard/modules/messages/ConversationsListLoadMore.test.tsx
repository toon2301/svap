import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ConversationsListLoadMore } from './ConversationsListLoadMore';

type ObserverRecord = {
  node: Element;
  root: Element | Document | null;
  rootMargin: string | undefined;
  disconnected: boolean;
  fire: () => void;
};

let observers: ObserverRecord[] = [];
const originalObserver = (global as unknown as { IntersectionObserver: unknown }).IntersectionObserver;

function installObserverSpy() {
  observers = [];
  class SpyObserver {
    private readonly callback: IntersectionObserverCallback;
    private readonly options: IntersectionObserverInit | undefined;
    private readonly records: ObserverRecord[] = [];

    constructor(callback: IntersectionObserverCallback, options?: IntersectionObserverInit) {
      this.callback = callback;
      this.options = options;
    }

    observe = (node: Element) => {
      const record: ObserverRecord = {
        node,
        root: this.options?.root ?? null,
        rootMargin: this.options?.rootMargin,
        disconnected: false,
        fire: () =>
          this.callback(
            [{ isIntersecting: true } as IntersectionObserverEntry],
            this as unknown as IntersectionObserver,
          ),
      };
      this.records.push(record);
      observers.push(record);
    };

    disconnect = () => {
      this.records.forEach((record) => {
        record.disconnected = true;
      });
    };

    unobserve = () => undefined;
    takeRecords = () => [];
  }
  (global as unknown as { IntersectionObserver: unknown }).IntersectionObserver = SpyObserver;
}

function liveObservers() {
  return observers.filter((record) => !record.disconnected);
}

describe('ConversationsListLoadMore', () => {
  beforeEach(() => {
    installObserverSpy();
  });

  afterEach(() => {
    (global as unknown as { IntersectionObserver: unknown }).IntersectionObserver = originalObserver;
  });

  it('renders an invisible sentinel at the end of the list', () => {
    render(<ConversationsListLoadMore enabled loading={false} isCompact={false} onLoadMore={jest.fn()} />);

    const sentinel = screen.getByTestId('conversations-load-more-sentinel');
    expect(sentinel).toHaveAttribute('aria-hidden', 'true');
    expect(screen.queryAllByTestId('conversations-load-more-row')).toHaveLength(0);
  });

  it('loads the next batch when the sentinel comes into view', () => {
    const onLoadMore = jest.fn();
    render(<ConversationsListLoadMore enabled loading={false} isCompact={false} onLoadMore={onLoadMore} />);

    expect(liveObservers()).toHaveLength(1);
    liveObservers()[0].fire();

    expect(onLoadMore).toHaveBeenCalledTimes(1);
  });

  it('looks ahead of the end of the list so scrolling does not stall', () => {
    render(<ConversationsListLoadMore enabled loading={false} isCompact={false} onLoadMore={jest.fn()} />);

    expect(liveObservers()[0].rootMargin).toBe('400px');
  });

  it('does not observe the sentinel while disabled', () => {
    render(
      <ConversationsListLoadMore enabled={false} loading={false} isCompact={false} onLoadMore={jest.fn()} />,
    );

    expect(liveObservers()).toHaveLength(0);
  });

  it('starts observing again when it is enabled after being disabled', () => {
    const onLoadMore = jest.fn();
    const { rerender } = render(
      <ConversationsListLoadMore enabled={false} loading={false} isCompact={false} onLoadMore={onLoadMore} />,
    );

    rerender(<ConversationsListLoadMore enabled loading={false} isCompact={false} onLoadMore={onLoadMore} />);
    expect(liveObservers()).toHaveLength(1);

    rerender(<ConversationsListLoadMore enabled={false} loading isCompact={false} onLoadMore={onLoadMore} />);
    expect(liveObservers()).toHaveLength(0);

    // Znova zapnutý pozorovateľ je nový, takže spustí donačítanie aj keď koniec zoznamu ostal na dohľad.
    rerender(<ConversationsListLoadMore enabled loading={false} isCompact={false} onLoadMore={onLoadMore} />);
    expect(liveObservers()).toHaveLength(1);
    liveObservers()[0].fire();
    expect(onLoadMore).toHaveBeenCalledTimes(1);
  });

  it('uses the viewport as the root when no ancestor scrolls', () => {
    render(
      <div>
        <ConversationsListLoadMore enabled loading={false} isCompact={false} onLoadMore={jest.fn()} />
      </div>,
    );

    expect(liveObservers()[0].root).toBeNull();
  });

  it('uses the nearest scrolling ancestor as the root', () => {
    render(
      <main data-testid="outer" style={{ overflowY: 'scroll' }}>
        <div data-testid="panel" style={{ overflowY: 'auto' }}>
          <div>
            <ConversationsListLoadMore enabled loading={false} isCompact={false} onLoadMore={jest.fn()} />
          </div>
        </div>
      </main>,
    );

    expect(liveObservers()[0].root).toBe(screen.getByTestId('panel'));
  });

  it.each(['auto', 'scroll', 'overlay'])('treats overflow-y %s as a scrolling ancestor', (overflowY) => {
    render(
      <section data-testid="scroller" style={{ overflowY } as React.CSSProperties}>
        <ConversationsListLoadMore enabled loading={false} isCompact={false} onLoadMore={jest.fn()} />
      </section>,
    );

    expect(liveObservers()[0].root).toBe(screen.getByTestId('scroller'));
  });

  it.each(['visible', 'hidden'])('does not treat overflow-y %s as a scrolling ancestor', (overflowY) => {
    render(
      <section style={{ overflowY } as React.CSSProperties}>
        <ConversationsListLoadMore enabled loading={false} isCompact={false} onLoadMore={jest.fn()} />
      </section>,
    );

    expect(liveObservers()[0].root).toBeNull();
  });

  it('skips ancestors that do not scroll vertically', () => {
    render(
      <main data-testid="outer" style={{ overflowY: 'auto' }}>
        <div style={{ overflowX: 'auto' }}>
          <div style={{ overflowY: 'hidden' }}>
            <ConversationsListLoadMore enabled loading={false} isCompact={false} onLoadMore={jest.fn()} />
          </div>
        </div>
      </main>,
    );

    expect(liveObservers()[0].root).toBe(screen.getByTestId('outer'));
  });

  it('shows two skeleton rows while a batch is loading', () => {
    render(<ConversationsListLoadMore enabled={false} loading isCompact={false} onLoadMore={jest.fn()} />);

    const rows = screen.getAllByTestId('conversations-load-more-row');
    expect(rows).toHaveLength(2);
    rows.forEach((row) => expect(row).toHaveAttribute('aria-hidden', 'true'));
  });

  it('sizes the skeleton rows for the compact rail', () => {
    const { rerender } = render(
      <ConversationsListLoadMore enabled={false} loading isCompact onLoadMore={jest.fn()} />,
    );
    expect(screen.getAllByTestId('conversations-load-more-row')[0].className).toContain('px-3 py-2.5');

    rerender(<ConversationsListLoadMore enabled={false} loading isCompact={false} onLoadMore={jest.fn()} />);
    expect(screen.getAllByTestId('conversations-load-more-row')[0].className).toContain('px-4 py-3.5');
  });

  it('works without IntersectionObserver support', () => {
    (global as unknown as { IntersectionObserver: unknown }).IntersectionObserver = undefined;

    expect(() =>
      render(<ConversationsListLoadMore enabled loading={false} isCompact={false} onLoadMore={jest.fn()} />),
    ).not.toThrow();
    expect(screen.getByTestId('conversations-load-more-sentinel')).toBeInTheDocument();
  });
});
