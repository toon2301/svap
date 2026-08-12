/**
 * Galéria fotiek príspevku: jedna fotka bez ovládania, 2–5 s karuselom.
 */

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import FeedPostImageCarousel from '../FeedPostImageCarousel';
import type { FeedPostImage } from '@/lib/feedApi';

jest.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (_k: string, fallback: string) => fallback }),
}));

function approved(id: number): FeedPostImage {
  return {
    id,
    thumbnail_url: `https://cdn.test/${id}-thumb.webp`,
    large_url: `https://cdn.test/${id}-large.webp`,
    width: 800,
    height: 600,
  };
}

function currentSrc() {
  return screen.getByTestId('feed-post-image').querySelector('img')?.getAttribute('src');
}

describe('FeedPostImageCarousel', () => {
  it('renders nothing without images', () => {
    const { container } = render(
      <FeedPostImageCarousel images={[]} alt="Fotka" />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('shows a single photo without any controls', () => {
    render(<FeedPostImageCarousel images={[approved(1)]} alt="Fotka" />);

    expect(screen.getByTestId('feed-post-image')).toBeInTheDocument();
    // Jedna fotka sa správa presne ako pred Fázou 4.4.
    expect(screen.queryByTestId('feed-image-next')).not.toBeInTheDocument();
    expect(screen.queryByTestId('feed-image-dots')).not.toBeInTheDocument();
  });

  it('moves between photos with the arrow buttons', async () => {
    render(
      <FeedPostImageCarousel
        images={[approved(1), approved(2), approved(3)]}
        alt="Fotka"
      />,
    );

    expect(currentSrc()).toContain('1-large');
    await userEvent.click(screen.getByTestId('feed-image-next'));
    expect(currentSrc()).toContain('2-large');
    await userEvent.click(screen.getByTestId('feed-image-prev'));
    expect(currentSrc()).toContain('1-large');
  });

  it('wraps around at both ends', async () => {
    render(
      <FeedPostImageCarousel images={[approved(1), approved(2)]} alt="Fotka" />,
    );

    // Doľava z prvej → posledná.
    await userEvent.click(screen.getByTestId('feed-image-prev'));
    expect(currentSrc()).toContain('2-large');
    await userEvent.click(screen.getByTestId('feed-image-next'));
    expect(currentSrc()).toContain('1-large');
  });

  it('responds to the keyboard arrows', async () => {
    render(
      <FeedPostImageCarousel images={[approved(1), approved(2)]} alt="Fotka" />,
    );

    const carousel = screen.getByTestId('feed-post-image');
    carousel.focus();
    await userEvent.keyboard('{ArrowRight}');
    expect(currentSrc()).toContain('2-large');
    await userEvent.keyboard('{ArrowLeft}');
    expect(currentSrc()).toContain('1-large');
  });

  it('jumps straight to a photo from the dots', async () => {
    render(
      <FeedPostImageCarousel
        images={[approved(1), approved(2), approved(3)]}
        alt="Fotka"
      />,
    );

    await userEvent.click(screen.getByRole('button', { name: 'Zobraziť fotku 3' }));

    expect(currentSrc()).toContain('3-large');
    expect(screen.getByTestId('feed-post-image')).toHaveTextContent('3/3');
  });

  it('shows the processing state for a photo the author has not had approved', () => {
    render(
      <FeedPostImageCarousel
        images={[{ id: 9, status: 'pending' }]}
        alt="Fotka"
      />,
    );

    expect(screen.getByTestId('feed-image-status')).toHaveTextContent('Spracúva sa…');
  });

  it('never shows a rejected photo, only a discreet note', () => {
    render(
      <FeedPostImageCarousel
        images={[
          approved(1),
          {
            id: 9,
            status: 'rejected',
            rejected_reason: 'Obrazok bol zamietnuty kvoli nevhodnemu obsahu.',
          },
        ]}
        alt="Fotka"
      />,
    );

    // Jedna zobraziteľná fotka → žiadne ovládanie karuselu.
    expect(screen.queryByTestId('feed-image-dots')).not.toBeInTheDocument();
    // Technický text z backendu sa NESMIE dostať von.
    const note = screen.getByTestId('feed-image-rejected-note');
    expect(note).toHaveTextContent('Táto fotka nespĺňa pravidlá obsahu.');
    expect(note).not.toHaveTextContent('Obrazok bol zamietnuty');
  });

  it('renders no media area when every photo was rejected', () => {
    render(
      <FeedPostImageCarousel
        images={[
          { id: 8, status: 'rejected', rejected_reason: 'x' },
          { id: 9, status: 'rejected', rejected_reason: 'y' },
        ]}
        alt="Fotka"
      />,
    );

    // Príspevok sa má tváriť ako čisto textový – žiadna prázdna galéria.
    expect(screen.queryByTestId('feed-post-image')).not.toBeInTheDocument();
    expect(screen.getByTestId('feed-image-rejected-note')).toBeInTheDocument();
  });

  it('falls back to a generic message for an unknown backend reason', () => {
    render(
      <FeedPostImageCarousel
        images={[{ id: 9, status: 'rejected', rejected_reason: 'Nieco uplne ine.' }]}
        alt="Fotka"
      />,
    );

    const note = screen.getByTestId('feed-image-rejected-note');
    expect(note).toHaveTextContent('Túto fotku sa nepodarilo nahrať.');
    expect(note).not.toHaveTextContent('Nieco uplne ine.');
  });

  it('letterboxes photos into one fixed-height area', () => {
    render(<FeedPostImageCarousel images={[approved(1)]} alt="Fotka" />);

    const media = screen.getByTestId('feed-post-image');
    // Jednotná výška pre všetky fotky…
    expect(media.className).toContain('h-80');
    // …a obrázok sa do nej vkladá celý (contain), nie orezaný.
    expect(media.querySelector('img.object-contain')).not.toBeNull();
    // Prázdne miesto vypĺňa rozmazaná kópia tej istej fotky.
    expect(media.querySelector('img.blur-xl')).not.toBeNull();
  });

  it('recovers when the photo list shrinks under the active index', async () => {
    const { rerender } = render(
      <FeedPostImageCarousel
        images={[approved(1), approved(2), approved(3)]}
        alt="Fotka"
      />,
    );
    await userEvent.click(screen.getByRole('button', { name: 'Zobraziť fotku 3' }));

    // Obnovenie feedu môže fotky odobrať – index mimo rozsahu by nevykreslil nič.
    rerender(<FeedPostImageCarousel images={[approved(1)]} alt="Fotka" />);

    expect(currentSrc()).toContain('1-large');
  });
});
