/**
 * Zámok ťahu prstom vo fullscreen prehliadači (`lockTouchPan`, nález 376, kolo 3c).
 *
 * Koreň prehliadača sa vykreslí až po pripojení (`mounted`), preto sa zámok pripája až vtedy: aj keď je vlastnosť zapnutá od
 * prvého vykreslenia, ťah po fotke sa musí zrušiť. Bez vlastnosti je prehliadač presne ako doteraz a ťah nič nezruší.
 */

jest.mock('../useProtectedImage', () => ({
  useProtectedImage: (src: string | null) => ({
    resolvedSrc: src,
    isProtected: false,
    isLoading: false,
    isError: false,
  }),
}));

import type { ComponentProps } from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ImageLightbox } from '../ImageLightbox';

const LABELS = {
  dialog: 'Fotky',
  close: 'Zavrieť',
  previous: 'Predchádzajúca',
  next: 'Ďalšia',
  counter: (current: number, total: number) => `${current} / ${total}`,
};

function vykresli(extra: Partial<ComponentProps<typeof ImageLightbox>> = {}) {
  return render(
    <ImageLightbox
      open
      sources={['https://cdn.test/1.webp']}
      initialIndex={0}
      alt="Fotka"
      labels={LABELS}
      onClose={jest.fn()}
      testId="lb"
      {...extra}
    />,
  );
}

/** Pošle začiatok dotyku a pohyb nahor po fotke; vráti, či sa predvolená akcia pohybu zrušila. */
function tahPoFotke() {
  const cielovy = screen.getByTestId('lb-frame');
  const zaciatok = new Event('touchstart', { bubbles: true, cancelable: true });
  Object.assign(zaciatok, { touches: [{ clientY: 300 }] });
  cielovy.dispatchEvent(zaciatok);
  const pohyb = new Event('touchmove', { bubbles: true, cancelable: true });
  Object.assign(pohyb, { touches: [{ clientY: 200 }] });
  cielovy.dispatchEvent(pohyb);
  return pohyb.defaultPrevented;
}

describe('zámok ťahu prstom v prehliadači', () => {
  it('zapnutý od prvého vykreslenia zruší ťah po fotke (pripojí sa hneď po vykreslení koreňa)', () => {
    vykresli({ lockTouchPan: true });

    expect(tahPoFotke()).toBe(true);
  });

  it('bez vlastnosti `lockTouchPan` ťah nič nezruší', () => {
    vykresli();

    expect(tahPoFotke()).toBe(false);
  });

  it('zapnutie a vypnutie za behu zámok pripojí a odpojí', () => {
    const { rerender } = vykresli();
    expect(tahPoFotke()).toBe(false);

    rerender(
      <ImageLightbox
        open
        sources={['https://cdn.test/1.webp']}
        initialIndex={0}
        alt="Fotka"
        labels={LABELS}
        onClose={jest.fn()}
        testId="lb"
        lockTouchPan
      />,
    );
    expect(tahPoFotke()).toBe(true);

    rerender(
      <ImageLightbox
        open
        sources={['https://cdn.test/1.webp']}
        initialIndex={0}
        alt="Fotka"
        labels={LABELS}
        onClose={jest.fn()}
        testId="lb"
      />,
    );
    expect(tahPoFotke()).toBe(false);
  });

  it('zatvorený prehliadač nič nevykreslí a nič nezamyká', () => {
    vykresli({ open: false, lockTouchPan: true });

    expect(screen.queryByTestId('lb')).not.toBeInTheDocument();
  });
});
