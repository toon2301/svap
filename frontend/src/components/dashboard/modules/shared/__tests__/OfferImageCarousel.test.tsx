/**
 * Karusel fotiek ponuky: fotka, ktorá sa nenačíta, sa vynechá (nález 279).
 *
 * Bez toho ostal pri zmazanej fotke pokazený obrázok s alt textom: obyčajný `<img>` ani `BlurredContainImage` chybu
 * nehlásili. Zlyhaná fotka sa teraz v rotácii preskočí a „Bez fotografie“ sa ukáže až vtedy, keď zlyhajú všetky.
 * Platí pre oba varianty (`cover` s obyčajným `<img>` aj `contain-blur`).
 */

import { act, fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import OfferImageCarousel from '../OfferImageCarousel';

jest.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (_k: string, fallback: string) => fallback }),
}));

const ALT = 'Ponuka';
const INTERVAL = 5000;

type Variant = 'cover' | 'contain-blur';

/** Fotka ponuky s verejnou adresou (predvolene odvodenou z `id`). */
function offerImage(id: number, url = `https://cdn.test/offers/${id}.webp`) {
  return { id, image_url: url, order: id };
}

/** Hlavné obrázky karuselu v poradí zobrazenia (rozmazané pozadie `contain-blur` má prázdny alt, tu sa nerátá). */
function photos(): HTMLElement[] {
  return screen.queryAllByAltText(ALT);
}

/** `src` fotky, ktorá je práve na obrazovke (priehľadnosť 100 %). */
function activeSrc(variant: Variant): string | null {
  const active = photos().find((img) =>
    variant === 'cover' ? img.classList.contains('opacity-100') : img.closest('.opacity-100') !== null,
  );
  return active?.getAttribute('src') ?? null;
}

describe.each<Variant>(['cover', 'contain-blur'])('OfferImageCarousel (%s)', (variant) => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  /** Vykreslí karusel s fotkami daných `id` v práve skúšanom variante. */
  function renderCarousel(ids: number[]) {
    return render(
      <OfferImageCarousel images={ids.map((id) => offerImage(id))} alt={ALT} variant={variant} intervalMs={INTERVAL} />,
    );
  }

  it('zlyhanú fotku v rotácii preskočí', () => {
    renderCarousel([1, 2, 3]);
    expect(activeSrc(variant)).toContain('/1.webp');

    fireEvent.error(photos()[1]);
    expect(photos()).toHaveLength(2);

    act(() => {
      jest.advanceTimersByTime(INTERVAL);
    });
    expect(activeSrc(variant)).toContain('/3.webp');
    act(() => {
      jest.advanceTimersByTime(INTERVAL);
    });
    expect(activeSrc(variant)).toContain('/1.webp');
    // Rotácia ide ďalej bez zdvojenia: znova tretia fotka, nie prvá dvakrát za sebou.
    act(() => {
      jest.advanceTimersByTime(INTERVAL);
    });
    expect(activeSrc(variant)).toContain('/3.webp');
  });

  it('keď zlyhá práve zobrazená fotka, ukáže sa ďalšia a „Bez fotografie“ sa neukáže', () => {
    renderCarousel([1, 2]);

    fireEvent.error(photos()[0]);

    expect(photos()).toHaveLength(1);
    expect(activeSrc(variant)).toContain('/2.webp');
    expect(screen.queryByText('Bez fotografie')).not.toBeInTheDocument();
  });

  it('„Bez fotografie“ ukáže až vtedy, keď zlyhajú všetky fotky', () => {
    renderCarousel([1, 2]);

    fireEvent.error(photos()[0]);
    expect(screen.queryByText('Bez fotografie')).not.toBeInTheDocument();
    fireEvent.error(photos()[0]);

    expect(screen.getByText('Bez fotografie')).toBeInTheDocument();
    expect(photos()).toHaveLength(0);
  });

  it('zlyhanie sa viaže na adresu: nová adresa tej istej fotky sa zobrazí znova', () => {
    const { rerender } = render(
      <OfferImageCarousel images={[offerImage(1)]} alt={ALT} variant={variant} intervalMs={INTERVAL} />,
    );
    fireEvent.error(photos()[0]);
    expect(screen.getByText('Bez fotografie')).toBeInTheDocument();

    rerender(
      <OfferImageCarousel
        images={[offerImage(1, 'https://cdn.test/offers/1-new.webp')]}
        alt={ALT}
        variant={variant}
        intervalMs={INTERVAL}
      />,
    );

    expect(activeSrc(variant)).toContain('1-new.webp');
    expect(screen.queryByText('Bez fotografie')).not.toBeInTheDocument();
  });
});

describe('OfferImageCarousel: stavy bez fotky ostávajú', () => {
  it('bez fotiek ukáže „Bez fotografie“', () => {
    render(<OfferImageCarousel images={[]} alt={ALT} />);

    expect(screen.getByText('Bez fotografie')).toBeInTheDocument();
  });

  it('rozpracovaná fotka ukáže „Spracúva sa…“', () => {
    render(<OfferImageCarousel images={[{ id: 1, status: 'pending' }]} alt={ALT} />);

    expect(screen.getByText('Spracúva sa…')).toBeInTheDocument();
  });

  it('zamietnutá fotka ukáže „Fotka zamietnutá“', () => {
    render(<OfferImageCarousel images={[{ id: 1, status: 'rejected' }]} alt={ALT} />);

    expect(screen.getByText('Fotka zamietnutá')).toBeInTheDocument();
  });
});
