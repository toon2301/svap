/**
 * Zdieľaná karta po zmazaní pôvodnej fotky (nález 91).
 *
 * Snapshot zdieľaného obsahu nesie verejnú adresu náhľadu. Keď sa pôvodná fotka zmaže, adresa prestane fungovať a
 * `BlurredContainImage` pri verejnej adrese nemal ošetrenú chybu načítania, takže na karte ostal pokazený obrázok.
 * Teraz karta po zlyhaní načítania ukáže náhradu: pri ponuke a portfóliu tú istú ako pri chýbajúcej fotke, pri
 * zdieľanom príspevku fotku vynechá (ako príspevok bez fotky) a pri nedostupnom zdroji použije existujúcu ikonu.
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
const OTHER_THUMBNAIL = 'https://cdn.example.com/media/offers/2/y.webp';

/** Karta zdieľaného obsahu s fotkou na náhľade; ostatné polia sú len tie, ktoré karta potrebuje na vykreslenie. */
function card(overrides: Partial<SharedContentCard> = {}): SharedContentCard {
  return { type: 'offer', title: 'Programovanie', thumbnailUrl: THUMBNAIL, ...overrides };
}

/** Všetky obrázky náhľadu (rozmazané pozadie aj hlavný obrázok). */
function images(container: HTMLElement): HTMLImageElement[] {
  return Array.from(container.querySelectorAll('img'));
}

/** Simuluje zlyhané načítanie náhľadu: prehliadač pošle `error` obom vrstvám obrázka. */
function failImages(container: HTMLElement) {
  images(container).forEach((image) => fireEvent.error(image));
}

describe('zlyhaný náhľad zdieľanej karty', () => {
  it('ponuka: namiesto pokazeného obrázka ukáže náhradu a ponechá štítok Ponúkam/Hľadám', () => {
    const { container } = render(<SharedContentPreviewCard data={card({ isSeeking: false })} />);
    expect(images(container)).toHaveLength(2);

    failImages(container);

    expect(images(container)).toHaveLength(0);
    expect(screen.getByText('Bez fotografie')).toBeInTheDocument();
    expect(screen.getByTestId('feed-shared-card-kind')).toHaveTextContent('Ponúkam');
  });

  it('portfólio: ukáže náhradu portfólia, nie ponuky', () => {
    const { container } = render(<SharedContentPreviewCard data={card({ type: 'portfolio_item', title: 'Weby' })} />);

    failImages(container);

    expect(images(container)).toHaveLength(0);
    expect(screen.getByText('Bez titulnej fotky')).toBeInTheDocument();
    expect(screen.queryByText('Bez fotografie')).toBeNull();
  });

  it('zdieľaný príspevok: fotku vynechá a text ostane', () => {
    const { container } = render(
      <SharedContentPreviewCard
        data={card({ type: 'feed_post', title: '', caption: 'Pôvodný text príspevku' })}
        onOpenPostPhoto={jest.fn()}
      />,
    );
    expect(screen.getByTestId('feed-shared-post-photo')).toBeInTheDocument();

    failImages(container);

    // Rovnako ako príspevok bez fotky: žiadny obrázok, žiadne tlačidlo fotky, žiadna náhrada.
    expect(images(container)).toHaveLength(0);
    expect(screen.queryByTestId('feed-shared-post-photo')).toBeNull();
    expect(screen.queryByText('Bez fotografie')).toBeNull();
    expect(screen.queryByText('Bez titulnej fotky')).toBeNull();
    expect(screen.getByText('Pôvodný text príspevku')).toBeInTheDocument();
  });

  it('nedostupná ponuka: namiesto náhľadu použije existujúcu ikonu', () => {
    const { container } = render(<SharedContentPreviewCard data={card({ unavailable: true })} />);

    failImages(container);

    expect(images(container)).toHaveLength(0);
    expect(screen.getByTestId('feed-shared-unavailable-icon')).toBeInTheDocument();
    expect(screen.queryByText('Bez fotografie')).toBeNull();
    expect(screen.getByText('Táto ponuka už nie je dostupná')).toBeInTheDocument();
  });

  it('načítaný náhľad náhradu nedostane', () => {
    const { container } = render(<SharedContentPreviewCard data={card()} />);

    images(container).forEach((image) => fireEvent.load(image));

    expect(images(container)).toHaveLength(2);
    expect(screen.queryByText('Bez fotografie')).toBeNull();
  });

  it('chyba sa nededí na iný náhľad, no tá istá adresa ostáva náhradou', () => {
    const { container, rerender } = render(<SharedContentPreviewCard data={card()} />);
    failImages(container);
    expect(screen.getByText('Bez fotografie')).toBeInTheDocument();

    // Nový objekt s tou istou adresou (napr. nové vykreslenie zoznamu): fotka sa nesmie znova pokúšať načítať.
    rerender(<SharedContentPreviewCard data={card({ title: 'Iný názov' })} />);
    expect(images(container)).toHaveLength(0);
    expect(screen.getByText('Bez fotografie')).toBeInTheDocument();

    // Iná adresa náhľadu je nová fotka, ktorá sa má zobraziť.
    rerender(<SharedContentPreviewCard data={card({ thumbnailUrl: OTHER_THUMBNAIL })} />);
    expect(images(container)).toHaveLength(2);
    expect(screen.queryByText('Bez fotografie')).toBeNull();
  });
});
