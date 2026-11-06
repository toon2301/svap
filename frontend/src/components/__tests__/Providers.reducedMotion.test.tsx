import React from 'react';
import { act, render } from '@testing-library/react';
import { motion } from 'framer-motion';
import '@testing-library/jest-dom';

// Skutočný framer-motion: globálny mock z jest.setup.js animácie nerobí, takže by nič nedokázal.
jest.mock('framer-motion', () => jest.requireActual('framer-motion'));

jest.mock('react-hot-toast', () => ({
  Toaster: () => null,
}));

jest.mock('@/contexts/AuthContext', () => ({
  AuthProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

jest.mock('@/hooks/useIsMobile', () => ({
  useIsMobileState: () => ({ isMobile: false, isResolved: true }),
}));

import { Providers } from '../providers';

type PreferenceListener = () => void;

/**
 * Nahradí `window.matchMedia` verziou s ovládateľným systémovým nastavením „Znížiť pohyb“
 * (`prefers-reduced-motion`) a vráti funkciu, ktorá ho prepne. Framer-motion si nastavenie číta pri prvom
 * komponente a ďalej ho sleduje cez udalosť `change`, preto sa prepnutie hlási všetkým zaregistrovaným
 * poslucháčom. Ostatné media query vracajú `false`.
 */
function installReducedMotionPreference(): (reduce: boolean) => void {
  let reduce = false;
  const listeners = new Set<PreferenceListener>();
  window.matchMedia = jest.fn().mockImplementation((query: string) => {
    const isReducedMotion = query.includes('prefers-reduced-motion');
    return {
      get matches() {
        return isReducedMotion && reduce;
      },
      media: query,
      onchange: null,
      addListener: jest.fn(),
      removeListener: jest.fn(),
      addEventListener: (_type: string, listener: PreferenceListener) => {
        if (isReducedMotion) listeners.add(listener);
      },
      removeEventListener: (_type: string, listener: PreferenceListener) => {
        listeners.delete(listener);
      },
      dispatchEvent: jest.fn(),
    };
  });
  return (next: boolean) => {
    reduce = next;
    listeners.forEach((listener) => listener());
  };
}

/** Posun po osi X (v px) z inline štýlu prvku; kým sa animácia nerozbehne, je štýl `transform: none`, teda 0. */
function translateX(element: HTMLElement): number {
  const match = /translateX\((-?[\d.]+)px\)/.exec(element.style.transform);
  return match ? Number(match[1]) : 0;
}

/**
 * Snímky animácie naozaj bežali: priehľadnosť sa už pohla z 0, no 5-sekundová animácia ešte nie je hotová.
 * Bez tejto kontroly by „posun je menší ako 100“ prešlo aj vtedy, keby sa animácia vôbec nespustila.
 */
function framesRan(element: HTMLElement): boolean {
  const opacity = Number(element.style.opacity);
  return opacity > 0 && opacity < 1;
}

/** Pomalá animácia (5 s) posunu aj priehľadnosti, aby sa dal rozlíšiť okamžitý skok od rozbehnutej animácie. */
function AnimatedBox() {
  return (
    <motion.div
      data-testid="box"
      initial={{ x: 0, opacity: 0 }}
      animate={{ x: 100, opacity: 1 }}
      transition={{ duration: 5 }}
    />
  );
}

/** Nechá ubehnúť niekoľko snímok animácie. Musí byť v samostatnom `act`: v tom istom ako `render` by React odložil efekty, ktoré animáciu spúšťajú. */
async function letFramesRun() {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 60));
  });
}

/** Vykreslí obsah (efekty sa dobehnú v `render`) a nechá ubehnúť snímky, aby bolo vidieť, či animácia beží alebo je hotová. */
async function renderAndLetFramesRun(ui: React.ReactElement) {
  const view = render(ui);
  await letFramesRun();
  return view;
}

describe('Providers – znížený pohyb (systémové „Znížiť pohyb“)', () => {
  let setReducedMotion: (reduce: boolean) => void;
  const originalMatchMedia = window.matchMedia;
  let warn: jest.SpyInstance;

  beforeAll(() => {
    // Musí byť pred prvým komponentom `motion`: ten si nastavenie čítaním a sledovaním zaregistruje.
    setReducedMotion = installReducedMotionPreference();
  });

  beforeEach(() => {
    // Vývojový režim framer-motion pri zapnutom „Znížiť pohyb“ raz vypíše upozornenie; v teste nie je dôležité.
    warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    warn.mockRestore();
  });

  afterAll(() => {
    window.matchMedia = originalMatchMedia;
  });

  it('bez Providers framer-motion „Znížiť pohyb“ ignoruje a posun animuje (predpoklad ostatných testov)', async () => {
    setReducedMotion(true);

    const { getByTestId } = await renderAndLetFramesRun(<AnimatedBox />);

    const box = getByTestId('box');
    expect(framesRan(box)).toBe(true);
    expect(translateX(box)).toBeLessThan(100);
  });

  it('so zapnutým „Znížiť pohyb“ sa posun vykoná okamžite, priehľadnosť sa animuje ďalej', async () => {
    setReducedMotion(true);

    const { getByTestId } = await renderAndLetFramesRun(
      <Providers>
        <AnimatedBox />
      </Providers>,
    );

    const box = getByTestId('box');
    expect(framesRan(box)).toBe(true);
    expect(translateX(box)).toBe(100);
  });

  it('s vypnutým „Znížiť pohyb“ sa posun animuje', async () => {
    setReducedMotion(false);

    const { getByTestId } = await renderAndLetFramesRun(
      <Providers>
        <AnimatedBox />
      </Providers>,
    );

    const box = getByTestId('box');
    expect(framesRan(box)).toBe(true);
    expect(translateX(box)).toBeLessThan(100);
  });

  it('zmena nastavenia za behu sa prejaví na komponentoch zobrazených po nej', async () => {
    setReducedMotion(false);
    const { rerender, getByTestId } = await renderAndLetFramesRun(<Providers>{null}</Providers>);

    setReducedMotion(true);
    rerender(
      <Providers>
        <AnimatedBox />
      </Providers>,
    );
    await letFramesRun();

    const box = getByTestId('box');
    expect(framesRan(box)).toBe(true);
    expect(translateX(box)).toBe(100);
  });
});
