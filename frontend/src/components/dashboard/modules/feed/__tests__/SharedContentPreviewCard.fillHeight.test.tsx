/**
 * Pružná plocha náhľadu ponuky a portfólia v dvojstĺpcovom okne detailu (nález 344, R53, R68).
 *
 * V ľavom stĺpci s pevnou výškou vyplní plocha náhľadu (fotka, náhrada aj ikona nedostupného zdroja) zvyšok stĺpca,
 * no nezmenší sa pod 8 rem (128 px). Všade inde ostáva výška 256 px. Zdieľaný príspevok sa nemení.
 *
 * jsdom nelayoutuje, takže sa kontrolujú triedy, ktoré o rozložení rozhodujú; výšky v pixeloch ukazuje prehliadač.
 */

import { fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import SharedContentPreviewCard from '../SharedContentPreviewCard';
import type { SharedContentCard } from '../sharedContentCard';

jest.mock('../../shared/useProtectedImage', () => ({
  useProtectedImage: (src: string | null) => ({
    resolvedSrc: src,
    isProtected: false,
    isLoading: false,
    isError: false,
  }),
}));

const THUMBNAIL = 'https://cdn.example.com/media/offers/1/x.webp';

const OFFER: SharedContentCard = {
  type: 'offer',
  title: 'Programovanie',
  thumbnailUrl: THUMBNAIL,
  isSeeking: false,
  price: { price_from: '25', price_currency: '€' },
};
const PORTFOLIO: SharedContentCard = {
  type: 'portfolio_item',
  title: 'Weby',
  thumbnailUrl: THUMBNAIL,
};

const PRIPADY: Array<[string, SharedContentCard]> = [
  ['ponuka s fotkou', OFFER],
  ['ponuka bez fotky', { ...OFFER, thumbnailUrl: null }],
  ['portfólio s fotkou', PORTFOLIO],
  ['portfólio bez fotky', { ...PORTFOLIO, thumbnailUrl: null }],
  ['ponuka, ktorej zdroj zmizol', { ...OFFER, thumbnailUrl: null, unavailable: true }],
];

/** Rám karty: tlačidlo živej karty, alebo `div` nedostupného zdroja (rodič plochy náhľadu). */
function ram(): HTMLElement {
  return screen.getByTestId('feed-shared-card-media').parentElement as HTMLElement;
}

describe('pružná plocha náhľadu ponuky a portfólia (fillHeight)', () => {
  it.each(PRIPADY)('%s: plocha vyplní zvyšok stĺpca a nezmenší sa pod 128 px', (_nazov, data) => {
    render(<SharedContentPreviewCard data={data} fillHeight />);

    const plocha = screen.getByTestId('feed-shared-card-media');
    expect(plocha.className).toContain('min-h-32');
    expect(plocha.className).toContain('flex-1');
    expect(plocha.className).not.toContain('h-64');
  });

  it.each(PRIPADY)('%s: obsah plochy vypĺňa rám absolútne', (_nazov, data) => {
    render(<SharedContentPreviewCard data={data} fillHeight />);

    const obal = screen.getByTestId('feed-shared-card-media').firstElementChild as HTMLElement;
    expect(obal.className).toContain('absolute');
    expect(obal.className).toContain('inset-0');
  });

  it.each(PRIPADY)('%s: karta aj rám sú flex stĺpec a telo karty sa nezmenšuje', (_nazov, data) => {
    render(<SharedContentPreviewCard data={data} fillHeight />);

    const koren = screen.getByTestId('feed-shared-card');
    expect(koren.className).toContain('flex-1');
    expect(koren.className).toContain('flex-col');
    const ramKarty = ram();
    expect(ramKarty.className).toContain('flex-1');
    expect(ramKarty.className).toContain('flex-col');
    expect((ramKarty.lastElementChild as HTMLElement).className).toContain('shrink-0');
  });

  it('ikona nedostupného zdroja so zlyhanou fotkou je tiež pružná', () => {
    const { container } = render(
      <SharedContentPreviewCard data={{ ...OFFER, unavailable: true }} fillHeight />,
    );
    container.querySelectorAll('img').forEach((obrazok) => fireEvent.error(obrazok));

    const plocha = screen.getByTestId('feed-shared-card-media');
    expect(screen.getByTestId('feed-shared-unavailable-icon')).toBeInTheDocument();
    expect(plocha.className).toContain('min-h-32');
    expect(plocha.className).toContain('flex-1');
    expect((plocha.firstElementChild as HTMLElement).className).toContain('inset-0');
  });

  it.each(PRIPADY)('%s: bez fillHeight ostáva plocha 256 px a karta bez flex tried', (_nazov, data) => {
    render(<SharedContentPreviewCard data={data} />);

    const plocha = screen.getByTestId('feed-shared-card-media');
    expect(plocha.className).toContain('h-64');
    expect(plocha.className).not.toContain('min-h-32');
    expect(plocha.className).not.toContain('flex-1');
    expect(screen.getByTestId('feed-shared-card').className).toBe('');
    expect(ram().className).not.toContain('flex-col');
  });

  it('zdieľaný príspevok ignoruje fillHeight: fotka ostáva 256 px a nič sa neobaľuje', () => {
    render(
      <SharedContentPreviewCard
        data={{ type: 'feed_post', title: '', caption: 'Pôvodný text', thumbnailUrl: THUMBNAIL }}
        fillHeight
      />,
    );

    const plocha = screen.getByTestId('feed-shared-card-media');
    expect(plocha.className).toContain('h-64');
    expect(plocha.className).not.toContain('flex-1');
    // Obal `absolute inset-0` pribúda len pri pružnej ploche; fotka v zdieľanom príspevku ostáva priamo v ráme.
    expect((plocha.firstElementChild as HTMLElement).className).not.toContain('absolute');
    expect(screen.getByTestId('feed-shared-card').className).toBe('');
  });
});
