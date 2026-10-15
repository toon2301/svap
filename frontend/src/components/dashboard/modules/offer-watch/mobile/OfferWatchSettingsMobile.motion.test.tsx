import type { ReactNode } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import type { OfferWatch } from '../types';
import { useOfferWatches } from '../useOfferWatches';
import OfferWatchSettingsMobile from './OfferWatchSettingsMobile';

/**
 * Pohyb obrazovky „Sledovanie“: vsúva sa sprava rovnakou pružinou ako sa vysúva panel Nastavení a pri Späť sa
 * vysúva späť doprava. Bez vsunutia (obnova po načítaní) začína priamo na svojom mieste.
 */

/** Či je obrazovka v `AnimatePresence` prítomná; `false` = práve sa vysúva (skutočný `useIsPresent`). */
let mockIsPresent = true;

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
    useIsPresent: () => mockIsPresent,
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

function sampleWatch(id: number): OfferWatch {
  return {
    id,
    category: 'Vzdelávanie',
    subcategory: 'Doučovanie',
    isSeeking: false,
    countryCode: 'SK',
    districtCode: '',
    districtLabel: '',
    priceMin: null,
    priceMax: null,
    priceCurrency: '',
    createdAt: '2026-09-06T08:00:00Z',
    updatedAt: '2026-09-06T08:00:00Z',
  };
}

/** Obrazovka so sledovaniami; vráti aj prekreslenie (po zmene `mockIsPresent`) a odmountovanie. */
function mountScreenWithWatches(watches: OfferWatch[], onBack = jest.fn()) {
  jest.mocked(useOfferWatches).mockReturnValue({
    watches,
    isLoading: false,
    mutation: null,
    error: null,
    reload: jest.fn().mockResolvedValue({ ok: true, value: watches }),
    createWatch: jest.fn(),
    updateWatch: jest.fn(),
    deleteWatch: jest.fn(),
    clearError: jest.fn(),
  } as never);
  const onPushView = jest.fn();
  // Nový element pri každom prekreslení: ten istý objekt by React preskočil a stav „prítomná“ by sa neprečítal.
  const build = () => <OfferWatchSettingsMobile view={{ kind: 'list' }} onBack={onBack} onPushView={onPushView} />;
  const rendered = render(build());
  return {
    onBack,
    rerender: () => rendered.rerender(build()),
    unmount: rendered.unmount,
  };
}

const deleteDialog = () => screen.queryByTestId('offer-watch-delete-dialog');
const openDeleteDialog = () => {
  fireEvent.click(screen.getAllByRole('button', { name: 'Vymazať sledovanie' })[0]!);
  expect(deleteDialog()).toBeInTheDocument();
};

describe('OfferWatchSettingsMobile – vysúvanie je neaktívne', () => {
  beforeEach(() => {
    mockIsPresent = true;
    document.body.style.overflow = '';
  });

  afterEach(() => {
    document.body.style.overflow = '';
  });

  it('holds the page scroll lock while the screen is present', () => {
    const screenControls = mountScreenWithWatches([sampleWatch(1)]);

    expect(document.body.style.overflow).toBe('hidden');
    screenControls.rerender();
    expect(document.body.style.overflow).toBe('hidden');
  });

  it('releases the page scroll lock as soon as the screen starts to slide out', () => {
    const screenControls = mountScreenWithWatches([sampleWatch(1)]);

    mockIsPresent = false;
    screenControls.rerender();

    // Ťuknutia už prechádzajú na Nastavenia pod obrazovkou, takže zámok nesmie čakať na koniec výstupu.
    expect(document.body.style.overflow).toBe('');
  });

  it('does not break a scroll lock taken by something else while the screen slides out', () => {
    const screenControls = mountScreenWithWatches([sampleWatch(1)]);
    mockIsPresent = false;
    screenControls.rerender();

    // Menu „Viac“ v Nastaveniach si zapamätá aktuálnu hodnotu a zamkne stránku (rovnaký vzor ako obrazovka).
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    screenControls.unmount();

    // Koniec výstupu nesmie menu odomknúť stránku pod rukami…
    expect(document.body.style.overflow).toBe('hidden');
    // …a po zatvorení menu sa vráti pôvodný stav, nie zámok navždy.
    document.body.style.overflow = previousOverflow;
    expect(document.body.style.overflow).toBe('');
  });

  it('closes the delete dialog as soon as the screen starts to slide out', () => {
    const screenControls = mountScreenWithWatches([sampleWatch(1)]);
    openDeleteDialog();

    mockIsPresent = false;
    screenControls.rerender();

    // Dialóg je portál mimo obrazovky, takže `pointer-events: none` obrazovky naň nepôsobí: nesmie ostať ťukateľný.
    expect(deleteDialog()).not.toBeInTheDocument();
  });

  it('ends with an unlocked page when the screen slides out with the delete dialog open', () => {
    const screenControls = mountScreenWithWatches([sampleWatch(1)]);
    openDeleteDialog();
    expect(document.body.style.overflow).toBe('hidden');

    mockIsPresent = false;
    screenControls.rerender();
    expect(document.body.style.overflow).toBe('');

    screenControls.unmount();
    expect(document.body.style.overflow).toBe('');
  });

  it('keeps the delete dialog while the screen is present', () => {
    const screenControls = mountScreenWithWatches([sampleWatch(1)]);
    openDeleteDialog();

    screenControls.rerender();

    expect(deleteDialog()).toBeInTheDocument();
  });

  it('gives the focus back to the Settings when the screen starts to slide out, not when it is removed', () => {
    const settingsRow = document.createElement('button');
    document.body.appendChild(settingsRow);
    settingsRow.focus();
    const screenControls = mountScreenWithWatches([sampleWatch(1)]);
    const insideScreen = screen.getAllByRole('button', { name: 'Vymazať sledovanie' })[0]!;
    insideScreen.focus();
    expect(document.activeElement).toBe(insideScreen);

    mockIsPresent = false;
    screenControls.rerender();

    // Inak by sa fokus vrátil až po ~0,6 s a vytrhol by ho z menu, ktoré sa medzitým otvorilo.
    expect(document.activeElement).toBe(settingsRow);
    document.body.removeChild(settingsRow);
  });
});

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
