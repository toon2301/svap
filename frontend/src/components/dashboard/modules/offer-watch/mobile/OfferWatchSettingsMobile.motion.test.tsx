import type { ReactNode } from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { useOfferWatches } from '../useOfferWatches';
import OfferWatchSettingsMobile from './OfferWatchSettingsMobile';

/**
 * Pohyb obrazovky „Sledovanie“: vsúva sa sprava rovnakou pružinou ako sa vysúva panel Nastavení a pri Späť sa
 * vysúva späť doprava. Bez vsunutia (obnova po načítaní) začína priamo na svojom mieste.
 */

jest.mock('framer-motion', () => {
  const { forwardRef } = jest.requireActual<typeof import('react')>('react');
  const MotionDiv = forwardRef<HTMLDivElement, Record<string, unknown>>(function MotionDiv(
    { initial, animate, exit, transition, children, ...rest },
    ref,
  ) {
    return (
      <div
        ref={ref}
        data-motion-initial={JSON.stringify(initial)}
        data-motion-animate={JSON.stringify(animate)}
        data-motion-exit={JSON.stringify(exit)}
        data-motion-transition={JSON.stringify(transition)}
        {...rest}
      >
        {children as ReactNode}
      </div>
    );
  });
  return {
    motion: { div: MotionDiv },
    AnimatePresence: ({ children }: { children?: ReactNode }) => children,
  };
});

jest.mock('../useOfferWatches', () => ({ useOfferWatches: jest.fn() }));
jest.mock('../../../hooks/useVisualViewportBounds', () => ({
  ...jest.requireActual('../../../hooks/useVisualViewportBounds'),
  useVisualViewportBounds: () => null,
}));

function renderScreen(slideIn?: boolean) {
  jest.mocked(useOfferWatches).mockReturnValue({
    watches: [],
    isLoading: false,
    mutation: null,
    error: null,
    reload: jest.fn().mockResolvedValue({ ok: true, value: [] }),
    createWatch: jest.fn(),
    updateWatch: jest.fn(),
    deleteWatch: jest.fn(),
    clearError: jest.fn(),
  } as never);
  render(
    <OfferWatchSettingsMobile
      view={{ kind: 'list' }}
      onBack={jest.fn()}
      onPushView={jest.fn()}
      slideIn={slideIn}
    />,
  );
  return screen.getByTestId('offer-watch-mobile-screen');
}

const json = (value: unknown) => JSON.stringify(value);

describe('OfferWatchSettingsMobile – pohyb', () => {
  it('slides in from the right edge when it was opened by a tap', () => {
    const root = renderScreen(true);

    expect(root).toHaveAttribute('data-motion-initial', json({ x: '100%' }));
    expect(root).toHaveAttribute('data-motion-animate', json({ x: 0 }));
  });

  it('starts in place when it is only restored', () => {
    const root = renderScreen(false);

    expect(root).toHaveAttribute('data-motion-initial', json({ x: 0 }));
    expect(root).toHaveAttribute('data-motion-animate', json({ x: 0 }));
  });

  it('starts in place by default', () => {
    const root = renderScreen();

    expect(root).toHaveAttribute('data-motion-initial', json({ x: 0 }));
  });

  it('slides out to the right edge when it closes', () => {
    const root = renderScreen(true);

    expect(root).toHaveAttribute('data-motion-exit', json({ x: '100%', pointerEvents: 'none' }));
  });

  it('does not react to taps while it slides out (they must reach the Settings under it)', () => {
    const root = renderScreen(true);

    // Vysúvajúca sa obrazovka ostáva ~0,6 s pripojená: jej tlačidlá (mazanie, vytvorenie) nesmú reagovať.
    expect(JSON.parse(root.getAttribute('data-motion-exit') ?? '{}')).toMatchObject({ pointerEvents: 'none' });
  });

  it('moves with the same spring as the Settings panel (Sidebar: spring, damping 25, stiffness 200)', () => {
    const root = renderScreen(true);

    expect(root).toHaveAttribute('data-motion-transition', json({ type: 'spring', damping: 25, stiffness: 200 }));
  });

  it('stays a modal dialog for assistive technology', () => {
    const root = renderScreen(true);

    expect(root).toHaveAttribute('role', 'dialog');
    expect(root).toHaveAttribute('aria-modal', 'true');
  });
});
