/**
 * Fullscreen prehliadač fotiek, keď sa fotka nenačíta (nález 291): namiesto pokazeného obrázka (verejná adresa) alebo
 * prázdneho rámika (chránená adresa, ktorej stiahnutie zlyhalo) sa ukáže viditeľná náhrada s textom. Počítadlo,
 * prepínanie ostatných fotiek a zatváranie ostávajú funkčné. Hook `useProtectedImage` je skutočný, `api` je podmenené.
 */

jest.mock('@/lib/apiUrl', () => ({
  getConfiguredApiUrl: () => '/api',
}));

jest.mock('@/lib/api', () => ({
  __esModule: true,
  api: { get: jest.fn() },
}));

jest.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (_key: string, fallback?: string) => fallback ?? _key }),
}));

import type { ComponentProps } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { api } from '@/lib/api';
import { ImageLightbox } from '../ImageLightbox';

const LABEL = 'Fotku sa nepodarilo načítať';
const LABELS = {
  dialog: 'Fotky',
  close: 'Zavrieť',
  previous: 'Predchádzajúca',
  next: 'Ďalšia',
  counter: (current: number, total: number) => `${current} / ${total}`,
};
const PUBLIC = ['https://cdn.test/1.webp', 'https://cdn.test/2.webp', 'https://cdn.test/3.webp'];
const protectedUrl = (id: number) => `https://backend.test/api/auth/portfolio/9/images/${id}/file/?variant=large`;

/** Otvorený prehliadač s danými fotkami; `extra` prepíše vlastnosti (napr. `onImageActivate`). */
function renderLightbox(sources: string[], extra: Partial<ComponentProps<typeof ImageLightbox>> = {}) {
  const onClose = jest.fn();
  render(
    <ImageLightbox
      open
      sources={sources}
      initialIndex={0}
      alt="Fotka"
      labels={LABELS}
      onClose={onClose}
      testId="lb"
      {...extra}
    />,
  );
  return { onClose };
}

/** Adresa fotky, ktorá je práve na obrazovke. */
const shownSrc = () => screen.getByTestId('lb-image').getAttribute('src');

beforeEach(() => {
  jest.clearAllMocks();
  (api.get as jest.Mock).mockReset();
  Object.defineProperty(URL, 'createObjectURL', { writable: true, value: jest.fn(() => 'blob:mock/1') });
  Object.defineProperty(URL, 'revokeObjectURL', { writable: true, value: jest.fn() });
});

describe('ImageLightbox: fotka, ktorá sa nenačíta', () => {
  it('fotka, ktorá sa načíta, sa ukáže s popisom a pevný rámec sa prenesie na obrázok', () => {
    renderLightbox(PUBLIC, { fixedFrame: true });

    expect(screen.getByTestId('lb-image')).toHaveAttribute('alt', 'Fotka');
    expect(screen.getByTestId('lb-image')).toHaveClass('h-full', 'w-full', 'object-contain');
    expect(screen.queryByTestId('lb-failed')).not.toBeInTheDocument();
  });

  it('zatvorený prehliadač nič nesťahuje, ani chránenú fotku', () => {
    renderLightbox([protectedUrl(1)], { open: false });

    expect(api.get).not.toHaveBeenCalled();
    expect(screen.queryByTestId('lb')).not.toBeInTheDocument();
  });

  it('zlyhaná verejná fotka ukáže náhradu s textom a počítadlo aj ovládanie ostanú', () => {
    renderLightbox(PUBLIC);

    fireEvent.error(screen.getByTestId('lb-image'));

    expect(screen.getByTestId('lb-failed')).toHaveTextContent(LABEL);
    expect(screen.queryByTestId('lb-image')).not.toBeInTheDocument();
    expect(screen.getByTestId('lb-counter')).toHaveTextContent('1 / 3');
    ['lb-close', 'lb-prev', 'lb-next'].forEach((id) => expect(screen.getByTestId(id)).toBeInTheDocument());
  });

  it('šípkou sa dá prejsť na ďalšiu fotku a návrat na zlyhanú ju skúsi načítať znova', () => {
    renderLightbox(PUBLIC);
    fireEvent.error(screen.getByTestId('lb-image'));

    fireEvent.click(screen.getByTestId('lb-next'));
    expect(shownSrc()).toBe(PUBLIC[1]);
    expect(screen.queryByTestId('lb-failed')).not.toBeInTheDocument();
    expect(screen.getByTestId('lb-counter')).toHaveTextContent('2 / 3');

    fireEvent.click(screen.getByTestId('lb-prev'));
    expect(shownSrc()).toBe(PUBLIC[0]);
    expect(screen.queryByTestId('lb-failed')).not.toBeInTheDocument();
  });

  it('klávesnica a zatvorenie fungujú aj na zlyhanej fotke', () => {
    const { onClose } = renderLightbox(PUBLIC);
    fireEvent.error(screen.getByTestId('lb-image'));

    fireEvent.keyDown(window, { key: 'ArrowRight' });
    expect(shownSrc()).toBe(PUBLIC[1]);
    fireEvent.keyDown(window, { key: 'ArrowLeft' });
    fireEvent.error(screen.getByTestId('lb-image'));
    expect(screen.getByTestId('lb-failed')).toBeInTheDocument();

    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByTestId('lb-close'));
    expect(onClose).toHaveBeenCalledTimes(2);
  });

  it('klik na náhradu zavolá `onImageActivate` a prehliadač nezatvorí', () => {
    const onImageActivate = jest.fn();
    const { onClose } = renderLightbox(PUBLIC, { onImageActivate });
    fireEvent.error(screen.getByTestId('lb-image'));

    fireEvent.click(screen.getByTestId('lb-failed'));

    expect(onImageActivate).toHaveBeenCalledTimes(1);
    expect(onClose).not.toHaveBeenCalled();
  });

  it('chránená fotka, ktorej stiahnutie zlyhalo, ukáže tú istú náhradu', async () => {
    (api.get as jest.Mock).mockRejectedValue(new Error('404'));

    renderLightbox([protectedUrl(1), protectedUrl(2)]);

    expect(await screen.findByTestId('lb-failed')).toHaveTextContent(LABEL);
    expect(screen.queryByTestId('lb-image')).not.toBeInTheDocument();
    expect(screen.getByTestId('lb-counter')).toHaveTextContent('1 / 2');
  });

  it('po zlyhanej chránenej fotke sa ďalšia chránená načíta normálne a náhrada nezostane', async () => {
    (api.get as jest.Mock).mockImplementation((url: string) =>
      url.includes('/images/1/')
        ? Promise.reject(new Error('404'))
        : Promise.resolve({ data: new Blob(['x'], { type: 'image/webp' }) }),
    );
    renderLightbox([protectedUrl(1), protectedUrl(2)]);
    await screen.findByTestId('lb-failed');

    fireEvent.click(screen.getByTestId('lb-next'));

    expect(await screen.findByTestId('lb-image')).toHaveAttribute('src', 'blob:mock/1');
    expect(screen.queryByTestId('lb-failed')).not.toBeInTheDocument();
  });

  it('počas sťahovania chránenej fotky nie je žiadna náhrada, len neutrálny rámik', () => {
    (api.get as jest.Mock).mockReturnValue(new Promise(() => undefined));

    renderLightbox([protectedUrl(1)]);

    expect(screen.queryByTestId('lb-failed')).not.toBeInTheDocument();
    expect(screen.queryByTestId('lb-image')).not.toBeInTheDocument();
  });
});
