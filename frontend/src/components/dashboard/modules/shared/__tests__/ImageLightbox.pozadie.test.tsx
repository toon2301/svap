/**
 * Pozadie fullscreen prehliadača na celú plochu (`fullBleedBackdrop`, nález 377, kolo 3c).
 *
 * Mobilný prehliadač Nástenky pripne koreň na viditeľnú plochu nad klávesnicou (`containerStyle`). Plávajúce lišty iOS nad
 * klávesnicou sú priesvitné a pod pripnutým koreňom nebolo nič, čo by zakrylo stránku Nástenky pod prehliadačom. Zapnutá
 * vlastnosť preto oddelí čierne pozadie od koreňa: koreň je priehľadný a pozadie kreslí jeho prvý potomok `fixed inset-0`,
 * ktorý pripnutie nesleduje. Bez vlastnosti je prehliadač presne ako doteraz.
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
import { fireEvent, render, screen } from '@testing-library/react';
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
  const onClose = jest.fn();
  render(
    <ImageLightbox
      open
      sources={['https://cdn.test/1.webp', 'https://cdn.test/2.webp']}
      initialIndex={0}
      alt="Fotka"
      labels={LABELS}
      onClose={onClose}
      testId="lb"
      {...extra}
    />,
  );
  return { onClose, koren: screen.getByTestId('lb') };
}

describe('bez vlastnosti `fullBleedBackdrop`', () => {
  it('čierne pozadie má koreň a samostatný prvok pozadia neexistuje', () => {
    const { koren } = vykresli();

    expect(koren).toHaveClass('bg-black/95');
    expect(screen.queryByTestId('lb-backdrop')).not.toBeInTheDocument();
  });

  it('pripnutý koreň si pozadie nechá (správanie z kola 3b sa nemení)', () => {
    const { koren } = vykresli({ containerStyle: { top: 59, height: 392, bottom: 'auto' } });

    expect(koren).toHaveClass('bg-black/95');
    expect(koren).toHaveStyle({ top: '59px', height: '392px', bottom: 'auto' });
    expect(screen.queryByTestId('lb-backdrop')).not.toBeInTheDocument();
  });
});

describe('s vlastnosťou `fullBleedBackdrop`', () => {
  it('koreň je priehľadný a pozadie kreslí jeho prvý potomok na celú plochu pod ostatným obsahom', () => {
    const { koren } = vykresli({ fullBleedBackdrop: true });
    const pozadie = screen.getByTestId('lb-backdrop');

    expect(koren).not.toHaveClass('bg-black/95');
    expect(koren.firstElementChild).toBe(pozadie);
    expect(pozadie).toHaveClass('fixed', 'inset-0', '-z-10', 'bg-black/95');
    expect(pozadie).toHaveAttribute('aria-hidden', 'true');
  });

  it('koreň ostáva `fixed inset-0` a pripnutie sa ho týka, pozadie pripnutie nesleduje', () => {
    const { koren } = vykresli({
      fullBleedBackdrop: true,
      containerStyle: { top: 59, height: 392, bottom: 'auto' },
    });
    const pozadie = screen.getByTestId('lb-backdrop');

    expect(koren).toHaveClass('fixed', 'inset-0');
    expect(koren).toHaveStyle({ top: '59px', height: '392px', bottom: 'auto' });
    expect(pozadie.getAttribute('style')).toBeNull();
  });

  it('fotka a počítadlo ostávajú nad pozadím a prepínanie fotiek funguje ďalej', () => {
    const { koren } = vykresli({ fullBleedBackdrop: true });

    const potomkovia = Array.from(koren.children);
    expect(potomkovia.indexOf(screen.getByTestId('lb-backdrop'))).toBe(0);
    expect(potomkovia.indexOf(screen.getByTestId('lb-frame'))).toBeGreaterThan(0);
    expect(screen.getByTestId('lb-counter')).toHaveTextContent('1 / 2');
    expect(screen.getByTestId('lb-image')).toHaveAttribute('src', 'https://cdn.test/1.webp');
  });

  it('klik na pozadie zatvára prehliadač rovnako ako klik na koreň (predvolené správanie)', () => {
    const { onClose } = vykresli({ fullBleedBackdrop: true });

    fireEvent.click(screen.getByTestId('lb-backdrop'));

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('klik na pozadie nezatvára, keď prehliadač zatváranie podkladom vypína (prehliadač Nástenky)', () => {
    const { onClose } = vykresli({ fullBleedBackdrop: true, dismissOnBackdropClick: false });

    fireEvent.click(screen.getByTestId('lb-backdrop'));

    expect(onClose).not.toHaveBeenCalled();
  });
});
