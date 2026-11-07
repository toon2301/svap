/**
 * Prehliadač fotiek ponuky na celú obrazovku, keď sa fotka nenačíta (nález 291): namiesto pokazeného obrázka sa ukáže
 * viditeľná náhrada s textom. Počítadlo, prepínanie ostatných fotiek, zatváranie a ponuka „Nahlásiť fotku“ ostávajú.
 */

import type { ComponentProps } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import OfferImageGalleryLightbox from '../OfferImageGalleryLightbox';

jest.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (_key: string, fallback?: string) => fallback ?? _key }),
}));

jest.mock('../ReportPhotoModal', () => ({ ReportPhotoModal: () => null }));

const LABEL = 'Fotku sa nepodarilo načítať';
const IMAGES = [
  { id: 1, image_url: 'https://cdn.test/offers/1.webp', order: 0 },
  { id: 2, image_url: 'https://cdn.test/offers/2.webp', order: 1 },
];

/** Otvorený prehliadač s dvoma fotkami; `extra` prepíše vlastnosti (napr. `reportTarget`). */
function renderLightbox(extra: Partial<ComponentProps<typeof OfferImageGalleryLightbox>> = {}) {
  const onClose = jest.fn();
  render(<OfferImageGalleryLightbox open images={IMAGES} alt="Ponuka" onClose={onClose} {...extra} />);
  return { onClose };
}

/** Obrázok, ktorý je práve na obrazovke. */
const shownImage = () => screen.getByAltText('Ponuka');

describe('OfferImageGalleryLightbox: fotka, ktorá sa nenačíta', () => {
  it('ukáže náhradu s textom a počítadlo aj ovládanie ostanú', () => {
    renderLightbox();

    fireEvent.error(shownImage());

    expect(screen.getByTestId('offer-image-gallery-lightbox-failed')).toHaveTextContent(LABEL);
    expect(screen.queryByAltText('Ponuka')).not.toBeInTheDocument();
    expect(screen.getByText('1 / 2')).toBeInTheDocument();
    ['Zavrieť', 'Predchádzajúce', 'Ďalej'].forEach((name) =>
      expect(screen.getByRole('button', { name })).toBeInTheDocument(),
    );
  });

  it('šípkou sa dá prejsť na ďalšiu fotku a návrat na zlyhanú ju skúsi načítať znova', () => {
    renderLightbox();
    fireEvent.error(shownImage());

    fireEvent.click(screen.getByRole('button', { name: 'Ďalej' }));
    expect(shownImage()).toHaveAttribute('src', IMAGES[1].image_url);
    expect(screen.queryByTestId('offer-image-gallery-lightbox-failed')).not.toBeInTheDocument();
    expect(screen.getByText('2 / 2')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Predchádzajúce' }));
    expect(shownImage()).toHaveAttribute('src', IMAGES[0].image_url);
    expect(screen.queryByTestId('offer-image-gallery-lightbox-failed')).not.toBeInTheDocument();
  });

  it('Escape zatvorí prehliadač, klik na podklad tiež, klik na náhradu nie', () => {
    const { onClose } = renderLightbox();
    fireEvent.error(shownImage());

    fireEvent.click(screen.getByTestId('offer-image-gallery-lightbox-failed'));
    expect(onClose).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('dialog'));
    expect(onClose).toHaveBeenCalledTimes(1);

    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(2);
  });

  it('ponuka „Nahlásiť fotku“ ostáva dostupná aj na zlyhanej fotke', () => {
    renderLightbox({ reportTarget: { type: 'offer_image', skillId: 3 } });

    fireEvent.error(shownImage());

    expect(screen.getByTestId('offer-image-gallery-lightbox-failed')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Moznosti fotky' })).toBeInTheDocument();
  });
});
